(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = globalThis.DispatchExamples;
  if (!data) {
    $('dispatch-description').textContent = 'Dispatch examples could not load. Reload to retry.';
    return;
  }
  const buttons = [...document.querySelectorAll('[data-scenario]')];
  const slider = $('dispatch-augmentation');
  let scenarioId = 'ercot';
  const money = n => `${n < -.005 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const energy = n => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} MWh`;
  const times = data.hours.map(h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 === 0 ? '00' : String(Math.round(h % 1 * 60))}`);
  const axis = title => ({ title: { text: title, font: { size: 12 } }, gridcolor: '#e2e8e1', fixedrange: true, automargin: true });

  function render() {
    const scenario = data.scenarios.find(s => s.id === scenarioId);
    const index = Number(slider.value), selected = scenario.cases[index], m = selected.metrics;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scenario === scenarioId)));
    $('dispatch-description').textContent = scenario.description;
    $('dispatch-price-note').textContent = scenario.price_note;
    $('dispatch-lesson').textContent = scenario.lesson;
    const sizeLabel = `+${selected.added_mwh} MWh · ${selected.capacity_mwh} MWh total · ${selected.duration_hours} hours`;
    $('dispatch-augmentation-value').textContent = sizeLabel;
    slider.setAttribute('aria-valuetext', sizeLabel);
    $('dispatch-0').textContent = `${selected.capacity_mwh} MWh / ${selected.duration_hours} h`;
    $('dispatch-1').textContent = money(m.operating_margin);
    $('dispatch-2').textContent = money(m.incremental_after_capacity_cost);
    $('dispatch-2').dataset.negative = String(m.incremental_after_capacity_cost < 0);

    const labels = ['No augmentation', 'Low augmentation', 'Over-augmentation'];
    $('dispatch-table-caption').textContent = `${scenario.label} · same invented day · ${labels[index]} selected`;
    $('dispatch-table-head').innerHTML = '<tr><th scope="col">Daily comparison</th>' + scenario.cases.map((c, i) =>
      `<th scope="col"${i === index ? ' class="selected"' : ''}>${labels[i]}<span>+${c.added_mwh} MWh${i === index ? ' · Selected' : ''}</span></th>`).join('') + '</tr>';
    const rows = [
      ['Total energy / duration', c => `${c.capacity_mwh} MWh / ${c.duration_hours} h`],
      ['Battery charge energy', c => energy(c.metrics.charged_mwh)],
      ['Battery discharge energy', c => energy(c.metrics.discharged_mwh)],
      ...(scenario.id === 'solar' ? [['Solar curtailed', c => energy(c.metrics.curtailed_mwh)]] : []),
      ...(scenario.id === 'peak' ? [['Unserved peak request', c => energy(c.metrics.unserved_mwh)]] : []),
      ['Site energy sales', c => money(c.metrics.energy_sales)],
      ['Grid energy purchases (− = credit)', c => money(c.metrics.purchase_cost)],
      ...(scenario.id === 'peak' ? [['Peak-delivery credit', c => money(c.metrics.delivery_credit)]] : []),
      ['Battery variable cost', c => money(c.metrics.wear_cost)],
      ['Site operating margin', c => money(c.metrics.operating_margin), 'subtotal'],
      ['Incremental operating margin', c => money(c.metrics.incremental_margin)],
      ['Added capacity cost / day¹', c => money(c.metrics.daily_capacity_cost)],
      ['Incremental after capacity cost', c => money(c.metrics.incremental_after_capacity_cost), 'subtotal'],
      ['One-time augmentation investment', c => money(c.metrics.capex)],
    ];
    $('dispatch-table-body').innerHTML = rows.map(([label, format, cls = '']) =>
      `<tr class="${cls}"><th scope="row">${label}</th>${scenario.cases.map((c, i) => `<td${i === index ? ' class="selected"' : ''}>${format(c)}</td>`).join('')}</tr>`).join('');
    const best = scenario.cases.reduce((a, b) => a.metrics.incremental_after_capacity_cost >= b.metrics.incremental_after_capacity_cost ? a : b);
    $('dispatch-insight').textContent = `Best of these three on this invented day: +${best.added_mwh} MWh, after allocated capacity costs.`;

    if (!globalThis.Plotly) {
      $('dispatch-plot').textContent = 'Chart library unavailable. The comparison table remains usable; reconnect and reload to display power curves.';
      return;
    }
    const x = [...data.hours, 24];
    const extra = [...times.map((time, i) => [time, scenario.prices[i]]), ['24:00', scenario.prices.at(-1)]];
    const trace = (name, values, color, dash = 'solid') => ({
      type: 'scatter', mode: 'lines', name, x, y: [...values, values.at(-1)], customdata: extra,
      line: { color, width: 2.8, shape: 'hv', dash },
      hovertemplate: '%{customdata[0]}<br>%{y:.1f} MW<br>Energy price: $%{customdata[1]:.0f}/MWh<extra>%{fullData.name}</extra>',
    });
    const traces = [trace('Battery meter', selected.battery_mw, '#169e18')];
    if (scenario.id === 'solar') {
      traces.push(trace('Solar generation used', selected.solar_used_mw, '#c99b00'));
      traces.push(trace('Combined grid export', selected.poi_mw, '#5c5c5c', 'dot'));
    }
    if (scenario.id === 'peak') traces.push(trace('Peak-support request', scenario.request_mw, '#798477', 'dash'));
    const window = scenario.window;
    globalThis.Plotly.react($('dispatch-plot'), traces, {
      autosize: true, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
      font: { family: 'Arial, Helvetica, sans-serif', color: '#202220', size: 12 },
      margin: { l: 66, r: 24, t: 76, b: 55 },
      legend: { orientation: 'h', x: 0, y: 1.20, font: { size: 11 } }, hovermode: 'x unified',
      xaxis: { ...axis('Hour of day'), range: [0, 24], tickvals: [0, 4, 8, 12, 16, 20, 24], ticktext: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'] },
      yaxis: { ...axis('Meter power (MW)'), range: [-110, scenario.id === 'solar' ? 170 : 115], zeroline: true, zerolinecolor: '#778773', zerolinewidth: 1.5 },
      shapes: [
        { type: 'rect', x0: window[0], x1: window[1], y0: 0, y1: 1, yref: 'paper', fillcolor: 'rgba(22,158,24,.055)', line: { width: 0 }, layer: 'below' },
        { type: 'line', x0: 0, x1: 24, y0: 100, y1: 100, line: { color: '#a9b8a5', width: 1, dash: 'dot' }, layer: 'below' },
      ],
      annotations: [{ x: (window[0] + window[1]) / 2, y: 1.02, yref: 'paper', text: scenario.window_label,
        showarrow: false, font: { size: 10, color: '#566950' } }],
    }, { responsive: true, displayModeBar: false, scrollZoom: false }).catch(() => {
      $('dispatch-description').textContent = 'The power chart could not render. The comparison table remains available; reload to retry.';
    });
  }
  buttons.forEach(button => button.addEventListener('click', () => { scenarioId = button.dataset.scenario; render(); }));
  slider.addEventListener('input', render);
  render();
})();
