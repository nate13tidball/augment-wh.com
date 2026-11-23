// Synthetic demo arithmetic and UI wiring; no external services or scientific backends.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fixture = require('./public/modeling-demos/animation-finance-data.js');
const M = require('./public/modeling-demos/concept-models.js');
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
let checks = 0;
function check(name, body) { body(); checks++; console.log(`PASS ${name}`); }

check('Augmentation waterfall conserves energy and scales every loss with added units', () => {
  for (const age of [0, 5, 15]) {
    const base = M.recovery(age, 0);
    const added = M.recovery(age, 100);
    near(added.rated + added.added, added.aging + added.imbalance + added.unavailable + added.conversion + added.delivered);
    for (const key of ['aging', 'imbalance', 'unavailable', 'conversion', 'delivered']) near(added[key], base[key] * 1.25);
    near(added.unavailable, added.installed * added.retained * .08);
    near(added.original, base.delivered);
    near(added.benefit, added.delivered - added.original);
    near(base.benefit, 0);
    near(added.originalYear0, M.recovery(0, 0).delivered);
    near(added.originalYear15, M.recovery(15, 0).delivered);
    assert.ok(added.originalYear0 > added.originalYear15);
  }
  assert.ok(M.recovery(15, 100).delivered < M.recovery(0, 100).delivered);
  near(M.recovery(0, 100).aging, 0);
});
check('All animation cases match canonical Python cash flows and results', () => {
  fixture.spec.finance.scenarios.forEach((c, i) => {
    const r = M.finance({ revenue: c.revenue_per_kwh_yr, discount: c.discount_rate * 100 }), expected = fixture.references[i];
    r.cash.forEach((v, t) => near(v, expected.cash[t]));
    near(r.npv, expected.npv); near(r.addedCapitalPct, expected.added_capex_pct);
    near(r.profitUpliftPct, expected.profit_uplift_pct); near(r.irr, expected.irr_pct);
    near(r.returnPerDollar, expected.return_per_dollar);
  });
});
check('Added capacity normalization, ledger, residual, and discounting reconcile', () => {
  const r = M.finance();
  near(r.blocks.reduce((total, b) => total + b.kwh, 0), 43500);
  near(r.blocks[0].capex, 100000 * .608 / 3 * 210 * 1.025 ** 4);
  assert.ok(r.cash.slice(0, 4).every(v => v === 0));
  assert.ok(r.residual.slice(0, 15).every(v => v === 0));
  r.cash.forEach((v, t) => near(v, r.revenue[t] - r.maintenance[t] + r.investment[t] + r.residual[t]));
  near(r.npv, r.npvWithoutResidual + r.residualPV);
  const zero = M.finance({ discount: 0 });
  near(zero.npv, zero.cash.reduce((a, b) => a + b, 0));
  assert.ok(M.finance({ costScale: 140 }).npv < r.npv);
  assert.ok(fixture.references[0].npv < 0 && r.npv > 0);
});
check('Risk is reproducible and responds to cost and delayed campaigns', () => {
  const base = M.risk();
  assert.deepEqual(base, M.risk());
  assert.equal(base.values.length, 600);
  assert.ok(base.values.every(Number.isFinite));
  assert.ok(base.p10 <= base.median && base.median <= base.p90);
  assert.ok(M.risk({ costScale: 140 }).median < base.median);
  const delayed = M.finance({ delay: 3 });
  assert.equal(delayed.cash.length, 16);
  assert.equal(delayed.blocks.length, 3);
  assert.ok(M.risk({}, 50, 3).values.every(Number.isFinite));
});

const html = fs.readFileSync('./public/modeling-demos/index.html', 'utf8');
const controller = fs.readFileSync('./public/modeling-demos/concepts.js', 'utf8');
function makeUI(withCharts = true) {
  const nodes = new Map(), controls = [], buttons = [], frames = [], plots = new Map(), events = {};
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const tag = match[0], id = match[1];
    const node = { id, hidden: /\shidden(?:\s|>)/.test(tag), textContent: '', dataset: {}, setAttribute(k, v) { this[k] = v; }, handlers: {},
      addEventListener(k, fn) { this.handlers[k] = fn; },
      parentElement: { querySelectorAll() { return [{}, {}]; } } };
    if (tag.startsWith('<input') && id !== 'service-year' && !id.startsWith('dispatch-')) {
      for (const name of ['value', 'min', 'max']) node[name] = tag.match(new RegExp(`${name}="([^"]+)"`))[1];
      node.dataset.unit = tag.match(/data-unit="([^"]*)"/)[1];
      controls.push(node);
    }
    if (tag.includes('data-finance-case')) {
      node.dataset.financeCase = tag.match(/data-finance-case="([^"]+)"/)[1]; buttons.push(node);
    }
    nodes.set(id, node);
  }
  const context = { DemoConcepts: M, AnimationFinance: fixture, console,
    window: { addEventListener(name, fn) { events[name] = fn; } },
    document: { documentElement: { dataset: { theme: 'light' } }, getElementById(id) { assert.ok(nodes.has(id), id); return nodes.get(id); }, querySelectorAll: selector => selector === '[data-finance-case]' ? buttons : controls },
    requestAnimationFrame: fn => frames.push(fn),
  };
  if (withCharts) context.Plotly = { react(element, data, layout) { plots.set(element.id, { data, layout }); return Promise.resolve(); } };
  vm.runInNewContext(controller, context);
  const flush = () => { while (frames.length) frames.shift()(); };
  const change = (id, v) => { const node = nodes.get(id); node.value = String(v); node.handlers.input(); flush(); };
  flush();
  return { nodes, controls, plots, change, theme(value) { context.document.documentElement.dataset.theme = value; events['site-theme-change'](); flush(); }, click(id) { nodes.get(id).handlers.click(); flush(); } };
}
check('Every populated control updates its output and linked plots', () => {
  const ui = makeUI();
  assert.equal(ui.plots.size, 2);
  assert.equal(ui.controls.length, 7);
  for (const control of ui.controls) {
    const original = control.value;
    ui.change(control.id, control.min);
    assert.notEqual(ui.nodes.get(`${control.id}-value`).textContent, '');
    ui.change(control.id, control.max);
    ui.change(control.id, original);
  }
  const oldNPV = ui.nodes.get('finance-0').textContent;
  ui.click('finance-low');
  assert.equal(ui.nodes.get('finance-0').dataset.negative, 'true');
  assert.notEqual(oldNPV, ui.nodes.get('finance-0').textContent);
  assert.equal(ui.nodes.get('downside-risk').hidden, true);
  assert.ok(!ui.plots.has('risk-plot'));
  assert.ok(!html.includes('href="#downside-risk"'));
  for (const id of ['finance-ledger-body', 'finance-schedule-body', 'finance-scenarios-body', 'finance-verdict', 'economics-map']) assert.ok(!ui.nodes.has(id));
  assert.doesNotMatch(html, /illustrative/i);
  assert.match(html, /href="\/solution-explained\/">View solution animation/);
  assert.doesNotMatch(ui.nodes.get('finance-selection').textContent, /animation/i);
  ui.click('finance-high');
  assert.equal(ui.nodes.get('finance-revenue').value, '45');
  assert.equal(ui.nodes.get('finance-discount').value, '6');
  assert.equal(ui.nodes.get('finance-high')['aria-pressed'], 'true');
  assert.match(ui.nodes.get('finance-selection').textContent, /High/);
  ui.change('finance-cost-scale', 140);
  assert.match(ui.nodes.get('finance-selection').textContent, /Custom/);
  assert.ok(!html.includes('augmentation-timing'));
  assert.ok(!ui.nodes.has('recovery-offline'));
  const section = html.slice(html.indexOf('id="capacity-recovery"'), html.indexOf('id="dispatch-replay"'));
  assert.ok(section.indexOf('id="recovery-0"') < section.indexOf('id="recovery-plot"'));
  assert.ok(section.indexOf('id="recovery-plot"') < section.indexOf('id="recovery-added"'));
  for (const age of [0, 1, 15]) {
    ui.change('recovery-age', age);
    for (let i = 0; i < 3; i++) assert.equal(ui.nodes.get('recovery-year-' + i).textContent, `Year ${age} after commissioning`);
    assert.equal(ui.nodes.get('recovery-0').textContent, `${M.recovery(age, 100).delivered.toFixed(1)} MWh`);
  }
  const before = ui.plots.get('recovery-plot').data[0].y;
  ui.change('recovery-added', 400);
  const after = ui.plots.get('recovery-plot').data[0].y;
  assert.equal(after[1], 400);
  assert.ok(after[2] < before[2] && after[3] < before[3] && after[4] < before[4]);
  assert.match(ui.plots.get('recovery-plot').data[0].x[6], /interconnection/);
  for (const added of [0, 100, 400]) {
    ui.change('recovery-added', added);
    const plot = ui.plots.get('recovery-plot'), result = M.recovery(15, added);
    const comparison = plot.data[1];
    near(comparison.base[0], result.original);
    near(comparison.base[0] + comparison.y[0], result.delivered);
    near(comparison.base[1], 0);
    near(comparison.y[1], result.original);
    assert.match(comparison.x[0], /delta/);
    assert.equal(plot.layout.shapes.length, 3);
    assert.ok(plot.layout.shapes.every(shape => shape.yref === 'paper' && !shape.line.dash));
    assert.equal(plot.layout.annotations.length, 1);
    assert.equal(plot.layout.annotations[0].text, '<b>Point of interconnection</b>');
  }
  assert.ok(!ui.nodes.has('recovery-reference-note'));
  ui.change('recovery-age', 0);
  near(ui.plots.get('recovery-plot').data[0].y[2], 0);

});
check('Chart appearance follows the theme without changing capacity or financial results', () => {
  const ui = makeUI(); ui.change('recovery-age', 12); ui.click('finance-high');
  const capacity = ui.nodes.get('recovery-0').textContent, npv = ui.nodes.get('finance-0').textContent;
  for (const theme of ['dark', 'light']) {
    ui.theme(theme);
    for (const {layout} of ui.plots.values()) {
      assert.equal(layout.font.color, theme === 'dark' ? '#edf3ed' : '#202220');
      assert.ok(layout.font.size >= 16 && layout.xaxis.title.font.size >= 16);
    }
    assert.ok(ui.plots.get('recovery-plot').layout.xaxis.tickfont.size >= 16);
    assert.equal(ui.nodes.get('recovery-0').textContent, capacity);
    assert.equal(ui.nodes.get('finance-0').textContent, npv);
    assert.equal(ui.plots.size, 2);
  }
});

check('CDN failure still leaves controls and financial summaries usable', () => {
  const ui = makeUI(false);
  assert.match(ui.nodes.get('concept-status').textContent, /unavailable/);
  ui.click('finance-base');
  assert.equal(ui.nodes.get('finance-0').textContent, '$1.58m');
});
console.log(`${checks} concept checks passed.`);
