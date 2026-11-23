# Augment Wh

Business website for augment-wh.com. HTML/CSS with a small inquiry form script
and Python standard-library SMTP backend. No build step or third-party packages.

Open `public/index.html` directly in a browser for a local preview.
Form delivery requires the server described below; file previews do not send mail.

## Homepage and preserved versions

The V3 pitch-deck page is now the homepage at `/`. It describes the controls and
integration product, battery deployments as needed, capacity guarantees, lead times,
modeled degradation, team experience, and partnerships with site owners for augmentation design and economic analysis.
The inquiry form retains `/api/inquiry` and `contact.js`.

The previous homepage is preserved at `/dev/previous-home/`, behind the existing
admin login on Vercel. `/dev/deck/` retains the working preview. The development
page tree at `/dev/` lists both, plus the field and memo concepts.

The homepage and deck preview share `public/assets/homepage/homepage.css` and
images under that same directory. Public assets live outside the protected
`/dev/` tree and remain available on the GitHub Pages fallback. The prior
homepage still uses the original `public/styles.css` and scripts.

The homepage names `assets/homepage/share-card.png` as its preferred search
preview image through Open Graph and `WebPage.primaryImageOfPage` metadata, and
allows large image previews. Google chooses whether to show a thumbnail for a
given result; these signals do not guarantee one.

The page uses approved green, charcoal, and light-gray branding. Text blocks
stay within 20 words, with aligned statistics, section numbering, and a contents
bar. The full-width battery-site illustration was supplied by Nathan. Lead-time
and degraded-capacity dollar figures were supplied/approved by Nathan; the parent
repository's `pitch_offering/v3-website-content-review.md` retains source and
editorial context. The dollar figures describe degraded capacity, not service revenue.

## Website review preview

The homepage's “Solution explained” row links to `/solution-explained/`, a slideshow
of the lifetime site planning deck. Slides advance on their own while in view; visitors
can pause, step with Back/Next, the dots, arrow keys or a swipe. Each slide carries
short speaker-note bullets. Moving slides are looping GIFs; stills are PNGs.
Run `python3 scripts/sync_solution_deck.py` after rebuilding the parent repository's
`../animations/grid-to-battery-life-zoom-v4/out/deck/` (`animations/svgframes/deck.py`).
It copies the slides and rewrites the marked slide list. Without JavaScript the slides
stack in order. The page labels its costs, performance, and financial scenarios as illustrative.

`/dev/site-review/` is a customer-facing rewrite staged under the protected
development route. `/dev/site-review/investors/` holds a separate investor
thesis. Neither route changes the production homepage. Both use the approved
brand assets and existing `/api/inquiry` form flow. Local static preview can
show the forms but cannot deliver mail without a configured API backend.

`/modeling-demos/` is the protected Site modeling demo. Its first section
links the year-selected capacity histogram to the full synthetic cell degradation
curve. Both views use `state_estimation/outputs/customer_showcase/chart_source.json`
from the parent repository, copied to `public/modeling-demos/data.json` by
`python scripts/sync_cell_demo.py`. Refresh that deployment copy after regenerating
the showcase. The Plotly charts use a versioned CDN bundle and require internet
access. The histogram's horizontal axis is capacity; the curve's is service year.
The histogram runs from higher to lower retained capacity and displays each bin's
share of scenario draws on a 0–100% scale, not calibrated certainty. The slider
sits below the retention curve; its thumb follows the same horizontal year scale,
including the curve's years 0–3 of history before the selectable forecast. The
example is a representative cell, not a site forecast or validated confidence range.

The second demo section, `#us-market`, reuses the homepage's “The operating
challenge” content, chart, and approved $3bn / $13bn degraded-capacity estimates.
Its header link jumps to “US grid energy storage market.” The section shares
the cell module’s neutral background and green accents; market figures remain red. Styles live in
`public/modeling-demos/market.css`, separate from the cell chart styles.
The market estimates are independent of the synthetic cell simulation; their
source context remains `../pitch_offering/v3-website-content-review.md`.

### Interactive presentation concepts

Modules 03–06 on `/modeling-demos/` are illustrative presentation examples.
They reuse Plotly and the site palette. No customer records or actual market prices are used.

| Module / anchor | Interactive views |
| --- | --- |
| Recoverable capacity / `#capacity-recovery` | Combined-fleet waterfall; added LV MWh, age, and annual average AC POI capacity. |
| Dispatch replay / `#dispatch-replay` | Three dispatch scenarios, one power plot, three augmentation sizes, and daily economics. |
| Investment economics / `#investment-economics` | V4 animation plan, Low/Base/High presets, annual cash, residual, schedule, and sensitivity map. |
| Downside risk / `#downside-risk` | 600 reproducible NPV draws around the selected animation scenario, with cost/revenue uncertainty and commissioning delay. |

Economics uses `animations/grid-to-battery-life-zoom-v4/site_plan_model.json` from the parent repository.
The 100 MWh original site adds 43.5 MWh across years 4, 7, 10, and 14.
Block sizes are fractions of one of three legacy blocks. Revenue is per usable kWh-year, not dispatch MWh.
Annual calculations match the animation's `finance.py`, including installation-year income, inflation, O&M, and year-15 straight-line residual value.
Residual is an illustrative unused-life valuation, not contracted cash; the UI shows NPV with and without it.
Original capital is a sunk baseline. No tax, debt, dispatch constraints, or decommissioning cost is modeled.

`animation-finance-data.js` stores exact source inputs, source hashes, and Python-generated reference cash flows and metrics.
Refresh explicitly when the animation source changes:

```bash
~/.venvs/augment-wh/bin/python scripts/sync_animation_finance.py /path/to/site_plan_model.json
```

`concept-models.js` contains deterministic calculations; `concepts.js` binds controls and plots; `concepts.css` scopes the layout.
Risk shares the selected economics inputs and shifts all four campaigns by the selected delay.
Campaigns beyond year 15 are excluded. Independent triangular distributions are illustrative, not calibrated probabilities.
Recovery and daily dispatch remain separate examples and do not feed annual finance.

Verify from this repository:

```bash
node test_modeling_concepts.cjs
node test_dispatch_examples.cjs
~/.venvs/augment-wh/bin/python -m unittest test_server
```

Checks cover energy conservation, dispatch constraints, canonical finance parity, residual reconciliation, risk reproducibility, controls, presets, and CDN failure.
DOM/Plotly stubs verify wiring; they do not replace browser visual review.

#### Energy waterfall and dispatch examples

The energy waterfall adds new LV units as the second bar. Both cohorts are
assumed installed at year 0, with the same illustrative 2.5% annual decline,
8% SOC-imbalance loss, fixed 8% annual average offline share, and 6% conversion loss.
The summaries show the selected year after commissioning above the plot; both sliders sit below it.
The final three bars are **annual average available AC MWh at the POI**: selected site energy, augmentation
delta, and the original plan without augmentation at the selected age. The floating delta
spans original-plan capacity to selected-site capacity. A bracket groups the three bars
under “Point of interconnection.” No electrochemical or site backend is called.

Dispatch uses `dispatch.js`, `dispatch.css`, and generated `dispatch-data.js`.
All nine cases have a fixed 100 MW battery/POI, 100% availability, and a 200 MWh
base battery, expressed as usable AC-discharge-equivalent energy: two hours at
100 MW from full. Additions are 0, 100, and 300 MWh. The one slider selects among
these cases. The green curve is signed **battery meter** power, not site export.
Solar uses a yellow actual-generation curve and a dotted combined POI curve;
peak support adds a dashed delivery request. Pricing is shown in text and hover.

`scripts/build_dispatch_examples.py` uses the installed SciPy/HiGHS MILP solver
to precompute these deliberately fictional days. There is no solver in the browser.
The optimal schedule maximizes POI energy settlement plus an invented event-delivery
credit, less $3/MWh battery discharge cost. Constraints include 15-minute energy
conservation, zero start/end energy, 90% round-trip efficiency, no simultaneous
charge/discharge, battery power, shared POI power, and solar-only charging in the
solar case. This is perfect-foresight scheduling of invented tariffs, not actual
ERCOT data, qualified market participation, or a production dispatch optimizer.

The economics table compares all sizes and highlights the selection. Energy sales,
grid purchases (negative at negative prices), event credit, variable cost, operating
margin, and baseline-relative margin reconcile to the optimizer's objective. Solar
settles at the combined POI, so foregone solar sales are included. Added capital is
$140/kWh and added maintenance $4/kWh-year; an 8%, 15-year capital recovery factor
allocates these costs over 365 days. Daily earnings are **not annualized**. The
reported daily incremental contribution subtracts only added allocated capacity
costs; it is not total project profit or an investment recommendation.

Rebuild only when editing the fictional inputs/dispatch mechanics:

```bash
# Optional generator dependencies; do not add these to the website server runtime.
~/.venvs/augment-wh/bin/python -m pip install -r scripts/requirements-dispatch.txt
~/.venvs/augment-wh/bin/python scripts/build_dispatch_examples.py
node test_dispatch_examples.cjs
```

The saved fixture retains solver optimality status. The focused checks independently
reconcile every interval, all cash components and allocated costs, and cover all
nine UI selections plus the missing-chart-library fallback. Other model sections
retain their separate inputs and behavior.

The customer page makes site assessment the current conversation and labels
integration, delivery, and capacity management by their project or planned
status. It uses no unverified site outcome, deployment schedule, return, or
capacity guarantee. The investor page uses the 3.5 and 7.8 GWh/year
restoration-only screening model documented in
`../pitch_offering/assumptions-and-sources.md`; those figures are not revenue,
qualified projects, or observed restoration. Verify buyer demand, technical
scope, deployment timing, site economics, and any guarantee terms before
publishing stronger claims.

## Scroll motion

The homepage uses the side sweep from `/dev/section-motion/`.
Entire sections slide in from alternating sides and replay when scrolling back.
The hamburger menu offers Pause animations and Play animations; pausing reveals every section.
This behavior plays even when the device requests reduced motion.
Without JavaScript or IntersectionObserver, content remains visible.

`/dev/section-motion/` retains sweep, curtain, and focus for comparison.
It loads current homepage markup, replays each treatment in both directions, and disables inquiry submission.
Its own pause button works under reduced motion too.

`/dev/scroll-reveal/` preserves the earlier fade-and-rise experiment.
It animates individual content blocks once and staggers the offering cards.
Its default respects reduced motion, while “Enable motion” opts in for the preview.
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
The header and footer use the full-name logo with its centered slogan; the favicon uses the compact logo.
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
keep form details visible. Success means the mail service accepted the email, not
that final inbox delivery has been verified.

For Microsoft Graph delivery, set `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, and
`GRAPH_CLIENT_SECRET` in Vercel Production, along with `INQUIRY_FROM` and
`INQUIRY_TO`. The app requests a Microsoft Graph token using client credentials,
then calls `/users/{INQUIRY_FROM}/sendMail`. Grant its service principal the
Exchange Online `Application Mail.Send` role, scoped to the sender mailbox using
[Application RBAC](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac).
Do not add an unscoped Entra `Mail.Send` grant: Microsoft says it would override
the mailbox scope. Keep the client secret outside Git and `public/`.

Run `python3 server.py` to serve the site and API on loopback port 8091. The
script does not automatically read .env files. SMTP remains a fallback when no
Graph variables are set; it uses STARTTLS (587 default) or implicit TLS
(`SMTP_TLS=implicit`, 465 default). A partial Graph configuration fails explicitly
instead of falling back to SMTP.

For local form testing set `INQUIRY_ORIGINS=http://127.0.0.1:8091`.
For a self-hosted deployment, a reverse proxy can forward `/api/inquiry` to the
local Python server. The Vercel handler uses the shared validation and delivery
functions in `server.py`. The API has a 32 KiB body
limit, honeypot, origin checks, field validation, and a process-local limit of 20
mail attempts per hour. This basic global limit resets on restart and can be
exhausted by spam; use platform-level abuse controls for a public launch.

Checks: `python3 -m unittest -v test_server.py` (mocked mail delivery, no email sent).
Verify Graph credentials, mailbox authorization, and live delivery before
considering the form operational.

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
