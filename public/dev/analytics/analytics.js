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
      cache: 'no-store', credentials: 'same-origin',
    });
    if (response.status === 401) {
      location.replace('/dev/login/?next=/dev/analytics');
      return;
    }
    if (response.status === 404) throw new Error('Analytics API is not deployed. Check that Vercel deploys the repository’s api/ folder.');
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Analytics API unavailable. Check the Vercel deployment.');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load analytics.');
    document.querySelector('#visitors').textContent = number(data.totals.visitors);
    document.querySelector('#pageviews').textContent = number(data.totals.pageviews);
    for (const [id, field] of [
      ['pages', 'requestPath'], ['referrers', 'referrerHostname'],
      ['countries', 'country'], ['devices', 'deviceType'],
    ]) {
      const body = document.querySelector(`#${id}`);
      body.replaceChildren();
      for (const item of data[id]) {
        const row = document.createElement('tr');
        for (const value of [item[field] || (id === 'referrers' ? 'Direct or unavailable' : 'Unknown'), number(item.pageviews), number(item.visitors)]) {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        }
        body.append(row);
      }
      if (!data[id].length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = 'No recorded data in this period.';
        row.append(cell);
        body.append(row);
      }
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
