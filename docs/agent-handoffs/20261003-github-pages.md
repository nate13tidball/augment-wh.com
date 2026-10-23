# GitHub Pages and inquiry form

2026-10-03, Codex. Requested another review and GitHub hosting.

Created the website repository and a Pages Actions workflow publishing only
public/. Added the inquiry form and Python SMTP handler from the previous turn.
Server tests cover validation, SMTP TLS/headers, success, failure, origin checks,
honeypot, and rate limit. Browser tests simulate success and failure without
sending email. Fixed project-site 404 navigation and standalone error styling.

Pages cannot run Python. No recipient address or SMTP credentials have been
provided. Email is not operational; do not claim otherwise. Next: confirm a
business recipient, configure a real API/mail relay, integrate its URL/CORS if
using Pages, and test delivery. Custom-domain DNS and workstation hosting remain
owned by the hosting task.
