(function () {
  'use strict';
  const M = globalThis.DemoConcepts;
  const $ = id => document.getElementById(id);
  const value = id => Number($(id).value);
  const C = { green: '#169e18', ink: '#202220', gray: '#69766e', pale: '#bfd8bb', red: '#a42c24', grid: '#e2e8e1' };
  const config = { responsive: true, displayModeBar: false, scrollZoom: false };
  const million = n => `${n < 0 ? '−' : ''}$${(Math.abs(n) / 1e6).toFixed(2)}m`;
  const axis = title => ({ title: { text: title, font: { size: 12 } }, gridcolor: C.grid, zerolinecolor: '#a9b8a5', fixedrange: true, automargin: true });
  let chartFailed = false;
  function draw(id, traces, layout = {}) {
    if (!globalThis.Plotly) return;
    const element = $(id);
    const base = {
      autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
      margin: { l: 60, r: 22, t: 65, b: 65 },
      font: { family: 'Arial, Helvetica, sans-serif', color: C.ink, size: 11 },
      legend: { orientation: 'h', x: 0, y: 1.17, font: { size: 11 } },
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
      xaxis: { ...axis(''), type: 'category', categoryorder: 'array', categoryarray: labels, tickfont: { size: 10 } },
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
    ], { xaxis: { ...axis('Plan year'), dtick: 1, range: [-.5, 15.5] },
      yaxis: axis('Incremental nominal value ($m)'), barmode: 'relative', bargap: .32 });
    $('finance-ledger-body').innerHTML = [
      ['Added operating profit', r.operatingPV], ['Augmentation investment', -r.capexPV],
      ['NPV before residual', r.npvWithoutResidual], ['Year-15 residual value', r.residualPV],
      ['NPV including residual', r.npv],
    ].map(([label, amount]) => `<tr><th scope="row">${label}</th><td>${million(amount)}</td></tr>`).join('');
    $('finance-schedule-body').innerHTML = r.blocks.map(b => `<tr><th scope="row">${b.id}</th><td>${b.year}</td><td>${b.vendor} · ${b.gen}</td><td>${(b.kwh / 1000).toFixed(2)}</td><td>$${b.unitCost.toFixed(0)}</td><td>${million(b.capex)}</td></tr>`).join('');
    $('finance-scenarios-body').innerHTML = globalThis.AnimationFinance.references.map((c, i) => {
      const scenario = M.source.finance.scenarios[i];
      return `<tr><th scope="row">${c.name}</th><td>$${scenario.revenue_per_kwh_yr}</td><td>${percent(scenario.discount_rate * 100)}</td><td>${percent(c.added_capex_pct)}</td><td>${percent(c.profit_uplift_pct)}</td><td>${percent(c.irr_pct)}</td><td>${million(c.npv)}</td></tr>`;
    }).join('');
    const selected = M.source.finance.scenarios.find(c => c.revenue_per_kwh_yr === o.revenue && c.discount_rate * 100 === o.discount && o.costScale === 100);
    document.querySelectorAll('[data-finance-case]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.financeCase === selected?.name)));
    $('finance-selection').textContent = selected ? `${selected.name} animation case selected` : 'Custom sensitivity selected';
    const prices = Array.from({ length: 15 }, (_, i) => 70 + i * 5);
    const revenues = Array.from({ length: 21 }, (_, i) => 15 + i * 2);
    const z = revenues.map(revenue => prices.map(costScale => M.finance({ ...o, costScale, revenue }, false).npv / 1e6));
    const colorLimit = Math.max(1, ...z.flat().map(Math.abs));
    draw('economics-map', [
      { type: 'heatmap', name: 'Incremental NPV', x: prices, y: revenues, z,
        zmin: -colorLimit, zmax: colorLimit, colorscale: [[0, '#cbd3c8'], [.5, '#f3f5f1'], [1, '#169e18']],
        colorbar: { title: { text: 'NPV ($m)' }, thickness: 12, len: .9 },
        hovertemplate: '%{x}% of animation cost<br>$%{y}/usable kWh-year revenue<br>NPV: $%{z:.2f}m<extra></extra>' },
      { type: 'scatter', mode: 'markers', name: 'Selected inputs', x: [o.costScale], y: [o.revenue],
        marker: { symbol: 'circle-open', size: 17, color: C.ink, line: { width: 3 } },
        hovertemplate: `Selected inputs<br>NPV: ${million(r.npv)}<extra></extra>` },
      { type: 'contour', x: prices, y: revenues, z, contours: { start: 0, end: 0, size: 1, coloring: 'none', showlabels: true },
        line: { color: C.ink, width: 1.5 }, showscale: false, showlegend: false, hoverinfo: 'skip' },
    ], { xaxis: { ...axis('Installed cost vs. animation (%)'), range: [67.5, 142.5], dtick: 10 },
      yaxis: { ...axis('Revenue ($/usable kWh-year)'), range: [14, 56], dtick: 10 },
      margin: { l: 65, r: 70, t: 45, b: 55 }, legend: { orientation: 'h', x: 0, y: 1.13 } });
    $('finance-verdict').textContent = `Residual contributes ${million(r.residualPV)} in present value. NPV without that credit: ${million(r.npvWithoutResidual)}.`;
  }

  function updateRisk() {
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
        text: label, showarrow: false, font: { color, size: 11 }, bgcolor: '#fff' })) });
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
  queue(updateRecovery, updateFinance, updateRisk);
  if (!chartFailed) $('concept-status').textContent = globalThis.Plotly ?
    'Ready. Move a slider to explore each example; hover over plots for values.' :
    'Chart library unavailable. Calculated summaries and sliders still work; reconnect and reload to display plots.';
})();
