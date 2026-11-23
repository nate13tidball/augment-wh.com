"""Copy the synthetic cell showcase chart data into the protected site demo."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = SITE_ROOT.parent / (
    "modeling/degradation/mechanistic_cell/state_estimation/outputs/"
    "customer_showcase/chart_source.json"
)
DESTINATION = SITE_ROOT / "public/modeling-demos/data.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    args = parser.parse_args()
    source = json.loads(args.source.read_text())
    years = source["year_slider_histograms"]["years"]
    if (source["label"] != "synthetic representative-cell demonstration; no customer records"
            or source["chemistry"] != "LFP" or source["draw_count"] != 400
            or years != list(range(3, 14))):
        parser.error("source does not match the documented synthetic cell example")
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.source, DESTINATION)
    digest = hashlib.sha256(DESTINATION.read_bytes()).hexdigest()
    print(f"Copied {args.source} -> {DESTINATION} (SHA-256 {digest})")


if __name__ == "__main__":
    main()
