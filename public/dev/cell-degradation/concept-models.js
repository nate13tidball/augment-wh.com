/* Fictional presentation mechanics only. Replace with canonical model outputs before customer analysis. */
(function (root) {
  'use strict';
  const source = typeof module !== 'undefined' && module.exports ? require('./animation-finance-data.js').spec : root.AnimationFinance.spec;
  const HORIZON = source.model.year_max;
  const baseCase = source.finance.scenarios.find(c => c.name === 'Base');
  const defaults = Object.freeze({ revenue: baseCase.revenue_per_kwh_yr, costScale: 100,
    discount: baseCase.discount_rate * 100, fade: source.model.fade_augment, delay: 0 });
  const sum = values => values.reduce((a, b) => a + b, 0);

  function recovery(age = 5, added = 100) {
    const offline = 8; // Fixed annual average offline allowance, separate from SOC imbalance.
    const rated = 400, installed = rated + added;
    const retained = .975 ** age;
    const healthy = installed * retained;
    // Same fictional aging and disjoint operational losses apply to both cohorts.
    const aging = installed - healthy, imbalance = healthy * .08, unavailable = healthy * offline / 100;
    const conversion = (healthy - imbalance - unavailable) * .06;
    const delivered = healthy - imbalance - unavailable - conversion;
    const originalAt = year => rated * .975 ** year * (1 - .08 - offline / 100) * .94;
    const original = originalAt(age), benefit = delivered - original;
    return { rated, added, installed, age, retained, aging, imbalance, unavailable, conversion, delivered,
      original, benefit, originalYear0: originalAt(0), originalYear15: originalAt(15) };
  }

  // Matches the annual convention in V4 finance.py, including same-year installation income
  // and inflated straight-line residual value. This is not the daily dispatch model.
  function finance(options = {}, includeIrr = true) {
    const o = { ...defaults, ...options };
    const n = HORIZON + 1, plate = source.site_nameplate_kwh, model = source.model, fin = source.finance;
    const cash = Array(n).fill(0), revenue = Array(n).fill(0), maintenance = Array(n).fill(0);
    const investment = Array(n).fill(0), residual = Array(n).fill(0), originalProfit = Array(n).fill(0);
    const blocks = source.augment_blocks.map(b => ({ ...b, year: b.year + o.delay,
      kwh: plate * b.size / model.original_blocks,
      unitCost: model.gen_cost_per_kwh[b.gen] * o.costScale / 100,
    })).filter(b => b.year <= HORIZON);
    for (let year = 1; year <= HORIZON; year++) {
      const inflation = (1 + fin.inflation) ** year;
      const online = blocks.filter(b => b.year <= year);
      const addedUsable = sum(online.map(b => b.kwh * (1 - o.fade) ** (year - b.year)));
      revenue[year] = addedUsable * o.revenue * inflation;
      maintenance[year] = sum(online.map(b => b.kwh)) * fin.om_per_kwh_yr * inflation;
      originalProfit[year] = plate * ((1 - model.fade_original) ** year * o.revenue - fin.om_per_kwh_yr) * inflation;
    }
    for (const b of blocks) {
      b.capex = b.kwh * b.unitCost * (1 + fin.inflation) ** b.year;
      investment[b.year] -= b.capex;
      const lifeRemaining = Math.max(0, fin.block_life_years - (HORIZON - b.year)) / fin.block_life_years;
      residual[HORIZON] += b.kwh * b.unitCost * (1 + fin.inflation) ** HORIZON * lifeRemaining;
    }
    const operating = revenue.map((v, t) => v - maintenance[t]);
    for (let t = 0; t < n; t++) cash[t] = operating[t] + investment[t] + residual[t];
    const pv = values => sum(values.map((v, t) => v / (1 + o.discount / 100) ** t));
    const capexPV = -pv(investment), operatingPV = pv(operating), residualPV = pv(residual);
    const npv = pv(cash), originalProfitPV = pv(originalProfit);
    let balance = 0;
    const cumulative = cash.map(v => (balance += v));
    let irr = null;
    if (includeIrr && cash.some(v => v < 0) && cash.some(v => v > 0)) {
      const atRate = rate => sum(cash.map((v, t) => v / (1 + rate) ** t));
      let lo = -.99, hi = 5;
      if (atRate(lo) * atRate(hi) <= 0) {
        for (let i = 0; i < 200; i++) {
          const mid = (lo + hi) / 2;
          if (atRate(lo) * atRate(mid) <= 0) hi = mid; else lo = mid;
        }
        irr = (lo + hi) / 2 * 100;
      }
    }
    const originalCapital = plate * model.gen_cost_per_kwh[model.legacy_gen];
    return { cash, revenue, maintenance, investment, residual, operating, cumulative, blocks,
      years: cash.map((_, t) => t), capital: -sum(investment), capexPV, operatingPV, residualPV,
      npv, npvWithoutResidual: operatingPV - capexPV, originalProfitPV, irr,
      addedCapitalPct: 100 * capexPV / originalCapital,
      profitUpliftPct: originalProfitPV === 0 ? null : 100 * (operatingPV + residualPV) / originalProfitPV,
      returnPerDollar: capexPV > 0 ? (operatingPV + residualPV) / capexPV : null };
  }

  function rng(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + .5) / 4294967296; };
  }
  function triangular(u, low, mode, high) {
    if (high === low) return low;
    const split = (mode - low) / (high - low);
    return u < split ? low + Math.sqrt(u * (high - low) * (mode - low)) :
      high - Math.sqrt((1 - u) * (high - low) * (high - mode));
  }
  function quantile(sorted, p) {
    const i = (sorted.length - 1) * p, low = Math.floor(i);
    return sorted[low] + (sorted[Math.ceil(i)] - sorted[low]) * (i - low);
  }
  function risk(options = {}, uncertainty = 25, delay = 0) {
    const o = { ...defaults, ...options }, random = rng(20261122), spread = uncertainty / 100;
    const values = Array.from({ length: 600 }, () => finance({ ...o,
      delay,
      revenue: o.revenue * triangular(random(), 1 - spread, 1, 1 + spread),
      costScale: o.costScale * triangular(random(), 1 - spread, 1, 1 + spread),
      fade: triangular(random(), .005, source.model.fade_augment, .02),
    }, false).npv).sort((a, b) => a - b);
    return { values, p10: quantile(values, .1), median: quantile(values, .5), p90: quantile(values, .9),
      positive: values.filter(v => v > 0).length / values.length };
  }

  const api = { source, defaults, recovery, finance, risk, HORIZON };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DemoConcepts = api;
})(globalThis);
