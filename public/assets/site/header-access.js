// Navigation visibility follows the server session; protected routes enforce access separately.
(() => {
  const items = document.querySelectorAll('.wh-header [data-admin-only]');
  if (!items.length) return;
  let revision = 0;
  async function refresh() {
    const current = ++revision;
    items.forEach(item => { item.hidden = true; });
    try {
      const response = await fetch('/api/admin', { credentials: 'same-origin', cache: 'no-store' });
      const session = response.ok ? await response.json() : null;
      if (current === revision) items.forEach(item => { item.hidden = session?.admin !== true; });
    } catch {
      // Failed or unavailable session checks leave admin links hidden.
    }
  }
  refresh();
  window.addEventListener('pageshow', refresh);
  window.addEventListener('site-admin-change', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  document.querySelector('#site-menu')?.addEventListener('toggle', event => {
    if (event.currentTarget.open) refresh();
  });
})();
