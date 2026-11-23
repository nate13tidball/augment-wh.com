(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = globalThis.DispatchExamples;
  if (!data) {
    $('dispatch-description').textContent = 'Dispatch examples could not load. Reload to retry.';
    return;
  }
  const buttons = [...document.querySelectorAll('[data-scenario]')];
  const capacityButtons = [...document.querySelectorAll('[data-augmentation]')];
  let selectedIndex = 1;
  let scenarioId = 'ercot';
  const money = n => `${n < -.005 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const times = data.hours.map(h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 === 0 ? '00' : String(Math.round(h % 1 * 60))}`);
  const palette = {};
  function syncPalette() {
    const dark = document.documentElement.dataset.theme === 'dark';
    Object.assign(palette, { ink: dark ? '#edf3ed' : '#202220', gray: dark ? '#b4c4b8' : '#69766e',
      grid: dark ? '#45564a' : '#e2e8e1', solar: dark ? '#f2cf53' : '#9c7600' });
  }
  const axis = title => ({ title: { text: title, font: { size: 16 } }, gridcolor: palette.grid, fixedrange: true, automargin: true });

  function render() {
    syncPalette();
    const scenario = data.scenarios.find(s => s.id === scenarioId);
    const selected = scenario.cases[selectedIndex], baseline = scenario.cases[0], m = selected.metrics;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scenario === scenarioId)));
    $('dispatch-description').textContent = scenario.description;
    $('dispatch-price-note').textContent = scenario.price_note;
    capacityButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.augmentation) === selectedIndex)));
    const sizeLabel = `+${selected.added_mwh} MWh · ${selected.capacity_mwh} MWh total · ${selected.duration_hours} hours`;
    $('dispatch-augmentation-value').textContent = sizeLabel;
    $('dispatch-comparison-note').textContent = selectedIndex === 0 ?
      'No augmentation selected: both battery curves overlap.' :
      `Selected +${selected.added_mwh} MWh is compared with the same site without augmentation.`;
    $('dispatch-1').textContent = money(m.operating_margin);
    $('dispatch-2').textContent = money(m.incremental_after_capacity_cost);
    $('dispatch-2').dataset.negative = String(m.incremental_after_capacity_cost < 0);

    if (!globalThis.Plotly) {
      $('dispatch-plot').textContent = 'Chart library unavailable. Capacity buttons and summary metrics remain available; reconnect to display curves.';
      return;
    }
    const x = [...data.hours, 24];
    const extra = [...times.map((time, i) => [time, scenario.prices[i]]), ['24:00', scenario.prices.at(-1)]];
    const trace = (name, values, color, dash = 'solid', width = 2.8) => ({
      type: 'scatter', mode: 'lines', name, x, y: [...values, values.at(-1)], customdata: extra,
      line: { color, width, shape: 'hv', dash },
      hovertemplate: '%{customdata[0]}<br>%{y:.1f} MW<br>Energy price: $%{customdata[1]:.0f}/MWh<extra>%{fullData.name}</extra>',
    });
    const traces = [
      // Draw the wide baseline first so equal values retain visible gray edges.
      trace('Battery · no augmentation', baseline.battery_mw, palette.gray, 'solid', 8),
      trace(`Battery · selected +${selected.added_mwh} MWh`, selected.battery_mw, '#169e18', 'solid', 3),
    ];
    if (scenario.id === 'solar') {
      traces.push(trace('Available solar generation', scenario.solar_available_mw, palette.solar));
    }
    if (scenario.id === 'peak') traces.push(trace('Peak-support request', scenario.request_mw, palette.gray, 'dash'));
    const window = scenario.window;
    globalThis.Plotly.react($('dispatch-plot'), traces, {
      autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
      font: { family: 'Arial, Helvetica, sans-serif', color: palette.ink, size: 16 },
      margin: { l: 66, r: 24, t: 45, b: 135 },
      legend: { orientation: 'h', x: 0, y: -.28, yanchor: 'top', font: { size: 16 }, itemclick: false, itemdoubleclick: false }, hovermode: 'x unified',
      xaxis: { ...axis('Hour of day'), range: [0, 24], tickvals: [0, 4, 8, 12, 16, 20, 24], ticktext: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'] },
      yaxis: { ...axis('Meter power (MW)'), range: [-110, scenario.id === 'solar' ? 170 : 115], zeroline: true, zerolinecolor: palette.gray, zerolinewidth: 1.5 },
      shapes: [
        { type: 'rect', x0: window[0], x1: window[1], y0: 0, y1: 1, yref: 'paper', fillcolor: 'rgba(22,158,24,.055)', line: { width: 0 }, layer: 'below' },
        { type: 'line', x0: 0, x1: 24, y0: 100, y1: 100, line: { color: '#a9b8a5', width: 1, dash: 'dot' }, layer: 'below' },
      ],
      annotations: [{ x: (window[0] + window[1]) / 2, y: 1.02, yref: 'paper', text: scenario.window_label,
        showarrow: false, font: { size: 16, color: palette.gray } }],
    }, { responsive: true, displayModeBar: false, scrollZoom: false }).catch(() => {
      $('dispatch-description').textContent = 'The power chart could not render. Summary metrics remain available; reload to retry.';
    });
  }
  buttons.forEach(button => button.addEventListener('click', () => { scenarioId = button.dataset.scenario; render(); }));
  capacityButtons.forEach(button => button.addEventListener('click', () => { selectedIndex = Number(button.dataset.augmentation); render(); }));
  window.addEventListener('site-theme-change', render);
  render();
})();
