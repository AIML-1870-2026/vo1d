// app.js — no modules, globals only. Runs after all other scripts are loaded.

var state = {
  drugA: null,
  drugB: null,
  activeTab: 0,
  tabRendered: [false, false, false],
};

var LABEL_SECTIONS = [
  { key: 'indications_and_usage', title: 'Indications & Usage', modal: null,          defaultOpen: true  },
  { key: 'warnings',              title: 'Warnings',             modal: 'warnings',    defaultOpen: false },
  { key: 'contraindications',     title: 'Contraindications',    modal: 'warnings',    defaultOpen: false },
  { key: 'drug_interactions',     title: 'Drug Interactions',    modal: 'interactions',defaultOpen: false },
  { key: 'adverse_reactions',     title: 'Adverse Reactions',    modal: 'adverse-events', defaultOpen: false },
];

// ── DOM refs ──────────────────────────────────────────────────────────────────

var inputA      = document.getElementById('search-a');
var inputB      = document.getElementById('search-b');
var dropA       = document.getElementById('dropdown-a');
var dropB       = document.getElementById('dropdown-b');
var compareBtn  = document.getElementById('btn-compare');
var onboarding  = document.getElementById('onboarding');
var resultsArea = document.getElementById('results-area');
var sameDrugWarn= document.getElementById('same-drug-warning');
var tabBtns     = document.querySelectorAll('.tab-btn');
var tabPanels   = document.querySelectorAll('.tab-panel');

// ── Autocomplete ──────────────────────────────────────────────────────────────

var acA = new Autocomplete(inputA, dropA, function(drug) { state.drugA = drug; });
var acB = new Autocomplete(inputB, dropB, function(drug) { state.drugB = drug; });

// ── Tab switching ─────────────────────────────────────────────────────────────

function switchTab(idx) {
  state.activeTab = idx;
  tabBtns.forEach(function(btn, i) {
    btn.classList.toggle('active', i === idx);
    btn.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  tabPanels.forEach(function(panel, i) {
    panel.classList.toggle('hidden', i !== idx);
  });

  if (state.tabRendered[idx] === 'pending') {
    if (idx === 1) finalizeEventsTab();
    if (idx === 2) finalizeCoAdminTab();
  }
}

tabBtns.forEach(function(btn, i) {
  btn.addEventListener('click', function() { switchTab(i); });
});

// ── Chips ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() {
    var nameA = chip.dataset.a;
    var nameB = chip.dataset.b;
    acA.setValue(nameA, nameA.toLowerCase());
    acB.setValue(nameB, nameB.toLowerCase());
    state.drugA = { displayName: nameA, generic: nameA, brand: nameA };
    state.drugB = { displayName: nameB, generic: nameB, brand: nameB };
    compare();
  });
});

// ── Compare ───────────────────────────────────────────────────────────────────

compareBtn.addEventListener('click', compare);
[inputA, inputB].forEach(function(inp) {
  inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') compare(); });
});

async function compare() {
  if (!state.drugA && inputA.value.trim()) {
    var n = inputA.value.trim();
    state.drugA = { displayName: n, generic: n, brand: n };
  }
  if (!state.drugB && inputB.value.trim()) {
    var n = inputB.value.trim();
    state.drugB = { displayName: n, generic: n, brand: n };
  }

  if (!state.drugA || !state.drugB) {
    showGlobalError('Please search for two medications to compare.');
    return;
  }

  var same = state.drugA.displayName.toLowerCase() === state.drugB.displayName.toLowerCase();
  sameDrugWarn.classList.toggle('hidden', !same);

  state.tabRendered = [false, false, false];
  destroyAllCharts();

  onboarding.classList.add('hidden');
  resultsArea.classList.remove('hidden');

  showLabelSkeleton();
  switchTab(0);

  loadLabelTab();
  loadEventsTab();
  loadCoAdminTab();
}

// ── Tab 1: Drug Labeling ──────────────────────────────────────────────────────

function showLabelSkeleton() {
  ['label-sections-a', 'label-sections-b'].forEach(function(id) {
    document.getElementById(id).innerHTML =
      '<div class="skeleton-block"></div>' +
      '<div class="skeleton-block"></div>' +
      '<div class="skeleton-block"></div>';
  });
  document.getElementById('label-name-a').textContent  = state.drugA.displayName;
  document.getElementById('label-name-b').textContent  = state.drugB.displayName;
  document.getElementById('events-name-a').textContent = state.drugA.displayName;
  document.getElementById('events-name-b').textContent = state.drugB.displayName;
}

async function loadLabelTab() {
  var nameA = state.drugA.generic || state.drugA.displayName;
  var nameB = state.drugB.generic || state.drugB.displayName;
  var both = await Promise.all([fetchLabelData(nameA), fetchLabelData(nameB)]);
  renderLabelPanel('a', state.drugA.displayName, both[0]);
  renderLabelPanel('b', state.drugB.displayName, both[1]);
  state.tabRendered[0] = true;
}

function renderLabelPanel(drugKey, drugName, labelData) {
  var nameEl     = document.getElementById('label-name-' + drugKey);
  var sectionsEl = document.getElementById('label-sections-' + drugKey);

  if (labelData && labelData.openfda && labelData.openfda.brand_name && labelData.openfda.brand_name[0]) {
    nameEl.textContent = labelData.openfda.brand_name[0];
  } else {
    nameEl.textContent = drugName;
  }

  if (!labelData) {
    sectionsEl.innerHTML = '<div class="error-msg">We couldn\'t find <strong>' + drugName +
      '</strong> in the FDA database. Try a different spelling or the generic name.</div>';
    return;
  }

  sectionsEl.innerHTML = LABEL_SECTIONS.map(function(section) {
    var raw = labelData[section.key];
    var rawText = Array.isArray(raw) ? raw.join('\n\n') : (raw || '');
    var hasData = rawText.trim().length > 0;
    var result  = truncateText(rawText, 800);
    var text    = result.text;
    var truncated = result.truncated;

    var helpBtn = section.modal
      ? '<button class="btn-help-tiny" data-modal="' + section.modal + '" aria-label="Learn more about ' + section.title + '">ⓘ</button>'
      : '';

    var bodyHtml = hasData
      ? '<div class="label-text" data-full="' + encodeURIComponent(rawText) +
          '" data-short="' + encodeURIComponent(text) +
          '" data-truncated="' + truncated + '">' +
          '<p>' + text.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>' +
          (truncated ? '<button class="btn-show-more">Show more</button>' : '') +
          '</div>'
      : '<p class="no-data-msg">No ' + section.title.toLowerCase() + ' data available for this drug.</p>';

    return '<div class="accordion-section' + (section.defaultOpen ? ' expanded' : '') + '">' +
      '<div class="accordion-header">' +
        '<span class="accordion-title">' + section.title + '</span>' +
        '<div class="accordion-header-right">' + helpBtn +
          '<span class="accordion-chevron" aria-hidden="true">▾</span>' +
        '</div>' +
      '</div>' +
      '<div class="accordion-body">' + bodyHtml + '</div>' +
    '</div>';
  }).join('');

  // Accordion toggles
  sectionsEl.querySelectorAll('.accordion-header').forEach(function(header) {
    header.addEventListener('click', function(e) {
      if (e.target.closest('[data-modal]')) return;
      header.closest('.accordion-section').classList.toggle('expanded');
    });
  });

  // Show more / show less
  sectionsEl.querySelectorAll('.btn-show-more').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var textEl = btn.closest('.label-text');
      var isTruncated = textEl.dataset.truncated === 'true';
      if (isTruncated) {
        var full = decodeURIComponent(textEl.dataset.full);
        textEl.querySelector('p').innerHTML = full.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
        textEl.dataset.truncated = 'false';
        btn.textContent = 'Show less';
      } else {
        var short = decodeURIComponent(textEl.dataset.short);
        textEl.querySelector('p').innerHTML = short.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
        textEl.dataset.truncated = 'true';
        btn.textContent = 'Show more';
      }
    });
  });
}

// ── Tab 2: Adverse Events ─────────────────────────────────────────────────────

async function loadEventsTab() {
  state.tabRendered[1] = 'loading';
  var nameA = state.drugA.generic || state.drugA.displayName;
  var nameB = state.drugB.generic || state.drugB.displayName;

  var all = await Promise.all([
    fetchAdverseEvents(nameA),
    fetchAdverseEvents(nameB),
    fetchSeriousOutcomes(nameA),
    fetchSeriousOutcomes(nameB),
  ]);

  var tab = document.getElementById('tab-1');
  tab.dataset.eventsA   = JSON.stringify(all[0]);
  tab.dataset.eventsB   = JSON.stringify(all[1]);
  tab.dataset.outcomesA = JSON.stringify(all[2]);
  tab.dataset.outcomesB = JSON.stringify(all[3]);

  if (state.activeTab === 1) {
    finalizeEventsTab();
  } else {
    state.tabRendered[1] = 'pending';
  }
}

function finalizeEventsTab() {
  var tab = document.getElementById('tab-1');
  var eventsA   = JSON.parse(tab.dataset.eventsA   || '[]');
  var eventsB   = JSON.parse(tab.dataset.eventsB   || '[]');
  var outcomesA = JSON.parse(tab.dataset.outcomesA || '{}');
  var outcomesB = JSON.parse(tab.dataset.outcomesB || '{}');
  renderEventsPanel('a', eventsA, outcomesA);
  renderEventsPanel('b', eventsB, outcomesB);
  state.tabRendered[1] = true;
}

function renderEventsPanel(drugKey, events, outcomes) {
  var chartId    = 'chart-events-' + drugKey;
  var outcomesId = 'chart-outcomes-' + drugKey;
  var eventsWrap  = document.getElementById('chart-events-' + drugKey + '-wrap');
  var outcomesWrap = document.getElementById('chart-outcomes-' + drugKey + '-wrap');

  if (events.length === 0) {
    eventsWrap.innerHTML = '<p class="no-data-msg">No adverse event reports found for this drug.</p>';
  } else {
    eventsWrap.innerHTML = '<canvas id="' + chartId + '"></canvas>';
    renderEventsChart(chartId, events, drugKey);
  }

  outcomesWrap.innerHTML = '<canvas id="' + outcomesId + '"></canvas>';
  renderOutcomesChart(outcomesId, outcomes, OUTCOME_META);
}

// ── Tab 3: Co-Administration ──────────────────────────────────────────────────

async function loadCoAdminTab() {
  state.tabRendered[2] = 'loading';
  document.getElementById('co-admin-heading').textContent =
    'When ' + state.drugA.displayName + ' and ' + state.drugB.displayName + ' are reported together';

  var nameA = state.drugA.generic || state.drugA.displayName;
  var nameB = state.drugB.generic || state.drugB.displayName;
  var result = await fetchCoAdministration(nameA, nameB);

  document.getElementById('tab-2').dataset.coAdmin = JSON.stringify(result);

  if (state.activeTab === 2) {
    finalizeCoAdminTab();
  } else {
    state.tabRendered[2] = 'pending';
  }
}

function finalizeCoAdminTab() {
  var tab = document.getElementById('tab-2');
  var result = JSON.parse(tab.dataset.coAdmin || '{"events":[],"total":0}');

  var chartContainer = document.getElementById('chart-co-admin-container');
  var emptyMsg  = document.getElementById('co-admin-empty');
  var totalEl   = document.getElementById('co-admin-total');

  emptyMsg.classList.add('hidden');
  totalEl.textContent = '';

  if (result.total === 0 || result.events.length === 0) {
    chartContainer.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
  } else {
    chartContainer.classList.remove('hidden');
    chartContainer.innerHTML = '<canvas id="chart-co-admin"></canvas>';
    renderCoAdminChart('chart-co-admin', result.events);
    totalEl.textContent = formatNumber(result.total) + ' total FAERS reports mention both drugs together.';
  }

  state.tabRendered[2] = true;
}

// ── Init ──────────────────────────────────────────────────────────────────────

initModals();
