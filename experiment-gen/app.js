/* ── Config ──────────────────────────────────────────────────────────── */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 45000;

const SYSTEM_PROMPT = `You are a K-12 science educator designing hands-on experiments for students. \
Given a grade level and a list of available supplies, generate a single age-appropriate science \
experiment that uses only those supplies (plus universally available items like water, paper, or a \
pen/pencil). The experiment should be safe for the specified grade level — avoid fire, sharp objects, \
toxic chemicals, or anything requiring adult supervision beyond normal classroom oversight unless \
clearly appropriate for the grade. Format your response in markdown with the following sections:

- **Title** (a catchy experiment name)
- **Grade Level**
- **Scientific Concept** (one or two sentences on what the experiment demonstrates)
- **Hypothesis** (a testable prediction, phrased in age-appropriate language)
- **Materials** (bulleted list of what's needed)
- **Procedure** (numbered steps)
- **What's Happening** (age-appropriate explanation of the underlying science)
- **Extension Questions** (2-3 questions to deepen student thinking)`;

/* ── DOM References ──────────────────────────────────────────────────── */

const gate          = document.getElementById('gate');
const app           = document.getElementById('app');
const envInput      = document.getElementById('env-input');
const apiKeyInput   = document.getElementById('api-key-input');
const apiKeySubmit  = document.getElementById('api-key-submit');
const gateError     = document.getElementById('gate-error');
const changeKey     = document.getElementById('change-key');

const gradeSelect = document.getElementById('grade');
const suppliesIn  = document.getElementById('supplies');
const modelSelect = document.getElementById('model');
const generateBtn = document.getElementById('generate-btn');

const placeholder = document.getElementById('placeholder');
const loader      = document.getElementById('loader');
const results     = document.getElementById('results');
const pdfBtn      = document.getElementById('pdf-btn');

/* ── State ───────────────────────────────────────────────────────────── */

let apiKey = null;

/* ── .env Parsing ────────────────────────────────────────────────────── */

function parseEnvKey(text) {
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^OPENAI_API_KEY\s*=\s*['"]?(sk-[^\s'"]+)['"]?/i);
    if (m) return m[1];
  }

  // Fallback: bare sk- key on its own line
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
        max_tokens: 1500,
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
  return raw
    .split(',')
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(', ');
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
    pdfBtn.classList.add('hidden');
  } else {
    loader.classList.add('hidden');
  }
}

function showResult(markdown) {
  const html = DOMPurify.sanitize(marked.parse(markdown));
  results.innerHTML = html;
  results.classList.remove('hidden');
  pdfBtn.classList.remove('hidden');
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
  pdfBtn.classList.add('hidden');
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
    showResult(markdown);
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

/* ── file:// guard ───────────────────────────────────────────────────── */

if (window.location.protocol === 'file:') {
  document.addEventListener('DOMContentLoaded', () => {
    showGateError('⚠ This page is open as a local file. API calls are blocked in that mode — open it via a local server or your deployed GitHub Pages URL.');
    envInput.disabled = true;
  });
}
