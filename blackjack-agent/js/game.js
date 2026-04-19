import { createShoe, scoreHand, cardValue } from './deck.js';

const DEALER_STANDS_SOFT_17 = true;

export const PHASES = {
  BET: 'BET',
  DEAL: 'DEAL',
  INSURANCE: 'INSURANCE',
  PLAYER_TURN: 'PLAYER_TURN',
  DEALER_TURN: 'DEALER_TURN',
  SETTLE: 'SETTLE',
  GAME_OVER: 'GAME_OVER',
};

function makeHand(bet) {
  return { cards: [], bet, doubled: false, surrendered: false, settled: false, result: null, insuranceBet: 0 };
}

export function createGame() {
  const shoe = createShoe();
  let bankroll = 1000;
  let phase = PHASES.BET;
  let playerHands = [];
  let activeHandIdx = 0;
  let dealerCards = [];
  let pendingBet = 25;
  let insuranceOffered = false;
  let _undoSnapshot = null;

  function activeHand() { return playerHands[activeHandIdx]; }

  function _cloneHands(hands) {
    return hands.map(h => ({ ...h, cards: [...h.cards] }));
  }

  function _saveSnapshot() {
    _undoSnapshot = {
      bankroll,
      phase,
      playerHands: _cloneHands(playerHands),
      dealerCards: [...dealerCards],
      activeHandIdx,
      shoeState: shoe.getState(),
    };
  }

  function legalActions() {
    if (phase !== PHASES.PLAYER_TURN) return [];
    const hand = activeHand();
    const { total } = scoreHand(hand.cards);
    const isInitial = hand.cards.length === 2;
    const isSplitAce = hand._splitAce;
    if (isSplitAce) return ['stand'];

    const actions = ['hit', 'stand'];
    if (isInitial && bankroll >= hand.bet) actions.push('double');
    if (isInitial && playerHands.length < 4) {
      const r0 = hand.cards[0].rank;
      const r1 = hand.cards[1].rank;
      const norm = r => ['J','Q','K'].includes(r) ? '10' : r;
      if (norm(r0) === norm(r1) && bankroll >= hand.bet) actions.push('split');
    }
    if (isInitial && !hand._afterSplit) actions.push('surrender');
    return actions;
  }

  function buildStatePayload(riskTolerance = 'standard') {
    const hand = activeHand();
    const { total: hardTotal, isSoft } = scoreHand(hand.cards);
    const softTotal = isSoft ? hardTotal : hardTotal;
    return {
      player_hand: hand.cards,
      player_total_hard: hardTotal,
      player_total_soft: isSoft ? hardTotal : hardTotal,
      is_soft: isSoft,
      dealer_up_card: dealerCards[0],
      legal_actions: phase === PHASES.INSURANCE
        ? ['insurance_yes', 'insurance_no']
        : legalActions(),
      hand_number: activeHandIdx + 1,
      total_hands_this_round: playerHands.length,
      bet: hand.bet,
      bankroll,
      rules: {
        decks: 6,
        dealer_stands_soft_17: DEALER_STANDS_SOFT_17,
        das_allowed: true,
        surrender_allowed: true,
        blackjack_payout: '3:2',
      },
      risk_tolerance: riskTolerance,
    };
  }

  function dealRound(bet) {
    _undoSnapshot = null;
    if (shoe.needsShuffle()) shoe.reset();
    pendingBet = bet;
    bankroll -= bet;
    playerHands = [makeHand(bet)];
    dealerCards = [];
    activeHandIdx = 0;
    insuranceOffered = false;

    playerHands[0].cards.push(shoe.deal());
    dealerCards.push(shoe.deal());
    playerHands[0].cards.push(shoe.deal());
    dealerCards.push(shoe.deal()); // hole card

    phase = PHASES.DEAL;

    // Insurance check
    if (dealerCards[0].rank === 'A') {
      phase = PHASES.INSURANCE;
      insuranceOffered = true;
      return { phase, requiresInput: true };
    }

    // Dealer peek for 10-value
    if (['10','J','Q','K'].includes(dealerCards[0].rank)) {
      const { total: dealerTotal } = scoreHand(dealerCards);
      if (dealerTotal === 21) {
        phase = PHASES.DEALER_TURN;
        return finishRound();
      }
    }

    // Player blackjack check
    const { total: playerTotal } = scoreHand(playerHands[0].cards);
    if (playerTotal === 21) {
      return finishRound();
    }

    phase = PHASES.PLAYER_TURN;
    return { phase };
  }

  function applyInsurance(takeIt) {
    if (phase !== PHASES.INSURANCE) return;
    _saveSnapshot();
    const hand = activeHand();
    if (takeIt) {
      const sideBet = Math.floor(hand.bet / 2);
      bankroll -= sideBet;
      hand.insuranceBet = sideBet;
    }
    // Check dealer BJ
    const { total: dealerTotal } = scoreHand(dealerCards);
    if (dealerTotal === 21) {
      if (hand.insuranceBet > 0) bankroll += hand.insuranceBet * 3; // 2:1 pays
      phase = PHASES.DEALER_TURN;
      return finishRound();
    } else {
      // Insurance lost (already deducted)
    }

    const { total: playerTotal } = scoreHand(playerHands[0].cards);
    if (playerTotal === 21) {
      return finishRound();
    }
    phase = PHASES.PLAYER_TURN;
    return { phase };
  }

  function applyAction(action) {
    if (phase !== PHASES.PLAYER_TURN) return;
    _saveSnapshot();
    const hand = activeHand();

    if (action === 'hit') {
      hand.cards.push(shoe.deal());
      const { total } = scoreHand(hand.cards);
      if (total >= 21) return advanceHand();
    } else if (action === 'stand') {
      return advanceHand();
    } else if (action === 'double') {
      bankroll -= hand.bet;
      hand.bet *= 2;
      hand.doubled = true;
      hand.cards.push(shoe.deal());
      return advanceHand();
    } else if (action === 'split') {
      const newHand = makeHand(hand.bet);
      bankroll -= hand.bet;
      newHand._afterSplit = true;
      hand._afterSplit = true;
      newHand.cards.push(hand.cards.pop());
      hand.cards.push(shoe.deal());
      newHand.cards.push(shoe.deal());
      if (hand.cards[0].rank === 'A') {
        hand._splitAce = true;
        newHand._splitAce = true;
      }
      playerHands.splice(activeHandIdx + 1, 0, newHand);
      const { total } = scoreHand(hand.cards);
      if (hand._splitAce || total >= 21) return advanceHand();
    } else if (action === 'surrender') {
      hand.surrendered = true;
      bankroll += Math.floor(hand.bet / 2);
      hand.settled = true;
      return advanceHand();
    }

    return { phase, hand: activeHand(), handIdx: activeHandIdx };
  }

  function advanceHand() {
    activeHandIdx++;
    if (activeHandIdx >= playerHands.length) {
      return finishRound();
    }
    phase = PHASES.PLAYER_TURN;
    return { phase, hand: activeHand(), handIdx: activeHandIdx };
  }

  function finishRound() {
    phase = PHASES.DEALER_TURN;
    // Dealer plays out only if at least one non-busted/surrendered player hand exists
    const anyAlive = playerHands.some(h => {
      const { total } = scoreHand(h.cards);
      return !h.surrendered && total <= 21;
    });

    if (anyAlive) {
      let { total: dt, isSoft: ds } = scoreHand(dealerCards);
      while (dt < 17 || (!DEALER_STANDS_SOFT_17 && ds && dt === 17)) {
        dealerCards.push(shoe.deal());
        ({ total: dt, isSoft: ds } = scoreHand(dealerCards));
      }
    }

    phase = PHASES.SETTLE;
    const { total: dealerTotal } = scoreHand(dealerCards);
    const dealerBJ = dealerTotal === 21 && dealerCards.length === 2;

    for (const hand of playerHands) {
      if (hand.settled) continue;
      const { total: pt } = scoreHand(hand.cards);
      const playerBJ = pt === 21 && hand.cards.length === 2 && !hand._afterSplit;

      if (pt > 21) {
        hand.result = 'bust';
      } else if (playerBJ && !dealerBJ) {
        hand.result = 'blackjack';
        bankroll += hand.bet + Math.floor(hand.bet * 1.5);
      } else if (dealerBJ && !playerBJ) {
        hand.result = 'dealer_blackjack';
      } else if (pt > dealerTotal || dealerTotal > 21) {
        hand.result = 'win';
        bankroll += hand.bet * 2;
      } else if (pt === dealerTotal) {
        hand.result = 'push';
        bankroll += hand.bet;
      } else {
        hand.result = 'loss';
      }
      hand.settled = true;
    }

    if (bankroll <= 0) {
      phase = PHASES.GAME_OVER;
    } else {
      phase = PHASES.BET;
    }

    return { phase, playerHands, dealerCards, dealerTotal, bankroll };
  }

  function canUndo() {
    return _undoSnapshot !== null;
  }

  function undo() {
    if (!_undoSnapshot) return false;
    const s = _undoSnapshot;
    bankroll = s.bankroll;
    phase = s.phase;
    playerHands = s.playerHands;
    dealerCards = s.dealerCards;
    activeHandIdx = s.activeHandIdx;
    shoe.setState(s.shoeState);
    _undoSnapshot = null;
    return true;
  }

  return {
    get phase() { return phase; },
    get bankroll() { return bankroll; },
    get playerHands() { return playerHands; },
    get dealerCards() { return dealerCards; },
    get activeHandIdx() { return activeHandIdx; },
    activeHand,
    legalActions,
    buildStatePayload,
    dealRound,
    applyInsurance,
    applyAction,
    canUndo,
    undo,
  };
}
