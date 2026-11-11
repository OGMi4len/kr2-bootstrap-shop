/* Дополнения к Bootstrap: поиск, расчёт ухода и интерактивные пояснения. */
(() => {
  'use strict';

  const english = document.documentElement.lang.startsWith('en');
  const locale = english ? 'en-US' : 'ru-RU';
  const say = (ru, en) => english ? en : ru;
  const byId = id => document.getElementById(id);
  const services = window.HV_SERVICES || {};

  // Индекс хранится в коде: поиск работает даже при открытии HTML без сервера.
  const search = byId('siteSearch');
  const results = byId('searchResults');
  if (search && results) {
    const index = [
      ['index.html', say('ХвостКом — главная', 'HvostKom — home'), say('салон груминг собака кошка преимущества уход', 'salon grooming dog cat benefits care')],
      ['catalog.html', say('Все услуги и цены', 'Services and prices'), say('каталог услуги фильтр собаки кошки', 'catalog services filter dogs cats')],
      ['#bookingModal', say('Запись на уход', 'Book a visit'), say('заявка дата время телефон запись бронирование', 'booking appointment date time phone')],
      ['guide.html#prepare', say('Перед визитом', 'Before your visit'), say('подготовка памятка переноска поводок список перед визитом', 'before visit guide checklist preparation carrier lead')],
      ['guide.html#cats', say('Что взять с собой', 'What to bring'), say('кошка собака переноска поводок привычные вещи', 'cat dog carrier lead familiar things')],
      ['guide.html#after', say('Уход после процедуры', 'Care after a procedure'), say('после визита шерсть расчёсывание рекомендации', 'after visit coat brushing recommendations')],
      ['gallery.html', say('До и после', 'Before and after'), say('галерея питомцы фотографии до после результат', 'gallery pets photos before after results')],
      ['about.html', say('О салоне', 'About the salon'), say('салон подход знакомство уход как проходит визит', 'salon approach introduction care visit process')],
      ['contacts.html', say('Контакты и график работы', 'Contact and opening hours'), say('телефон почта адрес Москва Боженко контакты график работы misha_stepanov_07@mail.ru 89252328798 79252328798', 'phone email address Moscow Bozhenko contacts opening hours misha_stepanov_07@mail.ru 89252328798 79252328798')]
    ];
    for (const [id, item] of Object.entries(services)) {
      const pets = item.pets?.includes('cat') ? say('кошка кошки кот', 'cat cats') : '';
      index.push([`product.html?service=${id}`, item.title, `${item.description} ${pets} ${say('собака собаки', 'dog dogs')}`]);
    }
    let active = -1;
    results.setAttribute('role', 'listbox');
    search.setAttribute('role', 'combobox');
    search.setAttribute('aria-autocomplete', 'list');
    search.setAttribute('aria-controls', results.id);

    function closeSearch() {
      results.hidden = true;
      active = -1;
      search.setAttribute('aria-expanded', 'false');
      search.removeAttribute('aria-activedescendant');
    }

    function markActive() {
      [...results.children].forEach((row, position) => {
        const selected = position === active;
        row.setAttribute('aria-selected', String(selected));
        row.classList.toggle('active', selected);
        if (selected) {
          search.setAttribute('aria-activedescendant', row.id);
          row.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function renderSearch() {
      const words = search.value.trim().toLocaleLowerCase(locale).split(/\s+/).filter(Boolean);
      results.replaceChildren();
      active = -1;
      search.removeAttribute('aria-activedescendant');
      if (!words.length) {
        closeSearch();
        if (byId('searchStatus')) byId('searchStatus').textContent = '';
        return;
      }
      const found = index.filter(([, title, description]) => {
        const haystack = `${title} ${description}`.toLocaleLowerCase(locale);
        return words.every(word => haystack.includes(word));
      }).slice(0, 8);
      found.forEach(([url, title, description], position) => {
        const row = document.createElement('li');
        row.id = `search-result-${position}`;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');
        const link = document.createElement('a');
        link.href = url;
        if (url === '#bookingModal') {
          link.dataset.bsToggle = 'modal';
          link.dataset.bsTarget = '#bookingModal';
          link.dataset.bookingOpen = '';
        }
        const heading = document.createElement('span');
        heading.className = 'search-title';
        heading.textContent = title;
        const detail = document.createElement('span');
        detail.className = 'search-text';
        detail.textContent = description;
        link.append(heading, detail);
        row.append(link);
        results.append(row);
      });
      const countText = found.length
        ? say(`Найдено разделов: ${found.length}`, `Sections found: ${found.length}`)
        : say('Ничего не найдено. Попробуйте «купание» или «запись».', 'No results. Try “bathing” or “booking”.');
      if (!found.length) {
        const empty = document.createElement('li');
        empty.className = 'search-empty';
        empty.textContent = countText;
        results.append(empty);
      }
      if (byId('searchStatus')) byId('searchStatus').textContent = countText;
      results.hidden = false;
      search.setAttribute('aria-expanded', 'true');
    }

    search.addEventListener('input', renderSearch);
    search.addEventListener('focus', () => { if (search.value.trim()) renderSearch(); });
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeSearch();
        return;
      }
      if (results.hidden) return;
      const count = results.querySelectorAll('a').length;
      if (count && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        active = event.key === 'ArrowDown' ? (active + 1) % count : (active <= 0 ? count - 1 : active - 1);
        markActive();
      }
      if (event.key === 'Enter' && count) {
        event.preventDefault();
        results.children[active < 0 ? 0 : active].querySelector('a').click();
      }
    });
    document.addEventListener('click', event => {
      if (event.target !== search && !results.contains(event.target)) closeSearch();
    });
    document.addEventListener('focusin', event => {
      if (event.target !== search && !results.contains(event.target)) closeSearch();
    });
    closeSearch();
  }

  const calculator = byId('careCalculator');
  if (calculator) {
    const pet = byId('calcPet');
    const service = byId('calcService');
    const visits = byId('calcVisits');
    const order = byId('calcOrder');
    const initialService = service.value;
    function calculate() {
      [...service.options].forEach(option => {
        const item = services[option.value];
        option.disabled = !!item && !item.pets.includes(pet.value);
      });
      if (!services[service.value]?.pets.includes(pet.value)) {
        service.value = services.bath?.pets.includes(pet.value)
          ? 'bath' : [...service.options].find(option => services[option.value] && !option.disabled)?.value || '';
      }
      const count = Number(visits.value);
      const valid = visits.value !== '' && Number.isInteger(count) && count >= 1 && count <= 12;
      visits.setCustomValidity(valid ? '' : say('Введите целое число от 1 до 12.', 'Enter a whole number from 1 to 12.'));
      const item = services[service.value];
      if (valid && item) {
        byId('calcPrice').textContent = say('от ', 'from ') + (item.price * count).toLocaleString(locale) + ' ₽';
        byId('calcTime').textContent = `${item.minutes * count} ${say('мин', 'min')}`;
        order.href = '#bookingModal';
        order.dataset.bsToggle = 'modal';
        order.dataset.bsTarget = '#bookingModal';
        order.dataset.service = service.value;
        order.dataset.pet = pet.value;
        order.removeAttribute('aria-disabled');
        order.removeAttribute('tabindex');
      } else {
        byId('calcPrice').textContent = say('Укажите 1–12 визитов', 'Choose 1–12 visits');
        byId('calcTime').textContent = '—';
        order.removeAttribute('href');
        order.removeAttribute('data-bs-toggle');
        order.setAttribute('aria-disabled', 'true');
        order.tabIndex = -1;
      }
    }
    calculator.addEventListener('input', calculate);
    calculator.addEventListener('change', calculate);
    calculator.addEventListener('submit', event => { event.preventDefault(); calculate(); });
    calculator.addEventListener('reset', () => setTimeout(() => {
      // Отключённый для кошки первый option не должен менять исходный выбор.
      service.value = initialService;
      calculate();
    }, 0));
    calculate();
  }

  const demo = byId('visitDemo');
  if (demo) {
    const steps = [...demo.querySelectorAll('[data-visit-step]')];
    const play = byId('demoPlay');
    const next = byId('demoNext');
    const reset = byId('demoReset');
    let current = -1;
    let timer = null;
    function stop() {
      clearInterval(timer);
      timer = null;
    }
    function draw() {
      demo.dataset.stage = current < 0 ? 'idle' : String(current + 1);
      steps.forEach((step, position) => {
        step.classList.toggle('is-active', position === current);
        step.classList.toggle('is-complete', position < current);
        if (position === current) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
      const title = steps[current]?.querySelector('[data-step-title], h3, h4, strong')?.textContent.trim()
        || steps[current]?.textContent.trim();
      byId('visitStatus').textContent = current < 0
        ? say('Нажмите «Старт», чтобы пройти этапы визита.', 'Press Start to explore a visit.')
        : `${current + 1}/${steps.length} · ${title}`;
      play.textContent = timer ? say('Пауза', 'Pause')
        : current === steps.length - 1 ? say('Повторить', 'Replay') : say('Старт', 'Start');
      play.setAttribute('aria-pressed', String(!!timer));
      next.disabled = current === steps.length - 1;
    }
    function advance() {
      current = Math.min(current + 1, steps.length - 1);
      if (current === steps.length - 1) stop();
      draw();
    }
    play.addEventListener('click', () => {
      if (timer) {
        stop();
        draw();
        return;
      }
      if (current === steps.length - 1) current = -1;
      if (current < 0) advance();
      timer = setInterval(advance, 1800);
      draw();
    });
    next.addEventListener('click', () => { stop(); advance(); });
    reset.addEventListener('click', () => { stop(); current = -1; draw(); });
    window.addEventListener('pagehide', stop);
    draw();
  }

  const copyStatus = byId('copyStatus');
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', async () => {
      const target = byId(button.dataset.copyTarget);
      if (!target) return;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(target.innerText || target.textContent);
        if (copyStatus) copyStatus.textContent = say('Памятка скопирована.', 'Checklist copied.');
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        if (copyStatus) copyStatus.textContent = say('Текст выделен. Нажмите ⌘C на Mac или Ctrl+C.', 'Text selected. Press ⌘C on Mac or Ctrl+C.');
      }
    });
  });
  const download = byId('downloadChecklist');
  if (download) download.addEventListener('click', () => {
    const checklist = byId('visitChecklist');
    if (!checklist) return;
    const blob = new Blob(['\uFEFF', checklist.innerText || checklist.textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = english ? 'hvostkom-visit-checklist.txt' : 'ХвостКом-памятка.txt';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (copyStatus) copyStatus.textContent = say('Памятка подготовлена к скачиванию.', 'Checklist ready to download.');
  });
})();
