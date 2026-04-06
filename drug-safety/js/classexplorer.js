// classexplorer.js — Drug Class Explorer (informational tool, standalone)

var DRUG_CLASSES = [
  {
    id: 'ssri',
    label: 'SSRIs',
    fullName: 'Selective Serotonin Reuptake Inhibitors',
    icon: '🧠',
    color: '#6C5CE7',
    mechanism: 'SSRIs block the reabsorption (reuptake) of serotonin in the brain, leaving more serotonin available in the synaptic cleft. This enhances mood-related signaling over time, which is why effects typically take 2–4 weeks to appear.',
    commonUses: ['Major depressive disorder', 'Generalized anxiety disorder', 'Panic disorder', 'Obsessive-compulsive disorder', 'Post-traumatic stress disorder', 'Social anxiety disorder'],
    classNotes: 'SSRIs are typically the first-line treatment for depression and anxiety disorders due to their favorable side-effect profile compared to older antidepressants. They carry an FDA black-box warning for increased suicidal thinking in children, adolescents, and young adults, particularly early in treatment.',
    drugs: [
      { name: 'Sertraline',    brand: 'Zoloft' },
      { name: 'Fluoxetine',    brand: 'Prozac' },
      { name: 'Escitalopram',  brand: 'Lexapro' },
      { name: 'Citalopram',    brand: 'Celexa' },
      { name: 'Paroxetine',    brand: 'Paxil' },
      { name: 'Fluvoxamine',   brand: 'Luvox' },
    ],
  },
  {
    id: 'snri',
    label: 'SNRIs',
    fullName: 'Serotonin-Norepinephrine Reuptake Inhibitors',
    icon: '⚡',
    color: '#0984E3',
    mechanism: 'SNRIs inhibit the reuptake of both serotonin and norepinephrine. The added norepinephrine activity is thought to contribute to benefits for pain conditions and may provide additional antidepressant effect compared to SSRIs for some patients.',
    commonUses: ['Major depressive disorder', 'Generalized anxiety disorder', 'Diabetic peripheral neuropathy', 'Fibromyalgia', 'Chronic musculoskeletal pain', 'Panic disorder'],
    classNotes: 'SNRIs share the SSRIs\' black-box warning for suicidal ideation. The norepinephrine component can elevate blood pressure, so monitoring is recommended, especially at higher doses. Discontinuation syndrome (flu-like symptoms, "brain zaps") can occur if stopped abruptly.',
    drugs: [
      { name: 'Venlafaxine',     brand: 'Effexor' },
      { name: 'Duloxetine',      brand: 'Cymbalta' },
      { name: 'Desvenlafaxine',  brand: 'Pristiq' },
      { name: 'Levomilnacipran', brand: 'Fetzima' },
      { name: 'Milnacipran',     brand: 'Savella' },
    ],
  },
  {
    id: 'statin',
    label: 'Statins',
    fullName: 'HMG-CoA Reductase Inhibitors',
    icon: '❤️',
    color: '#D63031',
    mechanism: 'Statins competitively inhibit HMG-CoA reductase, the rate-limiting enzyme in the cholesterol biosynthesis pathway in the liver. Lower hepatic cholesterol triggers increased LDL receptor expression, pulling more LDL out of the bloodstream.',
    commonUses: ['High LDL cholesterol (hyperlipidemia)', 'Prevention of cardiovascular events (heart attack, stroke)', 'Atherosclerosis', 'Familial hypercholesterolemia'],
    classNotes: 'Statins have strong cardiovascular outcome data and are among the most widely prescribed medications globally. The most concerning adverse effect is myopathy (muscle damage), which is rare but can progress to rhabdomyolysis. Risk increases when combined with certain drugs (e.g., fibrates, some antibiotics).',
    drugs: [
      { name: 'Atorvastatin',  brand: 'Lipitor' },
      { name: 'Simvastatin',   brand: 'Zocor' },
      { name: 'Rosuvastatin',  brand: 'Crestor' },
      { name: 'Pravastatin',   brand: 'Pravachol' },
      { name: 'Lovastatin',    brand: 'Mevacor' },
      { name: 'Fluvastatin',   brand: 'Lescol' },
      { name: 'Pitavastatin',  brand: 'Livalo' },
    ],
  },
  {
    id: 'ace',
    label: 'ACE Inhibitors',
    fullName: 'Angiotensin-Converting Enzyme Inhibitors',
    icon: '🫀',
    color: '#00B894',
    mechanism: 'ACE inhibitors block the enzyme that converts angiotensin I to angiotensin II, a potent vasoconstrictor. The result is vasodilation and reduced aldosterone secretion, lowering blood pressure and reducing the heart\'s workload.',
    commonUses: ['Hypertension', 'Heart failure', 'Diabetic nephropathy', 'Post-myocardial infarction', 'Chronic kidney disease'],
    classNotes: 'ACE inhibitors carry a black-box warning: they are contraindicated in pregnancy because they can cause fetal injury or death. A persistent dry cough is the most common reason patients switch to an ARB. Angioedema (dangerous swelling of the face/throat) is rare but serious.',
    drugs: [
      { name: 'Lisinopril',   brand: 'Prinivil / Zestril' },
      { name: 'Enalapril',    brand: 'Vasotec' },
      { name: 'Ramipril',     brand: 'Altace' },
      { name: 'Benazepril',   brand: 'Lotensin' },
      { name: 'Captopril',    brand: 'Capoten' },
      { name: 'Fosinopril',   brand: 'Monopril' },
      { name: 'Quinapril',    brand: 'Accupril' },
    ],
  },
  {
    id: 'arb',
    label: 'ARBs',
    fullName: 'Angiotensin II Receptor Blockers',
    icon: '💧',
    color: '#2B7A78',
    mechanism: 'ARBs block angiotensin II from binding to its AT1 receptors on blood vessels and the adrenal gland, preventing vasoconstriction and aldosterone release. Unlike ACE inhibitors, they do not affect bradykinin, which is why they rarely cause cough.',
    commonUses: ['Hypertension', 'Heart failure', 'Diabetic nephropathy', 'Post-myocardial infarction (selected agents)', 'Stroke prevention in patients with hypertension and left ventricular hypertrophy'],
    classNotes: 'ARBs share the pregnancy contraindication with ACE inhibitors. They are often used as an alternative when ACE inhibitor cough is intolerable. Hyperkalemia (elevated potassium) can occur, especially in patients with kidney disease or those taking potassium-sparing diuretics.',
    drugs: [
      { name: 'Losartan',    brand: 'Cozaar' },
      { name: 'Valsartan',   brand: 'Diovan' },
      { name: 'Irbesartan',  brand: 'Avapro' },
      { name: 'Olmesartan',  brand: 'Benicar' },
      { name: 'Telmisartan', brand: 'Micardis' },
      { name: 'Candesartan', brand: 'Atacand' },
    ],
  },
  {
    id: 'benzo',
    label: 'Benzodiazepines',
    fullName: 'Benzodiazepines (GABA-A Modulators)',
    icon: '😴',
    color: '#636E72',
    mechanism: 'Benzodiazepines bind to GABA-A receptors and enhance the effect of GABA, the brain\'s primary inhibitory neurotransmitter. This produces sedative, anxiolytic, anticonvulsant, and muscle-relaxant effects depending on the dose.',
    commonUses: ['Generalized anxiety disorder (short-term)', 'Panic disorder', 'Insomnia', 'Seizure disorders (selected agents)', 'Alcohol withdrawal', 'Procedural sedation'],
    classNotes: 'Benzodiazepines carry significant risks of physical dependence, tolerance, and withdrawal (which can be life-threatening). They interact dangerously with opioids and alcohol. The FDA has issued black-box warnings about the combined use of benzodiazepines and opioids. Long-term use is generally discouraged except for seizure disorders.',
    drugs: [
      { name: 'Alprazolam',  brand: 'Xanax' },
      { name: 'Lorazepam',   brand: 'Ativan' },
      { name: 'Diazepam',    brand: 'Valium' },
      { name: 'Clonazepam',  brand: 'Klonopin' },
      { name: 'Temazepam',   brand: 'Restoril' },
      { name: 'Oxazepam',    brand: 'Serax' },
      { name: 'Midazolam',   brand: 'Versed' },
    ],
  },
  {
    id: 'nsaid',
    label: 'NSAIDs',
    fullName: 'Non-Steroidal Anti-Inflammatory Drugs',
    icon: '💊',
    color: '#E17055',
    mechanism: 'NSAIDs inhibit cyclooxygenase enzymes (COX-1 and COX-2), which are responsible for producing prostaglandins — signaling molecules that promote pain, fever, and inflammation. COX-2-selective agents (e.g., celecoxib) spare the GI-protective COX-1 pathway.',
    commonUses: ['Pain (mild to moderate)', 'Fever', 'Osteoarthritis', 'Rheumatoid arthritis', 'Dysmenorrhea', 'Gout', 'Post-operative pain'],
    classNotes: 'NSAIDs carry black-box warnings for serious cardiovascular events (increased risk of heart attack and stroke) and serious GI events (bleeding, ulceration, perforation). Risk is dose- and duration-dependent. They should be used at the lowest effective dose for the shortest time needed. Kidney function can also be impaired, particularly in elderly or dehydrated patients.',
    drugs: [
      { name: 'Ibuprofen',     brand: 'Advil / Motrin' },
      { name: 'Naproxen',      brand: 'Aleve / Naprosyn' },
      { name: 'Diclofenac',    brand: 'Voltaren' },
      { name: 'Celecoxib',     brand: 'Celebrex' },
      { name: 'Meloxicam',     brand: 'Mobic' },
      { name: 'Indomethacin',  brand: 'Indocin' },
      { name: 'Ketorolac',     brand: 'Toradol' },
    ],
  },
  {
    id: 'ppi',
    label: 'PPIs',
    fullName: 'Proton Pump Inhibitors',
    icon: '🔬',
    color: '#FDCB6E',
    mechanism: 'PPIs irreversibly block the H+/K+ ATPase enzyme (the proton pump) in the gastric parietal cells, the final step in acid secretion. Because the blockade is irreversible, acid suppression lasts 24–72 hours even though the drug\'s half-life is short.',
    commonUses: ['Gastroesophageal reflux disease (GERD)', 'Peptic ulcer disease', 'H. pylori eradication (in combination)', 'Zollinger-Ellison syndrome', 'Prevention of NSAID-induced ulcers', 'Erosive esophagitis'],
    classNotes: 'PPIs are among the most prescribed drugs in the world, but long-term use carries risks that are frequently underappreciated: reduced absorption of magnesium, vitamin B12, calcium, and iron; increased susceptibility to C. difficile infection; and possible associations with kidney disease and dementia (evidence is debated). They should be used at the lowest effective dose for the indicated duration.',
    drugs: [
      { name: 'Omeprazole',    brand: 'Prilosec' },
      { name: 'Pantoprazole',  brand: 'Protonix' },
      { name: 'Esomeprazole',  brand: 'Nexium' },
      { name: 'Lansoprazole',  brand: 'Prevacid' },
      { name: 'Rabeprazole',   brand: 'Aciphex' },
      { name: 'Dexlansoprazole', brand: 'Dexilant' },
    ],
  },
  {
    id: 'anticoag',
    label: 'Anticoagulants',
    fullName: 'Anticoagulants (Blood Thinners)',
    icon: '🩸',
    color: '#D63031',
    mechanism: 'Different agents work at different points in the coagulation cascade. Warfarin inhibits vitamin K-dependent clotting factors (II, VII, IX, X). Direct oral anticoagulants (DOACs) like apixaban/rivaroxaban inhibit Factor Xa, while dabigatran directly inhibits thrombin (Factor IIa).',
    commonUses: ['Atrial fibrillation (stroke prevention)', 'Deep vein thrombosis treatment and prevention', 'Pulmonary embolism treatment', 'Mechanical heart valves (warfarin)', 'Post-surgical clot prevention'],
    classNotes: 'All anticoagulants carry a risk of serious bleeding, including life-threatening intracranial hemorrhage. Warfarin requires regular INR monitoring and is affected by many drug and food interactions (especially vitamin K-containing foods). DOACs have more predictable pharmacokinetics but most have limited reversal agents. Patients should carry identification indicating anticoagulant use.',
    drugs: [
      { name: 'Warfarin',    brand: 'Coumadin' },
      { name: 'Apixaban',    brand: 'Eliquis' },
      { name: 'Rivaroxaban', brand: 'Xarelto' },
      { name: 'Dabigatran',  brand: 'Pradaxa' },
      { name: 'Edoxaban',    brand: 'Savaysa' },
      { name: 'Enoxaparin',  brand: 'Lovenox' },
    ],
  },
  {
    id: 'betablocker',
    label: 'Beta-Blockers',
    fullName: 'Beta-Adrenergic Blocking Agents',
    icon: '🫁',
    color: '#0984E3',
    mechanism: 'Beta-blockers competitively block catecholamines (epinephrine, norepinephrine) at beta-adrenergic receptors. Beta-1 blockade slows heart rate and reduces myocardial contractility. Cardioselective agents primarily target beta-1; non-selective agents also block beta-2 (which can cause bronchospasm).',
    commonUses: ['Hypertension', 'Angina', 'Heart failure', 'Post-myocardial infarction', 'Atrial fibrillation (rate control)', 'Essential tremor', 'Migraine prophylaxis', 'Hyperthyroidism (symptom control)'],
    classNotes: 'Beta-blockers should not be stopped abruptly — this can trigger rebound hypertension, angina, or even myocardial infarction. Non-selective beta-blockers are generally avoided in asthma or COPD due to bronchospasm risk. They can mask hypoglycemia symptoms in diabetic patients. Some agents are lipid-soluble and cross the blood-brain barrier more readily, causing more CNS effects (fatigue, depression).',
    drugs: [
      { name: 'Metoprolol',  brand: 'Lopressor / Toprol-XL' },
      { name: 'Atenolol',    brand: 'Tenormin' },
      { name: 'Propranolol', brand: 'Inderal' },
      { name: 'Carvedilol',  brand: 'Coreg' },
      { name: 'Bisoprolol',  brand: 'Zebeta' },
      { name: 'Labetalol',   brand: 'Trandate' },
      { name: 'Nebivolol',   brand: 'Bystolic' },
    ],
  },
  {
    id: 'antibiotic',
    label: 'Antibiotics',
    fullName: 'Common Oral Antibiotics',
    icon: '🦠',
    color: '#00B894',
    mechanism: 'Mechanisms vary by class. Beta-lactams (amoxicillin, cephalexin) inhibit bacterial cell wall synthesis. Macrolides (azithromycin) and tetracyclines (doxycycline) inhibit the bacterial ribosome (50S and 30S subunits respectively). Fluoroquinolones (ciprofloxacin) inhibit bacterial DNA gyrase and topoisomerase IV.',
    commonUses: ['Bacterial respiratory infections', 'Urinary tract infections', 'Skin and soft tissue infections', 'Sexually transmitted infections', 'H. pylori eradication', 'Lyme disease (doxycycline)'],
    classNotes: 'Antibiotics only work against bacterial infections — they have no effect on viral illnesses. Overuse and inappropriate prescribing are major drivers of antibiotic resistance, a global public health crisis. Fluoroquinolones carry FDA black-box warnings for tendon rupture, peripheral neuropathy, and CNS effects. Some patients have severe allergic reactions, including anaphylaxis.',
    drugs: [
      { name: 'Amoxicillin',    brand: 'Amoxil' },
      { name: 'Azithromycin',   brand: 'Zithromax' },
      { name: 'Ciprofloxacin',  brand: 'Cipro' },
      { name: 'Doxycycline',    brand: 'Vibramycin' },
      { name: 'Cephalexin',     brand: 'Keflex' },
      { name: 'Trimethoprim',   brand: 'Primsol' },
      { name: 'Clindamycin',    brand: 'Cleocin' },
    ],
  },
  {
    id: 'antidiabetic',
    label: 'Antidiabetics',
    fullName: 'Type 2 Diabetes Medications',
    icon: '🩺',
    color: '#FDCB6E',
    mechanism: 'Diverse mechanisms: Metformin reduces hepatic glucose output and improves insulin sensitivity. Sulfonylureas (glipizide) stimulate pancreatic insulin secretion. DPP-4 inhibitors (sitagliptin) extend incretin hormone activity. SGLT2 inhibitors (empagliflozin) block glucose reabsorption in the kidney. GLP-1 agonists (liraglutide) mimic incretin effects and suppress appetite.',
    commonUses: ['Type 2 diabetes mellitus', 'Cardiovascular risk reduction in diabetic patients (SGLT2 inhibitors, GLP-1 agonists)', 'Weight management (GLP-1 agonists)', 'Heart failure (SGLT2 inhibitors)', 'Chronic kidney disease (selected agents)'],
    classNotes: 'Metformin remains the preferred first-line agent due to its safety, efficacy, and low cost. SGLT2 inhibitors and GLP-1 agonists have cardiovascular and renal benefits beyond glucose lowering and are increasingly used earlier in treatment. Sulfonylureas carry hypoglycemia risk. Thiazolidinediones (pioglitazone) can cause fluid retention and are avoided in heart failure.',
    drugs: [
      { name: 'Metformin',      brand: 'Glucophage' },
      { name: 'Glipizide',      brand: 'Glucotrol' },
      { name: 'Sitagliptin',    brand: 'Januvia' },
      { name: 'Empagliflozin',  brand: 'Jardiance' },
      { name: 'Liraglutide',    brand: 'Victoza' },
      { name: 'Pioglitazone',   brand: 'Actos' },
      { name: 'Semaglutide',    brand: 'Ozempic / Rybelsus' },
    ],
  },
];

// ── State ─────────────────────────────────────────────────────────────────────

var ceState = {
  activeClass: null,
  activeDrug: null,
};

// ── Init ──────────────────────────────────────────────────────────────────────

function initClassExplorer() {
  var tabsEl     = document.getElementById('ce-class-tabs');
  var bodyEl     = document.getElementById('ce-body');
  var emptyEl    = document.getElementById('ce-empty-state');
  var overviewEl = document.getElementById('ce-overview');
  var listEl     = document.getElementById('ce-drug-list');
  var detailEl   = document.getElementById('ce-detail');

  // Build class tabs
  DRUG_CLASSES.forEach(function(cls) {
    var btn = document.createElement('button');
    btn.className = 'ce-class-tab';
    btn.dataset.classId = cls.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.innerHTML =
      '<span class="ce-tab-icon">' + cls.icon + '</span>' +
      '<span class="ce-tab-label">' + cls.label + '</span>';
    btn.title = cls.fullName;
    btn.addEventListener('click', function() { activateClass(cls); });
    tabsEl.appendChild(btn);
  });

  function activateClass(cls) {
    ceState.activeClass = cls;
    ceState.activeDrug = null;

    // Update tab states
    tabsEl.querySelectorAll('.ce-class-tab').forEach(function(b) {
      var active = b.dataset.classId === cls.id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) b.style.setProperty('--tab-color', cls.color);
    });

    emptyEl.classList.add('hidden');
    bodyEl.classList.remove('hidden');

    renderOverview(cls, overviewEl);
    renderDrugList(cls, listEl, detailEl);

    // Reset detail panel
    detailEl.innerHTML =
      '<div class="ce-detail-empty">' +
        '<span class="ce-detail-empty-icon">👆</span>' +
        '<p>Select a medication from the list to see its FDA label information.</p>' +
      '</div>';
  }

  function renderOverview(cls, el) {
    var usesHtml = cls.commonUses.map(function(u) {
      return '<li>' + u + '</li>';
    }).join('');

    el.innerHTML =
      '<div class="ce-overview-card" style="--cls-color:' + cls.color + '">' +
        '<div class="ce-overview-top">' +
          '<span class="ce-overview-icon">' + cls.icon + '</span>' +
          '<div>' +
            '<h3 class="ce-overview-name">' + cls.fullName + '</h3>' +
            '<span class="ce-overview-count">' + cls.drugs.length + ' medications in this class</span>' +
          '</div>' +
        '</div>' +
        '<div class="ce-overview-grid">' +
          '<div class="ce-overview-block">' +
            '<h4 class="ce-overview-block-title">How it works</h4>' +
            '<p class="ce-overview-block-text">' + cls.mechanism + '</p>' +
          '</div>' +
          '<div class="ce-overview-block">' +
            '<h4 class="ce-overview-block-title">Common uses</h4>' +
            '<ul class="ce-uses-list">' + usesHtml + '</ul>' +
          '</div>' +
          '<div class="ce-overview-block ce-overview-full">' +
            '<h4 class="ce-overview-block-title">⚠ Class-wide considerations</h4>' +
            '<p class="ce-overview-block-text">' + cls.classNotes + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderDrugList(cls, listEl, detailEl) {
    listEl.innerHTML = '<p class="ce-list-heading">Medications in this class — select one to view its FDA label</p>';

    cls.drugs.forEach(function(drug) {
      var item = document.createElement('button');
      item.className = 'ce-drug-item';
      item.setAttribute('role', 'listitem');
      item.dataset.drug = drug.name;
      item.innerHTML =
        '<span class="ce-drug-item-name">' + drug.name + '</span>' +
        '<span class="ce-drug-item-brand">' + drug.brand + '</span>' +
        '<span class="ce-drug-item-arrow">›</span>';

      item.addEventListener('click', function() {
        // Active state
        listEl.querySelectorAll('.ce-drug-item').forEach(function(el) {
          el.classList.remove('active');
        });
        item.classList.add('active');
        ceState.activeDrug = drug.name;

        loadDrugDetail(drug, detailEl);
      });

      listEl.appendChild(item);
    });
  }

  async function loadDrugDetail(drug, detailEl) {
    // Loading state
    detailEl.innerHTML =
      '<div class="ce-detail-loading">' +
        '<div class="skeleton-block"></div>' +
        '<div class="skeleton-block"></div>' +
        '<div class="skeleton-block"></div>' +
      '</div>';

    var label = null;
    try {
      label = await fetchLabelData(drug.name);
    } catch(e) {
      // ignore, show empty
    }

    var totalReports = 0;
    try {
      var evData = await _fetchJSON(
        'https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"' +
        encodeURIComponent(drug.name) + '"&limit=1'
      );
      totalReports = (evData && evData.meta && evData.meta.results) ? evData.meta.results.total : 0;
    } catch(e) {}

    renderDrugDetail(drug, label, totalReports, detailEl);
  }

  var DETAIL_SECTIONS = [
    { key: 'indications_and_usage', title: 'Indications & Usage' },
    { key: 'warnings',              title: 'Warnings' },
    { key: 'contraindications',     title: 'Contraindications' },
    { key: 'drug_interactions',     title: 'Drug Interactions' },
    { key: 'adverse_reactions',     title: 'Adverse Reactions' },
  ];

  function renderDrugDetail(drug, label, totalReports, detailEl) {
    if (!label) {
      detailEl.innerHTML =
        '<div class="ce-detail-notfound">' +
          '<p>No FDA label data found for <strong>' + drug.name + '</strong>.</p>' +
          '<p class="ce-detail-notfound-sub">Try searching for it in the main comparator above using a different spelling or the brand name.</p>' +
        '</div>';
      return;
    }

    var brandName = (label.openfda && label.openfda.brand_name && label.openfda.brand_name[0])
      ? label.openfda.brand_name[0] : drug.brand;

    var sectionsHtml = DETAIL_SECTIONS.map(function(s) {
      var raw = label[s.key];
      var text = Array.isArray(raw) ? raw.join('\n\n') : (raw || '');
      var hasData = text.trim().length > 0;
      var result = truncateText(text, 600);

      var bodyHtml = hasData
        ? '<div class="ce-detail-text" data-full="' + encodeURIComponent(text) +
            '" data-short="' + encodeURIComponent(result.text) +
            '" data-truncated="' + result.truncated + '">' +
            '<p>' + result.text.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>' +
            (result.truncated ? '<button class="btn-show-more ce-show-more">Show more</button>' : '') +
          '</div>'
        : '<p class="no-data-msg">No ' + s.title.toLowerCase() + ' information available.</p>';

      return '<div class="ce-accordion-section">' +
        '<div class="ce-accordion-header">' +
          '<span class="ce-accordion-title">' + s.title + '</span>' +
          '<span class="ce-accordion-chevron">▾</span>' +
        '</div>' +
        '<div class="ce-accordion-body">' + bodyHtml + '</div>' +
      '</div>';
    }).join('');

    detailEl.innerHTML =
      '<div class="ce-detail-header">' +
        '<div>' +
          '<h3 class="ce-detail-drug-name">' + drug.name + '</h3>' +
          '<p class="ce-detail-brand">Brand: ' + brandName + '</p>' +
        '</div>' +
        (totalReports > 0
          ? '<div class="ce-detail-stat"><span class="ce-detail-stat-num">' + formatNumber(totalReports) + '</span><span class="ce-detail-stat-label">FAERS reports</span></div>'
          : '') +
      '</div>' +
      '<div class="ce-accordion">' + sectionsHtml + '</div>';

    // Wire up accordion
    detailEl.querySelectorAll('.ce-accordion-header').forEach(function(header) {
      header.addEventListener('click', function() {
        header.closest('.ce-accordion-section').classList.toggle('expanded');
      });
    });

    // Wire up show more/less
    detailEl.querySelectorAll('.ce-show-more').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var textEl = btn.closest('.ce-detail-text');
        var isTrunc = textEl.dataset.truncated === 'true';
        if (isTrunc) {
          textEl.querySelector('p').innerHTML = decodeURIComponent(textEl.dataset.full)
            .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
          textEl.dataset.truncated = 'false';
          btn.textContent = 'Show less';
        } else {
          textEl.querySelector('p').innerHTML = decodeURIComponent(textEl.dataset.short)
            .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
          textEl.dataset.truncated = 'true';
          btn.textContent = 'Show more';
        }
      });
    });

    // Auto-expand first section
    var first = detailEl.querySelector('.ce-accordion-section');
    if (first) first.classList.add('expanded');
  }
}

document.addEventListener('DOMContentLoaded', initClassExplorer);
