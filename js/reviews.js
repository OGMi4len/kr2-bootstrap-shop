/* The review wizard and public feed share a single data source per page. */
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const wizard = byId('reviewWizard');
  if (!wizard || !window.bootstrap?.Modal) return;

  const language = document.documentElement.lang === 'en' ? 'en' : 'ru';
  const t = (ru, en) => language === 'en' ? en : ru;
  const services = window.HV_SERVICES || {};
  const storageKey = 'hvostkom-review-preview-v1';
  const endpoint = new URL(t('api/reviews', '../api/reviews'), window.location.href);
  const modal = bootstrap.Modal.getOrCreateInstance(wizard);
  const form = byId('reviewForm');
  const openButton = byId('startReview');
  const next = byId('reviewNext');
  const back = byId('reviewBack');
  const status = byId('reviewFeedStatus');
  const feed = byId('reviewFeed');
  const more = byId('reviewMore');
  const notice = byId('reviewMode');
  const filter = byId('reviewFilter');
  const sort = byId('reviewSort');
  const name = byId('reviewName');
  const comment = byId('reviewComment');
  const consent = byId('reviewConsent');
  const service = byId('reviewService');
  const error = byId('reviewError');
  const done = byId('reviewDone');
  const panels = [...form.querySelectorAll('[data-review-step]')];
  const steps = [...form.querySelectorAll('.review-steps li')];
  const radios = [...form.querySelectorAll('[name="rating"]')];
  let step = 0;
  let mode = location.protocol === 'file:' ? 'preview' : null;
  let offset = 0;
  let loading = false;
  let submitting = false;
  let loadVersion = 0;

  Object.entries(services).forEach(([key, item]) => service.add(new Option(item.title, key)));

  async function request(url, options, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try { return await fetch(url, {...options, signal: controller.signal}); }
    finally { clearTimeout(timer); }
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function ratingLabel(rating) {
    return t(`Оценка: ${rating} из 5`, `Rating: ${rating} out of 5`);
  }

  function plural(n) {
    return t(new Intl.PluralRules('ru').select(n) === 'one' ? 'отзыв' :
      new Intl.PluralRules('ru').select(n) === 'few' ? 'отзыва' : 'отзывов', n === 1 ? 'review' : 'reviews');
  }

  function reviewCard(item, preview = false) {
    const card = node(preview ? 'div' : 'article', 'review-card');
    const heading = node('div', 'review-card-head');
    const avatar = node('span', 'review-avatar', [...item.name][0].toLocaleUpperCase(language));
    avatar.setAttribute('aria-hidden', 'true');
    const author = node('div', 'review-author');
    author.append(node(preview ? 'strong' : 'h3', '', item.name));
    if (!preview) {
      const time = node('time', 'review-muted', new Date(item.created_at).toLocaleDateString(language,
        {day: 'numeric', month: 'long', year: 'numeric'}));
      time.dateTime = item.created_at;
      author.append(time);
    }
    heading.append(avatar, author);
    const rating = node('span', 'review-card-stars');
    rating.setAttribute('role', 'img');
    rating.setAttribute('aria-label', ratingLabel(item.rating));
    const stars = node('span', '', '★'.repeat(item.rating));
    const remaining = node('span', 'review-star-empty', '★'.repeat(5 - item.rating));
    stars.setAttribute('aria-hidden', 'true');
    remaining.setAttribute('aria-hidden', 'true');
    rating.append(stars, remaining);
    const meta = node('div', 'review-card-meta');
    meta.append(rating);
    if (Object.hasOwn(services, item.service)) meta.append(node('span', 'review-service', services[item.service].title));
    card.append(heading, meta, node('p', 'review-card-text', item.comment));
    return card;
  }

  function readPreview() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter((item) => item && typeof item.name === 'string' && item.name &&
        typeof item.comment === 'string' && Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5) : [];
    } catch {
      return [];
    }
  }

  function localFeed() {
    const entries = readPreview();
    const counts = [0, 0, 0, 0, 0];
    entries.forEach(({rating}) => { counts[rating - 1] += 1; });
    const filtered = entries.filter((item) => !filter.value || item.rating === Number(filter.value));
    if (sort.value === 'best') filtered.sort((a, b) => b.rating - a.rating);
    if (sort.value === 'lowest') filtered.sort((a, b) => a.rating - b.rating);
    return {counts, items: filtered.slice(offset, offset + 12), more: filtered.length > offset + 12};
  }

  function renderSummary(counts) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    const weighted = counts.reduce((sum, count, i) => sum + count * (i + 1), 0);
    byId('reviewAverage').textContent = total ? (weighted / total).toLocaleString(language, {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '—';
    byId('reviewTotal').textContent = total ? `/ 5 · ${total} ${plural(total)}` : t('пока без оценок', 'no ratings yet');
    counts.forEach((count, i) => {
      const meter = document.querySelector(`[data-rating-meter="${i + 1}"]`);
      meter.max = total || 1;
      meter.value = count;
      document.querySelector(`[data-rating-count="${i + 1}"]`).textContent = count;
    });
  }

  function setMode(value) {
    mode = value;
    notice.hidden = value !== 'preview';
    notice.textContent = value === 'preview' ? t('Предпросмотр: отзывы сохраняются только в этом браузере и не отправляются в салон.',
      'Preview: reviews are saved in this browser only and are not sent to the salon.') : '';
    if (value === 'preview') byId('reviewConsentText').textContent = t('Понимаю, что отзыв сохранится только в этом браузере.',
      'I understand this review will only be stored in this browser.');
  }

  async function loadFeed(append = false) {
    const version = ++loadVersion;
    loading = true;
    more.disabled = true;
    if (!append) {
      offset = 0;
      more.hidden = true;
      feed.replaceChildren();
    }
    feed.setAttribute('aria-busy', 'true');
    status.textContent = t('Загружаем отзывы…', 'Loading reviews…');
    try {
      let data;
      if (mode !== 'preview') {
        const url = new URL(endpoint);
        url.search = new URLSearchParams({rating: filter.value, sort: sort.value, offset});
        const response = await request(url, {headers: {Accept: 'application/json'}, cache: 'no-store'}, 7000);
        if (version !== loadVersion) return;
        const isJson = response.headers.get('Content-Type')?.includes('application/json');
        if (mode === null && !isJson && (response.status === 404 || response.ok)) setMode('preview');
        else {
          if (!response.ok || !isJson) throw new Error('Feed unavailable');
          data = await response.json();
          if (!Array.isArray(data.items) || !Array.isArray(data.counts) || data.counts.length !== 5) throw new Error('Invalid feed');
          if (version !== loadVersion) return;
          setMode('server');
        }
      }
      if (mode === 'preview') {
        setMode('preview');
        data = localFeed();
      }
      renderSummary(data.counts);
      const cards = data.items.map((item) => reviewCard(item));
      offset += cards.length;
      feed.append(...cards);
      if (append && cards.length) {
        cards[0].tabIndex = -1;
        cards[0].focus();
      }
      const empty = filter.value ? t('С такой оценкой пока нет отзывов.', 'There are no reviews with that rating yet.') :
        t('Пока отзывов нет. Поделитесь впечатлениями первыми!', 'No reviews yet. Be the first to share your experience!');
      status.textContent = offset ? '' : empty;
      more.hidden = !data.more;
      openButton.disabled = false;
    } catch {
      if (version !== loadVersion) return;
      const retry = node('button', 'btn btn-outline-primary btn-sm ms-2', t('Повторить', 'Retry'));
      retry.type = 'button';
      retry.addEventListener('click', () => loadFeed(append));
      status.textContent = t('Не удалось загрузить отзывы.', 'Could not load reviews.');
      status.append(' ', retry);
    } finally {
      if (version === loadVersion) {
        loading = false;
        more.disabled = false;
        feed.setAttribute('aria-busy', 'false');
      }
    }
  }

  function draft() {
    return {rating: Number(radios.find((radio) => radio.checked)?.value || 0),
      name: name.value.trim(), comment: comment.value.trim(), service: service.value, consent: consent.checked};
  }

  function updateRating() {
    const {rating} = draft();
    wizard.querySelectorAll('[data-score]').forEach((label) => label.classList.toggle('is-selected', Number(label.dataset.score) <= rating));
    byId('reviewRatingText').textContent = rating ? ratingLabel(rating) : t('Выберите от 1 до 5 звёзд', 'Choose 1 to 5 stars');
  }

  function showError(text = '', target) {
    error.textContent = text;
    error.hidden = !text;
    if (target) { target.setAttribute('aria-invalid', 'true'); target.focus(); }
  }

  function goTo(index, focus = true) {
    step = index;
    showError();
    panels.forEach((panel, i) => { panel.hidden = index !== i; });
    steps.forEach((item, i) => {
      if (index === i) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.classList.toggle('is-complete', i < index);
    });
    back.hidden = index === 0;
    next.textContent = index !== 2 ? t('Далее', 'Next') : mode === 'preview' ? t('Сохранить отзыв', 'Save review') : t('Отправить на проверку', 'Send for moderation');
    if (index === 2) byId('reviewPreview').replaceChildren(reviewCard(draft(), true));
    if (focus) panels[index].querySelector('h3').focus();
  }

  function setBusy(busy) {
    submitting = busy;
    back.disabled = next.disabled = busy;
    wizard.querySelectorAll('[data-bs-dismiss]').forEach((button) => { button.disabled = busy; });
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    showError();
    const review = draft();
    if (step === 0) {
      if (!review.rating) return showError(t('Сначала поставьте оценку.', 'Choose a rating first.'), radios[0]);
      return goTo(1);
    }
    if (step === 1) {
      if ([...review.name].length < 2 || /[\x00-\x1f]/.test(review.name)) return showError(t('Введите имя (от 2 символов).', 'Enter a display name (at least 2 characters).'), name);
      if ([...review.comment].length < 20) return showError(t('Добавьте ещё немного: нужно минимум 20 символов.', 'Add a little more: at least 20 characters.'), comment);
      return goTo(2);
    }
    if (!review.consent) return showError(t('Поставьте галочку, чтобы продолжить.', 'Check the box to continue.'), consent);

    setBusy(true);
    try {
      if (mode === 'preview') {
        const {consent: _, ...entry} = review;
        localStorage.setItem(storageKey, JSON.stringify([{...entry, created_at: new Date().toISOString()}, ...readPreview()].slice(0, 100)));
        byId('reviewDoneTitle').textContent = t('Отзыв сохранён в браузере', 'Review saved in this browser');
        byId('reviewDoneText').textContent = t('Посмотрите, как он выглядит в ленте предпросмотра.', 'See how it looks in the preview feed.');
        filter.value = '';
        sort.value = 'new';
        void loadFeed();
      } else {
        const response = await request(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(review)}, 12000);
        if (response.status !== 201 || (await response.json()).status !== 'pending') throw new Error('Review not confirmed');
        byId('reviewDoneTitle').textContent = t('Отзыв на проверке', 'Review awaiting moderation');
        byId('reviewDoneText').textContent = t('Спасибо, что поделились впечатлениями. Отзыв появится в ленте после одобрения.',
          'Thank you for sharing. Your review will appear in the feed once approved.');
      }
      form.hidden = true;
      done.hidden = false;
      byId('reviewDoneTitle').focus();
    } catch {
      showError(mode === 'preview' ? t('Браузер не разрешил сохранить отзыв.', 'This browser did not allow the review to be saved.') :
        t('Не удалось подтвердить отправку. Текст остался в форме.', 'The submission could not be confirmed. Your text is still in the form.'));
    } finally {
      setBusy(false);
    }
  });

  openButton.addEventListener('click', () => modal.show(openButton));
  wizard.addEventListener('shown.bs.modal', () => panels[step].querySelector('h3').focus());
  wizard.addEventListener('hide.bs.modal', (event) => { if (submitting) event.preventDefault(); });
  wizard.addEventListener('hidden.bs.modal', () => {
    if (!done.hidden) {
      form.reset();
      form.hidden = false;
      done.hidden = true;
      byId('reviewCounter').textContent = '0 / 1200';
      updateRating();
      goTo(0, false);
    }
    openButton.focus();
  });
  back.addEventListener('click', () => goTo(step - 1));
  form.addEventListener('input', (event) => {
    event.target.removeAttribute('aria-invalid');
    if (event.target.name === 'rating') {
      radios.forEach((radio) => radio.removeAttribute('aria-invalid'));
      updateRating();
    }
    if (event.target === comment) byId('reviewCounter').textContent = `${comment.value.length} / 1200`;
    if (!error.hidden) showError();
  });
  filter.addEventListener('change', () => loadFeed());
  sort.addEventListener('change', () => loadFeed());
  more.addEventListener('click', () => { if (!loading) void loadFeed(true); });
  goTo(0, false);
  void loadFeed();
})();
