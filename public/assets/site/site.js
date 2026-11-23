(() => {
  const menu = document.querySelector('#site-menu');
  if (!menu) return;
  const summary = menu.querySelector('summary');
  const header = document.querySelector('.wh-header');
  let hiddenFraction = 0;
  function positionHeader(fraction) {
    hiddenFraction = Math.max(0, Math.min(1, fraction));
    header?.style.setProperty('--wh-header-offset', `${-100 * hiddenFraction}%`);
  }
  function revealHeader() {
    positionHeader(0);
  }
  if (header) {
    let previousY = Math.max(0, window.scrollY);
    let direction = 0;
    let distance = 0;
    window.addEventListener('scroll', () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - previousY;
      previousY = y;
      const keyboardFocus = header.contains(document.activeElement) &&
        document.activeElement?.matches(':focus-visible');
      if (y <= 20 || menu.open || keyboardFocus) {
        revealHeader();
        distance = 0;
        return;
      }
      if (!delta) return;
      const nextDirection = Math.sign(delta);
      const previousDistance = nextDirection === direction ? distance : 0;
      distance = previousDistance + Math.abs(delta);
      direction = nextDirection;
      // Consume only movement beyond the reversal dead zone, then follow the scroll.
      const threshold = direction < 0 ? 8 : 12;
      const travel = Math.max(0, distance - threshold) - Math.max(0, previousDistance - threshold);
      const height = Math.max(1, header.getBoundingClientRect().height);
      if (direction < 0 || y > height) {
        // Reveal over 1.6 header heights of upward scrolling instead of snapping open.
        positionHeader(hiddenFraction + direction * travel / (height * (direction < 0 ? 1.6 : 1)));
      }
    }, { passive: true });
    header.addEventListener('focusin', revealHeader);
  }
  if (header && 'ResizeObserver' in window) {
    new window.ResizeObserver(() => {
      document.documentElement.style.setProperty('--wh-header-height', `${header.getBoundingClientRect().height}px`);
    }).observe(header);
  }
  function close(restoreFocus = false) {
    menu.open = false;
    if (restoreFocus) summary.focus();
  }
  menu.addEventListener('toggle', () => {
    if (menu.open) revealHeader();
    summary.setAttribute('aria-label', menu.open ? 'Close site menu' : 'Open site menu');
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
  document.addEventListener('click', event => { if (!menu.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (menu.open && !menu.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { event.preventDefault(); close(true); }
  });
  const radios = menu.querySelectorAll('input[name="site-theme"]');
  function syncTheme() {
    radios.forEach(radio => { radio.checked = radio.value === document.documentElement.dataset.themePreference; });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = document.documentElement.dataset.theme === 'dark' ? '#161c19' : '#ffffff';
  }
  radios.forEach(radio => radio.addEventListener('change', () => window.setSiteTheme(radio.value)));
  window.addEventListener('site-theme-change', syncTheme);
  syncTheme();
  const motion = menu.querySelector('.wh-motion-toggle');
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { const saved = localStorage.getItem('augment-motion'); if (saved) paused = saved === 'paused'; } catch {}
  function applyMotion() {
    document.documentElement.classList.toggle('wh-motion-paused', paused);
    document.documentElement.classList.toggle('sweep-paused', paused);
    motion.textContent = paused ? 'Play animations' : 'Pause animations';
    motion.setAttribute('aria-pressed', String(paused));
  }
  motion.addEventListener('click', () => {
    paused = !paused;
    applyMotion();
    try { localStorage.setItem('augment-motion', paused ? 'paused' : 'playing'); } catch {}
  });
  applyMotion();
  // Existing experiment controls retain their listeners when moved into the shared menu.
  document.querySelectorAll('.motion-options, .preview-note a').forEach(control => {
    menu.querySelector('.wh-menu-panel').append(control);
  });
  document.querySelectorAll('#motion-toggle, #reveal-toggle').forEach(control => { control.hidden = true; });
})();
