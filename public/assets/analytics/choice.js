/* Copy this file and choice.css to another static Vercel site. Configure hosts on the script tag. */
(() => {
  const tag = document.currentScript;
  const hosts = (tag?.dataset.analyticsHosts || '').split(',').map(host => host.trim());
  const excludedPrefixes = (tag?.dataset.analyticsExcludePrefixes || '').split(',').map(path => path.trim()).filter(Boolean);
  const privacyUrl = tag?.dataset.privacyUrl || '/privacy/';
  const key = 'site-analytics-choice-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  let loaded = false;

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && saved.expires > Date.now() && ['allow', 'decline'].includes(saved.choice)) return saved.choice;
    } catch {}
    return null;
  }

  function loadAnalytics() {
    if (loaded || !hosts.includes(location.hostname) ||
        excludedPrefixes.some(path => location.pathname === path || location.pathname.startsWith(path + '/'))) return;
    loaded = true;
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    const script = document.createElement('script');
    script.src = '/_vercel/insights/script.js';
    script.defer = true;
    document.head.append(script);
  }

  let choice = readChoice();
  if (choice === 'allow') loadAnalytics();

  function element(tagName, text, className) {
    const node = document.createElement(tagName);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function init() {
    const settings = document.querySelectorAll('[data-analytics-settings]');
    const panel = element('section', '', 'analytics-choice');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Analytics choice');
    const copy = element('p', 'Allow anonymous site analytics? Vercel counts visits, pages, referrers, countries, and device types.');
    const link = element('a', 'Privacy details', 'analytics-choice-link');
    link.href = privacyUrl;
    const actions = element('div', '', 'analytics-choice-actions');
    const allow = element('button', 'Allow analytics');
    const decline = element('button', 'Decline analytics');
    allow.type = decline.type = 'button';
    actions.append(allow, decline);
    panel.append(copy, link, actions);
    document.body.append(panel);

    function render() {
      panel.hidden = choice !== null;
      settings.forEach(button => { button.textContent = `Analytics: ${choice === 'allow' ? 'On' : choice === 'decline' ? 'Off' : 'Choose'}`; });
    }
    function save(value) {
      try { localStorage.setItem(key, JSON.stringify({ choice: value, expires: Date.now() + lifetime })); } catch {}
      choice = value;
      render();
      if (value === 'allow') loadAnalytics();
      else if (loaded) location.reload(); // Unload the provider before another page view.
    }
    allow.addEventListener('click', () => save('allow'));
    decline.addEventListener('click', () => save('decline'));
    settings.forEach(button => button.addEventListener('click', () => {
      choice = null;
      render();
      allow.focus();
    }));
    window.addEventListener('storage', event => {
      if (event.key !== key) return;
      choice = readChoice();
      render();
      if (choice === 'allow') loadAnalytics();
      else if (loaded) location.reload();
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
