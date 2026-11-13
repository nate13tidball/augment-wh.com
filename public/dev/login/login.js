const form = document.querySelector('#login');
const admin = document.querySelector('#admin');
const status = document.querySelector('#status');
const pin = document.querySelector('#pin');
let busy = false;
const next = new URLSearchParams(location.search).get('next');
const destination = next && (next === '/dev' || next.startsWith('/dev/'))
  && !/[\\\r\n]/.test(next) ? next : '/dev/';
document.querySelector('#admin a').href = destination;

async function session(data) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try {
    const response = await fetch('/api/admin', {
      method: data ? 'POST' : 'GET',
      credentials: 'same-origin', cache: 'no-store',
      ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
    if (result.admin && data?.pin) {
      location.assign(destination);
      return;
    }
    form.hidden = result.admin;
    admin.hidden = !result.admin;
    status.textContent = result.admin ? 'Signed in as admin.' : 'Enter your PIN to sign in.';
  } catch (error) {
    status.textContent = error instanceof SyntaxError ? 'Login service unavailable. Please try again later.' : error.message;
    if (admin.hidden) form.hidden = false;
  } finally {
    pin.value = '';
    busy = false;
    document.querySelectorAll('button').forEach(button => { button.disabled = false; });
  }
}
form.addEventListener('submit', event => { event.preventDefault(); session({ pin: pin.value }); });
document.querySelector('#logout').addEventListener('click', () => session({ action: 'logout' }));
// Recheck when switching tabs so logout in another tab is reflected here.
window.addEventListener('pageshow', () => session());
document.addEventListener('visibilitychange', () => { if (!document.hidden) session(); });
