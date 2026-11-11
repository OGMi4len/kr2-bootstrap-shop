/* Старые адреса записи ведут в общее окно; параметры услуги сохраняются. */
(() => {
  'use strict';
  const destination = new URL('index.html', location.href);
  const parameters = new URLSearchParams(location.search);
  parameters.set('booking', '1');
  destination.search = parameters.toString();
  destination.hash = 'bookingModal';
  location.replace(destination.href);
})();
