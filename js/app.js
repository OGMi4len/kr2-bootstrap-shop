/* Обычный JS без сборки. Bootstrap управляет navbar, modal и accordion. */
'use strict';
const services = {
  groom: { title: 'Стрижка и уход', price: 'от 2 400 ₽', minutes: 90, pet: 'Для собак', image: 'dog', description: 'Аккуратная стрижка, купание и сушка. Подбираем форму с учётом шерсти.', steps: 'Знакомство, купание, сушка, стрижка' },
  bath: { title: 'Купание и вычёс', price: 'от 1 600 ₽', minutes: 60, pet: 'Для собак и кошек', image: 'cat', description: 'Мягкое очищение, сушка и удаление выпавшей шерсти.', steps: 'Знакомство, купание, сушка, вычёсывание' },
  ears: { title: 'Гигиенический уход', price: 'от 700 ₽', minutes: 30, pet: 'Для собак и кошек', image: 'dog', description: 'Уход за ушами и когтями без лишнего стресса.', steps: 'Знакомство, осмотр, уход за ушами и когтями' }
};
const requested = new URLSearchParams(location.search).get('service');
const selected = Object.hasOwn(services, requested) ? requested : 'groom';
const text = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };

// Фильтр оставляет кошкам только подходящие услуги.
const filter = document.getElementById('petFilter');
if (filter) filter.addEventListener('change', () => {
  let count = 0;
  document.querySelectorAll('.service-item').forEach(card => {
    card.hidden = filter.value === 'cat' && card.dataset.pet === 'dog';
    if (!card.hidden) count++;
  });
  text('filterCount', `Найдено услуг: ${count}`);
});

const modal = document.getElementById('serviceModal');
if (modal) modal.addEventListener('show.bs.modal', event => {
  const id = event.relatedTarget?.dataset.service;
  if (!Object.hasOwn(services, id)) return;
  text('modalService', `${services[id].title} · ${services[id].price} · ${services[id].minutes} мин`);
  document.getElementById('modalOrder').href = `order.html?service=${id}`;
});

if (document.getElementById('serviceTitle')) {
  const item = services[selected];
  text('serviceTitle', item.title); text('serviceDescription', item.description);
  text('servicePrice', item.price); text('serviceBadge', item.pet);
  text('serviceDuration', `${item.minutes} минут`); text('serviceSteps', item.steps); text('servicePet', item.pet);
  const image = document.getElementById('serviceImage');
  image.src = `images/${item.image}.svg`;
  image.alt = `Учебная иллюстрация питомца для услуги «${item.title}»`;
  document.getElementById('serviceOrder').href = `order.html?service=${selected}`;
  document.title = `${item.title} — ХвостКом`;
}

const form = document.getElementById('bookingForm');
if (form) {
  const field = id => document.getElementById(id);
  const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const service = field('service'), date = field('date'), time = field('time'), pet = field('petType');
  field('submitBooking').disabled = false;
  if (Object.hasOwn(services, requested)) {
    service.value = requested;
    if (requested === 'groom') pet.value = 'dog';
  }
  const hideResult = () => field('bookingResult').classList.add('d-none');
  function sync() {
    const now = new Date(), limit = new Date(now);
    limit.setDate(limit.getDate()+90);
    date.min = localDate(now); date.max = localDate(limit);
    const item = services[service.value];
    pet.setCustomValidity(pet.value === 'cat' && service.value === 'groom' ? 'Стрижка доступна для собак.' : '');
    date.setCustomValidity(date.value && (date.value < date.min || date.value > date.max) ? 'Дата вне учебного расписания.' : '');
    const previous = time.value;
    time.replaceChildren(new Option('Выберите время', ''));
    if (item && date.value && !date.validationMessage) {
      // Начало раз в полчаса; процедура должна закончиться до 19:00.
      for (let minute=600; minute+item.minutes<=1140; minute+=30) {
        const value = `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
        if (date.value === localDate(now) && minute <= now.getHours()*60+now.getMinutes()) continue;
        time.add(new Option(value, value));
      }
    }
    if ([...time.options].some(option => option.value === previous)) time.value = previous;
    if (time.options.length === 1) time.options[0].textContent = 'Нет времени: выберите другую дату';
    text('estimate', item ? `Предварительно: ${item.price} · ${item.minutes} мин` : 'Выберите услугу для расчёта предварительной цены.');
  }
  function validateText() {
    ['name','petName'].forEach(id => field(id).setCustomValidity(field(id).value.trim() ? '' : 'Введите текст.'));
    const digits = field('phone').value.replace(/\D/g,'');
    field('phone').setCustomValidity(digits.length === 10 ? '' : 'Нужно 10 цифр без +7.');
  }
  [service,date,pet].forEach(node => node.addEventListener('change', sync));
  form.addEventListener('input', () => { hideResult(); validateText(); });
  form.addEventListener('change', hideResult);
  form.addEventListener('submit', event => {
    event.preventDefault();
    sync(); validateText(); form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.querySelector(':invalid')?.focus();
      return;
    }
    const item = services[service.value];
    const dateLabel = new Date(`${date.value}T12:00:00`).toLocaleDateString('ru-RU');
    // textContent безопасно выводит введённые данные как текст.
    text('bookingSummary', `${field('name').value.trim()}, питомец ${field('petName').value.trim()}: ${item.title}, ${dateLabel} в ${time.value}. Предварительно ${item.price}.`);
    field('bookingResult').classList.remove('d-none');
    field('bookingResult').focus();
  });
  form.addEventListener('reset', () => {
    form.classList.remove('was-validated'); hideResult();
    form.querySelectorAll('input,select').forEach(node => node.setCustomValidity(''));
    setTimeout(sync, 0); // reset сначала возвращает исходные значения полей.
  });
  sync();
}
