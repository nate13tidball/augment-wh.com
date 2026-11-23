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
for (const theme of ['dark', 'light', 'dark']) {
  root.dataset.theme = theme; await handlers['site-theme-change']();
  for (const plot of Object.values(plots)) {
    assert.equal(plot.layout.paper_bgcolor, theme === 'dark' ? '#19211c' : '#fff');
    assert.ok(plot.layout.font.size >= 16);
  }
  for (const year of [data.year_slider_histograms.years[0], data.year_slider_histograms.years.at(-1)]) {
    element('service-year').value = String(year); element('service-year').handlers.input(); await flush();
    assert.equal(plots['degradation-curve'].layout.shapes[0].x0, year);
    for (const [i, scenario] of ['central', 'conservative'].entries()) {
      const sample = data.year_slider_histograms.scenarios[scenario];
      const index = data.year_slider_histograms.years.indexOf(year);
      assert.deepEqual(Array.from(plots.histogram.traces[i].y), sample.counts[index].map(n => n / sample.draw_count));
    }
  }
}
assert.doesNotMatch(read('./public/modeling-demos/demo.js'), /Illustrative operating history/);
console.log('PASS: cell charts load, retain all year endpoints and data, and follow light/dark appearance.');
