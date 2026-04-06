// charts.js — no modules, globals only

var DRUG_COLORS = {
  a: { bar: 'rgba(58, 175, 169, 0.85)', border: '#2B7A78' },
  b: { bar: 'rgba(225, 112, 85, 0.85)',  border: '#c0533a' },
};

var OUTCOME_COLORS = [
  '#74B9FF', // Hospitalization
  '#E17055', // Life-Threatening
  '#D63031', // Death
  '#A29BFE', // Disability
  '#FDCB6E', // Congenital
  '#636E72', // Other
];

var _chartInstances = {};

function _destroyChart(id) {
  if (_chartInstances[id]) {
    _chartInstances[id].destroy();
    delete _chartInstances[id];
  }
}

function destroyAllCharts() {
  Object.keys(_chartInstances).forEach(_destroyChart);
}

function _titleCase(str) {
  return (str || '').toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function renderEventsChart(canvasId, events, drugKey) {
  _destroyChart(canvasId);
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var color = DRUG_COLORS[drugKey] || DRUG_COLORS.a;
  var labels = events.map(function(e) { return _titleCase(e.term); });
  var data   = events.map(function(e) { return e.count; });

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Reports',
        data: data,
        backgroundColor: color.bar,
        borderColor: color.border,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ' ' + ctx.parsed.x.toLocaleString() + ' reports'; },
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#E0E6E8' },
          ticks: {
            color: '#636E72',
            font: { family: "'Source Sans 3', sans-serif", size: 12 },
            callback: function(val) { return val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val; },
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#2D3436', font: { family: "'Source Sans 3', sans-serif", size: 12 } },
        },
      },
    },
  });
}

function renderOutcomesChart(canvasId, outcomes, labels) {
  _destroyChart(canvasId);
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var data = labels.map(function(l) { return outcomes[l.key] || 0; });
  var total = data.reduce(function(a, b) { return a + b; }, 0);

  if (total === 0) {
    canvas.parentElement.innerHTML = '<p class="no-data-msg">No serious outcome data available.</p>';
    return;
  }

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.map(function(l) { return l.label; }),
      datasets: [{
        data: data,
        backgroundColor: OUTCOME_COLORS,
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#2D3436',
            font: { family: "'Source Sans 3', sans-serif", size: 11 },
            padding: 12,
            boxWidth: 14,
          },
        },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ' ' + ctx.label + ': ' + ctx.parsed.toLocaleString() + ' reports'; },
          },
        },
      },
    },
  });
}

function renderCoAdminChart(canvasId, events) {
  _destroyChart(canvasId);
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var labels = events.map(function(e) { return _titleCase(e.term); });
  var data   = events.map(function(e) { return e.count; });

  _chartInstances[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Co-reported',
        data: data,
        backgroundColor: 'rgba(116, 185, 255, 0.85)',
        borderColor: '#4a9fe0',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ' ' + ctx.parsed.x.toLocaleString() + ' reports'; },
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#E0E6E8' },
          ticks: {
            color: '#636E72',
            font: { family: "'Source Sans 3', sans-serif", size: 12 },
            callback: function(val) { return val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val; },
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#2D3436', font: { family: "'Source Sans 3', sans-serif", size: 12 } },
        },
      },
    },
  });
}
