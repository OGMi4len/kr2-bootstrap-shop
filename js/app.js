/* Основной сценарий: каталог → услуга → окно записи. Без сборки и сервера. */
(() => {
  'use strict';
  const services = window.HV_SERVICES;
  const english = document.documentElement.lang === 'en';
  const say = (ru, en) => english ? en : ru;
  const locale = english ? 'en-GB' : 'ru-RU';
  const byId = id => document.getElementById(id);
  const setText = (id, value) => { if (byId(id)) byId(id).textContent = value; };
  const formatPrice = item => say('от ', 'from ') + item.price.toLocaleString(locale) + ' ₽';
  const petLabel = item => item.pets.length === 2 ? say('Собаки и кошки', 'Dogs & cats') : say('Для собак', 'Dogs only');
  const parameters = new URLSearchParams(location.search);
  const requested = parameters.get('service');
  const selected = Object.hasOwn(services, requested) ? requested : 'groom';
  const asset = english ? '../' : '';

  // Переключение языка сохраняет выбранную услугу и якорь текущего раздела.
  const languageLink = byId('languageSwitch');
  if (languageLink) languageLink.href += location.search + location.hash;

  const filter = byId('petFilter');
  if (filter) {
    function filterCards() {
      let count = 0;
      document.querySelectorAll('.service-item').forEach(card => {
        const item = services[card.dataset.serviceKey];
        card.hidden = filter.value !== 'all' && !item.pets.includes(filter.value);
        if (!card.hidden) count++;
      });
      setText('filterCount', say('Найдено услуг: ', 'Services found: ') + count);
    }
    if (['dog', 'cat'].includes(parameters.get('pet'))) filter.value = parameters.get('pet');
    filter.addEventListener('change', filterCards);
    filterCards();
  }

  if (byId('serviceTitle')) {
    const item = services[selected];
    setText('serviceTitle', item.title);
    setText('serviceDescription', item.description);
    setText('servicePrice', formatPrice(item));
    setText('serviceBadge', petLabel(item));
    setText('serviceDuration', item.minutes + say(' минут', ' minutes'));
    setText('serviceSteps', item.steps);
    setText('servicePet', petLabel(item));
    byId('serviceImage').src = `${asset}images/${item.image}.svg`;
    byId('serviceImage').alt = say('Иллюстрация для услуги: ', 'Illustration for: ') + item.title;
    byId('serviceOrder').dataset.service = selected;
    document.title = `${item.title} — ${say('ХвостКом', 'HvostKom')}`;
  }

  const bookingModal = byId('bookingModal');
  const form = byId('bookingForm');
  if (!form) return;
  const service = byId('service');
  const date = byId('date');
  const time = byId('time');
  const pet = byId('petType');
  const localDate = day => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const hideResult = () => byId('bookingResult').classList.add('d-none');
  byId('submitBooking').disabled = false;
  if (Object.hasOwn(services, requested)) {
    service.value = requested;
    if (!services[requested].pets.includes('cat')) pet.value = 'dog';
  }
  const requestedPet = parameters.get('pet');
  if (['dog', 'cat'].includes(requestedPet) && (!services[service.value] || services[service.value].pets.includes(requestedPet))) {
    pet.value = requestedPet;
  }

  function syncBooking() {
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 90);
    date.min = localDate(now);
    date.max = localDate(limit);
    const item = services[service.value];
    pet.setCustomValidity(item && pet.value && !item.pets.includes(pet.value)
      ? say('Выберите услугу для этого питомца.', 'Choose a service suitable for this pet.') : '');
    const outsideRange = date.value && (date.value < date.min || date.value > date.max);
    const sunday = date.value && new Date(`${date.value}T12:00:00`).getDay() === 0;
    date.setCustomValidity(outsideRange
      ? say('Дата вне расписания.', 'The date is outside the schedule.')
      : sunday ? say('По воскресеньям салон закрыт.', 'The salon is closed on Sundays.') : '');
    const previousTime = time.value;
    time.replaceChildren(new Option(say('Выберите время', 'Choose a time'), ''));
    if (item && date.value && date.validity.valid) {
      // Начала раз в полчаса, окончание не позднее 18:00.
      for (let minute = 600; minute + item.minutes <= 1080; minute += 30) {
        if (date.value === localDate(now) && minute <= now.getHours() * 60 + now.getMinutes()) continue;
        const label = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        time.add(new Option(label, label));
      }
    }
    if ([...time.options].some(option => option.value === previousTime)) time.value = previousTime;
    if (!item || !date.value) time.options[0].textContent = say('Сначала выберите услугу и дату', 'Choose a service and date first');
    else if (time.options.length === 1) time.options[0].textContent = say('Нет времени: выберите другую дату', 'No times: choose another date');
    setText('estimate', item
      ? `${say('Предварительно: ', 'Estimate: ')}${formatPrice(item)} · ${item.minutes} ${say('мин', 'min')}`
      : say('Выберите услугу для расчёта цены.', 'Choose a service for an estimate.'));
  }

  function validateText() {
    ['name', 'petName'].forEach(id => byId(id).setCustomValidity(byId(id).value.trim() ? '' : say('Введите текст.', 'Enter a name.')));
    const digits = byId('phone').value.replace(/\D/g, '');
    const allowedPhone = /^[0-9 ()-]+$/.test(byId('phone').value);
    byId('phone').setCustomValidity(digits.length === 10 && allowedPhone ? '' : say('Нужно 10 цифр без +7, без букв.', 'Enter 10 digits without +7 or letters.'));
  }

  [service, date, pet].forEach(field => field.addEventListener('change', syncBooking));
  form.addEventListener('input', () => { hideResult(); validateText(); });
  form.addEventListener('change', hideResult);
  form.addEventListener('submit', event => {
    event.preventDefault();
    hideResult();
    syncBooking();
    validateText();
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.querySelector(':invalid')?.focus();
      return;
    }
    const item = services[service.value];
    const dateLabel = new Date(`${date.value}T12:00:00`).toLocaleDateString(locale);
    // Пользовательский ввод выводится текстом, а не HTML.
    setText('bookingSummary', `${byId('name').value.trim()}, ${byId('petName').value.trim()}: ${item.title}, ${dateLabel}, ${time.value}. ${formatPrice(item)}.`);
    byId('bookingResult').classList.remove('d-none');
    byId('bookingResult').focus();
  });
  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    hideResult();
    form.querySelectorAll('input, select').forEach(field => field.setCustomValidity(''));
    setTimeout(syncBooking, 0);
  });
  if (bookingModal) {
    bookingModal.addEventListener('show.bs.modal', event => {
      const trigger = event.relatedTarget;
      const chosen = trigger?.dataset.service;
      const chosenPet = trigger?.dataset.pet;
      if (Object.hasOwn(services, chosen)) service.value = chosen;
      if (['dog', 'cat'].includes(chosenPet)) pet.value = chosenPet;
      else if (services[service.value] && !services[service.value].pets.includes(pet.value) && pet.value) pet.value = '';
      if (services[service.value]?.pets.length === 1) pet.value = 'dog';
      form.classList.remove('was-validated');
      hideResult();
      syncBooking();
    });
    bookingModal.addEventListener('shown.bs.modal', () => byId('name').focus());
    if (parameters.get('booking') === '1' || location.hash === '#bookingModal') {
      bootstrap.Modal.getOrCreateInstance(bookingModal).show();
    }
  }
  syncBooking();
})();
