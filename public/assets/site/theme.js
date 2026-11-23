// Runs in the head so the saved appearance is applied before page content paints.
(() => {
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'light';
  try { preference = localStorage.getItem('augment-theme') || 'light'; } catch {}
  function apply(value) {
    preference = ['light', 'dark', 'system'].includes(value) ? value : 'light';
    root.dataset.themePreference = preference;
    root.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.style.colorScheme = root.dataset.theme;
    window.dispatchEvent(new CustomEvent('site-theme-change', { detail: { theme: root.dataset.theme, preference } }));
  }
  window.setSiteTheme = value => {
    apply(value);
    try { localStorage.setItem('augment-theme', preference); } catch {}
  };
  system.addEventListener('change', () => { if (preference === 'system') apply('system'); });
  window.addEventListener('storage', event => { if (event.key === 'augment-theme' || event.key === null) apply(event.newValue || 'light'); });
  apply(preference);
})();
