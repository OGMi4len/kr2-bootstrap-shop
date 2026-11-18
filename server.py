"""Local preview and review service. The WSGI entry point is application."""

import argparse
import json
import mimetypes
import os
import re
import sqlite3
from contextlib import closing
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from wsgiref.simple_server import make_server
from wsgiref.util import FileWrapper


ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get('HVOSTKOM_REVIEWS_DB', ROOT / 'var' / 'reviews.sqlite3')).expanduser()
PAGES = {'index', 'about', 'account', 'catalog', 'contacts', 'gallery', 'guide', 'order', 'product', 'reviews'}
SERVICES = {'', 'groom', 'bath', 'ears', 'nails', 'deshed', 'puppy'}


def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    db.execute('''CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        service TEXT NOT NULL, comment TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
    )''')
    return db


def reply(start, status, payload):
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    start(status, [('Content-Type', 'application/json; charset=utf-8'),
                   ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'),
                   ('Content-Length', str(len(data)))])
    return [data]


def reviews(env, start):
    send = lambda status, payload: reply(start, status, payload)
    method = env['REQUEST_METHOD']
    if method == 'GET':
        query = parse_qs(env['QUERY_STRING'])
        order = {'best': 'rating DESC, id DESC', 'lowest': 'rating ASC, id DESC'}.get(
            query.get('sort', [''])[0], 'id DESC')
        rating = query.get('rating', [''])[0]
        offset = query.get('offset', ['0'])[0]
        offset = int(offset) if re.fullmatch(r'[0-9]{1,8}', offset) else 0
        conditions = 'status = ?'
        args = ['approved']
        if rating in {'1', '2', '3', '4', '5'}:
            conditions += ' AND rating = ?'
            args.append(int(rating))
        with closing(connect()) as db:
            counts = {row[0]: row[1] for row in db.execute(
                "SELECT rating, COUNT(*) FROM reviews WHERE status = 'approved' GROUP BY rating")}
            items = [dict(row) for row in db.execute(
                f'SELECT id, name, rating, service, comment, created_at FROM reviews '
                f'WHERE {conditions} ORDER BY {order} LIMIT 13 OFFSET ?', [*args, offset])]
        return send('200 OK', {'counts': [counts.get(n, 0) for n in range(1, 6)],
                               'items': items[:12], 'more': len(items) > 12})

    if method != 'POST':
        return send('405 Method Not Allowed', {'error': 'method'})
    origin = env.get('HTTP_ORIGIN')
    host = env.get('HTTP_HOST', '')
    try:
        source = urlsplit(origin) if origin else None
    except ValueError:
        return send('403 Forbidden', {'error': 'origin'})
    if ((source and (source.netloc.lower() != host.lower() or source.scheme not in {'http', 'https'}))
            or env.get('HTTP_SEC_FETCH_SITE') == 'cross-site'):
        return send('403 Forbidden', {'error': 'origin'})
    if env.get('CONTENT_TYPE', '').split(';')[0].strip().lower() != 'application/json':
        return send('415 Unsupported Media Type', {'error': 'format'})
    size = env.get('CONTENT_LENGTH', '')
    if not re.fullmatch(r'[0-9]{1,5}', size) or not 0 < int(size) <= 12000:
        return send('413 Payload Too Large', {'error': 'size'})
    try:
        data = json.loads(env['wsgi.input'].read(int(size)).decode('utf-8'))
        if not isinstance(data, dict):
            raise ValueError
        name, comment = (data.get(key, '') for key in ('name', 'comment'))
        rating, service = data.get('rating'), data.get('service', '')
        if not all(isinstance(value, str) for value in (name, comment, service)):
            raise ValueError
        name, comment = name.strip(), comment.strip()
        (name + comment).encode('utf-8')  # Reject lone UTF-16 surrogates from malformed JSON.
        if not (2 <= len(name) <= 50 and 20 <= len(comment) <= 1200 and service in SERVICES
                and type(rating) is int and 1 <= rating <= 5 and data.get('consent') is True):
            raise ValueError
        if any(ord(ch) < 32 for ch in name) or any(ord(ch) < 32 and ch not in '\r\n\t' for ch in comment):
            raise ValueError
    except (ValueError, RecursionError):
        return send('400 Bad Request', {'error': 'validation'})

    with closing(connect()) as db, db:
        row = db.execute('INSERT INTO reviews(name, rating, service, comment) VALUES (?, ?, ?, ?)',
                         (name, rating, service, comment))
        review_id = row.lastrowid
    return send('201 Created', {'id': review_id, 'status': 'pending'})


def application(env, start):
    request_path = env.get('PATH_INFO', '')
    if request_path == '/api/reviews':
        return reviews(env, start)
    parts = (request_path.removeprefix('/') or 'index.html').split('/')
    if parts == ['en', '']:
        parts[-1] = 'index.html'
    if any(part.startswith('.') or not part or '\\' in part or '\x00' in part for part in parts):
        return reply(start, '404 Not Found', {'error': 'not-found'})
    page = (len(parts) == 1 or (len(parts) == 2 and parts[0] == 'en')) and (
        parts[-1].endswith('.html') and parts[-1][:-5] in PAGES)
    asset = len(parts) >= 2 and parts[0] in {'css', 'js', 'images', 'vendor'} and (
        Path(parts[-1]).suffix.lower() in {'.css', '.js', '.svg', '.jpg', '.jpeg', '.png', '.webp', '.ico', '.woff2'})
    file = ROOT.joinpath(*parts).resolve()
    if not ((page or asset) and file.is_relative_to(ROOT) and file.is_file() and file != DB.resolve()):
        return reply(start, '404 Not Found', {'error': 'not-found'})
    if env['REQUEST_METHOD'] not in {'GET', 'HEAD'}:
        return reply(start, '405 Method Not Allowed', {'error': 'method'})
    mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
    if mime.startswith('text/') or mime == 'application/javascript':
        mime += '; charset=utf-8'
    start('200 OK', [('Content-Type', mime), ('Content-Length', str(file.stat().st_size)),
                     ('X-Content-Type-Options', 'nosniff')])
    return [] if env['REQUEST_METHOD'] == 'HEAD' else FileWrapper(file.open('rb'))


def main():
    parser = argparse.ArgumentParser(description='ХвостКом: запуск сайта и управление отзывами')
    commands = parser.add_subparsers(dest='command')
    serve = commands.add_parser('serve', help='Локальный запуск сайта')
    serve.add_argument('--port', type=int, default=8080)
    listing = commands.add_parser('list', help='Показать отзывы')
    listing.add_argument('--status', choices=['pending', 'approved', 'rejected', 'all'], default='pending')
    for command in ('approve', 'reject'):
        commands.add_parser(command).add_argument('id', type=int)
    options = parser.parse_args()
    if options.command in (None, 'serve'):
        port = getattr(options, 'port', 8080)
        with make_server('127.0.0.1', port, application) as server:
            print(f'ХвостКом: http://127.0.0.1:{port}/reviews.html', flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
        return
    with closing(connect()) as db, db:
        if options.command == 'list':
            rows = db.execute('SELECT * FROM reviews ORDER BY id DESC') if options.status == 'all' else db.execute(
                'SELECT * FROM reviews WHERE status = ? ORDER BY id DESC', (options.status,))
            for row in rows:
                print(json.dumps(dict(row), ensure_ascii=False))
        else:
            status = 'approved' if options.command == 'approve' else 'rejected'
            result = db.execute('UPDATE reviews SET status = ? WHERE id = ?', (status, options.id))
            if not result.rowcount:
                parser.exit(1, 'Отзыв с таким номером не найден.\n')
            print(f'Отзыв #{options.id}: {status}')


if __name__ == '__main__':
    main()
