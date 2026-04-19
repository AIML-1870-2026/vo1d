// 6-deck S17 DAS surrender basic strategy
// Rows: hard 5-21, soft 13-21, pairs 2-A
// Columns: dealer 2,3,4,5,6,7,8,9,10,A

const DEALER_COLS = ['2','3','4','5','6','7','8','9','10','A'];

const HARD = {
  5:  ['H','H','H','H','H','H','H','H','H','H'],
  6:  ['H','H','H','H','H','H','H','H','H','H'],
  7:  ['H','H','H','H','H','H','H','H','H','H'],
  8:  ['H','H','H','H','H','H','H','H','H','H'],
  9:  ['H','D','D','D','D','H','H','H','H','H'],
  10: ['D','D','D','D','D','D','D','D','H','H'],
  11: ['D','D','D','D','D','D','D','D','D','H'],
  12: ['H','H','S','S','S','H','H','H','H','H'],
  13: ['S','S','S','S','S','H','H','H','H','H'],
  14: ['S','S','S','S','S','H','H','H','H','H'],
  15: ['S','S','S','S','S','H','H','H','R','H'],
  16: ['S','S','S','S','S','H','H','R','R','R'],
  17: ['S','S','S','S','S','S','S','S','S','R'],
  18: ['S','S','S','S','S','S','S','S','S','S'],
  19: ['S','S','S','S','S','S','S','S','S','S'],
  20: ['S','S','S','S','S','S','S','S','S','S'],
  21: ['S','S','S','S','S','S','S','S','S','S'],
};

const SOFT = {
  13: ['H','H','H','D','D','H','H','H','H','H'],
  14: ['H','H','H','D','D','H','H','H','H','H'],
  15: ['H','H','D','D','D','H','H','H','H','H'],
  16: ['H','H','D','D','D','H','H','H','H','H'],
  17: ['H','D','D','D','D','H','H','H','H','H'],
  18: ['S','D','D','D','D','S','S','H','H','H'],
  19: ['S','S','S','S','D','S','S','S','S','S'],
  20: ['S','S','S','S','S','S','S','S','S','S'],
  21: ['S','S','S','S','S','S','S','S','S','S'],
};

const PAIRS = {
  '2': ['P','P','P','P','P','P','H','H','H','H'],
  '3': ['P','P','P','P','P','P','H','H','H','H'],
  '4': ['H','H','H','P','P','H','H','H','H','H'],
  '5': ['D','D','D','D','D','D','D','D','H','H'],
  '6': ['P','P','P','P','P','H','H','H','H','H'],
  '7': ['P','P','P','P','P','P','H','H','H','H'],
  '8': ['P','P','P','P','P','P','P','P','P','R'],
  '9': ['P','P','P','P','P','S','P','P','S','S'],
  '10':['S','S','S','S','S','S','S','S','S','S'],
  'A': ['P','P','P','P','P','P','P','P','P','P'],
};

export function lookupStrategy(playerHand, dealerUpCard, isSoft, isPair) {
  const col = DEALER_COLS.indexOf(dealerUpCard.rank === '10' || ['J','Q','K'].includes(dealerUpCard.rank) ? '10' : dealerUpCard.rank);
  if (col === -1) return null;

  if (isPair) {
    const pairRank = playerHand[0].rank;
    const key = ['J','Q','K'].includes(pairRank) ? '10' : pairRank;
    return PAIRS[key]?.[col] ?? null;
  }
  if (isSoft) {
    const { total } = import_scoreHand(playerHand);
    return SOFT[Math.min(total, 21)]?.[col] ?? null;
  }
  const { total } = import_scoreHand(playerHand);
  return HARD[Math.min(Math.max(total, 5), 21)]?.[col] ?? null;
}

function import_scoreHand(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (['J','Q','K'].includes(c.rank)) total += 10;
    else if (c.rank === 'A') { total += 11; aces++; }
    else total += parseInt(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, isSoft: aces > 0 };
}

export function lookupStrategyForState(state) {
  const { player_hand, dealer_up_card, is_soft } = state;
  const isPair = player_hand.length === 2 &&
    (['J','Q','K','10'].includes(player_hand[0].rank) ? '10' : player_hand[0].rank) ===
    (['J','Q','K','10'].includes(player_hand[1].rank) ? '10' : player_hand[1].rank);
  const col = DEALER_COLS.indexOf(
    ['J','Q','K'].includes(dealer_up_card.rank) ? '10' : dealer_up_card.rank
  );
  if (col === -1) return null;

  if (isPair) {
    const key = ['J','Q','K'].includes(player_hand[0].rank) ? '10' : player_hand[0].rank;
    return PAIRS[key]?.[col] ?? null;
  }
  const total = state.player_total_soft ?? state.player_total_hard;
  const clampedTotal = Math.min(Math.max(total, is_soft ? 13 : 5), 21);
  return (is_soft ? SOFT : HARD)[clampedTotal]?.[col] ?? null;
}

export const ACTION_COLORS = { H: '#e74c3c', S: '#27ae60', D: '#f39c12', P: '#3498db', R: '#9b59b6' };
export const ACTION_LABELS = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };

export { HARD, SOFT, PAIRS, DEALER_COLS };
