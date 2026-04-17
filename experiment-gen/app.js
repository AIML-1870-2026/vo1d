/* ── Config ──────────────────────────────────────────────────────────── */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 45000;

const SYSTEM_PROMPT = `You are a K-12 science educator designing hands-on experiments for students. \
Given a grade level and a list of available supplies, generate a single age-appropriate science \
experiment that uses only those supplies (plus universally available items like water, paper, or a \
pen/pencil). The experiment should be safe for the specified grade level — avoid fire, sharp objects, \
toxic chemicals, or anything requiring adult supervision beyond normal classroom oversight unless \
clearly appropriate for the grade. Format your response in markdown with exactly these sections in order:

## Title
(a catchy experiment name)

## Difficulty
(exactly one word: Beginner, Intermediate, or Advanced)

## Estimated Time
(e.g. "20–30 minutes")

## Grade Level
## Scientific Concept
(one or two sentences on what the experiment demonstrates)

## Hypothesis
(a testable prediction, phrased in age-appropriate language)

## Materials
(bulleted list with - prefix)

## Procedure
(numbered steps)

## What's Happening
(age-appropriate explanation of the underlying science)

## Extension Questions
(2-3 questions to deepen student thinking)`;

/* ── Supply Categories ───────────────────────────────────────────────── */

const SUPPLY_CATEGORIES = [
  { label: 'Liquids',    items: ['Water', 'Vinegar', 'Dish Soap', 'Rubbing Alcohol', 'Lemon Juice', 'Milk', 'Cooking Oil', 'Hydrogen Peroxide'] },
  { label: 'Powders',    items: ['Baking Soda', 'Salt', 'Sugar', 'Cornstarch', 'Flour', 'Baking Powder', 'Sand', 'Coffee Grounds'] },
  { label: 'Containers', items: ['Plastic Cup', 'Glass Jar', 'Bowl', 'Plastic Bottle', 'Ziplock Bag', 'Tray', 'Spoon'] },
  { label: 'Household',  items: ['Balloon', 'Paper Towel', 'Aluminum Foil', 'Tape', 'String', 'Rubber Band', 'Candle', 'Matches'] },
  { label: 'Food',       items: ['Egg', 'Raisins', 'Yeast', 'Food Coloring', 'Ice', 'Potato', 'Cabbage', 'Milk'] },
  { label: 'Tools',      items: ['Ruler', 'Thermometer', 'Magnet', 'Compass', 'Battery', 'Wire', 'Stopwatch', 'Scale'] },
];

/* ── DOM References ──────────────────────────────────────────────────── */

const gate          = document.getElementById('gate');
const app           = document.getElementById('app');
const envInput      = document.getElementById('env-input');
const apiKeyInput   = document.getElementById('api-key-input');
const apiKeySubmit  = document.getElementById('api-key-submit');
const gateError     = document.getElementById('gate-error');
const changeKey     = document.getElementById('change-key');

const gradeSelect   = document.getElementById('grade');
const suppliesIn    = document.getElementById('supplies');
const modelSelect   = document.getElementById('model');
const generateBtn   = document.getElementById('generate-btn');
const pickerToggle  = document.getElementById('picker-toggle');
const pickerBody    = document.getElementById('picker-body');

const placeholder   = document.getElementById('placeholder');
const loader        = document.getElementById('loader');
const results       = document.getElementById('results');
const resultsActions = document.getElementById('results-actions');
const pdfBtn        = document.getElementById('pdf-btn');
const worksheetBtn  = document.getElementById('worksheet-btn');

const historyList   = document.getElementById('history-list');
const historyCount  = document.getElementById('history-count');

/* ── State ───────────────────────────────────────────────────────────── */

let apiKey = null;
let currentMarkdown = null;
let currentGrade = null;
const sessionHistory = [];

/* ── .env Parsing ────────────────────────────────────────────────────── */

function parseEnvKey(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^OPENAI_API_KEY\s*=\s*['"]?(sk-[^\s'"]+)['"]?/i);
    if (m) return m[1];
  }
  for (const line of lines) {
    const m = line.trim().match(/^(sk-[^\s]+)$/);
    if (m) return m[1];
  }
  return null;
}

/* ── API Call ────────────────────────────────────────────────────────── */

async function generateExperiment({ key, grade, supplies, model }) {
  const userPrompt = `Grade level: ${grade}\nAvailable supplies: ${supplies}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens: 1800,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch (_) {}
    throw Object.assign(new Error(detail || `HTTP ${res.status}`), { status: res.status });
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Unexpected response format from OpenAI.');
  return content;
}

/* ── Supply Normalization ────────────────────────────────────────────── */

function normalizeSupplies(raw) {
  return raw.split(',').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean).join(', ');
}

/* ── Supplies Picker ─────────────────────────────────────────────────── */

function buildSuppliesPicker() {
  pickerBody.innerHTML = '';
  for (const cat of SUPPLY_CATEGORIES) {
    const section = document.createElement('div');

    const labelEl = document.createElement('div');
    labelEl.className = 'picker-cat-label';
    labelEl.textContent = cat.label;
    section.appendChild(labelEl);

    const chipsEl = document.createElement('div');
    chipsEl.className = 'picker-chips';
    for (const item of cat.items) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = item;
      chip.dataset.item = item;
      chip.addEventListener('click', () => toggleSupply(item, chip));
      chipsEl.appendChild(chip);
    }
    section.appendChild(chipsEl);
    pickerBody.appendChild(section);
  }
}

function toggleSupply(name, chipEl) {
  const items = suppliesIn.value.split(',').map(s => s.trim()).filter(Boolean);
  const idx = items.findIndex(s => s.toLowerCase() === name.toLowerCase());
  if (idx === -1) {
    items.push(name);
    chipEl.classList.add('selected');
  } else {
    items.splice(idx, 1);
    chipEl.classList.remove('selected');
  }
  suppliesIn.value = items.join(', ');
}

function syncChipStates() {
  const current = suppliesIn.value.split(',').map(s => s.trim().toLowerCase());
  document.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('selected', current.includes(chip.dataset.item.toLowerCase()));
  });
}

pickerToggle.addEventListener('click', () => {
  const open = !pickerBody.classList.contains('hidden');
  pickerBody.classList.toggle('hidden', open);
  pickerToggle.classList.toggle('open', !open);
});

suppliesIn.addEventListener('input', syncChipStates);

/* ── Session History ─────────────────────────────────────────────────── */

function extractTitle(markdown) {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/\*+/g, '').trim() : 'Experiment';
}

function addToHistory(grade, markdown) {
  const title = extractTitle(markdown);
  sessionHistory.unshift({ title, grade, markdown, ts: Date.now() });
  if (sessionHistory.length > 20) sessionHistory.pop();
  renderHistory();
}

function renderHistory() {
  historyCount.textContent = sessionHistory.length;
  historyCount.classList.toggle('hidden', sessionHistory.length === 0);

  if (sessionHistory.length === 0) {
    historyList.innerHTML = '<p class="history-empty">No experiments generated yet.</p>';
    return;
  }

  historyList.innerHTML = '';
  for (const entry of sessionHistory) {
    const item = document.createElement('div');
    item.className = 'history-item';

    const titleEl = document.createElement('div');
    titleEl.className = 'history-item-title';
    titleEl.textContent = entry.title;

    const metaEl = document.createElement('div');
    metaEl.className = 'history-item-meta';
    metaEl.textContent = `Grade ${entry.grade}`;

    item.appendChild(titleEl);
    item.appendChild(metaEl);
    item.addEventListener('click', () => {
      currentMarkdown = entry.markdown;
      currentGrade = entry.grade;
      showResult(entry.markdown);
    });
    historyList.appendChild(item);
  }
}

/* ── Meta Parsing ────────────────────────────────────────────────────── */

function parseMeta(markdown) {
  const difficulty = markdown.match(/^##\s*Difficulty\s*\n+([^\n#]+)/im)?.[1]?.replace(/\*+/g, '').trim() || '';
  const time       = markdown.match(/^##\s*Estimated Time\s*\n+([^\n#]+)/im)?.[1]?.replace(/\*+/g, '').trim() || '';
  return { difficulty, time };
}

function metaBadgesHtml(difficulty, time) {
  const key = difficulty.toLowerCase();
  const cls = key.startsWith('beg') ? 'diff-easy' : key.startsWith('adv') ? 'diff-hard' : 'diff-med';
  let html = '<div class="exp-meta">';
  if (difficulty) html += `<span class="meta-badge ${cls}">⬡ ${esc(difficulty)}</span>`;
  if (time)       html += `<span class="meta-badge meta-time">⏱ ${esc(time)}</span>`;
  html += '</div>';
  return (difficulty || time) ? html : '';
}

/* ── Markdown Helpers ────────────────────────────────────────────────── */

function extractListSection(markdown, heading) {
  const re = new RegExp(`(?:^|\\n)##?\\s*\\**${heading}\\**[^\\n]*\\n([\\s\\S]*?)(?=\\n##?\\s|$)`, 'i');
  const m = markdown.match(re);
  if (!m) return [];
  const items = [];
  for (const line of m[1].split('\n')) {
    const bullet   = line.match(/^\s*[-*•]\s+(.+)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)/);
    const text = (bullet || numbered)?.[1];
    if (text) items.push(text.replace(/\*+/g, '').trim());
  }
  return items;
}

/* ── Worksheet ───────────────────────────────────────────────────────── */

function printWorksheet(title, grade, markdown) {
  const materials  = extractListSection(markdown, 'Materials');
  const procedure  = extractListSection(markdown, 'Procedure');

  const matHtml = materials.length
    ? materials.map(m =>
        `<div class="ci"><div class="cb"></div><span>${esc(m)}</span></div>`
      ).join('')
    : '<div class="blank-lines"><div class="bl"></div><div class="bl"></div><div class="bl"></div></div>';

  const procHtml = procedure.length
    ? procedure.map((p, i) =>
        `<div class="ci"><div class="cb"></div><span><b>${i + 1}.</b> ${esc(p)}</span></div>`
      ).join('')
    : '<div class="blank-lines"><div class="bl"></div><div class="bl"></div><div class="bl"></div><div class="bl"></div></div>';

  const lines = (n) => Array(n).fill('<div class="bl"></div>').join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Worksheet — ${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',serif;color:#000;background:#fff;padding:1.8cm 2cm;font-size:11pt;line-height:1.6}
h1{font-size:17pt;text-align:center;margin-bottom:3pt}
.subtitle{text-align:center;font-size:10pt;color:#444;margin-bottom:14pt}
h2{font-size:12pt;border-bottom:2px solid #000;padding-bottom:3pt;margin:16pt 0 8pt;text-transform:uppercase;letter-spacing:.04em}
.row{display:flex;gap:18pt;margin-bottom:14pt}
.field{flex:1;border-bottom:1px solid #555;padding-bottom:2pt;font-size:10pt}
.field b{margin-right:4pt}
.bl{border-bottom:1px solid #bbb;height:22pt;margin-bottom:3pt}
.blank-lines{margin:4pt 0 6pt}
.ci{display:flex;gap:8pt;align-items:flex-start;margin-bottom:6pt}
.cb{width:11pt;height:11pt;border:1.5px solid #333;flex-shrink:0;margin-top:2pt}
.obs-table{width:100%;border-collapse:collapse;margin-top:6pt}
.obs-table th,.obs-table td{border:1px solid #555;padding:5pt 7pt;font-size:10pt}
.obs-table th{background:#eee;font-weight:bold;text-align:left}
.obs-table td{height:30pt;vertical-align:top}
.checks{display:flex;gap:20pt;margin:6pt 0 10pt;flex-wrap:wrap}
.chk{display:flex;align-items:center;gap:6pt}
.footer{margin-top:20pt;border-top:1px solid #ccc;padding-top:6pt;text-align:center;font-size:9pt;color:#777}
@media print{body{padding:1cm 1.2cm}}
</style></head><body>
<h1>🔬 Science Experiment Observation Worksheet</h1>
<p class="subtitle">${esc(title)} &mdash; Grade ${esc(grade)}</p>

<div class="row">
  <div class="field"><b>Name:</b> _______________________</div>
  <div class="field"><b>Date:</b> ________________________</div>
  <div class="field"><b>Class:</b> _______________________</div>
</div>

<h2>My Hypothesis</h2>
<p style="margin-bottom:5pt">I predict that:</p>
<div class="blank-lines">${lines(3)}</div>
<p style="margin-bottom:5pt;margin-top:6pt">Because:</p>
<div class="blank-lines">${lines(2)}</div>

<h2>Materials Checklist</h2>
<p style="font-size:10pt;margin-bottom:6pt">Check off each item as you gather it:</p>
${matHtml}

<h2>Procedure</h2>
<p style="font-size:10pt;margin-bottom:6pt">Check off each step as you complete it:</p>
${procHtml}

<h2>Observations &amp; Data</h2>
<table class="obs-table">
  <tr><th style="width:13%">Step</th><th>What I Observed</th><th style="width:28%">Measurements / Notes</th></tr>
  <tr><td>1</td><td></td><td></td></tr>
  <tr><td>2</td><td></td><td></td></tr>
  <tr><td>3</td><td></td><td></td></tr>
  <tr><td>4</td><td></td><td></td></tr>
  <tr><td>5</td><td></td><td></td></tr>
  <tr><td>6</td><td></td><td></td></tr>
</table>

<h2>Additional Notes</h2>
<div class="blank-lines">${lines(3)}</div>

<h2>Results &amp; Conclusion</h2>
<p style="margin-bottom:5pt">What happened?</p>
<div class="blank-lines">${lines(3)}</div>
<p style="margin:10pt 0 5pt">My hypothesis was:</p>
<div class="checks">
  <div class="chk"><div class="cb"></div> Correct</div>
  <div class="chk"><div class="cb"></div> Partially Correct</div>
  <div class="chk"><div class="cb"></div> Incorrect</div>
</div>
<p style="margin-bottom:5pt">Because:</p>
<div class="blank-lines">${lines(3)}</div>

<h2>Extension Question</h2>
<p style="font-size:10pt;margin-bottom:6pt">Choose one extension question and answer it below:</p>
<div class="blank-lines">${lines(4)}</div>

<div class="footer">Generated by Science Experiment Generator &mdash; aiml-1870-2026.github.io/vo1d/experiment-gen/</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=860,height=1100');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── UI Helpers ──────────────────────────────────────────────────────── */

function showGate() {
  app.classList.add('hidden');
  gate.classList.remove('hidden');
}

function showApp() {
  gate.classList.add('hidden');
  app.classList.remove('hidden');
}

const GENERATE_BTN_HTML = generateBtn.innerHTML;

function setLoading(on) {
  generateBtn.disabled = on;
  generateBtn.innerHTML = on ? 'Generating…' : GENERATE_BTN_HTML;

  if (on) {
    placeholder.classList.add('hidden');
    loader.classList.remove('hidden');
    results.classList.add('hidden');
    resultsActions.classList.add('hidden');
  } else {
    loader.classList.add('hidden');
  }
}

function showResult(markdown) {
  const { difficulty, time } = parseMeta(markdown);
  const badges  = metaBadgesHtml(difficulty, time);
  const bodyHtml = DOMPurify.sanitize(marked.parse(markdown));
  results.innerHTML = badges + bodyHtml;
  results.classList.remove('hidden');
  resultsActions.classList.remove('hidden');
  placeholder.classList.add('hidden');
  loader.classList.add('hidden');
}

function showResultsError(msg, offerGateLink = false) {
  const card = document.createElement('div');
  card.className = 'error-card';

  const heading = document.createElement('strong');
  heading.textContent = '⚗ Something went wrong';
  card.appendChild(heading);

  const body = document.createElement('p');
  body.textContent = msg;
  card.appendChild(body);

  if (offerGateLink) {
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'Re-upload your .env file';
    link.addEventListener('click', e => { e.preventDefault(); showGate(); });
    p.appendChild(link);
    card.appendChild(p);
  }

  results.innerHTML = '';
  results.appendChild(card);
  results.classList.remove('hidden');
  resultsActions.classList.add('hidden');
  placeholder.classList.add('hidden');
  loader.classList.add('hidden');
}

function showGateError(msg) {
  gateError.textContent = msg;
  gateError.hidden = false;
}

function clearGateError() {
  gateError.textContent = '';
  gateError.hidden = true;
}

/* ── Key Validation ──────────────────────────────────────────────────── */

function acceptKey(key) {
  if (!key || !key.startsWith('sk-')) {
    showGateError('API key should start with "sk-". Check for extra spaces or missing characters.');
    return;
  }
  apiKey = key;
  apiKeyInput.value = '';
  showApp();
}

/* ── Event: .env file upload ─────────────────────────────────────────── */

envInput.addEventListener('change', () => {
  const file = envInput.files?.[0];
  if (!file) return;
  clearGateError();
  const reader = new FileReader();
  reader.onload = e => {
    const key = parseEnvKey(e.target.result);
    if (!key) {
      showGateError('Could not find an OpenAI API key in this file. Make sure it contains a line like OPENAI_API_KEY=sk-…');
      envInput.value = '';
      return;
    }
    acceptKey(key);
  };
  reader.onerror = () => showGateError('Could not read the file. Try again.');
  reader.readAsText(file);
});

/* ── Event: Paste API key ────────────────────────────────────────────── */

apiKeySubmit.addEventListener('click', () => {
  clearGateError();
  acceptKey(apiKeyInput.value.trim());
});

apiKeyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { clearGateError(); acceptKey(apiKeyInput.value.trim()); }
});

/* ── Event: Change key ───────────────────────────────────────────────── */

changeKey.addEventListener('click', e => {
  e.preventDefault();
  apiKey = null;
  envInput.value = '';
  apiKeyInput.value = '';
  clearGateError();
  showGate();
});

/* ── Event: Generate ─────────────────────────────────────────────────── */

generateBtn.addEventListener('click', async () => {
  if (!apiKey) { showGate(); return; }

  const grade    = gradeSelect.value;
  const rawSup   = suppliesIn.value.trim();
  const model    = modelSelect.value;
  const supplies = normalizeSupplies(rawSup);

  if (!supplies) {
    suppliesIn.focus();
    suppliesIn.style.borderColor = 'var(--error-border)';
    setTimeout(() => (suppliesIn.style.borderColor = ''), 1800);
    return;
  }

  setLoading(true);

  try {
    const markdown = await generateExperiment({ key: apiKey, grade, supplies, model });
    currentMarkdown = markdown;
    currentGrade    = grade;
    showResult(markdown);
    addToHistory(grade, markdown);
  } catch (err) {
    if (err.name === 'AbortError') {
      showResultsError('Request timed out after 45 seconds. Check your connection and try again.');
    } else if (err.name === 'TypeError') {
      showResultsError(
        'Could not reach OpenAI. Check your internet connection. ' +
        'If you\'re on GitHub Pages, a browser extension may be blocking the request — try disabling ad blockers.'
      );
    } else if (err.status === 401) {
      showResultsError('Your API key looks invalid. Check it and re-upload your .env file.', true);
    } else if (err.status === 429) {
      showResultsError('You\'ve hit OpenAI\'s rate limit or run out of credits. Wait a moment or check your account at platform.openai.com.');
    } else {
      showResultsError(err.message || 'An unknown error occurred.');
    }
  } finally {
    setLoading(false);
  }
});

/* ── Event: PDF download ─────────────────────────────────────────────── */

pdfBtn.addEventListener('click', () => window.print());

/* ── Event: Print Worksheet ──────────────────────────────────────────── */

worksheetBtn.addEventListener('click', () => {
  if (currentMarkdown) printWorksheet(extractTitle(currentMarkdown), currentGrade, currentMarkdown);
});

/* ── Init ────────────────────────────────────────────────────────────── */

buildSuppliesPicker();
renderHistory();

/* ── file:// guard ───────────────────────────────────────────────────── */

if (window.location.protocol === 'file:') {
  showGateError('⚠ This page is open as a local file. API calls are blocked in that mode — open it via a local server or your deployed GitHub Pages URL.');
  envInput.disabled = true;
}
