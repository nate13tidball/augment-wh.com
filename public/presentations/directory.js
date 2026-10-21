(() => {
  const list = document.querySelector('#company-list');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const path = location.pathname;
  const marker = path.toLowerCase().indexOf('/presentations/');
  const base = marker < 0 ? '' : path.slice(0, marker);
  fetch(`${base}/presentations/companies.json`, {cache: 'no-store'}).then(response => {
    if (!response.ok) throw new Error('Company list unavailable');
    return response.json();
  }).then(companies => {
    list.innerHTML = companies.map(company => `<a class="company-link" href="${escapeHTML(base)}/presentations/${encodeURIComponent(company.slug)}/"><span class="company-mark"><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(company.domain)}&sz=64" alt=""></span><span>${escapeHTML(company.name)}</span><span aria-hidden="true">↗</span><small>${escapeHTML(company.type)}</small></a>`).join('');
  }).catch(() => {
    list.innerHTML = '<p class="error">Company list is unavailable right now.</p>';
  });
})();
