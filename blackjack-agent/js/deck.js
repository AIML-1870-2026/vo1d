const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['S','H','D','C'];
const NUM_DECKS = 6;
const CUT_CARD = Math.floor(312 * 0.75); // ~234

export function cardValue(rank) {
  if (['J','Q','K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function buildShoe() {
  const shoe = [];
  for (let d = 0; d < NUM_DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit });
      }
    }
  }
  return shoe;
}

function shuffle(arr) {
  const buf = new Uint32Array(arr.length);
  crypto.getRandomValues(buf);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createShoe() {
  const cards = shuffle(buildShoe());
  let pos = 0;

  return {
    deal() {
      return cards[pos++];
    },
    needsShuffle() {
      return pos >= CUT_CARD;
    },
    reset() {
      shuffle(cards);
      pos = 0;
    },
    remaining() {
      return cards.length - pos;
    }
  };
}

export function scoreHand(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = cardValue(c.rank);
    total += v;
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  const isSoft = aces > 0 && total <= 21;
  return { total, isSoft };
}
