# Augment Wh

Business website for augment-wh.com. HTML/CSS with a small inquiry form script
and Python standard-library SMTP backend. No build step or third-party packages.

Open `public/index.html` directly in a browser for a local preview.
Form delivery requires the server described below; file previews do not send mail.

## Inquiry and quote form

The form collects name, reply email, optional company, inquiry type, and project
details. `POST /api/inquiry` validates inputs and sends a plain-text email to the
fixed `INQUIRY_TO` address; Reply-To is the visitor's validated address. It does not
send visitor autoresponders or store inquiries in a database. Failed submissions
keep form details visible. Success means the SMTP relay accepted the email, not
that final inbox delivery has been verified.

Run `python3 server.py` to serve the site and API on loopback port 8091. Set the
environment variables listed in `.env.example` in the service manager, including
the confirmed recipient, an authenticated sender, and an SMTP provider's credentials.
The script does not automatically read .env files. Keep secrets outside public/.
SMTP uses verified STARTTLS (587 default) or implicit TLS (`SMTP_TLS=implicit`,
465 default when SMTP_PORT is unset). Do not assume a Microsoft 365 mailbox permits
password-based SMTP; use an authorized SMTP relay/account supported by its provider.

For local form testing set `INQUIRY_ORIGINS=http://127.0.0.1:8091`.
The production proxy should forward `/api/inquiry` to `http://127.0.0.1:8091`;
it can serve public/ directly or proxy all traffic to this server. Terminate TLS
and enforce request/concurrency limits at the reverse proxy. The API has a 32 KiB
body limit, honeypot, origin checks, field validation, and a process-local limit of
20 mail attempts per hour. This basic global limit resets on restart and can be
exhausted by spam; use proxy-level abuse controls for a public launch.

Checks: `python3 -m unittest -v test_server.py` (mocked SMTP, no email sent).
Recipient and real SMTP delivery still need configuration and a live delivery
test before publishing the form as operational.

## Hosting handoff

Serve **only `public/`** as the document root. Do not serve the repository root,
`.git`, or `docs`. All deployed assets are local; no third-party fetches are needed
to render the page. Configure the web server to return `public/404.html` with an
HTTP 404 status for missing paths. DNS, TLS, tunnel configuration, system services,
and deployment are owned by Nathan's separate hosting task.

GitHub repository: https://github.com/nate13tidball/augment-wh.com
GitHub Pages: https://nate13tidball.github.io/augment-wh.com/
The Pages workflow publishes only public/ on pushes to main. GitHub Pages cannot
run the Python backend; the form is explicitly unavailable on github.io, with a
LinkedIn fallback. Before enabling it, configure and verify a hosted email API.
DNS for augment-wh.com remains owned by the separate hosting task.

## Content status

Working brand: **Augment Wh**, inferred from the domain. Positioning is based on
the lifecycle/augmentation proposal in `EMS_Startups`, not its separate
commissioning-workspace concept. This is an early-stage business page, not a claim
of deployed software, customers, results, or finished integrations. The 4-6 week
pilot is labeled proposed and depends on scope and data readiness.

Nathan's existing public LinkedIn URL remains a fallback contact destination. The
inquiry form's recipient email was requested and still needs confirmation.
Review brand, offer, biography, and contact details before publication.

## Sources and design references

- Business: `../EMS_Startups/founder_expertise.md` and
  `../EMS_Startups/polished_proposal/bess-lifecycle-intelligence-platform.md`.
- [TWAICE](https://www.twaice.com/): reference for clear audience framing and
  modular solution sections.
- [ACCURE](https://www.accure.net/battery-analytics/battery-intelligence): reference
  for a decision-oriented story connecting battery data to action.
- Original implementation and copy. No competitor source code, branding,
  testimonials, customer logos, or proprietary assets were copied.
- `public/assets/bess.jpg`: [Reid Gardner BESS by Sig. Chiocciola](https://commons.wikimedia.org/wiki/File:Reid_Gardner_BESS.jpg),
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), downloaded unchanged.
  This industry-context photograph does not represent an Augment Wh installation.

Keep private research, prospect data, and credentials out of the public directory.
