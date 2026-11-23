"""Copy the lifetime site planning slides into /solution-explained/ and rewrite the page's slide list.

Source: the parent repository's click-through deck build (animations/svgframes/deck.py), by default
../animations/grid-to-battery-life-zoom-v4/out/deck. Run after rebuilding that deck:

    python3 scripts/sync_solution_deck.py

Copies slides into public/assets/solution-explained/slides/ and replaces the markup between the
solution-deck markers in public/solution-explained/index.html (or --page).
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT.parent / "animations" / "grid-to-battery-life-zoom-v4" / "out" / "deck"
ASSETS = ROOT / "public" / "assets" / "solution-explained" / "slides"
PAGE = ROOT / "public" / "solution-explained" / "index.html"
COVER = 13  # slide shown first, before the visitor starts the deck
START, END = "<!-- solution-deck:start -->", "<!-- solution-deck:end -->"


def dwell_ms(notes: list[str]) -> int:
    """Time on a slide during autoplay: enough to read its notes, never under 6 seconds."""
    words = sum(len(n.split()) for n in notes)
    return max(6000, 3000 + words * 220)


def slide_markup(slides: list[dict]) -> str:
    total = len(slides)
    items = []
    for i, s in enumerate(slides, start=1):
        name = Path(s["src"]).name
        loading = "eager" if i in (1, COVER) else "lazy"
        notes = "".join(f"<li>{html.escape(n)}</li>" for n in s["notes"])
        items.append(
            f'      <li class="deck-slide" id="slide-{i}" role="group" aria-roledescription="slide" '
            f'aria-label="{i} of {total}" data-dwell="{dwell_ms(s["notes"])}">\n'
            f'        <img src="/assets/solution-explained/slides/{name}" width="1920" height="1080" '
            f'alt="{html.escape(s["alt"], quote=True)}" loading="{loading}" decoding="async">\n'
            f'        <ul class="deck-notes" aria-label="Speaker notes">{notes}</ul>\n'
            f'      </li>')
    return "\n".join(items)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--page", type=Path, default=PAGE)
    parser.add_argument("--skip-assets", action="store_true", help="only rewrite the page markup")
    args = parser.parse_args()

    slides = json.loads((args.source / "slides.json").read_text())
    if not args.skip_assets:
        if ASSETS.exists():
            shutil.rmtree(ASSETS)
        ASSETS.mkdir(parents=True)
        for s in slides:
            shutil.copyfile(args.source / s["src"], ASSETS / Path(s["src"]).name)

    page = args.page.read_text()
    a, b = page.index(START) + len(START), page.index(END)
    indent = page[page.rindex("\n", 0, b) + 1:b]
    args.page.write_text(page[:a] + "\n" + slide_markup(slides) + "\n" + indent + page[b:])
    print(f"synced {len(slides)} slides into {args.page}")


if __name__ == "__main__":
    main()
