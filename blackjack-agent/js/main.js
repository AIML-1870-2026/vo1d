import { parseEnvFile, getApiKey, setApiKey } from './env.js';
import { createGame, PHASES } from './game.js';
import { askAgent } from './agent.js';
import { lookupStrategyForState } from './strategy.js';
import { recordHandResult, getSession } from './analytics.js';
import {
  renderHands, setActionButtons, showAgentResult,
  showToast, updateBankroll, updateAnalytics,
  buildStrategyChart, highlightStrategyCell, showGameOver,
} from './ui.js';

let game = createGame();
let lastAgentResult = null;
let lastStatePayload = null;
let lastBasicAction = null;
let agentRateLimitUntil = 0;
let explainMode = 'standard';
let riskTolerance = 'standard';

// ── API Key ──────────────────────────────────────────────────────────────────
function onKeyLoaded() {
  document.getElementById('key-status').textContent = 'API key loaded ✓';
  document.getElementById('key-status').classList.add('key-ok');
  document.getElementById('env-banner').style.display = 'none';
  enableDealButton();
}

document.getElementById('env-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const ok = parseEnvFile(text);
  if (!ok) {
    showToast('No OPENAI_API_KEY found in .env file', 'error');
    e.target.value = '';
    return;
  }
  onKeyLoaded();
});

document.getElementById('btn-set-key').addEventListener('click', () => {
  const val = document.getElementById('key-text-input').value.trim();
  if (!val.startsWith('sk-') || val.length < 20) {
    showToast('Enter a valid OpenAI API key (starts with sk-)', 'error');
    return;
  }
  setApiKey(val);
  onKeyLoaded();
});

document.getElementById('key-text-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-set-key').click();
});

function enableDealButton() {
  const hasKey = !!getApiKey();
  const inBet = game.phase === PHASES.BET;
  document.getElementById('btn-deal').disabled = !hasKey || !inBet;
  document.getElementById('btn-ask-agent').disabled = !hasKey;
}

// ── Chips ────────────────────────────────────────────────────────────────────
document.getElementById('chip-tray').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const denom = parseInt(chip.dataset.value);
  const input = document.getElementById('bet-input');
  const current = parseInt(input.value) || 0;
  const next = Math.min(current + denom, game.bankroll);
  input.value = next;
  updateBetDisplay(next);
});

document.getElementById('btn-clear-bet').addEventListener('click', () => {
  document.getElementById('bet-input').value = 0;
  updateBetDisplay(0);
});

document.getElementById('bet-input').addEventListener('input', (e) => {
  updateBetDisplay(parseInt(e.target.value) || 0);
});

function updateBetDisplay(amount) {
  const el = document.getElementById('current-bet-display');
  if (el) el.textContent = `$${amount}`;
}

// ── Bet & Deal ───────────────────────────────────────────────────────────────
document.getElementById('btn-deal').addEventListener('click', () => {
  const betInput = document.getElementById('bet-input');
  const bet = parseInt(betInput.value);
  if (isNaN(bet) || bet < 1 || bet > game.bankroll) {
    showToast('Place a valid bet first', 'error');
    return;
  }
  lastAgentResult = null;
  lastStatePayload = null;
  lastBasicAction = null;
  showAgentResult(null, explainMode, null);

  const result = game.dealRound(bet);
  render();

  if (result.phase === PHASES.INSURANCE) {
    showToast('Dealer shows Ace — Insurance offered', 'info');
  }
});

// ── Insurance ────────────────────────────────────────────────────────────────
document.getElementById('btn-insurance-yes').addEventListener('click', () => {
  game.applyInsurance(true);
  render();
});
document.getElementById('btn-insurance-no').addEventListener('click', () => {
  game.applyInsurance(false);
  render();
});

// ── Player Actions ───────────────────────────────────────────────────────────
for (const action of ['hit','stand','double','split','surrender']) {
  document.getElementById(`btn-${action}`).addEventListener('click', () => {
    handlePlayerAction(action, false);
  });
}

function handlePlayerAction(action, wasAgentExec) {
  const prevHandIdx = game.activeHandIdx;
  game.applyAction(action);
  render();

  if (game.phase === PHASES.BET || game.phase === PHASES.GAME_OVER) {
    const results = game.playerHands.map(h => h.result);
    const basicForRecord = lastBasicAction;
    recordHandResult(results, game.bankroll, lastAgentResult?.action ?? null, wasAgentExec, basicForRecord);
    updateAnalytics();
    if (game.phase === PHASES.GAME_OVER) showGameOver(getSession(), game.bankroll);
  }
}

// ── Execute Recommendation ───────────────────────────────────────────────────
document.getElementById('btn-execute').addEventListener('click', () => {
  if (!lastAgentResult) return;
  const action = lastAgentResult.action;
  if (action === 'insurance_yes' || action === 'insurance_no') {
    game.applyInsurance(action === 'insurance_yes');
    render();
    return;
  }
  handlePlayerAction(action, true);
});

// ── Ask Agent ────────────────────────────────────────────────────────────────
document.getElementById('btn-ask-agent').addEventListener('click', async () => {
  if (!getApiKey()) { showToast('Upload .env file first', 'error'); return; }
  if (Date.now() < agentRateLimitUntil) {
    showToast(`Rate limited — wait ${Math.ceil((agentRateLimitUntil - Date.now()) / 1000)}s`, 'warn');
    return;
  }
  if (game.phase !== PHASES.PLAYER_TURN && game.phase !== PHASES.INSURANCE) {
    showToast('No active hand to advise on', 'info');
    return;
  }

  const btn = document.getElementById('btn-ask-agent');
  btn.disabled = true;
  btn.textContent = 'Thinking…';

  const payload = game.buildStatePayload(riskTolerance);
  lastStatePayload = payload;
  const basicAction = lookupStrategyForState(payload);
  lastBasicAction = basicAction;

  try {
    const result = await askAgent(payload);
    lastAgentResult = result;
    showAgentResult(result, explainMode, basicAction);
    highlightStrategyCell(payload, result.action, basicAction);
  } catch (err) {
    handleAgentError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ask Agent';
  }
});

function handleAgentError(err) {
  if (err.code === 401) {
    showToast('Invalid API key — re-upload .env', 'error');
  } else if (err.code === 429) {
    agentRateLimitUntil = Date.now() + 10000;
    showToast('Rate limited — wait a moment', 'warn');
  } else if (err.code >= 500) {
    showToast('OpenAI error — try again', 'error');
  } else if (err.code === 'BAD_JSON') {
    showToast('Agent response malformed — play manually', 'error');
  } else if (err.code === 'ILLEGAL_ACTION') {
    showToast('Agent gave illegal action — using basic strategy', 'warn');
    if (lastBasicAction) {
      const mapped = { H: 'hit', S: 'stand', D: 'double', P: 'split', R: 'surrender' }[lastBasicAction];
      if (mapped && game.legalActions().includes(mapped)) {
        lastAgentResult = { action: mapped, confidence: 0.5, reasoning_terse: 'Fallback: basic strategy', reasoning_detailed: 'Agent failed; basic strategy chart used as fallback.' };
        showAgentResult(lastAgentResult, explainMode, lastBasicAction);
      }
    }
  } else {
    showToast('Agent unreachable — play manually', 'error');
  }
  console.error('[AGENT] Error:', err);
}

// ── Explain Mode ─────────────────────────────────────────────────────────────
document.getElementById('explain-mode').addEventListener('change', (e) => {
  explainMode = e.target.value;
  if (lastAgentResult) showAgentResult(lastAgentResult, explainMode, lastBasicAction);
});

// ── Risk Tolerance ───────────────────────────────────────────────────────────
document.getElementById('risk-tolerance').addEventListener('change', (e) => {
  riskTolerance = e.target.value;
});

// ── Analytics Toggle ─────────────────────────────────────────────────────────
document.getElementById('btn-toggle-analytics').addEventListener('click', () => {
  const panel = document.getElementById('analytics-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  updateAnalytics();
});

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  if (game.playerHands.length === 0) return;
  renderHands(game.playerHands, game.dealerCards, game.activeHandIdx, game.phase);
  setActionButtons(game.legalActions(), game.phase);
  updateBankroll(game.bankroll);

  const inBet = game.phase === PHASES.BET;
  document.getElementById('bet-input').disabled = !inBet;
  document.getElementById('btn-clear-bet').disabled = !inBet;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('chip-disabled', !inBet));
  document.getElementById('btn-deal').disabled = !inBet || !getApiKey();
  document.getElementById('btn-ask-agent').disabled =
    (game.phase !== PHASES.PLAYER_TURN && game.phase !== PHASES.INSURANCE) || !getApiKey();

  // After a round settles, reset bet display to 0 so user must re-place
  if (inBet) {
    document.getElementById('bet-input').value = 0;
    updateBetDisplay(0);
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
buildStrategyChart();
updateBankroll(1000);
updateAnalytics();
enableDealButton();
updateBetDisplay(0);
