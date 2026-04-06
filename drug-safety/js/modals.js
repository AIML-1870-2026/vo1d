// modals.js — no modules, globals only

var MODAL_CONTENT = {
  'how-to-read': {
    title: 'How to Read This Data',
    body: '<p>CompaRx pulls real data from the FDA\'s public databases and shows it to you side by side. Here\'s what you\'re looking at:</p><ul><li><strong>Drug Labeling</strong> is the FDA-approved prescribing information — thorough, authoritative, and written for healthcare providers.</li><li><strong>Adverse Events</strong> come from the FDA Adverse Event Reporting System (FAERS), which collects voluntary reports from patients, providers, and manufacturers. More reports for a drug does not mean it\'s more dangerous — it often just means it\'s more widely used or has been on the market longer.</li><li><strong>Co-Administration data</strong> shows adverse events reported when both drugs appeared in the same FAERS report. This is not proof of an interaction — just a signal worth discussing with your doctor or pharmacist.</li></ul><p class="modal-callout">CompaRx is an educational tool. It is not a substitute for advice from a qualified healthcare professional. Always talk to your doctor or pharmacist before making decisions about your medications.</p>',
  },
  'drug-labels': {
    title: 'What Drug Labels Tell You',
    body: '<p>The drug label (also called the package insert or prescribing information) is the official FDA-approved document that comes with every medication. It\'s reviewed and approved by the FDA as part of the drug approval process, making it the most authoritative source of information about a drug\'s safety and use.</p><p>Labels cover who the drug is intended for, what it treats, how it should be used, what to watch out for, and what other medications it might interact with.</p><p class="modal-callout">If something in a drug label concerns you, that\'s a great question to bring to your pharmacist — they\'re specialists in exactly this kind of information.</p>',
  },
  'warnings': {
    title: 'Understanding Warnings & Contraindications',
    body: '<p><strong>Warnings</strong> describe important safety information that users and healthcare providers need to know. A warning doesn\'t mean "never use this drug" — it means "pay attention to this."</p><p><strong>Contraindications</strong> are situations where the drug should <em>not</em> be used at all — a specific medical condition, a particular combination with another drug, or a certain population (like pregnant women or people with kidney disease).</p><p>Think of it this way: warnings are "use caution," contraindications are "do not use."</p><p class="modal-callout">If you see a contraindication that applies to you, talk to your doctor before taking the medication. Don\'t stop an existing medication without medical guidance.</p>',
  },
  'interactions': {
    title: 'Understanding Drug Interactions',
    body: '<p>A drug interaction happens when one drug affects how another drug works in your body — one drug may become more or less effective, or side effects may become more intense.</p><p>Interactions range from minor (worth knowing about but usually manageable) to major (potentially dangerous). The drug label\'s interaction section describes the most clinically significant ones, but it can\'t list every possible combination.</p><p>This is why your pharmacist asks about everything you\'re taking — including supplements and over-the-counter medications.</p><p class="modal-callout">Having multiple medications? Your pharmacist can do a medication review and check for interactions across your entire regimen — free of charge.</p>',
  },
  'adverse-events': {
    title: 'How to Interpret Adverse Event Data',
    body: '<p>The adverse event data here comes from FAERS — the FDA Adverse Event Reporting System. This is a database of <em>voluntarily reported</em> incidents from patients, healthcare providers, and drug manufacturers.</p><ul><li><strong>Correlation ≠ causation.</strong> A report says someone experienced an event while taking the drug. It doesn\'t prove the drug caused it.</li><li><strong>Report counts ≠ incidence rates.</strong> A drug with 50,000 reports isn\'t necessarily more dangerous than one with 500. It may just be taken by far more people.</li><li><strong>Reporting is uneven.</strong> Some events get reported more than others. Report quality varies significantly.</li><li><strong>The FDA uses this as a signal,</strong> not proof — a signal prompts further investigation.</li></ul><p class="modal-callout">These charts are a starting point for curiosity, not a basis for changing your medication. Talk to your doctor or pharmacist if you have concerns.</p>',
  },
  'report-counts': {
    title: 'Why Report Counts Vary So Much',
    body: '<p>Some drugs have dramatically more adverse event reports than others. This reflects several factors unrelated to how dangerous the drug is:</p><ul><li><strong>Prescribing volume.</strong> Drugs taken by millions generate far more reports simply because more people are taking them.</li><li><strong>Time on market.</strong> A drug approved in 1970 has had decades of possible reporting. A drug approved in 2022 has had much less time.</li><li><strong>Media and public attention.</strong> When a drug receives news coverage, reporting spikes.</li><li><strong>Manufacturer reporting requirements.</strong> Companies must report serious adverse events they learn about.</li><li><strong>Patient awareness.</strong> Drugs with well-known side effect profiles tend to have higher reporting rates.</li></ul>',
  },
  'co-admin': {
    title: 'What Co-Administration Data Means',
    body: '<p>This tab shows adverse events from FAERS reports where <em>both drugs were listed together</em>. The idea is to surface signals that might be specific to taking these two medications at the same time.</p><p>This data <strong>can</strong> tell you which adverse events have been reported when both drugs appear together, and how often.</p><p>This data <strong>cannot</strong> tell you that the combination caused any of these events, or that the combination is dangerous. Absence of reports doesn\'t mean it\'s safe either.</p><p class="modal-callout">If you\'re taking both of these medications, your pharmacist is the best resource for evaluating the specific interaction risk for your situation.</p>',
  },
};

function initModals() {
  var overlay = document.getElementById('modal-overlay');
  var titleEl = document.getElementById('modal-title');
  var bodyEl = document.getElementById('modal-body');
  var closeBtn = document.getElementById('modal-close');

  function openModal(key) {
    var content = MODAL_CONTENT[key];
    if (!content) return;
    titleEl.textContent = content.title;
    bodyEl.innerHTML = content.body;
    overlay.classList.remove('hidden');
    requestAnimationFrame(function() { overlay.classList.add('visible'); });
    closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove('visible');
    setTimeout(function() { overlay.classList.add('hidden'); }, 200);
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-modal]');
    if (btn) {
      e.stopPropagation();
      openModal(btn.dataset.modal);
      return;
    }
    if (e.target === overlay) closeModal();
  });

  closeBtn.addEventListener('click', closeModal);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
  });
}
