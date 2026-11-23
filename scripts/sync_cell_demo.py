"""Build the three-profile site demo from the synthetic cell showcase snapshot."""

import argparse
import hashlib
import json
import sys
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = SITE_ROOT.parent / (
    "modeling/degradation/mechanistic_cell/state_estimation/outputs/"
    "customer_showcase_25_year/chart_source.json"
)
DESTINATION = SITE_ROOT / "public/modeling-demos/data.json"


def add_hot_low_usage(source: dict, source_path: Path) -> None:
    # Use the same inferred cell and Monte Carlo seed as the original profiles.
    sys.path.insert(0, str(SITE_ROOT.parent))
    import numpy as np
    from modeling.degradation.mechanistic_cell.state_estimation.customer_forecast import digest, forecast
    from modeling.degradation.mechanistic_cell.state_estimation.customer_showcase import _series
    from modeling.degradation.mechanistic_cell.state_estimation.snapshot import CellConfigurationSnapshot
    from plotting_model import ensemble_histograms_by_year, threshold_crossing_timeline

    directory = source_path.parent
    snapshot_path = directory / "cutoff_snapshot.json"
    if hashlib.sha256(snapshot_path.read_bytes()).hexdigest() != source["cutoff_snapshot_sha256"]:
        raise ValueError("showcase snapshot does not match chart source")
    snapshot = CellConfigurationSnapshot.load(snapshot_path)
    config = json.loads((directory / "input/cell_config.json").read_text())
    scenario = {**source["forecasts"]["central"]["assumptions"],
                "id": "hot_low_usage", "mean_temperature_k": 308.15,
                "efc_per_year": 120, "cycle_depth": .5}
    _, result = forecast(snapshot, config, scenario, seed=source["seed"] + 1,
                         end_service_year=source["forecast_end_service_year"])
    source["forecasts"][scenario["id"]] = _series(
        snapshot, result, source["nominal_capacity_ah"], source["forecast_end_service_year"])
    results = {name: json.loads((directory / name / "forecast.json").read_text())
               for name in ("central", "conservative")}
    for name, item in results.items():
        if digest(item) != source["forecasts"][name]["forecast_sha256"]:
            raise ValueError(f"{name} forecast does not match chart source")
    results[scenario["id"]] = result
    years = source["year_slider_histograms"]["years"]
    draws = {name: [[row["capacity_ah"] / source["nominal_capacity_ah"] * 100
                     for row in draw["annual"] if row["year"] in years]
                    for draw in item["joint_draws"]] for name, item in results.items()}
    source["year_slider_histograms"] = ensemble_histograms_by_year(years, draws, bin_width=2)
    source["threshold_timeline"] = threshold_crossing_timeline(years, draws, threshold=80)
    values = [value for item in source["forecasts"].values()
              for value in item["year_10_capacity_pct_nominal"]]
    bins = np.arange(np.floor(min(values)), np.ceil(max(values)) + 2)
    source["histogram"] = {"service_year": 10, "bin_edges_pct_nominal": bins.tolist(),
                           "counts_by_scenario": {
                               name: np.histogram(item["year_10_capacity_pct_nominal"], bins=bins)[0].tolist()
                               for name, item in source["forecasts"].items()}}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    args = parser.parse_args()
    source = json.loads(args.source.read_text())
    years = source["year_slider_histograms"]["years"]
    if (source["label"] != "synthetic representative-cell demonstration; no customer records"
            or source["chemistry"] != "LFP" or source["draw_count"] != 400
            or years != list(range(3, 26)) or source.get("rated_duration_hours") != 3.5):
        parser.error("source does not match the documented synthetic cell example")
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    add_hot_low_usage(source, args.source)
    DESTINATION.write_text(json.dumps(source, indent=2, sort_keys=True) + "\n")
    digest = hashlib.sha256(DESTINATION.read_bytes()).hexdigest()
    print(f"Built {args.source} -> {DESTINATION} (SHA-256 {digest})")


if __name__ == "__main__":
    main()
