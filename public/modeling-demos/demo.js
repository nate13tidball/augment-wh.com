const palette = {
  baseline: '#169e18',
  stress: '#5c5c5c',
  history: '#60717b',
};

const comparisonNames = { conservative: 'Higher stress', hot_low_usage: 'Hotter / lower usage' };

const chartConfig = { responsive: true, displayModeBar: false, scrollZoom: false };
const commonFont = { family: 'Arial, Helvetica, sans-serif', color: '#5c5c5c', size: 16 };
const commonMargin = { l: 68, r: 38 };

function chartTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  palette.stress = dark ? '#c2cbc4' : '#5c5c5c';
  palette.history = dark ? '#9bafbd' : '#60717b';
  return { paper_bgcolor: dark ? '#19211c' : '#fff', plot_bgcolor: dark ? '#19211c' : '#fff',
    font: { ...commonFont, color: dark ? '#edf3ed' : '#5c5c5c' } };
}

function histogramShares(source, scenario, index) {
  const samples = source.year_slider_histograms.scenarios[scenario];
  return samples.counts[index].map(count => count / samples.draw_count);
}

function histogramYRange(source, index, comparison) {
  const peak = Math.max(...histogramShares(source, 'central', index),
    ...histogramShares(source, comparison, index));
  return [0, Math.min(1, Math.ceil(peak * 1.15 * 20) / 20)];
}

function histogramTraces(source, index, comparison) {
  const bins = source.year_slider_histograms.bin_edges;
  const x = bins.slice(0, -1).map((edge, i) => 100 - (edge + bins[i + 1]) / 2);
  return [
    { name: 'Baseline duty', color: palette.baseline, scenario: 'central' },
    { name: comparisonNames[comparison], color: palette.stress, scenario: comparison },
  ].map(item => ({
    type: 'bar', name: item.name, x,
    y: histogramShares(source, item.scenario, index),
    width: source.year_slider_histograms.bin_width * .88,
    marker: { color: item.color }, opacity: .48,
    hovertemplate: `${item.name}<br>%{x:.1f}% capacity degraded<br>%{y:.1%} of model draws in this bin<extra></extra>`,
  }));
}

function medianMarkers(source, index, comparison) {
  return [
    { scenario: 'central', color: palette.baseline },
    { scenario: comparison, color: palette.stress },
  ].map(item => {
    const median = 100 - source.year_slider_histograms.scenarios[item.scenario].medians[index];
    return { type: 'line', x0: median, x1: median, y0: 0, y1: 1,
      yref: 'paper', line: { color: item.color, width: 2.5 } };
  });
}

function curveTraces(source, comparison) {
  const checks = source.history;
  const traces = [{
    type: 'scatter', mode: 'lines+markers', name: 'Modeled operating history',
    x: checks.map(point => point.service_year),
    y: checks.map(point => point.capacity_pct_nominal),
    line: { color: palette.history, width: 1.5 },
    marker: { color: '#fff', line: { color: palette.history, width: 1.5 }, size: 6 },
    hovertemplate: 'Year %{x:.1f}<br>%{y:.1f}% capacity<extra>Modeled operating history</extra>',
  }];
  for (const item of [
    { scenario: 'central', name: 'Baseline duty', color: palette.baseline, fill: 'rgba(22,158,24,.16)' },
    { scenario: comparison, name: comparisonNames[comparison], color: palette.stress,
      fill: document.documentElement.dataset.theme === 'dark' ? 'rgba(194,203,196,.18)' : 'rgba(92,92,92,.14)' },
  ]) {
    const points = source.forecasts[item.scenario].points;
    const x = points.map(point => point.service_year);
    traces.push({ type: 'scatter', mode: 'lines', x, y: points.map(point => point.p10),
      line: { width: 0 }, hoverinfo: 'skip', showlegend: false });
    traces.push({ type: 'scatter', mode: 'lines', x, y: points.map(point => point.p90),
      line: { width: 0 }, fill: 'tonexty', fillcolor: item.fill,
      hoverinfo: 'skip', showlegend: false });
    traces.push({ type: 'scatter', mode: 'lines', name: item.name, x,
      y: points.map(point => point.median),
      line: { color: item.color, width: 2.7 },
      hovertemplate: 'Year %{x:.0f}<br>Median %{y:.1f}%<extra>' + item.name + '</extra>' });
  }
  return traces;
}

function curveShapes(year, endYear) {
  return [
    { type: 'line', x0: year, x1: year, y0: 0, y1: 1, yref: 'paper',
      line: { color: document.documentElement.dataset.theme === 'dark' ? '#edf3ed' : '#202220', width: 2, dash: 'dot' } },
    { type: 'line', x0: 0, x1: endYear, y0: 80, y1: 80,
      line: { color: '#9aa59a', width: 1, dash: 'dot' } },
  ];
}

async function loadDemo() {
  const status = document.getElementById('chart-status');
  try {
    if (!window.Plotly) throw new Error('Chart library unavailable. Reconnect and reload to retry.');
    const response = await fetch('/modeling-demos/data.json');
    if (!response.ok) throw new Error('Model chart data could not be loaded.');
    const source = await response.json();
    const years = source.year_slider_histograms.years;
    if (source.label !== 'synthetic representative-cell demonstration; no customer records' ||
        source.chemistry !== 'LFP' || source.draw_count !== 400 ||
        years.length !== 23 || years.some((year, i) => year !== i + 3)) {
      throw new Error('Model chart data does not match this example.');
    }
    const histogram = document.getElementById('histogram');
    const curve = document.getElementById('degradation-curve');
    const slider = document.getElementById('service-year');
    const output = document.getElementById('selected-year');
    const selector = document.getElementById('cell-comparison');
    let comparison = 'conservative';
    selector.value = comparison;
    const initialIndex = years.indexOf(Number(slider.value));
    const endYear = years.at(-1);
    slider.max = String(endYear);
    const capacityValues = Object.values(source.forecasts).flatMap(scenario =>
      scenario.points.flatMap(point => [point.p10, point.p90]));
    const capacityFloor = Math.max(0, Math.floor((Math.min(...capacityValues) - 5) / 10) * 10);
    // The curve includes history from year zero; the selectable forecast starts at year three.
    // Match both plot margins and the range thumb's center to that same year scale.
    const control = document.querySelector('.year-control');
    control.style.marginLeft = `${commonMargin.l}px`;
    control.style.marginRight = `${commonMargin.r}px`;
    document.querySelector('.year-track').style.marginLeft = `${100 * years[0] / endYear}%`;
    const theme = chartTheme();
    await Promise.all([
      Plotly.newPlot(histogram, histogramTraces(source, initialIndex, comparison), {
        font: commonFont, margin: { ...commonMargin, t: 12, b: 42, autoexpand: false },
        barmode: 'overlay', ...theme,
        xaxis: { title: { text: 'Capacity degraded (%)', standoff: 10 },
          range: [100 - source.year_slider_histograms.bin_edges.at(-1), 100 - source.year_slider_histograms.bin_edges[0]],
          showgrid: false, zeroline: false, fixedrange: true },
        yaxis: { title: { text: 'Share of model draws (%)', standoff: 10 },
          range: histogramYRange(source, initialIndex, comparison), tickformat: '.0%', nticks: 5,
          showgrid: false, zeroline: false, fixedrange: true },
        showlegend: false,
        shapes: medianMarkers(source, initialIndex, comparison),
      }, chartConfig),
      Plotly.newPlot(curve, curveTraces(source, comparison), {
        font: commonFont, margin: { ...commonMargin, t: 12, b: 52, autoexpand: false },
        ...theme,
        xaxis: { title: { text: 'Service year', standoff: 10 },
          range: [0, endYear], dtick: 5, showgrid: false, zeroline: false, fixedrange: true },
        yaxis: { title: { text: 'Capacity retained (%)', standoff: 10 },
          range: [capacityFloor, 105], showgrid: false, zeroline: false, fixedrange: true },
        showlegend: false,
        shapes: curveShapes(Number(slider.value), endYear),
      }, chartConfig),
    ]);
    status.textContent = '';
    window.addEventListener('site-theme-change', async () => {
      const theme = chartTheme();
      const year = Number(slider.value);
      const index = years.indexOf(year);
      try {
        await Promise.all([
          Plotly.relayout(histogram, { ...theme, shapes: medianMarkers(source, index, comparison) }),
          Plotly.relayout(curve, { ...theme, shapes: curveShapes(year, endYear) }),
          Plotly.restyle(histogram, { 'marker.color': [palette.baseline, palette.stress] }, [0, 1]),
          Plotly.restyle(curve, { 'line.color': [palette.history, palette.baseline, palette.stress] }, [0, 3, 6]),
          Plotly.restyle(curve, { 'marker.line.color': palette.history }, [0]),
          Plotly.restyle(curve, { fillcolor: document.documentElement.dataset.theme === 'dark'
            ? 'rgba(194,203,196,.18)' : 'rgba(92,92,92,.14)' }, [5]),
        ]);
      } catch { status.textContent = 'Chart appearance could not update. Reload to apply the selected theme.'; }
    });

    let pendingYear = null;
    let updating = false;
    async function update() {
      if (updating) return;
      updating = true;
      try {
        while (pendingYear !== null) {
          const year = pendingYear;
          pendingYear = null;
          const selectedComparison = comparison;
          const name = comparisonNames[selectedComparison];
          const index = years.indexOf(year);
          if (index < 0) continue;
          output.value = String(year);
          await Plotly.restyle(histogram, { y: [
            histogramShares(source, 'central', index),
            histogramShares(source, selectedComparison, index),
          ] }, [0, 1]);
          await Plotly.restyle(histogram, { name,
            hovertemplate: `${name}<br>%{x:.1f}% capacity degraded<br>%{y:.1%} of model draws in this bin<extra></extra>` }, [1]);
          await Plotly.relayout(histogram, { shapes: medianMarkers(source, index, selectedComparison),
            'yaxis.range': histogramYRange(source, index, selectedComparison) });
          const points = source.forecasts[selectedComparison].points;
          await Plotly.restyle(curve, { y: ['p10', 'p90', 'median'].map(key => points.map(point => point[key])) }, [4, 5, 6]);
          await Plotly.restyle(curve, { name, hovertemplate: 'Year %{x:.0f}<br>Median %{y:.1f}%<extra>' + name + '</extra>' }, [6]);
          document.getElementById('histogram-comparison-label').textContent = name;
          document.getElementById('curve-comparison-label').textContent = name;
          await Plotly.relayout(curve, { shapes: curveShapes(year, endYear) });
        }
      } catch (error) {
        status.textContent = error.message || 'The chart could not update.';
      } finally {
        updating = false;
      }
    }
    selector.addEventListener('change', () => {
      if (!Object.hasOwn(comparisonNames, selector.value)) return;
      comparison = selector.value;
      pendingYear = Number(slider.value);
      void update();
    });
    slider.addEventListener('input', () => {
      pendingYear = Number(slider.value);
      output.value = slider.value;
      void update();
    });
  } catch (error) {
    status.textContent = error.message || 'The chart could not load.';
  }
}

void loadDemo();
