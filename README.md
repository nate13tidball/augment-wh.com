# Augment Wh

Business website for augment-wh.com. HTML/CSS with a small inquiry form script
and Python standard-library SMTP backend. No build step or third-party packages.

Open `public/index.html` directly in a browser for a local preview.
Form delivery requires the server described below; file previews do not send mail.

## Brand assets

The business repository's `brand/` folder is the source of logo artwork.
`brand.config.json` selects `version` (such as `v1`) and `header_logo`
(`lettermark`, `wordmark`, or `lockup`). `source_root` is relative to this website
repository and defaults to `../brand` when checked out as a submodule.

Run from the website repository after changing the selection or regenerating logos:

```bash
python3 scripts/sync_brand.py
# Select the next complete logo set and save that version in the config:
python3 scripts/sync_brand.py --version v2
# For a standalone checkout, supply the location of the business repo's brand folder:
python3 scripts/sync_brand.py --source-root /path/to/Augment-wh/brand
```

Each version must include `lettermark/aa-vN.png`, `wordmark/augment-wh-vN.png`,
and `lockups/augment-wh-lockup-vN.png`. Missing files fail before overwriting
deployed assets. The sync copies the selected artwork into `public/assets/brand/`;
HTML references stable filenames, so switching versions requires no HTML edits.
The header and footer use the selected format; the favicon uses the lettermark.
`manifest.json` records the deployed version. Commit the config and copied assets
in this website repository, then update its pointer in the business repository.
GitHub Pages and standalone hosting use the committed copies and do not need
access to the private business repo. Refresh the browser cache after switching.

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

## Production deployment

**`main` is continuously deployed to the live production website.** Nathan
confirmed this on 2026-10-12. Whatever is pushed to `main`, including a force
push, is what production displays after deployment completes.

Keep design changes on a feature branch for review. Updating `main` is a
production release; creating a feature branch alone does not change production.

## Hosting handoff

Serve **only `public/`** as the document root. Do not serve the repository root,
`.git`, or `docs`. The company presentation demo loads company favicon marks from
Google's favicon service; the rest of the site's assets are local. Configure the
web server to return `public/404.html` with an HTTP 404 status for missing paths.
DNS, TLS, tunnel configuration, system services, and deployment are owned by
Nathan's separate hosting task.

GitHub repository: https://github.com/nate13tidball/augment-wh.com
GitHub Pages: https://nate13tidball.github.io/augment-wh.com/
The Pages workflow publishes only public/ on pushes to main. GitHub Pages cannot
run the Python backend; the form is explicitly unavailable on github.io, with
direct email and Google Calendar booking links available instead. Before enabling
the form, configure and verify a hosted email API.
DNS for augment-wh.com remains owned by the separate hosting task.

## Content status

Confirmed company name: **Augment-wh**, with **Aa** as its compact lettermark.
The website uses the selected brand assets described above. Positioning is based on
the company's augmentation work and founder expertise in storage controls,
deployment, commissioning, and lifecycle engineering. The page describes an
initial operating-site augmentation study without naming the customer or site. It
does not claim a deployed software product, guaranteed outcome, or completed project.

## Contact link configuration

Edit **`public/site-config.json`** to change these destinations without editing HTML:

- `email`: primary address used by the email/outreach button.
- `emailCc`: CC address for that button, currently `nate.tidball@gmail.com`; use an
  empty string to omit the CC.
- `meetingUrl`: `./meet`, resolved relative to the deployed site. This becomes
  `https://augment-wh.com/meet` in production and `http://127.0.0.1:8092/meet`
  in the default local preview. It also preserves GitHub Pages subdirectory paths.
  An absolute URL can be used to intentionally override this host-relative behavior.
- `bookingUrl`: Google Calendar destination used by `/meet`.

The homepage loads this file with caching disabled. `/meet` and `/meet/` redirect
to `bookingUrl`: the Python server sends a temporary HTTP redirect; static hosts
serve `public/meet/index.html`, which redirects using JavaScript. Static hosting
must support directory index pages. JavaScript is required for the homepage
contact links and the static booking redirect; the booking page includes a
manual continue link once configuration loads.

Deploy the updated config with the site; edits on an unpushed branch do not change
production. Configure the host/CDN to revalidate `site-config.json` if it applies
long-lived caching. Values in this file are public; keep credentials out of it.
The inquiry form's SMTP recipient remains the separate `INQUIRY_TO` environment
variable. Change that too if incoming form messages should go to a new inbox.
`emailCc` applies to the mailto button, not the server-delivered inquiry form.

## Company presentation demos

`public/presentations/companies.json` is an editable starter index for `/presentations/<slug>/` pages. All listed companies use one shared demo presentation in `presentation.js`; add a company entry and matching folder shell to add a route. Set an entry's optional `presentation` field to an HTML filename in that company's folder (for example, `custom.html`) to use a company-specific presentation instead. The page shows the current date and a clear demo notice; its sample claims do not imply a customer relationship, meeting, or completed assessment. Company marks currently use site favicons via Google's favicon service, with initials as a fallback. Replace these with approved local logo assets before making a real customer-facing deck.

The starter list spans renewable asset operations, project developers/owners, and storage providers; it is not a claim that every company is a direct NovaSource competitor. Trimark describes controls/services across battery storage and other generation types ([company overview](https://trimarkassoc.com/company/)); NovaSource describes BESS operations and maintenance ([BESS services](https://www.novasourcepower.com/services/battery-energy-storage-systems-bess/)); DESRI describes developing, owning, and operating renewable and storage assets ([DESRI](https://desri.com/)); Plus Power describes developing, owning, and operating standalone battery projects ([company overview](https://www.pluspower.com/about/)).

For a NUC preview, keep the Mac `nuc` connection open and visit
`http://127.0.0.1:8092/`. The meeting button stays on that local server before
redirecting to the configured Google Calendar destination.

Checks: `python3 -m unittest -v` and `node test_site_links.mjs` (Node is only used
for this development check; the website still has no build step).

## Ouros template adaptation

The `design/ouros-template` branch adapts the saved Ouros Materials starter from
`../nathantidball.com/web-templates/ouros-materials/`: oversized typography,
a technical electrical-diagram hero, numbered sections, neutral cards, a dark engagement section,
and a large contact footer. It now includes scroll entrances, word-by-word heading
reveals, an expanding fixed menu, and animated pilot-scope disclosures reconstructed
from the public Framer source maps. See [interaction evidence and checks](docs/ouros-interactions.md).
The page uses Augment-wh's existing content and brand assets. The source reference
and screenshots remain in the personal-site repository.

The existing inquiry API, form fields, GitHub Pages form guard, email link, and
booking link are retained. The single-page layout needs no build step or new
dependencies. Preview with `python3 -m http.server 8092 --bind 127.0.0.1 --directory public`
and open `http://127.0.0.1:8092/` (static preview only; inquiry delivery requires
the configured Python backend).

## Sources and design references

- Business: `../EMS_Startups/founder_expertise.md` and
  `../EMS_Startups/polished_proposal/bess-lifecycle-intelligence-platform.md`.
- [TWAICE](https://www.twaice.com/): reference for clear audience framing and
  modular solution sections.
- [ACCURE](https://www.accure.net/battery-analytics/battery-intelligence): reference
  for a decision-oriented story connecting battery data to action.
- Original implementation and copy. No competitor source code, branding,
  testimonials, customer logos, or proprietary assets were copied.
Keep private research, prospect data, and credentials out of the public directory.
