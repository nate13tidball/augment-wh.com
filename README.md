# Augment Wh

Business website for augment-wh.com. HTML/CSS with a small inquiry form script
and Python standard-library SMTP backend. No build step or third-party packages.

Open `public/index.html` directly in a browser for a local preview.
Form delivery requires the server described below; file previews do not send mail.

## Homepage and preserved versions

The V3 pitch-deck page is now the homepage at `/`. It describes the controls and
integration product, annual ESS deployments, capacity guarantees, lead times,
modeled degradation, team experience, and the five-month partnership ask.
The inquiry form retains `/api/inquiry` and `contact.js`.

The previous homepage is preserved at `/dev/previous-home/`, behind the existing
admin login on Vercel. `/dev/deck/` retains the working preview. The development
page tree at `/dev/` lists both, plus the field and memo concepts.

The homepage and deck preview share `public/assets/homepage/homepage.css` and
images under that same directory. Public assets live outside the protected
`/dev/` tree and remain available on the GitHub Pages fallback. The prior
homepage still uses the original `public/styles.css` and scripts.

The page uses approved green, charcoal, and light-gray branding. Text blocks
stay within 20 words, with aligned statistics, section numbering, and a contents
bar. The full-width battery-site illustration was supplied by Nathan. Lead-time
and degraded-capacity dollar figures were supplied/approved by Nathan; the parent
repository's `pitch_offering/v3-website-content-review.md` retains source and
editorial context. The dollar figures describe degraded capacity, not service revenue.

## Scroll reveal behavior

The homepage now uses fade-and-rise entrances tested at `/dev/scroll-reveal/`.
That clone remains available for comparison.
It uses the existing IntersectionObserver in `interactions.js`, marks individual
content blocks, and lightly staggers the offering cards. Each block appears once.
The “Enable motion” link opts into animation for this preview only, even when
the browser prefers reduced motion; the default respects that preference.
The hero remains immediately visible; reduced-motion and no-JavaScript visitors
receive readable content without animation. The homepage shares this reveal behavior, without the experiment banner.
Its chart fills the panel width; display cropping removes horizontal white
image margins while preserving axes and labels.
The clone shares homepage assets and retains the working inquiry endpoint.

## Brand assets

The business repository's `brand/production/` folder is the source of approved
logo artwork. `brand.config.json` selects `header_logo` (`logo` or `full-logo`).
`source_root` is relative to this website repository and defaults to
`../brand/production` when checked out as a submodule.

Run from the website repository after changing the selection or regenerating logos:

```bash
python3 scripts/sync_brand.py
# For a standalone checkout, supply the location of the business repo's brand folder:
python3 scripts/sync_brand.py --source-root /path/to/Augment-wh/brand/production
```

Production must include `augment-logo.png` and `augment-full-logo.png`.
Missing files fail before overwriting deployed assets.
The sync validates the exact production schema and manifest before copying approved artwork into
`public/assets/brand/`; HTML references stable filenames.
The header and footer use the full-name logo; the favicon uses the compact logo.
The website must keep these copied files because the submodule is deployed independently and
cannot read files from its parent repository. They are deployment outputs, not alternate brand
sources. `manifest.json` records the parent production-manifest hash and each copied asset hash.
Commit the config and copied assets
in this website repository, then update its pointer in the business repository.
GitHub Pages and standalone hosting use the committed copies and do not need
access to the private business repo. Refresh the browser cache after switching.

## Inquiry and quote form

The form collects name, reply email, optional company, and inquiry details.
`POST /api/inquiry` is served by `api/inquiry.py` on Vercel; it validates inputs and sends a plain-text email to the
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
For a self-hosted deployment, a reverse proxy can forward `/api/inquiry` to the
local Python server. The Vercel handler uses the shared validation and SMTP
delivery functions in `server.py`. The API has a 32 KiB body
limit, honeypot, origin checks, field validation, and a process-local limit of 20
mail attempts per hour. This basic global limit resets on restart and can be
exhausted by spam; use platform-level abuse controls for a public launch.

Checks: `python3 -m unittest -v test_server.py` (mocked SMTP, no email sent).
Recipient and real SMTP delivery still need configuration and a live delivery
test before publishing the form as operational.

## Production deployment

**Vercel is the current production host for augment-wh.com.** The production host is documented as Vercel. The Vercel project and its deployment settings live in the
Vercel dashboard; this repository currently has no `vercel.json`. Before changing
deployment behavior, verify the connected Vercel project and its production branch.

This repository also has a GitHub Pages workflow that publishes `public/` when
`main` changes. It is a secondary/legacy deployment path; Vercel is the current
canonical host per the project owner. GitHub Pages cannot run the Python backend.

## Hosting handoff

Serve **only `public/`** as the document root. Do not serve the repository root,
`.git`, or `docs`. The company presentation demo loads company favicon marks from
Google's favicon service; the rest of the site's assets are local. Configure the
web server to return `public/404.html` with an HTTP 404 status for missing paths.
Vercel's project root/output settings are managed in its dashboard, not this repo.
`server.py` is a local loopback server; Vercel will not run it as a persistent
server just because it is present. If the inquiry API is expected to work in
production, verify that `/api/inquiry` is connected to a Vercel Function or an
external backend/proxy.

The Pages workflow publishes only `public/` on pushes to `main`; its form cannot
use the Python backend. Keep this fallback deployment's limitations distinct
from the Vercel production deployment.

## Content status

Confirmed company name: **Augment-wh**, with **Aa** as its compact lettermark.
The website uses the selected brand assets described above. Positioning is based on
the company's augmentation work and founder expertise in storage controls,
deployment, commissioning, and lifecycle engineering. The page describes an
initial operating-site augmentation study without naming the customer or site. It
does not claim a deployed software product, guaranteed outcome, or completed project.

## Contact

The inquiry form sends submissions to the business recipient configured in
`INQUIRY_TO`. The visitor's validated address is used for replies.


## Company presentation demos

The homepage navigation links to the company library at `/presentations/`. `public/presentations/companies.json` is an editable starter index for `/presentations/<slug>/` pages. All listed companies use one shared demo presentation in `presentation.js`; add a company entry and matching folder shell to add a route. Set an entry's optional `presentation` field to an HTML filename in that company's folder (for example, `custom.html`) to use a company-specific presentation instead. The page shows the current date and a clear demo notice; its sample claims do not imply a customer relationship or completed assessment. Company marks currently use site favicons via Google's favicon service, with initials as a fallback. Replace these with approved local logo assets before making a real customer-facing deck.

The starter list spans renewable asset operations, project developers/owners, and storage providers; it is not a claim that every company is a direct NovaSource competitor. Trimark describes controls/services across battery storage and other generation types ([company overview](https://trimarkassoc.com/company/)); NovaSource describes BESS operations and maintenance ([BESS services](https://www.novasourcepower.com/services/battery-energy-storage-systems-bess/)); DESRI describes developing, owning, and operating renewable and storage assets ([DESRI](https://desri.com/)); Plus Power describes developing, owning, and operating standalone battery projects ([company overview](https://www.pluspower.com/about/)).

## Admin access and cookies

The `/dev/` page links to `/dev/login/`. The Vercel Python Function at
`api/admin.py` validates a PIN on the server and issues a signed admin cookie
for 30 days. The cookie covers the entire host, persists across tabs and browser
restarts, and uses Secure, HttpOnly, SameSite=Strict, and the `__Host-` prefix.
Use the canonical `https://www.augment-wh.com` host consistently: cookies are
host-specific. Sign out on the login page to clear this browser's cookie.

Set these Production environment variables in Vercel and redeploy:

- `ADMIN_PIN`: Nathan's chosen PIN (4–12 digits).
- `ADMIN_SESSION_SECRET`: at least 32 random characters, generated with
  `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.

Login fails closed until both values are configured. Neither credential belongs
in Git or public files. Changing the PIN alone does not revoke existing cookies;
rotate the session secret to revoke all sessions. `GET /api/admin` reports
`{"admin": true}` for a valid session. Future protected endpoints must call
`api.admin.is_admin(headers)` before returning protected data or accepting writes.
Vercel routing middleware in `middleware.js` requires the signed cookie for
every `/dev` and `/dev/*` request, except the login page and its script. Guests
redirect to login and return to their requested development page after signing
in. `/api/analytics` also checks the cookie in the Python handler. Responses use
private/no-store caching. The main site and presentations remain public.
The GitHub Pages fallback excludes `/dev/` because it cannot enforce authentication. The static local server and GitHub Pages cannot run
the login API. Tests use in-memory HTTP handlers without starting a server.

This is a basic shared PIN login. A fixed one-second check delay slows casual
guessing but is not a distributed rate limit. Use Vercel firewall rate limiting
before granting this short PIN access to sensitive data or destructive actions.

For a NUC preview, keep the Mac `nuc` connection open and visit
`http://127.0.0.1:8092/`. The preview uses the local static server.

Checks: `python3 -m unittest -v` and `node test_site_links.mjs` (Node is only used
for this development check; the website still has no build step).

## Ouros template adaptation

The `design/ouros-template` branch adapts the saved Ouros Materials starter from
the Ouros Materials reference: oversized typography,
a technical electrical-diagram hero, numbered sections, neutral cards, a dark engagement section,
and a large contact footer. It now includes scroll entrances, word-by-word heading
reveals, an expanding fixed menu, and animated pilot-scope disclosures reconstructed
from the public Framer source maps. See [interaction evidence and checks](docs/ouros-interactions.md).
The page uses Augment-wh's existing content and brand assets. The source reference
and screenshots remain in a separate design repository.

The inquiry form keeps name, email, optional company, and one inquiry details
message box. The single-page layout needs no build step or new
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

## Development analytics dashboard

`/dev/analytics` displays all-time production visitors/page views and top pages
from the last seven days using the public [Vercel Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api).
The read-only proxy is a standard-library Vercel Python Function at `api/analytics.py`.
It needs the repository root as Vercel's project root, with `public/` as static
output, so Vercel discovers `api/`. No deployment settings are changed by this code.
The local Python server and GitHub Pages serve the dashboard shell but do not run
this Vercel-only proxy. The UI reports a missing/unavailable API explicitly.

Vercel Web Analytics is enabled for the project. Every public HTML page includes
the standard HTML tracking script at `/_vercel/insights/script.js`, including the
main site, presentations, and development pages. No npm packages or build step
are needed. The canonical dashboard URL is `/dev/analytics`; `/dev/analytics/`
forwards there in the browser. Set these Production environment variables in
Vercel, then redeploy:

- `ANALYTICS_VERCEL_TOKEN`: Vercel access token authorized for the project.
- `ANALYTICS_PROJECT_ID`: project ID.
- `ANALYTICS_TEAM_ID`: team ID for team projects; omit for personal projects.

The dashboard loads automatically and has a refresh button. Admin login is required to view these reports, including direct API requests. The Vercel token stays on the server. The endpoint disables response
caching and limits queries to the configured project and fixed reports.

Check with `python3 -m unittest -v test_analytics.py` (mocked Vercel, no server or
real credentials required) and `node test_site_links.mjs`. Live totals require
configuration and collected traffic; zero traffic is distinct from an API error.
