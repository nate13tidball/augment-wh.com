import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const data = JSON.parse(read('./public/modeling-demos/data.json'));
const nodes = {}, handlers = {}, plots = {};
const element = id => nodes[id] ??= { id, value: '10', style: {}, handlers: {},
  addEventListener(type, fn) { this.handlers[type] = fn; } };
const root = { dataset: { theme: 'dark' } };
const Plotly = {
  async newPlot(node, traces, layout) { plots[node.id] = { traces, layout }; },
  async relayout(node, updates) { Object.assign(plots[node.id].layout, updates); },
  async restyle(node, updates, indices) {
    for (const [key, value] of Object.entries(updates)) indices.forEach((i,j) => {
      plots[node.id].traces[i][key] = Array.isArray(value) ? value[j] : value;
    });
  },
};
runInNewContext(read('./public/modeling-demos/demo.js'), {
  Plotly, window: { Plotly, addEventListener(type, fn) { handlers[type] = fn; } },
  document: { documentElement: root, getElementById: element, querySelector: element },
  fetch: async () => ({ok: true, json: async () => data}),
});
const flush = () => new Promise(setImmediate);
await flush();
assert.equal(Object.keys(plots).length, 2, element('chart-status').textContent);
const names = { conservative: 'Higher stress', hot_low_usage: 'Hotter / lower usage' };
function assertSelection(scenario, year) {
  assert.equal(plots['degradation-curve'].layout.shapes[0].x0, year);
  assert.equal(element('selected-year').value, String(year));
  assert.equal(plots.histogram.traces[1].name, names[scenario]);
  for (const id of ['histogram-comparison-label', 'curve-comparison-label']) {
    assert.equal(element(id).textContent, names[scenario]);
  }
  const index = data.year_slider_histograms.years.indexOf(year);
  for (const [i, key] of ['central', scenario].entries()) {
    const sample = data.year_slider_histograms.scenarios[key];
    assert.equal(sample.counts[index].reduce((a, b) => a + b, 0), 400);
    assert.deepEqual(Array.from(plots.histogram.traces[i].y), sample.counts[index].map(n => n / sample.draw_count));
    assert.equal(plots.histogram.layout.shapes[i].x0, 100 - sample.medians[index]);
    assert.deepEqual(Array.from(plots['degradation-curve'].traces[i === 0 ? 3 : 6].y),
      data.forecasts[key].points.map(p => p.median));
  }
  for (const [i, key] of ['p10', 'p90'].entries()) {
    assert.deepEqual(Array.from(plots['degradation-curve'].traces[4 + i].y), data.forecasts[scenario].points.map(p => p[key]));
  }
  const peak = Math.max(...plots.histogram.traces.flatMap(t => Array.from(t.y)));
  assert.ok(plots.histogram.layout['yaxis.range'][1] >= peak);
  assert.equal(plots['degradation-curve'].traces[6].name, names[scenario]);
}
for (const theme of ['dark', 'light', 'dark']) {
  root.dataset.theme = theme; await handlers['site-theme-change']();
  for (const plot of Object.values(plots)) {
    assert.equal(plot.layout.paper_bgcolor, theme === 'dark' ? '#19211c' : '#fff');
    assert.ok(plot.layout.font.size >= 16);
  }
  for (const scenario of ['conservative', 'hot_low_usage', 'conservative']) {
    element('cell-comparison').value = scenario; element('cell-comparison').handlers.change(); await flush();
    for (const year of data.year_slider_histograms.years) {
      element('service-year').value = String(year); element('service-year').handlers.input(); await flush();
      assertSelection(scenario, year);
    }
  }
}
// Rapid input during asynchronous Plotly updates must settle on the latest selection.
for (const [scenario, year] of [['hot_low_usage', 3], ['conservative', 10], ['hot_low_usage', 25]]) {
  element('cell-comparison').value = scenario; element('cell-comparison').handlers.change();
  element('service-year').value = String(year); element('service-year').handlers.input();
}
await flush();
assertSelection('hot_low_usage', 25);
const hot = data.forecasts.hot_low_usage.assumptions;
assert.equal(hot.mean_temperature_k, 308.15);
assert.equal(hot.efc_per_year, 120);
assert.notDeepEqual(data.forecasts.hot_low_usage.points, data.forecasts.conservative.points);
const html = read('./public/modeling-demos/index.html');
assert.match(html, /<th scope="col">Baseline duty<\/th><th scope="col">Higher stress<\/th><th scope="col">Hotter \/ lower usage<\/th>/);
assert.match(html, /Charge rate<\/th><td>0.20 C<\/td><td>0.286 C<\/td><td>0.20 C<\/td>/);
assert.doesNotMatch(read('./public/modeling-demos/demo.js'), /Illustrative operating history/);
console.log('PASS: all three cell profiles, both comparison selections, every year, rapid input, and light/dark appearance.');
