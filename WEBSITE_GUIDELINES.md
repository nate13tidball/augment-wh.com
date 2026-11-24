# Website guidelines

The website's shared design and editorial contract applies to public pages, development previews, presentations, and error/login pages. Start here and follow [AGENTS.md](AGENTS.md) for execution and publishing rules.

## North Star

Visitors should understand aAugment's work within seconds and have a clear next step. Each page should make it easy for a site owner, partner, or prospective investor to contact the company. Put a direct contact action near the main explanation and again after detailed content. Favor a simple, useful explanation over exhaustive on-page qualifications.

## Voice and perspective

- Default to **third person**. Describe aAugment, the service, the model, the asset, or the site owner directly.
- Avoid first- and second-person language in ordinary page copy: **I, me, my, we, us, our, you, your**, and their contractions.
- Prefer “aAugment models lifetime capacity” over “We model your battery.” Prefer “Site operating history” over “Your operating history.”
- Use neutral interface labels: “Contact,” “Site assessment,” “Service year,” and “Appearance.” Instructions can name the action without addressing the reader: “Drag to explore.”
- **Blog posts are the exception:** an identified author may use a personal voice when appropriate to the post. Quoted source material retains its original wording and attribution.
- Keep ordinary paragraphs and continuous prose blocks to 20 words maximum. Use headings, short lists, and tables for detail.
- State material provenance once, in normal-sized copy beside the relevant claim. Label model-generated examples plainly without repeating caveats throughout the page.

## Clear presentation

- Do not use disclaimers, fine print, footnote-style caveats, or tiny captions as a second layer of page copy.
- Use 16 px as the minimum for visible text, including navigation, chart labels, legends, form help, and footers. Body copy should usually be larger.
- Remove explanations that only repeat information already clear from a title, label, or nearby sentence.
- Place a material limitation in the main explanation when it changes the meaning of a claim. Leave detailed methods and assumptions in a linked source or technical page.
- Make calls to action obvious and specific. The primary paths are a site conversation, a partnership conversation, and an investment conversation.

Apply these rules to new and revised copy. Older pages contain legacy wording; review it when those pages are edited. This guideline does not authorize an unrelated rewrite of approved business claims.

## Shared header and navigation

- Reuse the original index-page header design: full logo artwork, existing horizontal frame spacing, pale masthead background, and circular hamburger. Keep the masthead about 30% shorter than its original size, retaining the menu's touch target. Append settings inside that menu; do not replace it with a new header design.
- Every HTML page shares that header and hamburger at desktop and mobile widths.
- The header progressively hides on downward scrolling and gradually reveals over 1.6 header heights of upward scrolling. Preserve partial visibility when scrolling stops; do not snap fully open at a direction change. It stays visible near the page top, while the menu is open, and during keyboard interaction. Small scroll movements should not cause flicker. Its height and anchor offsets are defined in `public/assets/site/site.css`.
- `scripts/site_header.html` owns the common markup. Never maintain separate copies by hand.
- `scripts/sync_site_header.py` embeds the header and shared assets in every page, including presentation templates and the 404 page. It adds existing in-page anchor links and development navigation only on development pages. The explicitly featured Technical Solution and Modeling Demo links appear in the main menu on every page; the demo retains its protected `/modeling-demos/` route.
- Keep model-specific jump navigation in the page body when useful. Secondary controls, including appearance and animation preferences, belong inside the hamburger menu.
- The header includes a Contact button sized to match the menu control. Presentations and Development navigation require a verified admin session.
- Navigation works without JavaScript through native `details`/`summary`. Escape, outside clicks, and focus leaving the menu close it when JavaScript is available.

## Appearance and accessibility

- Offer **Light, Dark, and System** appearance settings in the shared menu. Light is the initial default, regardless of the system appearance. Explicit saved selections still apply.
- Save an explicit preference across pages/reloads; synchronize it across tabs. Storage failures must not break navigation or theme changes.
- Use `theme.js` in the document head to apply the preference before content paints. Theme-aware interactive graphics respond to `site-theme-change`.
- Retain accurate chart colors, visible labels, keyboard focus, and contrast. Do not invert imagery or recolor approved logos; place the approved logo on its light backing.
- Keep the menu usable on short screens through internal scrolling. Preserve touch target sizes and avoid covering anchor targets.
- Retain the shared animation preference and respect reduced-motion defaults. Page experiments can retain additional controls inside the menu.

## Verification and workflow

From the website repository, using the parent repository's shared Python environment:

```bash
~/.venvs/augment-wh/bin/python scripts/sync_site_header.py
~/.venvs/augment-wh/bin/python scripts/sync_site_header.py --check
node test_site_shell.mjs
~/.venvs/augment-wh/bin/python -m unittest -q
node test_site_links.mjs
```

For visible changes, check desktop and mobile layouts, menu keyboard behavior, cross-page theme persistence, and theme-aware charts through the connected browser when available. Report any browser verification blocker accurately. The static preview serves only `public/`; API behavior is checked separately. Existing publishing authorization and any explicit local-only iteration instructions remain governed by AGENTS.md and the active request.

After publishing, check both Vercel and the GitHub Pages fallback workflow for the
pushed commit. A completed push or successful Vercel status alone is insufficient.
Use README.md's deployment verification and recovery commands; inspect failed-step
logs before changing application code. Keep transient artifact retries bounded,
retain failure on the final attempt, and never publish protected routes to Pages.
