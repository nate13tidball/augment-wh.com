const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('./public/modeling-demos/dispatch-data.js');
const near = (a, b, tolerance = 1e-4) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const sum = a => a.reduce((x, y) => x + y, 0);
let count = 0;
function check(name, body) { body(); count++; console.log(`PASS ${name}`); }

check('Three examples, three sizes, constant 100 MW and a genuine two-hour base', () => {
  assert.deepEqual(data.scenarios.map(s => s.id), ['ercot', 'solar', 'peak']);
  assert.deepEqual(data.additions_mwh, [0, 50, 100]);
  assert.equal(data.availability_pct, 100);
  assert.equal(data.battery_power_mw, 100);
  assert.equal(data.interconnection_mw, 100);
  assert.equal(data.base_capacity_mwh / data.battery_power_mw, 2);
  assert.equal(data.hours.length, 96);
  assert.equal(data.synthetic, true);
});

check('All nine schedules satisfy interval conservation, power, energy, and import constraints', () => {
  for (const s of data.scenarios) for (const c of s.cases) {
    assert.equal(c.solver.status, 'optimal');
    assert.ok(c.solver.relative_gap < 1e-8);
    assert.equal(c.stored_mwh.length, 97);
    near(c.stored_mwh[0], 0); near(c.stored_mwh.at(-1), 0);
    near(c.capacity_mwh, 200 + c.added_mwh);
    near(c.duration_hours, c.capacity_mwh / 100);
    for (let t = 0; t < 96; t++) {
      const charge = c.charge_mw[t], discharge = c.discharge_mw[t], solar = c.solar_used_mw[t];
      assert.ok([charge, discharge, solar, c.poi_mw[t], c.stored_mwh[t]].every(Number.isFinite));
      assert.ok(charge >= -1e-6 && charge <= 100 + 1e-6 && discharge >= -1e-6 && discharge <= 100 + 1e-6);
      assert.ok(charge * discharge < 1e-4, 'simultaneous charging/discharging');
      assert.ok(c.poi_mw[t] >= -100 - 1e-6 && c.poi_mw[t] <= 100 + 1e-6);
      assert.ok(c.stored_mwh[t] >= -1e-6 && c.stored_mwh[t] <= c.capacity_mwh + 1e-6);
      near(c.stored_mwh[t + 1], c.stored_mwh[t] + .9 * charge * .25 - discharge * .25);
      near(c.battery_mw[t], discharge - charge);
      near(c.poi_mw[t], solar + discharge - charge);
      assert.ok(solar >= -1e-6 && solar <= s.solar_available_mw[t] + 1e-6);
      if (!s.grid_charge) assert.ok(c.poi_mw[t] >= -1e-6 && charge <= solar + 1e-6);
    }
  }
});

check('Independent settlement and capacity-cost calculations reconcile', () => {
  for (const s of data.scenarios) for (const c of s.cases) {
    const m = c.metrics;
    const revenue = sum(c.poi_mw.map((p, i) => Math.max(0, p) * s.prices[i] * .25));
    const purchases = sum(c.poi_mw.map((p, i) => Math.max(0, -p) * s.prices[i] * .25));
    const wear = sum(c.discharge_mw) * .25 * 3;
    const support = sum(c.discharge_mw.map((p, i) => s.request_mw[i] > 0 ? p * .25 * s.credit : 0));
    near(m.energy_sales, revenue); near(m.purchase_cost, purchases); near(m.wear_cost, wear); near(m.delivery_credit, support);
    near(m.operating_margin, revenue - purchases + support - wear);
    near(m.incremental_margin, m.operating_margin - s.cases[0].metrics.operating_margin);
    near(m.capex, c.added_mwh * 140000);
    near(m.daily_capacity_cost, (m.capex * (.08 / (1 - 1.08 ** -15)) + c.added_mwh * 4000) / 365);
    near(m.incremental_after_capacity_cost, m.incremental_margin - m.daily_capacity_cost);
    near(m.charged_mwh, sum(c.charge_mw) * .25);
    near(m.discharged_mwh, sum(c.discharge_mw) * .25);
    near(m.curtailed_mwh, sum(s.solar_available_mw.map((p, i) => p - c.solar_used_mw[i])) * .25);
    near(m.unserved_mwh, sum(s.request_mw.map((p, i) => Math.max(0, p - c.discharge_mw[i]))) * .25);
  }
});

check('More energy increases optimized operating margin and reduces peak-support shortfall', () => {
  for (const s of data.scenarios) {
    assert.ok(s.cases[2].metrics.operating_margin >= s.cases[1].metrics.operating_margin - 1e-5);
    assert.ok(s.cases[1].metrics.operating_margin >= s.cases[0].metrics.operating_margin - 1e-5);
    near(s.cases[0].metrics.incremental_after_capacity_cost, 0);
    assert.notDeepEqual(s.cases[0].battery_mw, s.cases[1].battery_mw);
  }
  const peak = data.scenarios.find(s => s.id === 'peak');
  assert.ok(peak.cases[0].metrics.unserved_mwh > 0);
  assert.ok(peak.cases[2].metrics.unserved_mwh < peak.cases[1].metrics.unserved_mwh);
  assert.ok(peak.cases[1].metrics.unserved_mwh < peak.cases[0].metrics.unserved_mwh);
});

const html = fs.readFileSync('./public/modeling-demos/index.html', 'utf8');
const script = fs.readFileSync('./public/modeling-demos/dispatch.js', 'utf8');
function ui(charts = true) {
  const nodes = new Map(), buttons = [], capacityButtons = [], plots = [], events = {};
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const [tag, id] = match;
    const node = { id, textContent: '', innerHTML: '', dataset: {}, handlers: {},
      setAttribute(k, v) { this[k] = v; }, addEventListener(k, fn) { this.handlers[k] = fn; } };
    if (tag.includes('data-scenario=')) {
      node.dataset.scenario = tag.match(/data-scenario="([^"]+)"/)[1]; buttons.push(node);
    }
    if (tag.includes('data-augmentation=')) {
      node.dataset.augmentation = tag.match(/data-augmentation="([^"]+)"/)[1]; capacityButtons.push(node);
    }
    nodes.set(id, node);
  }
  const context = { DispatchExamples: data,
    window: { addEventListener(name, fn) { events[name] = fn; } },
    document: { documentElement: { dataset: { theme: 'light' } }, getElementById(id) { assert.ok(nodes.has(id), id); return nodes.get(id); }, querySelectorAll: selector => selector === '[data-scenario]' ? buttons : capacityButtons },
  };
  if (charts) context.Plotly = { react(node, traces, layout) { plots.push({ node, traces, layout }); return Promise.resolve(); } };
  vm.runInNewContext(script, context);
  return { nodes, buttons, capacityButtons, plots, theme(value) { context.document.documentElement.dataset.theme = value; events['site-theme-change'](); }, change(value) {
    capacityButtons[value].handlers.click();
  } };
}

check('Scenario and capacity buttons compare baseline with selection and update summaries', () => {
  const state = ui();
  const section = html.split('id="dispatch-replay"')[1].split('</section>')[0];
  assert.equal((section.match(/type="range"/g) || []).length, 0);
  assert.equal((section.match(/id="dispatch-plot"/g) || []).length, 1);
  assert.ok(!section.includes('dispatch-table') && !section.includes('What changes financially?'));
  assert.equal(state.capacityButtons.length, 3);
  assert.ok(!section.includes('concept-metrics') && !section.includes('availability'));
  assert.match(section, /Base augmentation · \+50 MWh/);
  assert.match(section, /Over-augmentation · \+100 MWh/);
  for (const button of state.buttons) {
    button.handlers.click();
    assert.equal(button['aria-pressed'], 'true');
    assert.equal(state.buttons.filter(b => b['aria-pressed'] === 'true').length, 1);
    const s = data.scenarios.find(s => s.id === button.dataset.scenario);
    for (let index = 0; index < 3; index++) {
      state.change(index);
      const chart = state.plots.at(-1), c = s.cases[index];
      assert.equal(chart.node.id, 'dispatch-plot');
      assert.equal(chart.traces.length, s.id === 'ercot' ? 2 : 3);
      assert.deepEqual(Array.from(chart.traces[1].y).slice(0, 96), c.battery_mw);
      assert.equal(chart.traces[1].line.color, '#169e18');
      assert.deepEqual(Array.from(chart.traces[0].y).slice(0, 96), s.cases[0].battery_mw);
      assert.equal(chart.traces[0].line.dash, 'solid');
      assert.equal(chart.traces[1].line.dash, 'solid');
      assert.ok(chart.traces[0].line.width >= chart.traces[1].line.width + 4);
      assert.deepEqual(Array.from(chart.traces[0].x), [...data.hours, 24]);
      assert.deepEqual(Array.from(chart.traces[1].x), [...data.hours, 24]);
      assert.match(chart.traces[0].name, /no augmentation/);
      if (s.id === 'solar') assert.deepEqual(Array.from(chart.traces[2].y).slice(0, 96), s.solar_available_mw);
      assert.equal(state.capacityButtons[index]['aria-pressed'], 'true');
      assert.equal(state.capacityButtons.filter(b => b['aria-pressed'] === 'true').length, 1);
      if (index === 0) assert.match(state.nodes.get('dispatch-comparison-note').textContent, /overlap/);
      else assert.notDeepEqual(Array.from(chart.traces[0].y), Array.from(chart.traces[1].y));
      assert.equal(state.nodes.get('dispatch-augmentation-value').textContent, `+${c.added_mwh} MWh · ${c.capacity_mwh} MWh total · ${c.duration_hours} hours`);
      assert.notEqual(state.nodes.get('dispatch-1').textContent, '');
      assert.notEqual(state.nodes.get('dispatch-2').textContent, '');
    }
  }
});

check('Theme changes preserve dispatch selection, values, and readable labels', () => {
  const state = ui(); state.buttons[1].handlers.click(); state.change(2);
  const before = state.plots.at(-1), metric = state.nodes.get('dispatch-1').textContent;
  for (const theme of ['dark', 'light']) {
    state.theme(theme); const after = state.plots.at(-1);
    assert.equal(after.layout.font.color, theme === 'dark' ? '#edf3ed' : '#202220');
    assert.ok(after.layout.font.size >= 16 && after.layout.legend.font.size >= 16);
    assert.deepEqual(after.traces.map(t => Array.from(t.y)), before.traces.map(t => Array.from(t.y)));
    assert.equal(state.capacityButtons[2]['aria-pressed'], 'true');
    assert.equal(state.nodes.get('dispatch-1').textContent, metric);
  }
});

check('Missing chart library preserves scenario and capacity selection and summary metrics', () => {
  const state = ui(false);
  state.buttons[1].handlers.click(); state.change(0);
  assert.match(state.nodes.get('dispatch-plot').textContent, /Chart library unavailable/);
  assert.match(state.nodes.get('dispatch-description').textContent, /solar/);
  assert.equal(state.nodes.get('dispatch-2').textContent, '$0');
});
console.log(`${count} dispatch checks passed.`);
