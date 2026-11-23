(function () {
  'use strict';
  const M = globalThis.DemoConcepts;
  const $ = id => document.getElementById(id);
  const value = id => Number($(id).value);
  const C = { green: '#169e18', ink: '#202220', gray: '#69766e', pale: '#bfd8bb', red: '#a42c24', grid: '#e2e8e1' };
  function syncPalette() {
    const dark = document.documentElement.dataset.theme === 'dark';
    Object.assign(C, { ink: dark ? '#edf3ed' : '#202220', gray: dark ? '#b4c4b8' : '#69766e',
      grid: dark ? '#45564a' : '#e2e8e1', pale: dark ? '#7b9877' : '#bfd8bb' });
  }
  syncPalette();
  const config = { responsive: true, displayModeBar: false, scrollZoom: false };
  const million = n => `${n < 0 ? '−' : ''}$${(Math.abs(n) / 1e6).toFixed(2)}m`;
  const axis = title => ({ title: { text: title, font: { size: 16 } }, gridcolor: C.grid, zerolinecolor: C.gray, fixedrange: true, automargin: true });
  let chartFailed = false;
  function draw(id, traces, layout = {}) {
    if (!globalThis.Plotly) return;
    const element = $(id);
    const base = {
      autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
      margin: { l: 60, r: 22, t: 65, b: 65 },
      font: { family: 'Arial, Helvetica, sans-serif', color: C.ink, size: 16 },
      legend: { orientation: 'h', x: 0, y: 1.17, font: { size: 16 } },
      hoverlabel: { font: { family: 'Arial, Helvetica, sans-serif' } },
      xaxis: axis(''), yaxis: axis(''), ...layout,
    };
    globalThis.Plotly.react(element, traces, base, config).catch(() => {
      chartFailed = true;
      $('concept-status').textContent = 'A chart could not load. Calculated summaries and controls remain available; reload to retry.';
    });
  }
  function metric(prefix, entries) {
    entries.forEach((entry, index) => {
      const [text, negative = false] = Array.isArray(entry) ? entry : [entry];
      const element = $(`${prefix}-${index}`);
      element.textContent = text;
      element.dataset.negative = String(negative);
    });
  }
  function readPlan() {
    return { revenue: value('finance-revenue'), costScale: value('finance-cost-scale'), discount: value('finance-discount') };
  }
  const line = (name, x, y, color, extra = {}) => ({ type: 'scatter', mode: 'lines', name, x, y,
    line: { color, width: 2.5 }, ...extra });

  function updateRecovery() {
    const r = M.recovery(value('recovery-age'), value('recovery-added'));
    metric('recovery', [`${r.delivered.toFixed(1)} MWh`, `${r.original.toFixed(1)} MWh`, `+${r.benefit.toFixed(1)} MWh`]);
    for (let i = 0; i < 3; i++) $('recovery-year-' + i).textContent = `Year ${r.age} after commissioning`;
    const labels = ['Original<br>LV energy', 'Augmented<br>units', 'Cell<br>aging', 'SOC<br>imbalance',
      'Offline<br>capacity', 'Conversion<br>loss', 'Energy at<br>interconnection', 'Augmentation<br>delta', 'Original plan<br>no augmentation'];
    draw('recovery-plot', [{ type: 'waterfall', orientation: 'v', name: 'Energy chain',
      x: labels.slice(0, 7), measure: ['absolute', 'relative', 'relative', 'relative', 'relative', 'relative', 'total'],
      y: [r.rated, r.added, -r.aging, -r.imbalance, -r.unavailable, -r.conversion, 0],
      text: [r.rated, r.added, -r.aging, -r.imbalance, -r.unavailable, -r.conversion, r.delivered].map(n => n.toFixed(1)),
      textposition: 'outside', cliponaxis: false,
      decreasing: { marker: { color: C.gray } }, increasing: { marker: { color: C.green } }, totals: { marker: { color: C.ink } },
      connector: { line: { color: '#b8c4b5' } }, hovertemplate: '%{x}<br>%{text} MWh<extra></extra>',
    }, { type: 'bar', name: 'Point of interconnection comparison', x: labels.slice(7), y: [r.benefit, r.original], base: [r.original, 0],
      marker: { color: [C.green, C.gray] }, width: .65, text: [`+${r.benefit.toFixed(1)}`, r.original.toFixed(1)],
      textposition: 'outside', cliponaxis: false, hovertemplate: '%{x}<br>%{y:.1f} AC MWh at POI<extra></extra>',
    }], { showlegend: false, yaxis: { ...axis('Annual average available capacity (MWh)'), range: [0, r.installed * 1.18] },
      xaxis: { ...axis(''), type: 'category', categoryorder: 'array', categoryarray: labels, tickfont: { size: 16 } },
      margin: { l: 60, r: 25, t: 65, b: 100 },
      shapes: [
        { type: 'line', x0: 5.65, x1: 8.35, y0: 1.02, y1: 1.02, yref: 'paper', line: { color: C.ink, width: 1.5 } },
        ...[5.65, 8.35].map(x => ({ type: 'line', x0: x, x1: x, y0: .98, y1: 1.02,
          yref: 'paper', line: { color: C.ink, width: 1.5 } })),
      ],
      annotations: [{ x: 7, y: 1.06, yref: 'paper', text: '<b>Point of interconnection</b>',
        yanchor: 'bottom', showarrow: false, font: { size: 16, color: C.ink } }],
    });
  }

  function updateFinance() {
    const o = readPlan(), r = M.finance(o);
    const percent = n => n === null ? '—' : `${n.toFixed(1)}%`;
    metric('finance', [[million(r.npv), r.npv < 0], percent(r.addedCapitalPct),
      percent(r.profitUpliftPct), percent(r.irr)]);
    const hover = 'Year %{x}<br>$%{y:.2f}m<extra>%{fullData.name}</extra>';
    draw('finance-plot', [
      ...[['Operating profit', r.operating, C.green], ['Augmentation investment', r.investment, C.gray],
        ['Year-15 residual value', r.residual, C.pale]].map(([name, values, color]) => ({
        type: 'bar', name, x: r.years, y: values.map(v => v / 1e6), marker: { color }, hovertemplate: hover })),
      line('Cumulative total incl. residual', r.years, r.cumulative.map(v => v / 1e6), C.ink, { hovertemplate: hover }),
    ], { xaxis: { ...axis('Plan year'), dtick: 3, range: [-.5, 15.5] },
      yaxis: axis('Incremental nominal value ($m)'), barmode: 'relative', bargap: .32,
      margin: { l: 70, r: 22, t: 25, b: 205 },
      legend: { orientation: 'h', x: 0, y: -.3, yanchor: 'top', font: { size: 16 } } });
    const selected = M.source.finance.scenarios.find(c => c.revenue_per_kwh_yr === o.revenue && c.discount_rate * 100 === o.discount && o.costScale === 100);
    document.querySelectorAll('[data-finance-case]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.financeCase === selected?.name)));
    $('finance-selection').textContent = selected ? `${selected.name} case selected` : 'Custom sensitivity selected';

  }

  function updateRisk() {
    if ($('downside-risk').hidden) return;
    const o = readPlan(), r = M.risk(o, value('risk-spread'), value('risk-delay'));
    metric('risk', [[million(r.p10), r.p10 < 0], [million(r.median), r.median < 0],
      [million(r.p90), r.p90 < 0], `${(r.positive * 100).toFixed(0)}%`]);
    const span = Math.max((r.values.at(-1) - r.values[0]) / 1e6, .1), bin = span / 25;
    const start = r.values[0] / 1e6 - bin / 2;
    const counts = Array(26).fill(0);
    r.values.forEach(v => counts[Math.min(25, Math.floor((v / 1e6 - start) / bin))]++);
    const markers =
      [[r.p10, 'P10', C.gray], [r.median, 'Median', C.green], [r.p90, 'P90', C.gray]];
    draw('risk-plot', [{ type: 'bar', name: 'Share of synthetic draws',
      x: counts.map((_, i) => start + (i + .5) * bin), y: counts.map(n => n / 600), width: bin * .92,
      marker: { color: C.green, opacity: .55 }, hovertemplate: 'NPV near $%{x:.2f}m<br>%{y:.1%} of synthetic draws<extra></extra>',
    }], { showlegend: false, xaxis: axis('Incremental NPV ($m)'), yaxis: { ...axis('Share of draws'), tickformat: '.0%' },
      margin: { l: 60, r: 22, t: 65, b: 60 },
      shapes: [{ type: 'line', x0: 0, x1: 0, y0: 0, y1: 1, yref: 'paper', line: { color: C.ink, dash: 'dash', width: 1 } },
        ...markers.map(([n, , color]) => ({ type: 'line', x0: n / 1e6, x1: n / 1e6, y0: 0, y1: .9, yref: 'paper', line: { color, width: 1.5 } }))],
      annotations: markers.map(([n, label, color], i) => ({ x: n / 1e6, y: 1 + (i === 1 ? .09 : 0), yref: 'paper',
        text: label, showarrow: false, font: { color, size: 16 }, bgcolor: '#fff' })) });
  }

  function labelInput(input) {
    const n = Number(input.value);
    const label = `${n}${input.dataset.unit}`;
    $(`${input.id}-value`).textContent = label;
    input.setAttribute('aria-valuetext', label);
  }

  const jobs = new Set();
  let scheduled = false;
  function queue(...updates) {
    updates.forEach(update => jobs.add(update));
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try { jobs.forEach(update => update()); }
      catch (error) { $('concept-status').textContent = 'The demo could not update. Reload the page to retry.'; console.error(error); }
      finally { jobs.clear(); }
    });
  }
  document.querySelectorAll('.concept-control input').forEach(input => {
    labelInput(input);
    input.addEventListener('input', () => {
      labelInput(input);
      if (input.id.startsWith('recovery-')) queue(updateRecovery);
      else if (input.id.startsWith('finance-')) queue(updateFinance, updateRisk);
      else queue(updateRisk);
    });
  });
  document.querySelectorAll('[data-finance-case]').forEach(button => {
    button.addEventListener('click', () => {
      const scenario = M.source.finance.scenarios.find(c => c.name === button.dataset.financeCase);
      for (const [id, amount] of [['finance-revenue', scenario.revenue_per_kwh_yr], ['finance-discount', scenario.discount_rate * 100], ['finance-cost-scale', 100]]) {
        $(id).value = String(amount); labelInput($(id));
      }
      queue(updateFinance, updateRisk);
    });
  });
  window.addEventListener('site-theme-change', () => {
    syncPalette();
    queue(updateRecovery, updateFinance, updateRisk);
  });
  queue(updateRecovery, updateFinance, updateRisk);
  if (!chartFailed) $('concept-status').textContent = globalThis.Plotly ?
    'Ready. Move a slider to explore each example; hover over plots for values.' :
    'Chart library unavailable. Calculated summaries and sliders still work; reconnect and reload to display plots.';
})();
