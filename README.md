# Augment Wh

Standalone business website for augment-wh.com. Static HTML and CSS, with no
runtime dependencies, build step, JavaScript, tracking, cookies, or form backend.

Open `public/index.html` directly in a browser for a local preview.

## Hosting handoff

Serve **only `public/`** as the document root. Do not serve the repository root,
`.git`, or `docs`. All deployed assets are local; no third-party fetches are needed
to render the page. Configure the web server to return `public/404.html` with an
HTTP 404 status for missing paths. DNS, TLS, tunnel configuration, system services,
and deployment are owned by Nathan's separate hosting task.

This task did not change DNS or start a server. The repo is initially local with
no GitHub remote. Intended canonical domain: https://augment-wh.com; add canonical,
robots, and sitemap metadata once the hosting agent confirms the final domain.

## Content status

Working brand: **Augment Wh**, inferred from the domain. Positioning is based on
the lifecycle/augmentation proposal in `EMS_Startups`, not its separate
commissioning-workspace concept. This is an early-stage business page, not a claim
of deployed software, customers, results, or finished integrations. The 4-6 week
pilot is labeled proposed and depends on scope and data readiness.

Nathan's existing public LinkedIn URL is the working contact destination. A
business email was requested but must be confirmed before adding an email link.
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
