/* Локальные функции без сервера: тема, помощник и профиль на этом устройстве. */
(() => {
  'use strict';
  const en = document.documentElement.lang === 'en';
  const t = (ru, english) => en ? english : ru;
  const root = document.documentElement;
  const $ = id => document.getElementById(id);
  const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' + ({sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',chat:'<path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0Z"/><path d="M7 10h10M7 14h6"/>'}[name]) + '</svg>';
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  // В форме записи используем сохранённые данные только по месту и без отправки.
  const booking = $('bookingModal');
  booking?.addEventListener('show.bs.modal', () => {
    const saved = read('hv-local-profile-v1', {});
    if (saved && typeof saved === 'object') ['name','email','phone'].forEach(key => {
      const input = $(key); let value = saved[key];
      if (key === 'phone' && typeof value === 'string') { value = value.replace(/\D/g,''); if (value.length === 11 && /^[78]/.test(value)) value = value.slice(1); }
      if (input && !input.value && typeof value === 'string') input.value = value.slice(0,150);
    });
    const savedPets = read('hv-local-pets-v1', []);
    $('savedPetPicker')?.closest('.saved-pet-wrap').remove();
    if (Array.isArray(savedPets) && savedPets.some(p => p && typeof p.name === 'string' && ['dog','cat'].includes(p.type))) {
      const wrap = document.createElement('div'); wrap.className = 'saved-pet-wrap mb-4';
      const label = document.createElement('label'); label.className = 'form-label'; label.htmlFor = 'savedPetPicker'; label.textContent = t('Питомец из моего кабинета','Pet from my account');
      const select = document.createElement('select'); select.id = 'savedPetPicker'; select.className = 'form-select'; const empty = document.createElement('option'); empty.value = ''; empty.textContent = t('Выбрать сохранённого питомца','Choose a saved pet'); select.append(empty);
      savedPets.slice(0,10).forEach((p,index) => { if (!p || typeof p.name !== 'string' || !['dog','cat'].includes(p.type)) return; const option = document.createElement('option'); option.value = index; option.textContent = p.name.slice(0,60); select.append(option); });
      select.addEventListener('change', () => { if(select.value === '') return; const pet = savedPets[Number(select.value)]; $('petName').value = pet.name.slice(0,60); $('petType').value = pet.type; $('petType').dispatchEvent(new Event('change',{bubbles:true})); $('petName').dispatchEvent(new Event('input',{bubbles:true})); });
      wrap.append(label,select); $('bookingForm').prepend(wrap);
    }
  });
  const tools = document.createElement('div'); tools.className = 'member-tools';
  tools.innerHTML = `<button class="member-tool" id="themeToggle" type="button" aria-pressed="false">${icon('sun')}</button><a class="member-tool" href="account.html" aria-label="${t('Личный кабинет','My account')}" title="${t('Личный кабинет','My account')}">${icon('user')}</a>`;
  document.querySelector('#mainNav')?.append(tools);
  function themeLabel() {
    const dark = root.dataset.bsTheme === 'dark';
    $('themeToggle').setAttribute('aria-pressed', String(dark));
    $('themeToggle').setAttribute('aria-label', t(dark ? 'Включить светлую тему' : 'Включить тёмную тему', dark ? 'Switch to light theme' : 'Switch to dark theme'));
    $('themeToggle').title = $('themeToggle').getAttribute('aria-label');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14221c' : '#fbf7ef');
  }
  if ($('themeToggle')) {
    themeLabel();
    $('themeToggle').addEventListener('click', () => {
      root.dataset.bsTheme = root.dataset.bsTheme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('hv-theme', root.dataset.bsTheme); } catch (_) {}
      themeLabel();
    });
    addEventListener('storage', e => { if (e.key === 'hv-theme' && ['light','dark'].includes(e.newValue)) { root.dataset.bsTheme = e.newValue; themeLabel(); } });
  }

  // Небольшой справочный чат. Он не выдаёт автоматические ответы за оператора.
  const launcher = document.createElement('button'); launcher.type = 'button'; launcher.id = 'supportLauncher'; launcher.className = 'support-launch'; launcher.innerHTML = icon('chat');
  launcher.setAttribute('aria-label', t('Открыть поддержку','Open support')); launcher.setAttribute('aria-controls','supportWidget'); launcher.setAttribute('aria-expanded','false');
  const widget = document.createElement('section'); widget.id = 'supportWidget'; widget.className = 'support-widget'; widget.hidden = true; widget.setAttribute('aria-label', t('Помощь и контакты','Help and contacts'));
  widget.innerHTML = `<div class="support-head" id="supportHandle" tabindex="0" aria-label="${t('Переместить окно: потяните или используйте стрелки','Move window: drag or use arrow keys')}"><div><strong>${t('На связи — ХвостКом','Here to help — HvostKom')}</strong><small>${t('Автопомощник · перетащите за шапку','Quick answers · drag this header')}</small></div><button class="support-close" type="button" aria-label="${t('Свернуть поддержку','Minimise support')}">×</button></div><div class="support-log" id="supportLog" role="log" aria-live="polite" aria-relevant="additions" aria-label="${t('Сообщения','Messages')}"></div><div class="support-quick"><button type="button" data-answer="booking">${t('Как записаться?','How to book?')}</button><button type="button" data-answer="price">${t('Цены','Prices')}</button><button type="button" data-answer="hours">${t('Адрес и часы','Address & hours')}</button></div><form class="support-form"><label class="visually-hidden" for="supportInput">${t('Ваш вопрос','Your question')}</label><input class="form-control" id="supportInput" maxlength="500" required placeholder="${t('Задайте вопрос…','Ask a question…')}" autocomplete="off"><button type="submit" class="btn btn-primary" aria-label="${t('Получить ответ','Get an answer')}">→</button></form><div class="support-links"><a href="tel:+79252328798">${t('Позвонить','Call salon')}</a><a id="supportEmail" href="mailto:misha_stepanov_07@mail.ru">${t('Написать администратору','Email administrator')}</a></div>`;
  document.body.append(widget, launcher);
  let transcript = [];
  function message(text, user = false) {
    const item = document.createElement('div'); item.className = 'support-message' + (user ? ' is-user' : ''); item.textContent = text; $('supportLog').append(item);
    while ($('supportLog').children.length > 60) $('supportLog').firstElementChild.remove();
    transcript.push((user ? t('Вы: ','You: ') : t('Помощник: ','Assistant: ')) + text); transcript = transcript.slice(-16);
    $('supportLog').scrollTop = $('supportLog').scrollHeight;
    $('supportEmail').href = 'mailto:misha_stepanov_07@mail.ru?subject=' + encodeURIComponent(t('Вопрос с сайта ХвостКом','Question from HvostKom website')) + '&body=' + encodeURIComponent(transcript.join('\n\n'));
  }
  message(t('Привет! Помогу с услугами, записью и подготовкой к визиту. Здесь отвечаю автоматически. Для связи с администратором используйте телефон или почту ниже.','Hi! I can help with services, booking and preparing for your visit. These are automatic answers. Call or email below to contact the salon administrator.'));
  function closeChat() { widget.hidden = true; launcher.setAttribute('aria-expanded','false'); launcher.focus(); }
  launcher.addEventListener('click', () => { if (!widget.hidden) return closeChat(); widget.hidden = false; launcher.setAttribute('aria-expanded','true'); clamp(); $('supportInput').focus(); });
  widget.querySelector('.support-close').addEventListener('click', closeChat);
  widget.addEventListener('keydown', e => { if (e.key === 'Escape') closeChat(); });
  const answers = {
    booking:t('Выберите услугу на странице «Услуги» и нажмите «Записаться». В форме укажите питомца и желаемое время. Чтобы согласовать запись, свяжитесь с администратором: +7 (925) 232-87-98.','Choose a service and select Book a visit. Enter your pet and preferred time, then contact the administrator to confirm: +7 (925) 232-87-98.'),
    price:t('Уход — от 400 ₽, комплексная стрижка — от 2 400 ₽, купание — от 1 600 ₽. Актуальные варианты и длительность смотрите в разделе «Услуги». Итоговую стоимость уточнит администратор.','Care starts at ₽400, full grooming at ₽2,400 and bathing at ₽1,600. See Services for details and duration. The administrator will confirm the final price.'),
    hours:t('Москва, ул. Боженко, д. 14, корп. 1, кв. 22. Работаем понедельник–суббота, 10:00–18:00. Воскресенье — выходной. Карта есть на странице «Контакты».','Moscow, Bozhenko St, 14, building 1, apartment 22. Monday–Saturday, 10:00–18:00. Closed Sunday. See Contacts for the map.'),
    prepare:t('Перед визитом выгуляйте питомца, возьмите поводок или переноску и расскажите мастеру об особенностях здоровья и поведения. Подробнее — на странице «Первый визит».','Walk your pet beforehand, bring a leash or carrier and tell the groomer about health or behavioural needs. Read the first-visit guide for more details.'),
    cat:t('Для кошек доступны купание, вычёсывание, уход за ушами и когтями. В каталоге выберите фильтр «Кошка», чтобы увидеть подходящие услуги.','Cats can have bathing, deshedding, ear and nail care. Select the Cat filter in Services to see suitable options.'),
    fallback:t('Этот вопрос лучше уточнить у администратора. Позвоните или нажмите «Написать администратору» — откроется письмо с текстом беседы. Автоматически сообщения салону не отправляются.','Please ask the administrator about this. Call or select Email administrator to open an email containing this conversation. Messages are not automatically sent to the salon.')
  };
  function answer(question, key) {
    message(question, true);
    if (!key) { const q = question.toLowerCase(); key = /цен|стоим|руб|price|cost/.test(q) ? 'price' : /запис|брон|book/.test(q) ? 'booking' : /адрес|работ|час|address|hour|where/.test(q) ? 'hours' : /кош|кот|cat/.test(q) ? 'cat' : /подготов|перв|prepare|first/.test(q) ? 'prepare' : 'fallback'; }
    message(answers[key]);
  }
  widget.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => answer(b.textContent, b.dataset.answer)));
  widget.querySelector('form').addEventListener('submit', e => { e.preventDefault(); const q = $('supportInput').value.trim(); if (!q) return; answer(q.slice(0,500)); $('supportInput').value = ''; });
  let drag;
  function place(x,y) { const w = widget.offsetWidth, h = widget.offsetHeight; widget.style.left = Math.max(8,Math.min(x,innerWidth-w-8)) + 'px'; widget.style.top = Math.max(8,Math.min(y,innerHeight-h-8)) + 'px'; widget.style.right = 'auto'; widget.style.bottom = 'auto'; }
  function clamp() { if (!widget.hidden) { const r = widget.getBoundingClientRect(); place(r.left,r.top); } }
  const handle = $('supportHandle');
  handle.addEventListener('pointerdown', e => { if (e.target.closest('button') || e.button !== 0) return; const r=widget.getBoundingClientRect(); drag={x:e.clientX-r.left,y:e.clientY-r.top}; handle.setPointerCapture(e.pointerId); });
  handle.addEventListener('pointermove', e => { if (drag) place(e.clientX-drag.x,e.clientY-drag.y); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(event => handle.addEventListener(event, () => { drag=null; }));
  handle.addEventListener('keydown', e => { const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key]; if (!delta || e.target !== handle) return; e.preventDefault(); const r=widget.getBoundingClientRect(); place(r.left+delta[0],r.top+delta[1]); });
  addEventListener('resize',clamp);

  // Профиль на устройстве: без паролей и имитации серверной авторизации.
  if (!$('profileForm')) return;
  const profileKey = 'hv-local-profile-v1', petsKey = 'hv-local-pets-v1';
  let profile = read(profileKey, {}); if (!profile || typeof profile !== 'object' || Array.isArray(profile)) profile = {};
  let pets = read(petsKey, []); if (!Array.isArray(pets)) pets = []; pets = pets.filter(p=>p && typeof p.name==='string' && ['dog','cat'].includes(p.type)).slice(0,10);
  ['name','email','phone'].forEach(key => { $('profile'+key).value = typeof profile[key] === 'string' ? profile[key].slice(0,150) : ''; });
  function greeting() { const name = $('profilename').value.trim(); $('memberGreeting').textContent = name ? t('Привет, ','Hi, ') + name + '!' : t('Ваш уголок заботы','Your care corner'); $('memberInitial').textContent = name ? Array.from(name)[0].toUpperCase() : '♡'; }
  greeting();
  $('profileForm').addEventListener('submit', e => { e.preventDefault(); if (!$('profileForm').reportValidity()) return; profile = Object.fromEntries(['name','email','phone'].map(k=>[k,$('profile'+k).value.trim()])); const ok=write(profileKey,profile); greeting(); $('profileStatus').textContent = ok ? t('Профиль сохранён на этом устройстве.','Profile saved on this device.') : t('Браузер не разрешил сохранение. Данные доступны до закрытия страницы.','Storage is unavailable. Data will last until this page closes.'); });
  function renderPets() {
    $('petList').replaceChildren(); $('petCount').textContent = String(pets.length);
    if (!pets.length) { const p=document.createElement('p'); p.className='member-note'; p.textContent=t('Добавьте питомца — его карточка всегда будет под рукой.','Add your pet to keep their details close at hand.'); $('petList').append(p); }
    pets.forEach((pet,index) => { const row=document.createElement('div'); row.className='member-pet'; const info=document.createElement('div'), name=document.createElement('strong'), detail=document.createElement('small'); name.textContent=pet.name; detail.textContent=(pet.type==='cat'?t('Кошка','Cat'):t('Собака','Dog'))+(pet.breed ? ' · '+pet.breed : ''); info.append(name,detail); const button=document.createElement('button'); button.type='button'; button.className='btn btn-outline-primary py-2 px-3'; button.textContent=t('Удалить','Remove'); button.setAttribute('aria-label',t('Удалить питомца ','Remove pet ')+pet.name); button.addEventListener('click',()=> { pets.splice(index,1); const ok=write(petsKey,pets); renderPets(); $('petStatus').textContent=ok?t('Карточка удалена.','Pet removed.'):t('Изменения не удалось сохранить.','Changes could not be saved.'); $('memberPetName').focus(); }); row.append(info,button); $('petList').append(row); });
  }
  renderPets();
  $('petForm').addEventListener('submit', e=> { e.preventDefault(); if (!$('petForm').reportValidity()) return; const name=$('memberPetName').value.trim(); if (!name) return; if(pets.length>=10) { $('petStatus').textContent=t('Можно сохранить до 10 питомцев.','You can save up to 10 pets.'); return; } pets.push({name,type:$('memberPetType').value,breed:$('memberPetBreed').value.trim()}); const ok=write(petsKey,pets); renderPets(); $('petForm').reset(); $('petStatus').textContent=ok?t('Питомец добавлен.','Pet added.'):t('Браузер не разрешил сохранение карточки.','Your browser did not allow saving this pet.'); });
  $('clearLocal').addEventListener('click',()=> { if (!confirm(t('Удалить профиль и карточки питомцев с этого устройства?','Delete your profile and pets from this device?'))) return; try { localStorage.removeItem(profileKey); localStorage.removeItem(petsKey); } catch (_) { $('profileStatus').textContent=t('Не удалось очистить хранилище браузера.','Unable to clear browser storage.'); return; } profile={}; pets=[]; $('profileForm').reset(); ['name','email','phone'].forEach(k=>$('profile'+k).value=''); renderPets(); greeting(); $('profileStatus').textContent=t('Локальные данные удалены.','Local data deleted.'); });
})();
