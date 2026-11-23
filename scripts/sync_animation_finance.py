"""Export the V4 animation's exact inputs and canonical financial results for the demo.

Usage: python scripts/sync_animation_finance.py /path/to/site_plan_model.json
Only writes the website fixture; never modifies the animation or its generated tables.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys


def build(source: Path):
    spec = json.loads(source.read_text())
    module_spec = importlib.util.spec_from_file_location('animation_finance', source.with_name('finance.py'))
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    source_results = module.evaluate(spec, spec['finance'])
    cases = []
    for case, result in zip(spec['finance']['scenarios'], source_results):
        cash = module.augmentation_cash_flows(spec['model'], spec['augment_blocks'],
                                             spec['model']['gen_cost_per_kwh'], spec['finance'], case['revenue_per_kwh_yr'])
        cash = [v * spec['site_nameplate_kwh'] for v in cash]
        npv = sum(v / (1 + case['discount_rate']) ** t for t, v in enumerate(cash))
        cases.append(dict(**result, cash=cash, npv=npv))
    payload = dict(source='animations/grid-to-battery-life-zoom-v4/site_plan_model.json',
                   source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                   finance_sha256=hashlib.sha256(source.with_name('finance.py').read_bytes()).hexdigest(),
                   spec=spec, references=cases)
    target = Path(__file__).resolve().parents[1] / 'public/dev/cell-degradation/animation-finance-data.js'
    target.write_text('/* Generated from the V4 animation model; see scripts/sync_animation_finance.py. */\n'
                      '(function(root) { const data = ' + json.dumps(payload, separators=(',', ':'), allow_nan=False) + ';\n'
                      'if (typeof module !== "undefined" && module.exports) module.exports = data;\n'
                      'else root.AnimationFinance = data; })(globalThis);\n')
    for case in cases:
        print(f"{case['name']}: NPV ${case['npv']:,.2f}; added capital {case['added_capex_pct']:.2f}%; "
              f"added profit incl. residual {case['profit_uplift_pct']:.2f}%; IRR {case['irr_pct']:.2f}%")


if __name__ == '__main__':
    build(Path(sys.argv[1]).resolve())
