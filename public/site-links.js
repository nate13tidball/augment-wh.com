// Resolve beside this script, including when deployed under a GitHub Pages prefix.
const configUrl = new URL('site-config.json', document.currentScript.src);
fetch(configUrl, { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error('Contact configuration unavailable.');
    return response.json();
  })
  .then(config => {
    const emailQuery = config.emailCc ? `?${new URLSearchParams({ cc: config.emailCc })}` : '';
    const meetingUrl = new URL(config.meetingUrl, configUrl).href;
    document.querySelectorAll('[data-contact-link]').forEach(link => {
      const key = link.dataset.contactLink;
      link.href = key === 'email' ? `mailto:${config.email}${emailQuery}`
        : key === 'meetingUrl' ? meetingUrl : config[key];
    });
    if (document.body.hasAttribute('data-booking-redirect')) {
      location.replace(config.bookingUrl);
    }
  })
  .catch(() => {
    document.querySelector('#contact-link-status').textContent =
      'Contact links could not load. Please refresh the page to try again.';
  });
