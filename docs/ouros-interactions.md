# Ouros interaction reconstruction

Inspected the live [Ouros Materials homepage](https://www.ourosmaterials.com/)
and its public application modules on 2026-10-12. This replaces the earlier
static-only interpretation for the `design/ouros-template` branch.

## Extracted code

Local inspection archive:
`a temporary runtime capture directory`

- `index.html`: downloaded public page.
- `manifest.json`: URLs, byte counts, and SHA-256 hashes for 15 deployed modules
  (1,270,959 bytes), including React, Framer Motion, and Framer.
- Four public `.mjs.map` files provided **55 embedded source entries**.
- `sources/` and `sources-index.json`: extracted source content and its mapping
  back to the published source maps. These are generated components and library
  sources, not an editable Framer project or backend application.
- `extract.py`: fetches the observed module graph; it does not execute downloaded code.

Primary page bundle:
https://framerusercontent.com/sites/10XNV6AgRTLqsSiYDCRozJ/pZ8zGEuutHBC_ONJdB_s7FKwOjG_VWXrkh_ens1AoLc.C6-VJ7gh.mjs

Its adjacent `.mjs.map` exposes `augiA20Il.js` (home), `xGHMwuSiu.js`
(expanding products), and the ticker/slideshow components. The public
`script_main.CzcUErst.mjs.map` exposes the navigation component.
The downloaded bundles stay in the inspection archive; production uses our own
small implementation with the existing Augment-wh content and assets.

## Observed behavior and implementation

| Original behavior | Source evidence | Augment-wh implementation |
| --- | --- | --- |
| Hero title, description, and media rise/fade in | Home: initial Y 80; delays .2/.3/.5 s; duration .8/.8/.6 s; easing [.44,0,.56,1] | Hero entrance transitions with matching offsets, delays, and timing |
| Introduction appears word by word | Home: word tokenization, Y 10; .02 s stagger; .6 s spring, bounce 0 | Existing heading emphasis preserved; word spans revealed once on entry, .6 s CSS ease-out approximation |
| Cards enter on scroll | Home: threshold 0, once, Y 40; .8 s tween with stagger | IntersectionObserver reveals feature cards, process cards, section labels, and scope rows |
| Product rows have desktop hover previews and click/tap expansion | Product component: desktop closed/hover/open, tablet closed/open, phone closed/open; .5 s tween [.44,0,.56,1] | Pilot scope uses animated native disclosures, local battery-image previews, and rotating plus icons |
| Navigation stays visible and expands | Main shell: fixed navigation, blur, open/closed states | Fixed header, animated expanded menu, Escape/outside-click/link dismissal |

The apparent product “tabs” are expandable rows in the recovered code. There
was no scroll-selected tab component or pinned product tab system in the inspected
homepage. Desktop hover previews start at 1200 px; smaller widths use tap/click.
Rows can remain open independently, as in the reference.

The original also has video and a partner ticker. Augment-wh retains its own BESS
photo and has no partner-logo section. No reference videos, logos, newsletter,
tracking scripts, or external application services are loaded by the redesign.
These differences remain; this is not a full clone of the source application.

## Validation

Run from the repository root:

```sh
python3 -m unittest -v
node test_site_links.mjs
node test_interactions.mjs
```

Browser checks: scroll into each section; open and close all scope rows by mouse
and keyboard; interrupt an expansion with another click; open the menu and dismiss
with Escape or a link; inspect at 390 px and desktop widths. Reduced motion disables
entrances and interpolated expansion. With JavaScript disabled, the content stays
visible and scope disclosures work natively. The existing contact links still
require JavaScript as documented in the README.

Preview: `http://127.0.0.1:8092/` (keep the Mac `nuc` connection open).
