const session = {
  handsPlayed: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  bankrollHistory: [1000],
  agentExecuted: 0,
  agentOverridden: 0,
  agentMatchedBasic: 0,
  agentTotal: 0,
  currentStreak: 0,
  longestWin: 0,
  longestLoss: 0,
  peakBankroll: 1000,
};

export function recordHandResult(results, finalBankroll, agentAction, userExecutedAgent, basicStrategyAction) {
  session.handsPlayed += results.length;
  for (const r of results) {
    if (r === 'win' || r === 'blackjack') {
      session.wins++;
      session.currentStreak = session.currentStreak >= 0 ? session.currentStreak + 1 : 1;
      session.longestWin = Math.max(session.longestWin, session.currentStreak);
    } else if (r === 'push') {
      session.pushes++;
      session.currentStreak = 0;
    } else if (r === 'loss' || r === 'bust' || r === 'dealer_blackjack') {
      session.losses++;
      session.currentStreak = session.currentStreak <= 0 ? session.currentStreak - 1 : -1;
      session.longestLoss = Math.max(session.longestLoss, Math.abs(session.currentStreak));
    }
    if (r === 'blackjack') session.blackjacks++;
  }
  session.bankrollHistory.push(finalBankroll);
  session.peakBankroll = Math.max(session.peakBankroll, finalBankroll);

  if (agentAction) {
    session.agentTotal++;
    if (userExecutedAgent) session.agentExecuted++;
    else session.agentOverridden++;
    if (basicStrategyAction && agentAction === basicStrategyMap(basicStrategyAction)) {
      session.agentMatchedBasic++;
    }
  }
}

function basicStrategyMap(chartAction) {
  return { H: 'hit', S: 'stand', D: 'double', P: 'split', R: 'surrender' }[chartAction] ?? null;
}

export function getSession() { return { ...session }; }

export function buildSvgCurve(width, height) {
  const hist = session.bankrollHistory;
  if (hist.length < 2) return '';
  const maxB = Math.max(...hist);
  const minB = Math.min(...hist);
  const range = maxB - minB || 1;
  const pts = hist.map((v, i) => {
    const x = (i / (hist.length - 1)) * width;
    const y = height - ((v - minB) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <polyline points="${pts}" fill="none" stroke="#27ae60" stroke-width="2"/>
    <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="#555" stroke-width="1"/>
  </svg>`;
}
