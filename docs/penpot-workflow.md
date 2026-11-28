# Penpot design workflow

The website in `public/` is the published source. Penpot holds editable design
copies for layout exploration. The [company homepage design](https://design.penpot.app/?screen=workspace&team-id=7d3e61e0-34c6-81f6-8009-037307a478ed&file-id=e7ca6b81-c0d3-8029-8009-0378518b941c&page-id=1b08da3c-c169-80db-8009-040af3502bea)
has a 1140 × 5400 desktop board with separately movable section boards, text,
cards, controls, and image fills. Its Penpot file ID is
`e7ca6b81-c0d3-8029-8009-0378518b941c`; page ID is
`1b08da3c-c169-80db-8009-040af3502bea`.
This copy covers the desktop layout; the site's mobile layout still needs a
separate Penpot board if mobile design editing is desired.

## Startup homepage proposal

The separate [startup homepage concept](https://design.penpot.app/?screen=workspace&team-id=7d3e61e0-34c6-81f6-8009-037307a478ed&file-id=3db45ae8-1dfd-81ce-8009-0411716b2466&page-id=3db45ae8-1dfd-81ce-8009-0411716b2467)
is an editable design proposal, not a change to the published website. It has
desktop (1440 × 2780) and mobile (390 × 2270) boards with separate text, cards,
buttons, and chart shapes. The file ID is
`3db45ae8-1dfd-81ce-8009-0411716b2466`; page ID is
`3db45ae8-1dfd-81ce-8009-0411716b2467`. Board IDs are
`e8ad8cf9-71d7-80f0-8009-04122d7e41c9` (desktop) and
`e8ad8cf9-71d7-80f0-8009-0412f40b7152` (mobile).

The concept leads with “More capacity. Same site.” and puts the site contact
action beside an illustrative capacity-planning view. It then shows site
assessment, integration design, and deployment planning. The chart is a visual
concept with no site data or performance claim. The new navigation header
differs from the current shared-header rule in `WEBSITE_GUIDELINES.md`; decide
whether to change that rule before implementing this design in HTML/CSS.

This is an assisted round trip. Penpot MCP can read and change the design and
generate draft HTML/CSS, but it does not continuously synchronize Penpot with
`public/index.html`. Review layout, copy, behavior, accessibility, and mobile
breakpoints on each transfer. Generated markup is a reference, not a replacement
for the production page's semantic HTML or scripts.

## Device setup

1. In Penpot, enable **Your account → Integrations → MCP Server** and generate
   an MCP key. Save the key in `~/.config/penpot/token` with owner-only access:
   `chmod 600 ~/.config/penpot/token`. This file is device-local, not part of Git
   or SourceMe. `PENPOT_MCP_TOKEN_FILE` may point to another private file.
2. Open the intended design file and click **MCP** in the drawing toolbar.
   Keep that tab active while the bridge runs. MCP follows the focused Penpot
   page, so verify the page before writes.
3. Run `node scripts/penpot.mjs status`. The bridge needs Node.js 20 or newer
   and uses Penpot's hosted Streamable HTTP MCP endpoint. It has no npm
   dependencies. For native Codex tools, add the server URL from Penpot's
   Integrations page in Codex's MCP settings on that device. That URL contains
   the key; keep Codex's local configuration private.

Penpot's [official MCP guide](https://help.penpot.app/mcp/) describes the
connection, plugin, and current tool capabilities.

## HTML and CSS to Penpot

1. Inspect the page locally at desktop and mobile widths. Read the source HTML,
   CSS, and the approved brand contract in the parent repository. Run the brand
   asset validation before using production assets.
2. Use `status` to capture the active file and page IDs. Write a small Penpot
   Plugin API script for the selected sections, then apply it with both guards:

   ```bash
   node scripts/penpot.mjs apply /path/to/design-change.js \
     --file-id FILE_ID --page-id PAGE_ID
   ```

   Scripts can create boards, text, and image fills with `penpot.createBoard`,
   `penpot.createText`, and `penpot.uploadMediaUrl`. Use `api Penpot`,
   `api Board`, or another type to inspect the current Plugin API. Keep text and
   cards separate so they can be moved in Penpot. Create a new page for major
   imports; avoid replacing an exploratory page without preserving it.
3. Export the changed board and compare it with the browser page. The MCP
   bridge acts on the connected Penpot tab, so disconnects require reconnecting
   in Penpot before retrying.

## Penpot to HTML and CSS

Pull the board structure and Penpot-generated draft code into a review folder:

```bash
node scripts/penpot.mjs pull \
  --file-id FILE_ID --page-id PAGE_ID --shape-id BOARD_ID \
  --out /path/to/review-folder
node scripts/penpot.mjs export --shape-id BOARD_ID \
  --out /path/to/review-folder/design.png
```

`structure.json` contains movable layers and their geometry. `draft.html` and
`draft.css` show Penpot's code output. Use them to implement the selected design
changes in `public/`, then run the website checks in `WEBSITE_GUIDELINES.md` and
visually check desktop and mobile layouts. Follow this repository's normal
commit, push, and deployment verification workflow for website changes.

The bridge reads the key from the local file; it does not accept a token on the
command line or write credentials into exports. Never commit the MCP key, a
server URL containing `userToken`, or authentication state.
