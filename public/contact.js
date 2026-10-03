const form = document.querySelector('#inquiry-form');
const status = document.querySelector('#form-status');
if (location.hostname.endsWith('.github.io')) {
  form.querySelector('button').disabled = true;
  status.textContent = 'Email inquiries are coming soon. Please contact Nathan using the LinkedIn link.';
  form.prepend(status);
  form.querySelectorAll('input, select, textarea').forEach(field => { field.disabled = true; });
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (location.hostname.endsWith('.github.io')) return;
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Sending your inquiry...';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your inquiry could not be sent. Please try again later.');
    status.textContent = 'Thank you. Your inquiry has been sent. We\'ll reply by email.';
    form.reset();
  } catch (error) {
    status.textContent = error.name === 'TimeoutError'
      ? 'Delivery could not be confirmed. Please contact us on LinkedIn before retrying.'
      : (error instanceof TypeError || error instanceof SyntaxError)
        ? 'The inquiry service is unavailable. Your details are still here. Please try again later or contact us on LinkedIn.'
        : error.message;
  } finally {
    button.disabled = false;
  }
});
