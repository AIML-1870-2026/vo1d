/* ============================================
   Decision Neuron — App Logic
   ============================================ */

// --- Persona Weight Profiles ---
const PERSONAS = {
  carGuy: {
    label: 'Car Guy',
    emoji: '🔧',
    flavor: 'Speed is everything. Price? Irrelevant.',
    weights: { reliability: 0.15, speed: 0.45, utility: 0.05, price: 0.05 }
  },
  familyMan: {
    label: 'Family Man',
    emoji: '👨‍👩‍👧‍👦',
    flavor: 'Family first. Safety and space are non-negotiable.',
    weights: { reliability: 0.40, speed: 0.05, utility: 0.40, price: 0.15 }
  },
  teenager: {
    label: 'Teenager',
    emoji: '🎓',
    flavor: 'Just need wheels that won\'t break the bank.',
    weights: { reliability: 0.15, speed: 0.30, utility: 0.05, price: 0.50 }
  },
  commuter: {
    label: 'Commuter',
    emoji: '💼',
    flavor: 'Reliable daily driver. Fuel costs matter.',
    weights: { reliability: 0.35, speed: 0.05, utility: 0.20, price: 0.40 }
  },
  adventurer: {
    label: 'Adventurer',
    emoji: '🏔️',
    flavor: 'Off-road capable. Built for the wild.',
    weights: { reliability: 0.20, speed: 0.15, utility: 0.45, price: 0.20 }
  }
};

// --- Car Database (20 Vehicles) ---
const CARS = [
  { name: 'Toyota Camry',        emoji: '🚗', reliability: 92, speed: 35, utility: 60, price: 80 },
  { name: 'Honda Civic',         emoji: '🚗', reliability: 90, speed: 40, utility: 50, price: 85 },
  { name: 'Ford F-150',          emoji: '🛻', reliability: 75, speed: 45, utility: 95, price: 50 },
  { name: 'Chevrolet Corvette',  emoji: '🏎️', reliability: 60, speed: 95, utility: 10, price: 20 },
  { name: 'Porsche 911',         emoji: '🏎️', reliability: 70, speed: 98, utility: 10, price: 5  },
  { name: 'Tesla Model 3',       emoji: '⚡', reliability: 72, speed: 80, utility: 55, price: 45 },
  { name: 'Toyota RAV4',         emoji: '🚙', reliability: 88, speed: 30, utility: 80, price: 70 },
  { name: 'Subaru Outback',      emoji: '🚙', reliability: 85, speed: 28, utility: 85, price: 68 },
  { name: 'BMW M3',              emoji: '🏎️', reliability: 55, speed: 92, utility: 25, price: 15 },
  { name: 'Mazda Miata',         emoji: '🚗', reliability: 80, speed: 70, utility: 10, price: 75 },
  { name: 'Jeep Wrangler',       emoji: '🚙', reliability: 60, speed: 30, utility: 90, price: 45 },
  { name: 'Kia Soul',            emoji: '🚗', reliability: 78, speed: 25, utility: 65, price: 90 },
  { name: 'Dodge Charger',       emoji: '🏎️', reliability: 50, speed: 88, utility: 35, price: 40 },
  { name: 'Honda CR-V',          emoji: '🚙', reliability: 90, speed: 28, utility: 82, price: 65 },
  { name: 'Toyota Tacoma',       emoji: '🛻', reliability: 88, speed: 35, utility: 88, price: 55 },
  { name: 'Hyundai Elantra',     emoji: '🚗', reliability: 82, speed: 32, utility: 48, price: 92 },
  { name: 'Ford Mustang',        emoji: '🏎️', reliability: 55, speed: 90, utility: 15, price: 50 },
  { name: 'Volkswagen Golf GTI', emoji: '🚗', reliability: 75, speed: 75, utility: 45, price: 60 },
  { name: 'Chrysler Pacifica',   emoji: '🚐', reliability: 70, speed: 20, utility: 95, price: 55 },
  { name: 'Nissan Altima',       emoji: '🚗', reliability: 80, speed: 35, utility: 55, price: 82 }
];

// --- Car SVG Silhouettes (wireframe side profiles with bezier curves) ---
// Cars face right. Q = quadratic bezier for smooth rooflines.
const CAR_SVG_DATA = {
  // Smooth mid-sedan, gentle flowing roofline
  'Toyota Camry': {
    body: 'M30,93 L30,72 Q32,68 40,68 L55,68 Q72,46 90,42 L148,40 Q162,40 175,50 Q182,56 188,62 L210,62 L210,93 Z',
    win: ['M78,46 Q84,43 92,42 L104,42 L104,64 L62,66 Z', 'M108,42 L146,41 Q160,41 174,52 L174,62 L108,62 Z'],
    wh: [60, 188],
    dt: ['M210,66 L216,66 L216,80 L210,80', 'M30,72 L24,74 L24,84 L30,84', 'M108,62 L108,42']
  },
  // Sportier compact, fastback-ish rear, sharper creases
  'Honda Civic': {
    body: 'M28,93 L28,70 Q30,66 36,66 L48,66 Q65,40 85,36 L142,34 Q158,34 175,48 Q182,54 188,58 L215,58 L215,93 Z',
    win: ['M72,42 Q78,38 88,36 L102,36 L102,58 L54,64 Z', 'M106,36 L140,35 Q156,35 172,48 L172,58 L106,58 Z'],
    wh: [58, 192],
    dt: ['M215,62 L222,62 L222,78 L215,78', 'M28,70 L22,72 L22,82 L28,82']
  },
  // Full-size pickup: tall cab, long bed, big fenders
  'Ford F-150': {
    body: 'M20,88 L20,52 Q22,48 28,48 L35,48 Q48,26 60,24 L108,24 Q116,24 120,32 L126,50 L200,50 Q208,50 214,56 L220,62 L224,62 L224,88 Z',
    win: ['M55,28 Q58,26 62,26 L82,26 L82,48 L40,48 Z', 'M86,26 L106,26 Q114,26 118,34 L122,48 L86,48 Z'],
    wh: [58, 200],
    dt: ['M126,54 L200,54', 'M224,66 L230,66 L230,80 L224,80', 'M20,54 L14,56 L14,68 L20,68']
  },
  // Ultra-low mid-engine supercar, tiny cabin pushed forward
  'Chevrolet Corvette': {
    body: 'M15,93 L15,76 Q18,72 24,72 L35,72 Q50,56 68,52 L92,50 Q100,48 108,48 L172,50 Q190,52 205,62 Q210,66 215,68 L228,68 L228,93 Z',
    win: ['M72,54 Q80,50 94,50 L94,68 L55,70 Z'],
    wh: [50, 202],
    dt: ['M172,48 L188,44 L205,50', 'M228,72 L234,72 L234,84 L228,84', 'M15,76 L10,78 L10,86 L15,86']
  },
  // THE iconic 911: continuous sloping rear, rear sits higher than front, rounded flowing shape
  'Porsche 911': {
    body: 'M18,93 L18,66 Q20,58 32,54 Q50,40 78,34 Q98,30 118,32 Q135,34 150,42 Q165,52 185,60 L210,62 Q216,62 218,66 L218,93 Z',
    win: ['M36,52 Q52,40 80,34 Q90,32 98,32 L98,54 Q72,56 36,54 Z', 'M102,32 Q118,31 128,36 Q142,42 152,50 L152,56 L102,54 Z'],
    wh: [52, 192],
    dt: ['M218,68 L224,68 L224,82 L218,82', 'M18,68 L12,70 L12,80 L18,80', 'M152,56 L152,32']
  },
  // Ultra-smooth, no grille, glass-roof effect, minimal
  'Tesla Model 3': {
    body: 'M24,93 L24,70 Q26,66 32,66 L48,66 Q68,42 90,38 L155,36 Q172,36 188,50 Q194,56 200,62 L216,62 L216,93 Z',
    win: ['M76,42 Q82,40 92,38 L120,38 L120,60 L58,64 Z', 'M124,38 L154,37 Q170,37 186,50 L186,60 L124,60 Z'],
    wh: [58, 192],
    dt: []
  },
  // Angular compact SUV, raised stance, sharp body lines
  'Toyota RAV4': {
    body: 'M22,88 L22,50 Q24,46 28,46 L35,46 Q48,28 62,26 L158,26 Q168,26 178,36 Q184,42 188,48 L218,48 L218,88 Z',
    win: ['M56,30 Q60,28 66,28 L95,28 L95,46 L40,46 Z', 'M99,28 L156,28 Q166,28 176,36 L180,44 L99,44 Z'],
    wh: [55, 196],
    dt: ['M218,52 L225,52 L225,70 L218,70', 'M22,50 L16,52 L16,64 L22,64']
  },
  // Wagon-crossover, long extended roof, roof rails, slightly lifted
  'Subaru Outback': {
    body: 'M22,88 L22,54 Q24,50 28,50 L35,50 Q50,30 65,28 L168,28 Q178,28 186,38 Q190,44 194,50 L218,50 L218,88 Z',
    win: ['M58,32 Q62,30 68,30 L100,30 L100,48 L42,48 Z', 'M104,30 L166,30 Q176,30 184,38 L188,48 L104,48 Z'],
    wh: [55, 196],
    dt: ['M58,25 L168,25', 'M58,25 L58,28', 'M168,25 L168,28']
  },
  // Aggressive sport sedan: lower, wider, flared fenders, air intakes
  'BMW M3': {
    body: 'M24,93 L24,70 Q26,66 32,66 L48,66 Q66,42 84,38 L148,36 Q164,36 178,48 Q184,54 190,60 L215,60 L215,93 Z',
    win: ['M72,42 Q78,40 86,38 L102,38 L102,60 L55,64 Z', 'M106,38 L146,37 Q162,37 176,48 L176,60 L106,60 Z'],
    wh: [56, 192],
    dt: ['M215,64 L222,64 L222,80 L215,80', 'M24,70 L18,72 L18,82 L24,82', 'M215,58 L220,56 L225,58']
  },
  // Tiny 2-seater roadster, convertible (no fixed roof), very short
  'Mazda Miata': {
    body: 'M40,93 L40,72 Q42,68 48,68 L58,68 Q74,50 90,46 L138,44 Q150,44 164,54 Q170,58 175,62 L205,62 L205,93 Z',
    win: ['M94,48 Q100,46 108,46 L138,45 L138,60 L90,60 Z'],
    wh: [68, 184],
    dt: ['M140,42 Q148,38 164,44', 'M205,66 L210,66 L210,78 L205,78', 'M40,72 L35,74 L35,82 L40,82']
  },
  // Maximum boxy: flat windshield, flat panels, nearly vertical everything
  'Jeep Wrangler': {
    body: 'M18,86 L18,38 Q18,34 22,34 L28,34 Q30,24 36,22 L115,22 Q120,22 122,28 L124,38 L198,38 Q204,38 208,44 L214,52 L224,52 L224,86 Z',
    win: ['M38,26 Q40,24 44,24 L76,24 L76,36 L34,36 Z', 'M80,24 L113,24 Q118,24 120,28 L122,36 L80,36 Z'],
    wh: [54, 198],
    dt: ['M224,56 L230,56 L230,72 L224,72', 'M18,42 L12,44 L12,58 L18,58']
  },
  // Tall boxy compact, short overhangs, upright stance
  'Kia Soul': {
    body: 'M28,93 L28,48 Q30,44 34,44 L40,44 Q52,26 66,24 L165,24 Q174,24 180,32 Q184,38 186,44 L215,44 L215,93 Z',
    win: ['M58,28 Q62,26 68,26 L98,26 L98,42 L44,42 Z', 'M102,26 L163,26 Q172,26 178,34 L182,42 L102,42 Z'],
    wh: [58, 192],
    dt: ['M215,48 L222,48 L222,68 L215,68', 'M28,48 L22,50 L22,64 L28,64']
  },
  // Wide-body muscle sedan, aggressive stance, thick haunches
  'Dodge Charger': {
    body: 'M20,93 L20,70 Q22,66 28,66 L42,66 Q60,42 80,38 L155,36 Q172,36 188,52 Q194,58 200,62 L222,62 L222,93 Z',
    win: ['M68,42 Q74,40 82,38 L104,38 L104,62 L50,64 Z', 'M108,38 L153,37 Q170,37 186,52 L186,62 L108,62 Z'],
    wh: [56, 196],
    dt: ['M222,66 L230,66 L230,84 L222,84', 'M20,70 L12,72 L12,84 L20,84']
  },
  // Rounded compact SUV, smooth lines, practical
  'Honda CR-V': {
    body: 'M24,88 L24,50 Q26,46 30,46 L38,46 Q52,28 68,26 L162,26 Q172,26 182,36 Q188,42 192,48 L218,48 L218,88 Z',
    win: ['M60,30 Q64,28 70,28 L98,28 L98,46 L44,46 Z', 'M102,28 L160,28 Q170,28 180,36 L184,46 L102,46 Z'],
    wh: [56, 196],
    dt: ['M218,52 L225,52 L225,70 L218,70', 'M24,50 L18,52 L18,64 L24,64']
  },
  // Mid-size pickup, smaller than F-150, cab + bed
  'Toyota Tacoma': {
    body: 'M22,88 L22,52 Q24,48 28,48 L34,48 Q46,28 58,26 L108,26 Q114,26 118,32 L124,50 L195,50 Q202,50 208,56 L214,60 L220,60 L220,88 Z',
    win: ['M52,30 Q56,28 60,28 L82,28 L82,48 L38,48 Z', 'M86,28 L106,28 Q112,28 116,34 L120,48 L86,48 Z'],
    wh: [55, 198],
    dt: ['M124,54 L195,54', 'M220,64 L226,64 L226,78 L220,78']
  },
  // Angular compact sedan, sharp creases, sportier stance
  'Hyundai Elantra': {
    body: 'M26,93 L26,72 Q28,68 34,68 L48,68 Q66,42 84,38 L145,36 Q162,36 178,50 Q184,56 190,60 L214,60 L214,93 Z',
    win: ['M72,42 Q78,40 86,38 L102,38 L102,60 L55,66 Z', 'M106,38 L143,37 Q160,37 176,50 L176,60 L106,60 Z'],
    wh: [58, 192],
    dt: ['M214,64 L220,64 L220,80 L214,80', 'M26,72 L20,74 L20,84 L26,84']
  },
  // Classic muscle coupe: long hood, short rear deck, aggressive
  'Ford Mustang': {
    body: 'M25,93 L25,72 Q27,68 32,68 L42,68 Q56,48 72,44 L125,42 Q140,42 158,52 Q165,56 172,58 L218,58 L218,93 Z',
    win: ['M76,46 Q82,44 90,44 L104,44 L104,62 L54,66 Z', 'M108,44 L123,43 Q138,43 155,52 L155,58 L108,58 Z'],
    wh: [55, 196],
    dt: ['M125,40 Q140,36 158,42', 'M218,62 L226,62 L226,80 L218,80', 'M25,72 L20,74 L20,84 L25,84']
  },
  // Hot hatchback: short, steep rear hatch angle, rear spoiler
  'Volkswagen Golf GTI': {
    body: 'M28,93 L28,56 Q30,52 34,52 L40,52 Q54,32 70,28 L155,28 Q165,28 172,36 Q178,42 182,50 L215,52 L215,93 Z',
    win: ['M62,32 Q66,30 72,30 L100,30 L100,50 L46,50 Z', 'M104,30 L153,30 Q163,30 170,36 L175,48 L104,48 Z'],
    wh: [58, 194],
    dt: ['M215,56 L222,56 L222,72 L215,72', 'M172,30 Q176,26 182,30']
  },
  // Minivan: very long, tall roof, three window sections, sliding doors
  'Chrysler Pacifica': {
    body: 'M18,88 L18,48 Q20,44 24,44 L30,44 Q42,24 56,22 L185,22 Q195,22 202,32 Q206,38 210,44 L222,44 L222,88 Z',
    win: ['M48,26 Q52,24 58,24 L82,24 L82,42 L34,42 Z', 'M86,24 L124,24 L124,42 L86,42 Z', 'M128,24 L183,24 Q193,24 200,32 L204,42 L128,42 Z'],
    wh: [55, 200],
    dt: ['M86,42 L86,24', 'M128,42 L128,24']
  },
  // Mid-size sedan, flowing lines, V-motion grille hint
  'Nissan Altima': {
    body: 'M26,93 L26,72 Q28,68 34,68 L50,68 Q68,44 86,40 L150,38 Q165,38 180,50 Q186,56 192,62 L214,62 L214,93 Z',
    win: ['M76,44 Q82,42 88,40 L104,40 L104,62 L58,66 Z', 'M108,40 L148,39 Q163,39 178,50 L178,62 L108,62 Z'],
    wh: [58, 190],
    dt: ['M214,66 L220,66 L220,82 L214,82', 'M26,72 L20,74 L20,84 L26,84', 'M180,56 L188,52 L196,58']
  }
};

// Builds an SVG string from car silhouette data
function getCarSVG(name) {
  const d = CAR_SVG_DATA[name];
  if (!d) return '';

  const wheels = d.wh.map(cx =>
    `<circle cx="${cx}" cy="108" r="15" class="car-wheel"/>` +
    `<circle cx="${cx}" cy="108" r="6" class="car-hub"/>` +
    `<line x1="${cx - 5}" y1="103" x2="${cx + 5}" y2="113" class="car-spoke"/>` +
    `<line x1="${cx + 5}" y1="103" x2="${cx - 5}" y2="113" class="car-spoke"/>`
  ).join('');

  const windows = d.win.map(w => `<path d="${w}" class="car-window"/>`).join('');
  const details = d.dt.map(p => `<path d="${p}" class="car-detail"/>`).join('');

  return `<svg viewBox="0 0 240 130" class="car-svg">
    <path d="${d.body}" class="car-body"/>
    ${windows}
    <g>${wheels}</g>
    ${details}
    <line x1="10" y1="124" x2="230" y2="124" class="car-ground"/>
  </svg>`;
}

// --- Application State ---
const state = {
  persona: 'familyMan',
  sliders: {
    reliability: 50,
    speed: 50,
    utility: 50,
    price: 50
  },
  currentCarName: null,
  animatingGauge: false
};

// --- DOM References ---
const dom = {
  personaCards: document.querySelectorAll('.persona-card'),
  personaFlavor: document.getElementById('persona-flavor'),
  sliders: {
    reliability: document.getElementById('slider-reliability'),
    speed: document.getElementById('slider-speed'),
    utility: document.getElementById('slider-utility'),
    price: document.getElementById('slider-price')
  },
  sliderValues: {
    reliability: document.getElementById('val-reliability'),
    speed: document.getElementById('val-speed'),
    utility: document.getElementById('val-utility'),
    price: document.getElementById('val-price')
  },
  carDisplay: document.getElementById('car-display'),
  carName: document.getElementById('car-name'),
  carMeta: document.getElementById('car-meta'),
  carBackStats: document.getElementById('car-back-stats'),
  gaugeFill: document.getElementById('gauge-fill'),
  gaugeNumber: document.getElementById('gauge-number'),
  radarData: document.getElementById('radar-data'),
  altList: document.getElementById('alternatives-list'),
  neutralMessage: document.getElementById('neutral-message'),
  neuralLines: document.querySelectorAll('.neural-line:not(.neural-line--persona)'),
  personaNeuron: document.getElementById('persona-neuron'),
  neuronEmoji: document.getElementById('neuron-emoji'),
  neuronLines: document.querySelectorAll('.neuron-line'),
  personaInputNode: document.getElementById('persona-input-node'),
  personaInputEmoji: document.getElementById('persona-input-emoji'),
  personaInputLabel: document.getElementById('persona-input-label'),
  personaNeuralLine: document.getElementById('neural-line-persona'),
  sensitivityList: document.getElementById('sensitivity-list')
};

// --- Scoring Engine ---
// Sliders represent desired levels (not just importance).
// Persona weights determine how much each factor matters.
// Score measures how well a car FITS the user's desired profile.
function calculateMatchScores() {
  const persona = PERSONAS[state.persona];
  const w = persona.weights;
  const s = state.sliders;
  const factors = ['reliability', 'speed', 'utility', 'price'];

  // Edge case: all sliders at 0
  const totalInput = factors.reduce((sum, f) => sum + s[f], 0);
  if (totalInput === 0) {
    return CARS.map(car => ({ car, score: 0 }));
  }

  return CARS.map(car => {
    let totalScore = 0;
    let totalWeight = 0;

    factors.forEach(f => {
      const desired = s[f];
      const actual = car[f];
      const weight = w[f];

      // Skip factors the user doesn't care about
      if (desired === 0) return;

      let satisfaction;
      if (actual >= desired) {
        // Car meets or exceeds the target — great, but diminishing returns
        // for massive excess (you're paying for features you don't need).
        // Max penalty is ~8 points, so exceeding is never terrible.
        if (desired >= 100) {
          satisfaction = 100;
        } else {
          const excessRatio = (actual - desired) / (100 - desired);
          satisfaction = 100 - excessRatio * excessRatio * 8;
        }
      } else {
        // Car falls short — steeper penalty for larger gaps.
        // Power curve: small shortfalls are tolerable, big ones hurt.
        satisfaction = Math.pow(actual / desired, 1.2) * 100;
      }

      totalScore += weight * satisfaction;
      totalWeight += weight * 100;
    });

    if (totalWeight === 0) return { car, score: 0 };
    return { car, score: Math.round((totalScore / totalWeight) * 100) };
  });
}

function getRecommendation() {
  const scored = calculateMatchScores();
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// --- Render Functions ---
function updateDisplay() {
  const ranked = getRecommendation();
  const allZero = state.sliders.reliability + state.sliders.speed +
                  state.sliders.utility + state.sliders.price === 0;

  if (allZero) {
    dom.neutralMessage.hidden = false;
    dom.carName.textContent = '—';
    dom.carMeta.textContent = '';
    dom.carDisplay.innerHTML = getCarSVG('Toyota Camry');
    renderGauge(0);
    renderRadarChart({ reliability: 0, speed: 0, utility: 0, price: 0 });
    dom.altList.innerHTML = '';
    updateNeuralLines();
    return;
  }

  dom.neutralMessage.hidden = true;

  const best = ranked[0];
  renderCarDisplay(best.car);
  renderGauge(best.score);
  renderRadarChart(best.car);
  renderAlternatives(ranked.slice(1, 4));
  updateNeuralLines();
  updateWeightBars();
  updatePersonaNeuron();
  renderSensitivity();
}

function renderCarDisplay(car) {
  if (state.currentCarName !== car.name) {
    if (state.currentCarName === null) {
      // First load — render immediately, no crossfade
      dom.carDisplay.innerHTML = getCarSVG(car.name);
    } else {
      // Crossfade animation
      dom.carDisplay.classList.add('changing');
      setTimeout(() => {
        dom.carDisplay.innerHTML = getCarSVG(car.name);
        dom.carDisplay.classList.remove('changing');
      }, 300);
    }
    state.currentCarName = car.name;
  }

  dom.carName.textContent = car.name;
  dom.carMeta.textContent = `Reliability ${car.reliability} · Speed ${car.speed} · Utility ${car.utility} · Price ${car.price}`;

  dom.carBackStats.innerHTML =
    `<div>REL: ${car.reliability}</div>` +
    `<div>SPD: ${car.speed}</div>` +
    `<div>UTL: ${car.utility}</div>` +
    `<div>PRC: ${car.price}</div>`;
}

function renderGauge(percentage) {
  const circumference = 2 * Math.PI * 85; // ~534
  const offset = circumference - (percentage / 100) * circumference;
  dom.gaugeFill.style.strokeDashoffset = offset;

  // Color shifts from cyan to orange at high values
  if (percentage > 80) {
    dom.gaugeFill.style.stroke = 'var(--accent-secondary)';
  } else {
    dom.gaugeFill.style.stroke = 'var(--accent-primary)';
  }

  animateCounter(dom.gaugeNumber, parseInt(dom.gaugeNumber.textContent) || 0, percentage);
}

function renderRadarChart(car) {
  // Map car stats to diamond coordinates
  // Top = reliability, Right = speed, Bottom = utility, Left = price
  const cx = 100, cy = 100, maxR = 85;

  const relR = (car.reliability / 100) * maxR;
  const spdR = (car.speed / 100) * maxR;
  const utlR = (car.utility / 100) * maxR;
  const prcR = (car.price / 100) * maxR;

  const points = [
    `${cx},${cy - relR}`,           // top
    `${cx + spdR},${cy}`,           // right
    `${cx},${cy + utlR}`,           // bottom
    `${cx - prcR},${cy}`            // left
  ].join(' ');

  dom.radarData.setAttribute('points', points);
}

function renderAlternatives(alts) {
  dom.altList.innerHTML = alts.map((item, i) => `
    <div class="alt-car" data-car-index="${CARS.indexOf(item.car)}" tabindex="0">
      <span class="alt-car__rank">#${i + 2}</span>
      <span class="alt-car__name">${item.car.name}</span>
      <span class="alt-car__score">${item.score}%</span>
      <div class="alt-car__bar">
        <div class="alt-car__bar-fill" style="width: ${item.score}%"></div>
      </div>
    </div>
  `).join('');

  // Attach click listeners for preview
  dom.altList.querySelectorAll('.alt-car').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.carIndex);
      const car = CARS[idx];
      renderCarDisplay(car);
      renderRadarChart(car);
    });
  });
}

function updateNeuralLines() {
  const persona = PERSONAS[state.persona];

  // Update the 4 factor lines
  dom.neuralLines.forEach(line => {
    const factor = line.dataset.line;
    if (!factor) return;
    const contribution = persona.weights[factor] * state.sliders[factor];
    const maxContribution = 100;
    const normalized = contribution / maxContribution;

    line.style.strokeWidth = 1 + normalized * 4;
    line.style.opacity = 0.1 + normalized * 0.6;
  });

  // Update the persona neural line (5th input)
  if (dom.personaNeuralLine) {
    const totalSignal = ['reliability', 'speed', 'utility', 'price'].reduce(
      (sum, f) => sum + persona.weights[f] * state.sliders[f], 0
    );
    const normalized = Math.min(totalSignal / 50, 1);
    dom.personaNeuralLine.style.strokeWidth = 1.5 + normalized * 3;
    dom.personaNeuralLine.style.opacity = 0.15 + normalized * 0.55;
  }
}

function updateWeightBars() {
  const persona = PERSONAS[state.persona];
  const factors = ['reliability', 'speed', 'utility', 'price'];

  factors.forEach(factor => {
    const group = document.querySelector(`.slider-group[data-factor="${factor}"]`);
    if (!group) return;
    const bar = group.querySelector('.slider-weight__bar');
    if (!bar) return;
    bar.style.width = (persona.weights[factor] * 100) + '%';
  });
}

function calculateSensitivity() {
  const factors = ['reliability', 'speed', 'utility', 'price'];
  const results = [];

  factors.forEach(factor => {
    const original = state.sliders[factor];

    // Best score with this factor at 0
    state.sliders[factor] = 0;
    const bestAt0 = getRecommendation()[0].score;

    // Best score with this factor at 100
    state.sliders[factor] = 100;
    const bestAt100 = getRecommendation()[0].score;

    // Restore
    state.sliders[factor] = original;

    results.push({
      factor,
      impact: bestAt100 - bestAt0,
      absImpact: Math.abs(bestAt100 - bestAt0)
    });
  });

  return results;
}

function renderSensitivity() {
  const sensitivity = calculateSensitivity();
  const maxImpact = Math.max(...sensitivity.map(s => s.absImpact), 1);
  const labels = { reliability: 'REL', speed: 'SPD', utility: 'UTL', price: 'PRC' };

  dom.sensitivityList.innerHTML = sensitivity.map(s => {
    const barWidth = (s.absImpact / maxImpact) * 100;
    const sign = s.impact >= 0 ? '+' : '';
    const isHigh = s.absImpact > 15;
    return `
      <div class="sensitivity-item">
        <span class="sensitivity-item__label">${labels[s.factor]}</span>
        <div class="sensitivity-item__bar-wrap">
          <div class="sensitivity-item__bar${isHigh ? ' sensitivity-item__bar--high' : ''}" style="width: ${barWidth}%"></div>
        </div>
        <span class="sensitivity-item__value${isHigh ? ' sensitivity-item__value--high' : ''}">${sign}${s.impact}</span>
      </div>`;
  }).join('');
}

function updatePersonaNeuron() {
  const persona = PERSONAS[state.persona];

  // Update the left-panel neuron emoji
  dom.neuronEmoji.textContent = persona.emoji;

  // Update the center persona input indicator
  if (dom.personaInputEmoji) {
    dom.personaInputEmoji.textContent = persona.emoji;
  }
  if (dom.personaInputLabel) {
    dom.personaInputLabel.textContent = persona.label;
  }

  // Update left-panel neuron connection line thickness/opacity based on weights
  dom.neuronLines.forEach(line => {
    const factor = line.dataset.neuronLine;
    if (!factor) return;
    const weight = persona.weights[factor];
    const normalized = (weight - 0.05) / 0.45;
    line.style.strokeWidth = 1 + normalized * 3.5;
    line.style.opacity = 0.15 + normalized * 0.65;
  });
}

function pulsePersonaNeuron() {
  // Pulse left-panel neuron
  dom.personaNeuron.classList.remove('pulse');
  void dom.personaNeuron.offsetWidth;
  dom.personaNeuron.classList.add('pulse');

  // Pulse center persona indicator
  if (dom.personaInputNode) {
    dom.personaInputNode.classList.remove('pulse');
    void dom.personaInputNode.offsetWidth;
    dom.personaInputNode.classList.add('pulse');
  }
}

function updateSliderTrack(slider) {
  const val = slider.value;
  slider.style.setProperty('--val', val);
}

// --- Counter Animation ---
function animateCounter(element, from, to) {
  const duration = 500;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * ease);
    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// --- Event Listeners ---

// Persona selection
dom.personaCards.forEach(card => {
  card.addEventListener('click', () => {
    const persona = card.dataset.persona;
    state.persona = persona;

    // Update aria
    dom.personaCards.forEach(c => c.setAttribute('aria-checked', 'false'));
    card.setAttribute('aria-checked', 'true');

    // Update flavor text
    dom.personaFlavor.textContent = PERSONAS[persona].flavor;

    // Pulse the persona neuron
    pulsePersonaNeuron();

    // Pulse sliders to indicate weight shift
    document.querySelectorAll('.factor-slider').forEach(s => {
      s.style.transition = 'none';
      s.classList.add('pulse');
      setTimeout(() => {
        s.classList.remove('pulse');
        s.style.transition = '';
      }, 300);
    });

    updateDisplay();
  });

  // Keyboard: Enter/Space to select
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });
});

// Slider input
Object.keys(dom.sliders).forEach(factor => {
  const slider = dom.sliders[factor];
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    state.sliders[factor] = val;
    dom.sliderValues[factor].textContent = val;
    slider.setAttribute('aria-valuenow', val);
    updateSliderTrack(slider);
    updateDisplay();
  });
});

// --- Initialization ---
function init() {
  // Set defaults
  state.persona = 'familyMan';
  state.sliders = { reliability: 50, speed: 50, utility: 50, price: 50 };

  // Sync slider DOM
  Object.keys(dom.sliders).forEach(factor => {
    dom.sliders[factor].value = state.sliders[factor];
    dom.sliderValues[factor].textContent = state.sliders[factor];
    updateSliderTrack(dom.sliders[factor]);
  });

  // Set initial persona
  dom.personaCards.forEach(c => {
    c.setAttribute('aria-checked', c.dataset.persona === state.persona ? 'true' : 'false');
  });
  dom.personaFlavor.textContent = PERSONAS[state.persona].flavor;

  // Initial render
  updateDisplay();
}

document.addEventListener('DOMContentLoaded', init);
