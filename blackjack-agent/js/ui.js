import { scoreHand } from './deck.js';
import { HARD, SOFT, PAIRS, DEALER_COLS, ACTION_COLORS, ACTION_LABELS } from './strategy.js';
import { getSession, buildSvgCurve } from './analytics.js';

const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set(['H', 'D']);

// Animation state tracking
let _prevDealerCount = 0;
let _prevShowHole = false;
let _prevHandCounts = new Map(); // handIdx → card count
let _skipNextAnimation = false;

export function resetAnimationState() {
  _skipNextAnimation = true;
}

function cardHtml(card, faceDown = false, extraClass = '') {
  if (faceDown) return `<div class="card face-down ${extraClass}"></div>`;
  const suit = SUIT_SYMBOLS[card.suit] ?? card.suit;
  const color = RED_SUITS.has(card.suit) ? 'red' : 'black';
  return `<div class="card ${extraClass}" style="color:${color}">
    <span class="rank">${card.rank}</span>
    <span class="suit">${suit}</span>
  </div>`;
}

export function renderCard(card, faceDown = false) {
  return cardHtml(card, faceDown);
}

export function renderHands(playerHands, dealerCards, activeIdx, phase, skipAnim = false) {
  const dealerArea = document.getElementById('dealer-area');
  const playerArea = document.getElementById('player-area');
  const noAnim = _skipNextAnimation || skipAnim;

  const showHole = phase !== 'PLAYER_TURN' && phase !== 'INSURANCE';
  const { total: dt } = showHole ? scoreHand(dealerCards) : scoreHand([dealerCards[0]]);
  const dealerScore = showHole
    ? `${scoreHand(dealerCards).total}`
    : `${scoreHand([dealerCards[0]]).total}+?`;

  // Dealer cards — animate newly added cards and hole reveal
  const dealerHtml = dealerCards.map((c, i) => {
    const isFaceDown = i === 1 && !showHole;
    const isNew    = !noAnim && i >= _prevDealerCount;
    const isReveal = !noAnim && i === 1 && showHole && !_prevShowHole;
    const cls = isReveal ? 'card-reveal' : isNew ? 'card-deal' : '';
    return cardHtml(c, isFaceDown, cls);
  }).join('');

  dealerArea.innerHTML = `
    <div class="hand-label">Dealer <span class="score">${dealerScore}</span></div>
    <div class="cards-row">${dealerHtml}</div>`;

  // Player hands — animate new cards per hand
  playerArea.innerHTML = playerHands.map((hand, idx) => {
    const { total, isSoft } = scoreHand(hand.cards);
    const active = idx === activeIdx && (phase === 'PLAYER_TURN' || phase === 'INSURANCE');
    const resultClass = hand.result ? `result-${hand.result}` : '';
    const resultLabel = hand.result
      ? `<span class="result-badge result-badge-anim">${formatResult(hand.result)}</span>`
      : '';
    const prevCount = _prevHandCounts.get(idx) ?? 0;

    const cardsHtml = hand.cards.map((c, ci) => {
      const cls = (!noAnim && ci >= prevCount) ? 'card-deal' : '';
      return cardHtml(c, false, cls);
    }).join('');

    return `<div class="hand ${active ? 'active-hand' : ''} ${resultClass}">
      <div class="hand-label">Hand ${idx + 1} — $${hand.bet} ${isSoft ? '(soft)' : ''}
        <span class="score">${total}</span>${resultLabel}
      </div>
      <div class="cards-row">${cardsHtml}</div>
    </div>`;
  }).join('');

  // Update tracking state
  _prevDealerCount = dealerCards.length;
  _prevShowHole   = showHole;
  _prevHandCounts = new Map(playerHands.map((h, i) => [i, h.cards.length]));
  _skipNextAnimation = false;
}

export function clearAnimationTracking() {
  _prevDealerCount = 0;
  _prevShowHole    = false;
  _prevHandCounts  = new Map();
}

function formatResult(r) {
  return { win: 'WIN', loss: 'LOSS', push: 'PUSH', bust: 'BUST', blackjack: 'BLACKJACK! 🎉', dealer_blackjack: 'DEALER BJ', surrender: 'SURRENDERED' }[r] ?? r;
}

export function setActionButtons(legalActions, phase) {
  const actions = ['hit','stand','double','split','surrender'];
  for (const a of actions) {
    const btn = document.getElementById(`btn-${a}`);
    if (btn) btn.disabled = phase !== 'PLAYER_TURN' || !legalActions.includes(a);
  }
  const insDiv = document.getElementById('insurance-prompt');
  if (insDiv) insDiv.style.display = phase === 'INSURANCE' ? 'flex' : 'none';
}

export function showAgentResult(result, explainMode, basicStrategyAction) {
  const panel = document.getElementById('agent-panel');
  const execBtn = document.getElementById('btn-execute');
  if (!result) {
    panel.innerHTML = '<p class="muted">Press "Ask Agent" to get a recommendation.</p>';
    if (execBtn) execBtn.disabled = true;
    return;
  }

  const matches = basicStrategyAction && basicStrategyMap(basicStrategyAction) === result.action;
  const matchIcon = basicStrategyAction
    ? (matches
        ? '<span class="match-icon match">✓ matches basic strategy</span>'
        : '<span class="match-icon no-match">⚠ diverges from basic strategy</span>')
    : '';

  let html = `<div class="agent-action">
    <span class="action-badge action-${result.action}">${result.action.toUpperCase()}</span>
    <span class="confidence">Confidence: ${Math.round(result.confidence * 100)}%</span>
    ${matchIcon}
  </div>`;

  if (explainMode === 'terse' || explainMode === 'standard') {
    html += `<p class="reasoning">${result.reasoning_terse}</p>`;
  } else {
    html += `<p class="reasoning">${result.reasoning_detailed}</p>`;
    if (basicStrategyAction) html += `<p class="muted">Basic strategy: ${ACTION_LABELS[basicStrategyAction] ?? basicStrategyAction}</p>`;
  }

  panel.innerHTML = html;
  if (execBtn) execBtn.disabled = false;
}

function basicStrategyMap(chartAction) {
  return { H: 'hit', S: 'stand', D: 'double', P: 'split', R: 'surrender' }[chartAction] ?? null;
}

export function showToast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

export function updateBankroll(amount) {
  const el = document.getElementById('bankroll-display');
  if (!el) return;
  const prev = parseInt(el.dataset.prev ?? amount);
  el.textContent = `$${amount}`;
  el.dataset.prev = amount;
  if (prev !== amount) {
    el.classList.remove('bankroll-up', 'bankroll-down');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add(amount > prev ? 'bankroll-up' : 'bankroll-down');
  }
}

export function updateAnalytics() {
  const s = getSession();
  const panel = document.getElementById('analytics-panel');
  if (!panel) return;
  const winRate   = s.handsPlayed ? ((s.wins / s.handsPlayed) * 100).toFixed(1) : '0.0';
  const agreeRate = s.agentTotal  ? ((s.agentExecuted / s.agentTotal) * 100).toFixed(1) : 'N/A';
  const basicAgree = s.agentTotal ? ((s.agentMatchedBasic / s.agentTotal) * 100).toFixed(1) : 'N/A';

  panel.innerHTML = `
    <div class="analytics-grid">
      <div class="stat"><span class="stat-label">Hands</span><span class="stat-val">${s.handsPlayed}</span></div>
      <div class="stat"><span class="stat-label">Wins</span><span class="stat-val">${s.wins}</span></div>
      <div class="stat"><span class="stat-label">Losses</span><span class="stat-val">${s.losses}</span></div>
      <div class="stat"><span class="stat-label">Pushes</span><span class="stat-val">${s.pushes}</span></div>
      <div class="stat"><span class="stat-label">Blackjacks</span><span class="stat-val">${s.blackjacks}</span></div>
      <div class="stat"><span class="stat-label">Win Rate</span><span class="stat-val">${winRate}%</span></div>
      <div class="stat"><span class="stat-label">Peak $</span><span class="stat-val">$${s.peakBankroll}</span></div>
      <div class="stat"><span class="stat-label">Agent Agree</span><span class="stat-val">${agreeRate}%</span></div>
      <div class="stat"><span class="stat-label">vs Basic</span><span class="stat-val">${basicAgree}%</span></div>
      <div class="stat"><span class="stat-label">Best Streak</span><span class="stat-val">${s.longestWin}W / ${s.longestLoss}L</span></div>
    </div>
    <div class="bankroll-chart">${buildSvgCurve(300, 80)}</div>`;
}

export function buildStrategyChart() {
  const container = document.getElementById('strategy-chart');
  if (!container) return;

  const dealerHeaders = ['', ...DEALER_COLS].map(d => `<th>${d}</th>`).join('');
  let rows = '';

  rows += `<tr><td colspan="${DEALER_COLS.length + 1}" class="section-header">Hard Totals</td></tr>`;
  for (let t = 5; t <= 21; t++) {
    if (!HARD[t]) continue;
    rows += `<tr><td class="row-label">H${t}</td>${HARD[t].map((a, i) =>
      `<td id="cell-H${t}-${i}" class="cell" style="background:${ACTION_COLORS[a]}" title="${ACTION_LABELS[a]}">${a}</td>`
    ).join('')}</tr>`;
  }

  rows += `<tr><td colspan="${DEALER_COLS.length + 1}" class="section-header">Soft Totals</td></tr>`;
  for (let t = 13; t <= 21; t++) {
    if (!SOFT[t]) continue;
    rows += `<tr><td class="row-label">S${t}</td>${SOFT[t].map((a, i) =>
      `<td id="cell-S${t}-${i}" class="cell" style="background:${ACTION_COLORS[a]}" title="${ACTION_LABELS[a]}">${a}</td>`
    ).join('')}</tr>`;
  }

  rows += `<tr><td colspan="${DEALER_COLS.length + 1}" class="section-header">Pairs</td></tr>`;
  for (const [rank, arr] of Object.entries(PAIRS)) {
    rows += `<tr><td class="row-label">${rank}-${rank}</td>${arr.map((a, i) =>
      `<td id="cell-P${rank}-${i}" class="cell" style="background:${ACTION_COLORS[a]}" title="${ACTION_LABELS[a]}">${a}</td>`
    ).join('')}</tr>`;
  }

  container.innerHTML = `<table class="strategy-table">
    <thead><tr>${dealerHeaders}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function highlightStrategyCell(state, agentAction, basicAction) {
  document.querySelectorAll('.cell.highlighted').forEach(el => {
    el.classList.remove('highlighted', 'match-highlight', 'mismatch-highlight');
  });
  if (!basicAction || !state) return;

  const dealerIdx = DEALER_COLS.indexOf(
    ['J','Q','K'].includes(state.dealer_up_card?.rank) ? '10' : state.dealer_up_card?.rank
  );
  if (dealerIdx === -1) return;

  const isPair = state.player_hand?.length === 2 && (() => {
    const norm = r => ['J','Q','K'].includes(r) ? '10' : r;
    return norm(state.player_hand[0].rank) === norm(state.player_hand[1].rank);
  })();

  let cellId;
  if (isPair) {
    const key = ['J','Q','K'].includes(state.player_hand[0].rank) ? '10' : state.player_hand[0].rank;
    cellId = `cell-P${key}-${dealerIdx}`;
  } else if (state.is_soft) {
    const t = Math.min(Math.max(state.player_total_soft ?? state.player_total_hard, 13), 21);
    cellId = `cell-S${t}-${dealerIdx}`;
  } else {
    const t = Math.min(Math.max(state.player_total_hard, 5), 21);
    cellId = `cell-H${t}-${dealerIdx}`;
  }

  const cell = document.getElementById(cellId);
  if (!cell) return;

  const agentMapped = { hit: 'H', stand: 'S', double: 'D', split: 'P', surrender: 'R' }[agentAction];
  const matches = agentMapped === basicAction;
  cell.classList.add('highlighted', matches ? 'match-highlight' : 'mismatch-highlight');
  cell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export function showGameOver(session, finalBankroll) {
  const modal = document.getElementById('gameover-modal');
  if (!modal) return;
  const s = getSession();
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Game Over</h2>
      <p style="color:var(--parchment);font-style:italic;margin-bottom:8px;">Your coffers are empty, traveller.</p>
      <div class="go-stats">
        <div>Hands played: <strong>${s.handsPlayed}</strong></div>
        <div>Wins / Losses / Pushes: <strong>${s.wins} / ${s.losses} / ${s.pushes}</strong></div>
        <div>Blackjacks: <strong>${s.blackjacks}</strong></div>
        <div>Peak bankroll: <strong>$${s.peakBankroll}</strong></div>
        <div>Longest win streak: <strong>${s.longestWin}</strong></div>
        <div>Longest loss streak: <strong>${s.longestLoss}</strong></div>
      </div>
      <button onclick="location.reload()">Return to the Tavern</button>
    </div>`;
  modal.style.display = 'flex';
}
