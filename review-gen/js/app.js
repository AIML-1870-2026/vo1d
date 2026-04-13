/* ── API ─────────────────────────────────────────────────────────────── */

const OPENAI_ENDPOINT = 'https://corsproxy.io/?https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 30000;

async function generateReview({ apiKey, model, productName, productDescription, ratings, tone, length }) {
  const ratingsBlock = Object.entries(ratings)
    .map(([k, v]) => `  - ${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}/5 ${'⭐'.repeat(v)}`)
    .join('\n');

  const systemPrompt = `You are a product review writer. Write a realistic, human-sounding product review.

Ratings by aspect:
${ratingsBlock}

Tone: ${tone}
Length: ${length}

Write in markdown. Structure the review to naturally reflect each aspect's rating — praise highly-rated aspects and call out weaker ones. Include:
- A punchy headline
- Body paragraphs covering price, features, and usability (weighted by their ratings)
- A final verdict

Sound like a real person, not a template.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: `Product: ${productName}\n\nDescription: ${productDescription}` },
        ],
        max_tokens: 1024,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch (_) {}
    throw new Error(`OpenAI error ${res.status}${detail ? ': ' + detail : ''}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Unexpected response format from OpenAI.');
  return content;
}

/* ── DOM ─────────────────────────────────────────────────────────────── */

const form              = document.getElementById('reviewForm');
const submitBtn         = document.getElementById('submitBtn');
const outputWrap        = document.getElementById('outputWrap');
const outputPlaceholder = document.getElementById('outputPlaceholder');
const outputBody        = document.getElementById('outputBody');
const loader            = document.getElementById('loader');
const errorBanner       = document.getElementById('errorBanner');
const apiKeyInput       = document.getElementById('apiKeyInput');
const ratingPrice       = document.getElementById('ratingPrice');
const ratingFeatures    = document.getElementById('ratingFeatures');
const ratingUsability   = document.getElementById('ratingUsability');

/* ── Form submit ─────────────────────────────────────────────────────── */

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showError('Please enter your OpenAI API key.');
    apiKeyInput.focus();
    return;
  }
  if (!apiKey.startsWith('sk-')) {
    showError('API key looks wrong — it should start with "sk-". Check for extra spaces or missing characters.');
    apiKeyInput.focus();
    return;
  }

  const productName        = document.getElementById('productName').value.trim();
  const productDescription = document.getElementById('productDescription').value.trim();

  if (!productName || !productDescription) {
    showError('Please fill in the product name and description.');
    return;
  }

  const ratings = {
    price:     parseInt(ratingPrice.value, 10),
    features:  parseInt(ratingFeatures.value, 10),
    usability: parseInt(ratingUsability.value, 10),
  };
  const tone   = document.getElementById('tone').value;
  const length = document.getElementById('length').value;
  const model  = document.getElementById('model').value;

  clearError();
  setLoading(true);
  outputWrap.hidden = true;
  outputPlaceholder.hidden = false;

  try {
    const markdown = await generateReview({ apiKey, model, productName, productDescription, ratings, tone, length });
    outputBody.innerHTML = marked.parse(markdown);
    outputPlaceholder.hidden = true;
    outputWrap.hidden = false;
  } catch (err) {
    if (err.name === 'AbortError') {
      showError('Request timed out after 30 s. Check your connection and try again.');
    } else if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      showError(
        'Browser blocked the request to OpenAI (TypeError: Failed to fetch). ' +
        'Most likely cause: a browser extension (ad blocker / privacy shield) is blocking api.openai.com — try disabling extensions and retrying. ' +
        'If that does not help, check the Console tab in DevTools (F12) for the exact error.'
      );
    } else {
      showError(err.message);
    }
  } finally {
    setLoading(false);
  }
});

/* ── Helpers ─────────────────────────────────────────────────────────── */

function setLoading(on) {
  loader.hidden      = !on;
  submitBtn.disabled = on;
  submitBtn.textContent = on ? '⏳ Generating…' : '✨ Generate Review!';
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.textContent = '';
  errorBanner.hidden = true;
}

/* ── file:// guard (runs after helpers are defined) ─────────────────── */
if (window.location.protocol === 'file:') {
  showError('⚠️ This page is open as a local file. Browsers block API calls in that mode — open it via a local server (e.g. VS Code Live Server) or your deployed GitHub Pages URL.');
  submitBtn.disabled = true;
}
