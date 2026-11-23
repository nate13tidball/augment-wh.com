"""Build nine fictional, perfect-foresight daily dispatch examples for the website.

This presentation fixture is independent of the canonical site-operation backend.
Uses SciPy/HiGHS MILP rather than inventing an optimizer. No customer/market data.
Run with ~/.venvs/augment-wh/bin/python scripts/build_dispatch_examples.py.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import lil_matrix

ROOT = Path(__file__).resolve().parents[1]
DT = .25
N = 96
POWER = 100.
BASE_ENERGY = 200.  # Usable AC-discharge-equivalent MWh: exactly 2 h at 100 MW.
ROUND_TRIP = .90
WEAR = 3.  # Fictional variable cost per MWh discharged at the battery meter.
ADDITIONS = [0, 100, 300]


def scenarios():
    hour = np.arange(N) * DT
    solar = 150 * np.maximum(0, np.sin((hour - 6) * np.pi / 12)) ** 1.6
    # Invented local-clock, 24-hour tariffs. These are not actual market observations.
    return [
        dict(id="ercot", label="ERCOT-style arbitrage", solar=np.zeros(N), grid_charge=True,
             prices=np.repeat([28, 24, 21, 18, 22, 35, 65, 90, 55, 20, 5, -10,
                               -20, -12, 15, 45, 120, 280, 260, 160, 75, 50, 35, 30], 4),
             credit=0., window=[16, 20], request=np.zeros(N),
             description="Buy during low-price hours and sell into the evening peak. Extra MWh extends the discharge window.",
             price_note="Invented energy prices: −$20 to $280/MWh. Grid charging allowed; no ancillary-service revenue.",
             window_label="Evening price peak", lesson="More energy reaches additional price intervals; the 100 MW export ceiling stays fixed."),
        dict(id="solar", label="Solar + storage", solar=solar, grid_charge=False,
             prices=np.repeat([28, 25, 22, 20, 22, 28, 40, 55, 45, 30, 18, 12,
                               8, 10, 16, 30, 65, 145, 160, 140, 90, 55, 38, 30], 4),
             credit=0., window=[17, 21], request=np.zeros(N),
             description="Shift a 150 MW solar profile into evening hours behind one shared 100 MW interconnection.",
             price_note="Invented energy prices: $8 to $160/MWh. Solar charging only; displaced solar sales are included in site economics.",
             window_label="Evening energy value", lesson="The yellow line is solar used, including battery charging. The dotted line is combined site export."),
        dict(id="peak", label="Evening peak support", solar=np.zeros(N), grid_charge=True,
             prices=np.repeat([28, 25, 22, 20, 19, 23, 30, 42, 38, 27, 21, 18,
                               16, 17, 22, 29, 35, 45, 46, 47, 48, 36, 31, 29], 4),
             credit=120., window=[17, 21], request=np.where((hour >= 17) & (hour < 21), 100., 0.),
             description="Support a four-hour evening request. Added energy extends delivery without changing the 100 MW power rating.",
             price_note="Invented energy prices: $16 to $48/MWh, plus $120/MWh for delivery during 17:00–21:00.",
             window_label="100 MW peak-support request", lesson="Unserved request energy stays visible. The delivery credit is fictional; no capacity-market qualification is implied."),
    ]


def solve(scenario, added):
    """Maximize POI energy value + delivery credit − battery throughput cost.

    Variables: charge, discharge, solar used, stored energy (N+1), charge-mode binary.
    Signed POI power = solar used + discharge - charge. One settlement per POI interval.
    Start/end empty; stored energy is measured as deliverable AC MWh, not DC nameplate.
    """
    c, d, pv, e, z = 0, N, 2 * N, 3 * N, 4 * N + 1
    size = 5 * N + 1
    capacity = BASE_ENERGY + added
    prices = np.asarray(scenario['prices'], dtype=float)
    credit = np.where(scenario['request'] > 0, scenario['credit'], 0.)
    objective = np.zeros(size)
    objective[c:c + N] = prices * DT
    objective[d:d + N] = (-prices - credit + WEAR) * DT
    objective[pv:pv + N] = -prices * DT
    lower = np.zeros(size)
    upper = np.concatenate([np.full(N, POWER), np.full(N, POWER), scenario['solar'],
                            np.full(N + 1, capacity), np.ones(N)])
    upper[e] = upper[e + N] = 0.
    integrality = np.zeros(size)
    integrality[z:] = 1
    rows, lo, hi = [], [], []

    def constraint(coefficients, minimum=-np.inf, maximum=np.inf):
        rows.append(coefficients)
        lo.append(minimum)
        hi.append(maximum)

    for t in range(N):
        constraint({e+t+1: 1., e+t: -1., c+t: -ROUND_TRIP * DT, d+t: DT}, 0., 0.)
        constraint({pv+t: 1., d+t: 1., c+t: -1.}, -POWER if scenario['grid_charge'] else 0., POWER)
        constraint({c+t: 1., z+t: -POWER}, maximum=0.)
        constraint({d+t: 1., z+t: POWER}, maximum=POWER)
        if not scenario['grid_charge']:
            constraint({c+t: 1., pv+t: -1.}, maximum=0.)
    matrix = lil_matrix((len(rows), size))
    for i, row in enumerate(rows):
        for j, v in row.items():
            matrix[i, j] = v
    result = milp(objective, integrality=integrality, bounds=Bounds(lower, upper),
                  constraints=LinearConstraint(matrix.tocsr(), lo, hi),
                  options={'mip_rel_gap': 1e-9, 'time_limit': 30})
    if not result.success or result.mip_gap > 1e-8:
        raise RuntimeError(f"Dispatch not solved to optimum: {result.message}")
    charge, discharge, solar_used = [result.x[start:start+N] for start in [c, d, pv]]
    stored = result.x[e:e+N+1]
    battery = discharge - charge
    poi = solar_used + battery
    exported = np.maximum(poi, 0)
    imported = np.maximum(-poi, 0)
    energy_sales = float(np.sum(exported * prices) * DT)
    purchase_cost = float(np.sum(imported * prices) * DT)  # Negative prices can produce a credit.
    delivery_credit = float(np.sum(discharge * credit) * DT)
    wear_cost = float(np.sum(discharge) * DT * WEAR)
    net = energy_sales - purchase_cost + delivery_credit - wear_cost
    if abs(net + result.fun) > 1e-4:
        raise AssertionError('Dispatch objective and settlement do not reconcile')
    capex = added * 1000 * 140.
    capital_recovery_factor = .08 * 1.08 ** 15 / (1.08 ** 15 - 1)
    allocated_cost = (capex * capital_recovery_factor + added * 1000 * 4) / 365
    unserved = float(np.sum(np.maximum(0, scenario['request'] - discharge)) * DT)
    clean = lambda seq: [round(float(x), 7) if abs(x) > 1e-7 else 0. for x in seq]
    return dict(added_mwh=added, capacity_mwh=capacity, duration_hours=capacity / POWER,
                battery_mw=clean(battery), solar_used_mw=clean(solar_used), poi_mw=clean(poi),
                charge_mw=clean(charge), discharge_mw=clean(discharge), stored_mwh=clean(stored),
                metrics=dict(energy_sales=energy_sales, purchase_cost=purchase_cost,
                             delivery_credit=delivery_credit, wear_cost=wear_cost, operating_margin=net,
                             charged_mwh=float(sum(charge)*DT), discharged_mwh=float(sum(discharge)*DT),
                             curtailed_mwh=float(sum(scenario['solar']-solar_used)*DT),
                             unserved_mwh=unserved, capex=capex, daily_capacity_cost=allocated_cost),
                solver=dict(status='optimal', relative_gap=float(result.mip_gap)))


def build():
    output = dict(version=1, synthetic=True, interval_hours=DT, battery_power_mw=POWER,
                  interconnection_mw=POWER, base_capacity_mwh=BASE_ENERGY, availability_pct=100,
                  round_trip_efficiency=ROUND_TRIP, wear_usd_per_discharge_mwh=WEAR,
                  additions_mwh=ADDITIONS, hours=[i*DT for i in range(N)], scenarios=[])
    for s in scenarios():
        cases = [solve(s, added) for added in ADDITIONS]
        base = cases[0]['metrics']['operating_margin']
        for case in cases:
            m = case['metrics']
            m['incremental_margin'] = m['operating_margin'] - base
            m['incremental_after_capacity_cost'] = m['incremental_margin'] - m['daily_capacity_cost']
        item = {key: value for key, value in s.items() if key not in ['prices', 'solar', 'request']}
        item.update(prices=s['prices'].tolist(), solar_available_mw=s['solar'].tolist(),
                    request_mw=s['request'].tolist(), cases=cases)
        output['scenarios'].append(item)
    return output


if __name__ == '__main__':
    payload = build()
    target = ROOT / 'public/modeling-demos/dispatch-data.js'
    # A deployment fixture, usable without runtime fetches or a browser solver.
    target.write_text('/* Generated fictional examples; rebuild with scripts/build_dispatch_examples.py. */\n'
                      '(function (root) { const data = ' + json.dumps(payload, separators=(',', ':'), allow_nan=False) + ';\n'
                      'if (typeof module !== "undefined" && module.exports) module.exports = data;\n'
                      'else root.DispatchExamples = data; })(globalThis);\n')
    for s in payload['scenarios']:
        print(s['id'], [(c['added_mwh'], round(c['metrics']['incremental_after_capacity_cost'])) for c in s['cases']])
