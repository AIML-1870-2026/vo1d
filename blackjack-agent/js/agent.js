import { getApiKey } from './env.js';

const MODEL = 'gpt-4o';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a Blackjack strategy advisor. You will receive the current game state as JSON and must respond with a single JSON object — no prose, no code fences, no commentary outside the object.

Schema:
{
  "action": "hit" | "stand" | "double" | "split" | "surrender" | "insurance_yes" | "insurance_no",
  "confidence": number between 0 and 1,
  "reasoning_terse": string (one sentence, no more than 25 words),
  "reasoning_detailed": string (2-4 sentences, may reference probabilities)
}

Only recommend actions that are legal given the state. The "legal_actions" array in the input tells you what is available this turn. If you recommend an illegal action you will be retried.

Respect the risk_tolerance field: "conservative" prefers surrender and stand in marginal spots; "standard" plays textbook basic strategy; "aggressive" prefers double and split on thin edges.`;

async function callAPI(messages) {
  const key = getApiKey();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages,
      temperature: 0.2,
    }),
  });

  if (res.status === 401) throw Object.assign(new Error('Invalid API key'), { code: 401 });
  if (res.status === 429) throw Object.assign(new Error('Rate limited'), { code: 429 });
  if (res.status >= 500) throw Object.assign(new Error('OpenAI server error'), { code: res.status });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return data.choices[0].message.content;
}

export async function askAgent(statePayload) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(statePayload) },
  ];

  console.log('[AGENT] → request', { action: 'asking', legalActions: statePayload.legal_actions });

  let raw;
  try {
    raw = await callAPI(messages);
  } catch (err) {
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[AGENT] ✗ JSON parse failed, retrying');
    const retryMessages = [
      ...messages,
      { role: 'assistant', content: raw },
      { role: 'user', content: 'Your previous response was not valid JSON. Reply with only the JSON object.' },
    ];
    raw = await callAPI(retryMessages);
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[AGENT] ✗ JSON parse failed after retry, raw:', raw);
      throw Object.assign(new Error('Agent response malformed'), { code: 'BAD_JSON' });
    }
  }

  const VALID_ACTIONS = ['hit','stand','double','split','surrender','insurance_yes','insurance_no'];
  if (!VALID_ACTIONS.includes(parsed.action) || !statePayload.legal_actions.includes(parsed.action)) {
    console.warn(`[AGENT] ✗ invalid action=${parsed.action} (not in legal_actions), retrying`);
    const retryMessages = [
      ...messages,
      { role: 'assistant', content: JSON.stringify(parsed) },
      { role: 'user', content: `Action "${parsed.action}" is not in legal_actions: ${JSON.stringify(statePayload.legal_actions)}. Try again.` },
    ];
    raw = await callAPI(retryMessages);
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw Object.assign(new Error('Agent response malformed'), { code: 'BAD_JSON' });
    }
    if (!VALID_ACTIONS.includes(parsed.action) || !statePayload.legal_actions.includes(parsed.action)) {
      throw Object.assign(new Error(`Illegal action: ${parsed.action}`), { code: 'ILLEGAL_ACTION' });
    }
  }

  console.log('[AGENT] ← response', parsed);
  console.log(`[AGENT] ✓ validated action=${parsed.action} (legal)`);
  return parsed;
}
