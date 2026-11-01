const button = document.querySelector('#refresh');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const number = value => typeof value === 'number' ? value.toLocaleString() : '—';
async function loadAnalytics() {
  button.disabled = true;
  results.hidden = true;
  status.textContent = 'Loading analytics…';
  try {
    const response = await fetch('/api/analytics', {
      cache: 'no-store', credentials: 'omit',
    });
    if (response.status === 404) throw new Error('Analytics API is not deployed. Check that Vercel deploys the repository’s api/ folder.');
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Analytics API unavailable. Check the Vercel deployment.');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load analytics.');
    document.querySelector('#visitors').textContent = number(data.totals.visitors);
    document.querySelector('#pageviews').textContent = number(data.totals.pageviews);
    const pages = document.querySelector('#pages');
    pages.replaceChildren();
    for (const page of data.pages) {
      const row = document.createElement('tr');
      for (const value of [page.requestPath || 'Others', number(page.pageviews), number(page.visitors)]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      pages.append(row);
    }
    if (!data.pages.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = 'No recorded page views in this period yet.';
      row.append(cell);
      pages.append(row);
    }
    document.querySelector('#period').textContent = `${new Date(data.since).toLocaleString()} – ${new Date(data.until).toLocaleString()}`;
    results.hidden = false;
    status.textContent = 'Updated just now.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}
button.addEventListener('click', loadAnalytics);
loadAnalytics();
