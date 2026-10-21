(() => {
  const root = document.querySelector('#presentation');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const path = location.pathname;
  const marker = path.toLowerCase().indexOf('/presentations/');
  const base = marker < 0 ? '' : path.slice(0, marker);
  const parts = path.replace(/\/+$/, '').split('/');
  const leaf = parts.at(-1) === 'index.html' ? parts.at(-2) : parts.at(-1);
  const slug = decodeURIComponent(leaf || '').toLowerCase();
  fetch(`${base}/presentations/companies.json`, {cache: 'no-store'}).then(r => {
    if (!r.ok) throw new Error('Company index unavailable');
    return r.json();
  }).then(companies => {
    const company = companies.find(item => item.slug === slug);
    if (!company) {
      root.innerHTML = `<section class="error"><p class="eyebrow">Augment-wh presentation demo</p><h1>Company not found</h1><p>This demo URL is not in the company index.</p><a href="${escapeHTML(base)}/">Return to Augment-wh</a></section>`;
      document.title = 'Company not found | Augment-wh';
      return;
    }
    // Set company-specific custom HTML here when a tailored presentation is ready.
    if (company.presentation) {
      const custom = `${base}/presentations/${encodeURIComponent(company.slug)}/${encodeURIComponent(company.presentation)}`;
      const target = new URL(custom, location.origin);
      if (target.origin === location.origin) { location.replace(target.href); return; }
    }
    const date = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', day: 'numeric'}).format(new Date());
    const initials = company.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
    root.innerHTML = `
      <header class="top"><a class="augment" href="${escapeHTML(base)}/">Augment-wh</a><span class="demo">Demo presentation</span></header>
      <div class="identity"><span class="logo"><img data-company-logo src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(company.domain)}&sz=128" alt="${escapeHTML(company.name)} logo"></span><div><p>${escapeHTML(company.type)}</p><h1>${escapeHTML(company.name)}</h1></div></div>
      <section class="hero"><p class="eyebrow">Capacity and augmentation planning</p><h2>Make the next battery decision with the whole asset in view.</h2><p>A working demo of how Augment-wh connects battery performance, site constraints, and project economics to support long-term storage decisions.</p></section>
      <h2 class="section-title">A clearer path from operating data to an investment decision.</h2>
      <section class="grid" aria-label="Planning approach">
        <article class="card"><span>01 / Understand</span><b>Start with the asset</b><p>Bring operating history, capacity tests, configuration, and warranty context into one baseline.</p></article>
        <article class="card"><span>02 / Compare</span><b>Test practical options</b><p>Explore augmentation timing against site limits, electrical constraints, and commercial assumptions.</p></article>
        <article class="card"><span>03 / Decide</span><b>Make tradeoffs visible</b><p>Give engineering and finance a shared view of capacity outlook, uncertainty, and next steps.</p></article>
      </section>
      <p class="note">Illustrative demo only. This is a shared sample presentation rendered with company identity and date; it does not represent a completed assessment, customer relationship, or meeting.</p>
      <footer class="footer"><span>Prepared ${date} · ${escapeHTML(company.name)}</span><a href="${escapeHTML(base)}/#contact">Continue the conversation ↗</a></footer>`;
    root.querySelector('[data-company-logo]').addEventListener('error', event => {
      const mark = document.createElement('span');
      mark.className = 'logo';
      mark.setAttribute('aria-label', `${company.name} monogram`);
      mark.textContent = initials;
      event.currentTarget.replaceWith(mark);
    }, {once: true});
    document.title = `${company.name} | Augment-wh presentation demo`;
  }).catch(() => {
    root.innerHTML = '<section class="error"><h1>Presentation unavailable</h1><p>Please try again later.</p></section>';
  });
})();
