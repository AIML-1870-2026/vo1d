// classexplorer.js — Drug Class Explorer

var DRUG_CLASSES = [
  {
    id: 'ssri',
    label: 'SSRIs',
    description: 'Selective Serotonin Reuptake Inhibitors — antidepressants',
    icon: '🧠',
    drugs: ['Sertraline', 'Fluoxetine', 'Escitalopram', 'Citalopram', 'Paroxetine', 'Fluvoxamine'],
  },
  {
    id: 'snri',
    label: 'SNRIs',
    description: 'Serotonin-Norepinephrine Reuptake Inhibitors',
    icon: '⚡',
    drugs: ['Venlafaxine', 'Duloxetine', 'Desvenlafaxine', 'Levomilnacipran'],
  },
  {
    id: 'statin',
    label: 'Statins',
    description: 'HMG-CoA reductase inhibitors — cholesterol-lowering',
    icon: '❤️',
    drugs: ['Atorvastatin', 'Simvastatin', 'Rosuvastatin', 'Pravastatin', 'Lovastatin', 'Fluvastatin'],
  },
  {
    id: 'ace',
    label: 'ACE Inhibitors',
    description: 'Angiotensin-converting enzyme inhibitors — blood pressure',
    icon: '🫀',
    drugs: ['Lisinopril', 'Enalapril', 'Ramipril', 'Benazepril', 'Captopril', 'Fosinopril'],
  },
  {
    id: 'arb',
    label: 'ARBs',
    description: 'Angiotensin II receptor blockers — blood pressure',
    icon: '💧',
    drugs: ['Losartan', 'Valsartan', 'Irbesartan', 'Olmesartan', 'Telmisartan', 'Candesartan'],
  },
  {
    id: 'benzo',
    label: 'Benzodiazepines',
    description: 'Anxiolytics and sedatives acting on GABA receptors',
    icon: '😴',
    drugs: ['Alprazolam', 'Lorazepam', 'Diazepam', 'Clonazepam', 'Temazepam', 'Oxazepam'],
  },
  {
    id: 'nsaid',
    label: 'NSAIDs',
    description: 'Non-steroidal anti-inflammatory drugs — pain & inflammation',
    icon: '💊',
    drugs: ['Ibuprofen', 'Naproxen', 'Diclofenac', 'Celecoxib', 'Meloxicam', 'Indomethacin'],
  },
  {
    id: 'ppi',
    label: 'PPIs',
    description: 'Proton pump inhibitors — acid reflux & ulcers',
    icon: '🔬',
    drugs: ['Omeprazole', 'Pantoprazole', 'Esomeprazole', 'Lansoprazole', 'Rabeprazole'],
  },
  {
    id: 'anticoag',
    label: 'Anticoagulants',
    description: 'Blood thinners — clot prevention',
    icon: '🩸',
    drugs: ['Warfarin', 'Apixaban', 'Rivaroxaban', 'Dabigatran', 'Enoxaparin', 'Heparin'],
  },
  {
    id: 'betablocker',
    label: 'Beta-Blockers',
    description: 'Beta-adrenergic blocking agents — heart rate & blood pressure',
    icon: '🏃',
    drugs: ['Metoprolol', 'Atenolol', 'Propranolol', 'Carvedilol', 'Bisoprolol', 'Labetalol'],
  },
  {
    id: 'antibiotic',
    label: 'Antibiotics',
    description: 'Broad-spectrum common antibiotics',
    icon: '🦠',
    drugs: ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline', 'Trimethoprim', 'Cephalexin'],
  },
  {
    id: 'antidiabetic',
    label: 'Antidiabetics',
    description: 'Medications for type 2 diabetes management',
    icon: '🩺',
    drugs: ['Metformin', 'Glipizide', 'Sitagliptin', 'Empagliflozin', 'Liraglutide', 'Pioglitazone'],
  },
];

// ── State ─────────────────────────────────────────────────────────────────────

var explorerState = {
  activeClassId: null,
  selectedDrugs: [],   // max 2
};

// ── Init ──────────────────────────────────────────────────────────────────────

function initClassExplorer() {
  var tabsEl    = document.getElementById('class-tabs');
  var gridEl    = document.getElementById('class-grid');
  var loadingEl = document.getElementById('class-grid-loading');
  var barEl     = document.getElementById('class-selected-bar');
  var pillsEl   = document.getElementById('class-selected-pills');
  var cmpBtn    = document.getElementById('class-compare-btn');

  // Build class tabs
  DRUG_CLASSES.forEach(function(cls) {
    var btn = document.createElement('button');
    btn.className = 'class-tab-btn';
    btn.dataset.classId = cls.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.innerHTML = '<span class="class-tab-icon">' + cls.icon + '</span><span class="class-tab-label">' + cls.label + '</span>';
    btn.title = cls.description;
    btn.addEventListener('click', function() { activateClass(cls); });
    tabsEl.appendChild(btn);
  });

  function activateClass(cls) {
    // Update tab appearance
    tabsEl.querySelectorAll('.class-tab-btn').forEach(function(b) {
      var active = b.dataset.classId === cls.id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    explorerState.activeClassId = cls.id;
    explorerState.selectedDrugs = [];
    updateSelectedBar();

    // Show skeleton
    gridEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');

    // Render drug cards (data is local — no fetch needed)
    setTimeout(function() {
      loadingEl.classList.add('hidden');
      gridEl.classList.remove('hidden');
      renderDrugGrid(cls, gridEl);
    }, 250);
  }

  function renderDrugGrid(cls, gridEl) {
    gridEl.innerHTML = '';

    var desc = document.createElement('p');
    desc.className = 'class-grid-description';
    desc.textContent = cls.description;
    gridEl.appendChild(desc);

    var grid = document.createElement('div');
    grid.className = 'class-drug-grid';

    cls.drugs.forEach(function(drugName) {
      var card = document.createElement('button');
      card.className = 'class-drug-card';
      card.dataset.drug = drugName;
      card.innerHTML =
        '<span class="class-drug-name">' + drugName + '</span>' +
        '<span class="class-drug-action">Add to compare</span>';

      card.addEventListener('click', function() { toggleDrug(drugName, card); });
      grid.appendChild(card);
    });

    gridEl.appendChild(grid);
  }

  function toggleDrug(name, cardEl) {
    var idx = explorerState.selectedDrugs.indexOf(name);

    if (idx >= 0) {
      // Deselect
      explorerState.selectedDrugs.splice(idx, 1);
      cardEl.classList.remove('selected', 'slot-a', 'slot-b');
      cardEl.querySelector('.class-drug-action').textContent = 'Add to compare';
    } else {
      if (explorerState.selectedDrugs.length >= 2) {
        showGlobalError('You can only select 2 drugs to compare. Deselect one first.');
        return;
      }
      explorerState.selectedDrugs.push(name);
      var slot = explorerState.selectedDrugs.length === 1 ? 'slot-a' : 'slot-b';
      cardEl.classList.add('selected', slot);
      cardEl.querySelector('.class-drug-action').textContent =
        explorerState.selectedDrugs.length === 1 ? 'Drug A ✓' : 'Drug B ✓';
    }

    // Refresh all card labels to stay in sync after deselect
    refreshCardSlots();
    updateSelectedBar();
  }

  function refreshCardSlots() {
    document.querySelectorAll('.class-drug-card').forEach(function(card) {
      var name = card.dataset.drug;
      var idxInSelected = explorerState.selectedDrugs.indexOf(name);
      card.classList.remove('selected', 'slot-a', 'slot-b');
      if (idxInSelected === 0) {
        card.classList.add('selected', 'slot-a');
        card.querySelector('.class-drug-action').textContent = 'Drug A ✓';
      } else if (idxInSelected === 1) {
        card.classList.add('selected', 'slot-b');
        card.querySelector('.class-drug-action').textContent = 'Drug B ✓';
      } else {
        card.querySelector('.class-drug-action').textContent = 'Add to compare';
      }
    });
  }

  function updateSelectedBar() {
    var sel = explorerState.selectedDrugs;
    if (sel.length === 0) {
      barEl.classList.add('hidden');
      return;
    }

    barEl.classList.remove('hidden');
    pillsEl.innerHTML = sel.map(function(name, i) {
      var label = i === 0 ? 'A' : 'B';
      var cls   = i === 0 ? 'drug-badge-a' : 'drug-badge-b';
      return '<span class="class-selected-pill">' +
        '<span class="drug-badge ' + cls + '">' + label + '</span>' +
        name +
        '</span>';
    }).join('<span class="class-selected-vs">vs</span>');

    cmpBtn.disabled = sel.length < 2;
    cmpBtn.style.opacity = sel.length < 2 ? '0.5' : '1';
  }

  cmpBtn.addEventListener('click', function() {
    var sel = explorerState.selectedDrugs;
    if (sel.length < 2) return;

    // Populate the main comparator
    var inputA = document.getElementById('search-a');
    var inputB = document.getElementById('search-b');
    inputA.value = sel[0];
    inputB.value = sel[1];

    // Update app state (acA/acB are globals set in app.js)
    if (typeof acA !== 'undefined') {
      acA.setValue(sel[0], sel[0].toLowerCase());
      acB.setValue(sel[1], sel[1].toLowerCase());
    }

    // Scroll to top and trigger compare
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(function() {
      if (typeof compare === 'function') compare();
    }, 400);
  });
}

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', initClassExplorer);
