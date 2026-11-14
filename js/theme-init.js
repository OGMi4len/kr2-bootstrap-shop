/* Тема задаётся до отрисовки страницы. Ошибка хранилища не мешает сайту. */
(() => {
  let theme;
  try { theme = localStorage.getItem('hv-theme'); } catch (_) {}
  if (!['light', 'dark'].includes(theme)) theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.bsTheme = theme;
})();
