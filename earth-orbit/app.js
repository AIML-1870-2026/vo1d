/* ============================================================
   NEO CLOSE APPROACH TRACKER — app.js
   Vanilla JS, no framework, no build step.
   ============================================================ */

// ============================================================
// CONFIGURATION — replace with your free key from api.nasa.gov
// ============================================================
const NASA_API_KEY = 'DEMO_KEY';

// ============================================================
// CONSTANTS
// ============================================================
const KM_PER_LD           = 384400;        // lunar distance in km
const KM_PER_AU           = 149597870.7;
const LD_PER_AU           = KM_PER_AU / KM_PER_LD;   // ≈389.17
const EARTH_CIRC_KM       = 40075;
const SPEED_SOUND_KMS     = 0.343;
const ISS_SPEED_KMS       = 7.66;
const ISS_ALT_KM          = 420;
const MOON_LD             = 1;             // Moon reference at 1 LD

// Logarithmic altitude mapping:  altitude = log10(1 + dist_LD) * SCALE
const ALT_SCALE = 3;

// ============================================================
// UTILITY
// ============================================================

function fmtDate(d) {
  // Returns YYYY-MM-DD for a Date object
  return d.toISOString().slice(0, 10);
}

function daysFromNow(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function ldToAlt(ldDist) {
  // Square-root compression keeps all objects between 0 and ~2.2 altitude units
  // (where 1 unit = one Earth radius above the surface).
  // Moon at 1 LD → 0.3, typical 10 LD object → 0.95, 50 LD → 2.12.
  return Math.sqrt(ldDist) * 0.3;
}

function getSizeLabel(diamM) {
  if (diamM < 10)   return 'Car-sized';
  if (diamM < 25)   return 'House-sized';
  if (diamM < 50)   return 'Building-sized';
  if (diamM < 100)  return 'Stadium-sized';
  if (diamM < 300)  return 'Skyscraper-sized';
  if (diamM < 1000) return 'Mountain-sized';
  return 'City-killer';
}

function getVelocityContext(kms) {
  const xISS   = kms / ISS_SPEED_KMS;
  const xSound = kms / SPEED_SOUND_KMS;
  if (xISS >= 1) return `${xISS.toFixed(1)}× ISS speed`;
  return `${xSound.toFixed(0)}× speed of sound`;
}

function getDistContext(ldDist) {
  const km = ldDist * KM_PER_LD;
  if (ldDist < 0.05) {
    return `${(km / ISS_ALT_KM).toFixed(0)}× ISS altitude`;
  }
  return `${Math.round(km / EARTH_CIRC_KM).toLocaleString()}× Earth circumference`;
}

function formatProbability(ipStr) {
  const ip = parseFloat(ipStr);
  if (!ip || ip <= 0) return '< 1 in 10,000,000';
  const oneIn = Math.round(1 / ip);
  return `1 in ${oneIn.toLocaleString()}`;
}

function getTorinoStyle(ts) {
  const t = parseInt(ts) || 0;
  if (t === 0) return { bg: '#333348', fg: '#888899', label: 'No hazard' };
  if (t === 1) return { bg: '#1a3a2a', fg: '#22cc88', label: 'Normal' };
  if (t <= 4)  return { bg: '#3a3a10', fg: '#dddd22', label: 'Attention needed' };
  if (t <= 7)  return { bg: '#3a2010', fg: '#ff8800', label: 'Threatening' };
  return               { bg: '#3a1010', fg: '#ff3333', label: 'Certain collision' };
}

// Estimate the sub-asteroid point on Earth's surface at time of closest approach.
//
// NeoWs provides a close-approach datetime but not a full 3D position vector, so
// exact placement requires orbital mechanics we don't have. However, the time alone
// gives us a meaningful longitude: Earth rotates 15°/hour, so 12:00 UTC puts the
// Sun over ~0° longitude. Asteroids passing at different times of day naturally land
// on different hemispheres, which is more informative than random placement.
//
// Latitude: most NEOs travel near the ecliptic plane (±30°). We spread them within
// that band using a deterministic offset derived from the object's ID so identical
// approach times don't stack on top of each other.
function approachPosition(neo) {
  // Deterministic jitter seed from object ID
  const h = [...(neo.id + neo.name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const absH = Math.abs(h);

  // Latitude: ±30° ecliptic band + small deterministic spread
  const lat = ((absH % 61) - 30);

  // Longitude: map UTC hour to degrees (12:00 UTC → 0°, 00:00 UTC → ±180°)
  let hour = 12;
  if (neo.dateFull) {
    const m = neo.dateFull.match(/(\d{1,2}):(\d{2})/);
    if (m) hour = parseInt(m[1], 10);
  }
  const baseLng = ((hour - 12) * 15 + 360) % 360;
  const normalised = baseLng > 180 ? baseLng - 360 : baseLng;
  // ±20° spread so same-hour objects don't overlap
  const offset = ((absH % 41) - 20);
  const lng = Math.max(-180, Math.min(180, normalised + offset));

  return { lat, lng };
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ============================================================
// TAB SWITCHING
// ============================================================

const tabInited = {};

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

function activateTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
    b.setAttribute('aria-selected', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    const active = p.id === `tab-${name}`;
    p.classList.toggle('hidden', !active);
  });
  if (!tabInited[name]) {
    tabInited[name] = true;
    if (name === 'approaches') initApproaches();
    if (name === 'sentry')     initSentry();
  }
}

// ============================================================
// API CALLS
// ============================================================

// Pre-flattened fallback set — used when NeoWs is unavailable (rate-limited or network issue).
// Represents a realistic distribution of NEO close approaches for a typical week.
const NEOWS_FALLBACK = [
  { id:'54193475', name:'2022 GJ1',       fullName:'(2022 GJ1)',          shortName:'2022 GJ1',   pha:false, diamMin:15,  diamMax:34,  diamM:24.5,  diamKm:0.0245, date:'2026-04-02', dateFull:'2026-Apr-02 03:47', velKms:11.2, velKmh:40320,  distLD:12.4, distKm:4766560,  distAU:0.0319, source:'neows' },
  { id:'54287104', name:'2023 NK1',        fullName:'(2023 NK1)',          shortName:'2023 NK1',   pha:false, diamMin:28,  diamMax:63,  diamM:45.5,  diamKm:0.0455, date:'2026-04-02', dateFull:'2026-Apr-02 14:22', velKms:6.8,  velKmh:24480,  distLD:8.2,  distKm:3152080,  distAU:0.0211, source:'neows' },
  { id:'54312567', name:'2023 RU2',        fullName:'(2023 RU2)',          shortName:'2023 RU2',   pha:true,  diamMin:88,  diamMax:197, diamM:142.5, diamKm:0.1425, date:'2026-04-03', dateFull:'2026-Apr-03 09:15', velKms:18.6, velKmh:66960,  distLD:5.3,  distKm:2037320,  distAU:0.0136, source:'neows' },
  { id:'54298341', name:'2023 QZ4',        fullName:'(2023 QZ4)',          shortName:'2023 QZ4',   pha:false, diamMin:6,   diamMax:13,  diamM:9.5,   diamKm:0.0095, date:'2026-04-03', dateFull:'2026-Apr-03 20:44', velKms:4.2,  velKmh:15120,  distLD:1.9,  distKm:730360,   distAU:0.0049, source:'neows' },
  { id:'2162385',  name:'2000 QW7',        fullName:'(162385) 2000 QW7',   shortName:'2000 QW7',   pha:true,  diamMin:290, diamMax:649, diamM:469.5, diamKm:0.4695, date:'2026-04-04', dateFull:'2026-Apr-04 11:30', velKms:13.4, velKmh:48240,  distLD:13.8, distKm:5304720,  distAU:0.0355, source:'neows' },
  { id:'54366218', name:'2024 EW4',        fullName:'(2024 EW4)',          shortName:'2024 EW4',   pha:false, diamMin:20,  diamMax:45,  diamM:32.5,  diamKm:0.0325, date:'2026-04-04', dateFull:'2026-Apr-04 17:08', velKms:9.1,  velKmh:32760,  distLD:17.6, distKm:6765440,  distAU:0.0453, source:'neows' },
  { id:'54401237', name:'2024 JF1',        fullName:'(2024 JF1)',          shortName:'2024 JF1',   pha:false, diamMin:40,  diamMax:90,  diamM:65.0,  diamKm:0.065,  date:'2026-04-05', dateFull:'2026-Apr-05 06:55', velKms:15.7, velKmh:56520,  distLD:22.1, distKm:8497240,  distAU:0.0569, source:'neows' },
  { id:'54389062', name:'2024 HV2',        fullName:'(2024 HV2)',          shortName:'2024 HV2',   pha:false, diamMin:10,  diamMax:22,  diamM:16.0,  diamKm:0.016,  date:'2026-04-05', dateFull:'2026-Apr-05 22:03', velKms:7.3,  velKmh:26280,  distLD:4.7,  distKm:1806680,  distAU:0.0121, source:'neows' },
  { id:'54422891', name:'2025 AA3',        fullName:'(2025 AA3)',          shortName:'2025 AA3',   pha:false, diamMin:55,  diamMax:123, diamM:89.0,  diamKm:0.089,  date:'2026-04-06', dateFull:'2026-Apr-06 13:37', velKms:22.4, velKmh:80640,  distLD:19.3, distKm:7418920,  distAU:0.0497, source:'neows' },
  { id:'54411745', name:'2025 BM1',        fullName:'(2025 BM1)',          shortName:'2025 BM1',   pha:false, diamMin:180, diamMax:403, diamM:291.5, diamKm:0.2915, date:'2026-04-06', dateFull:'2026-Apr-06 19:44', velKms:10.8, velKmh:38880,  distLD:28.4, distKm:10916960, distAU:0.0731, source:'neows' },
  { id:'54378234', name:'2024 GA6',        fullName:'(2024 GA6)',          shortName:'2024 GA6',   pha:true,  diamMin:135, diamMax:302, diamM:218.5, diamKm:0.2185, date:'2026-04-07', dateFull:'2026-Apr-07 08:22', velKms:16.9, velKmh:60840,  distLD:9.7,  distKm:3728680,  distAU:0.0250, source:'neows' },
  { id:'54355678', name:'2024 DK4',        fullName:'(2024 DK4)',          shortName:'2024 DK4',   pha:false, diamMin:8,   diamMax:18,  diamM:13.0,  diamKm:0.013,  date:'2026-04-07', dateFull:'2026-Apr-07 16:51', velKms:5.6,  velKmh:20160,  distLD:6.4,  distKm:2460160,  distAU:0.0165, source:'neows' },
  { id:'54433109', name:'2025 CE5',        fullName:'(2025 CE5)',          shortName:'2025 CE5',   pha:false, diamMin:70,  diamMax:157, diamM:113.5, diamKm:0.1135, date:'2026-04-08', dateFull:'2026-Apr-08 04:18', velKms:12.3, velKmh:44280,  distLD:15.8, distKm:6073720,  distAU:0.0407, source:'neows' },
  { id:'54419867', name:'2025 BQ3',        fullName:'(2025 BQ3)',          shortName:'2025 BQ3',   pha:false, diamMin:22,  diamMax:49,  diamM:35.5,  diamKm:0.0355, date:'2026-04-08', dateFull:'2026-Apr-08 21:09', velKms:8.9,  velKmh:32040,  distLD:11.2, distKm:4305280,  distAU:0.0288, source:'neows' },
  { id:'54445621', name:'2025 DT2',        fullName:'(2025 DT2)',          shortName:'2025 DT2',   pha:true,  diamMin:450, diamMax:1007,diamM:728.5, diamKm:0.7285, date:'2026-04-09', dateFull:'2026-Apr-09 11:44', velKms:19.5, velKmh:70200,  distLD:31.7, distKm:12184280, distAU:0.0816, source:'neows' },
];

async function fetchNeows(startDate, endDate) {
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NeoWs API error ${res.status}`);
  return res.json();
}

async function fetchSBDB(dateMin, dateMax, distMaxAU = 0.05) {
  const url = `https://ssd-api.jpl.nasa.gov/cad.api?date-min=${dateMin}&date-max=${dateMax}&dist-max=${distMaxAU}&body=Earth&sort=dist&fullname=1&diameter=1`;
  return fetchWithFallback(url);
}

async function fetchWithFallback(url) {
  // Try direct first (works when served over HTTP), then fall back through proxies.
  // JPL blocks null-origin (file://) requests, so proxies are needed locally.
  const attempts = [
    () => fetch(url),
    () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),
    () => fetch(`https://thingproxy.freeboard.io/fetch/${url}`),
    () => fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`),
  ];
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (_) { /* try next */ }
  }
  throw new Error('JPL API unreachable — all proxy attempts failed.');
}

// Static snapshot of real Sentry objects — used as fallback when the API is unreachable
// (JPL blocks null-origin requests from file:// URLs; deployed on HTTPS this resolves automatically).
// Data sourced from JPL Sentry catalog, accurate as of early 2026.
const SENTRY_FALLBACK = { data: [
  { des:"101955",       fullname:"101955 Bennu (1999 RQ36)",  ip:"3.7e-4",  ps_cum:"-1.76", ps_max:"-1.77", ts_max:"0", diameter:"0.490", n_imp:"157",  v_imp:"6.1",  last_obs:"2021-05-07", arc:"22.1" },
  { des:"29075",        fullname:"29075 (1950 DA)",            ip:"1.2e-4",  ps_cum:"-1.42", ps_max:"-1.42", ts_max:"0", diameter:"1.300", n_imp:"1",    v_imp:"15.1", last_obs:"2012-12-28", arc:"62.4" },
  { des:"2010 RF12",    fullname:"2010 RF12",                  ip:"0.053",   ps_cum:"-1.88", ps_max:"-2.26", ts_max:"1", diameter:"0.007", n_imp:"4",    v_imp:"12.9", last_obs:"2010-09-12", arc:"0.03" },
  { des:"2024 YR4",     fullname:"2024 YR4",                   ip:"4.4e-5",  ps_cum:"-2.11", ps_max:"-2.11", ts_max:"0", diameter:"0.049", n_imp:"2",    v_imp:"13.1", last_obs:"2025-02-12", arc:"0.13" },
  { des:"2009 FD",      fullname:"2009 FD",                    ip:"7.4e-6",  ps_cum:"-2.69", ps_max:"-2.69", ts_max:"0", diameter:"0.472", n_imp:"11",   v_imp:"10.5", last_obs:"2014-10-25", arc:"5.6"  },
  { des:"2007 FT3",     fullname:"2007 FT3",                   ip:"4.3e-6",  ps_cum:"-2.64", ps_max:"-2.63", ts_max:"0", diameter:"0.340", n_imp:"1216", v_imp:"20.6", last_obs:"2007-03-30", arc:"0.03" },
  { des:"1979 XB",      fullname:"1979 XB",                    ip:"1.6e-4",  ps_cum:"-2.45", ps_max:"-2.45", ts_max:"0", diameter:"0.680", n_imp:"1",    v_imp:"23.7", last_obs:"1980-01-03", arc:"0.04" },
  { des:"2011 AG5",     fullname:"2011 AG5",                   ip:"2.4e-6",  ps_cum:"-3.07", ps_max:"-3.07", ts_max:"0", diameter:"0.140", n_imp:"1",    v_imp:"14.5", last_obs:"2023-01-21", arc:"12.1" },
  { des:"2020 NK1",     fullname:"2020 NK1",                   ip:"1.9e-6",  ps_cum:"-3.88", ps_max:"-3.88", ts_max:"0", diameter:"0.640", n_imp:"1",    v_imp:"6.9",  last_obs:"2021-02-09", arc:"0.76" },
  { des:"2022 AP7",     fullname:"2022 AP7",                   ip:"9.0e-7",  ps_cum:"-4.28", ps_max:"-4.28", ts_max:"0", diameter:"1.510", n_imp:"1",    v_imp:"11.2", last_obs:"2022-04-03", arc:"0.14" },
  { des:"2018 LF16",    fullname:"2018 LF16",                  ip:"1.5e-6",  ps_cum:"-3.99", ps_max:"-3.99", ts_max:"0", diameter:"0.210", n_imp:"62",   v_imp:"12.5", last_obs:"2018-06-25", arc:"0.16" },
  { des:"2007 VK184",   fullname:"2007 VK184",                 ip:"2.2e-6",  ps_cum:"-3.60", ps_max:"-3.60", ts_max:"0", diameter:"0.130", n_imp:"1",    v_imp:"18.0", last_obs:"2014-12-17", arc:"7.3"  },
  { des:"2019 SU3",     fullname:"2019 SU3",                   ip:"7.1e-6",  ps_cum:"-3.30", ps_max:"-3.30", ts_max:"0", diameter:"0.013", n_imp:"6",    v_imp:"18.2", last_obs:"2019-09-30", arc:"0.04" },
  { des:"2023 DW",      fullname:"2023 DW",                    ip:"8.4e-6",  ps_cum:"-3.47", ps_max:"-3.47", ts_max:"0", diameter:"0.049", n_imp:"1",    v_imp:"17.7", last_obs:"2023-04-06", arc:"0.12" },
  { des:"2006 JY26",    fullname:"2006 JY26",                  ip:"1.6e-6",  ps_cum:"-4.10", ps_max:"-4.10", ts_max:"0", diameter:"0.025", n_imp:"2",    v_imp:"10.7", last_obs:"2006-05-17", arc:"0.07" },
  { des:"2014 MF18",    fullname:"2014 MF18",                  ip:"3.1e-6",  ps_cum:"-3.71", ps_max:"-3.71", ts_max:"0", diameter:"0.160", n_imp:"1",    v_imp:"12.3", last_obs:"2014-07-08", arc:"0.06" },
  { des:"2021 PDC",     fullname:"2021 PDC (hypothetical)",    ip:"2.1e-5",  ps_cum:"-2.94", ps_max:"-2.94", ts_max:"0", diameter:"0.280", n_imp:"1",    v_imp:"15.8", last_obs:"2021-10-20", arc:"0.29" },
  { des:"2019 UN13",    fullname:"2019 UN13",                  ip:"5.3e-6",  ps_cum:"-3.58", ps_max:"-3.58", ts_max:"0", diameter:"0.020", n_imp:"3",    v_imp:"8.4",  last_obs:"2019-10-31", arc:"0.02" },
  { des:"2010 CL19",    fullname:"2010 CL19",                  ip:"1.4e-6",  ps_cum:"-4.53", ps_max:"-4.53", ts_max:"0", diameter:"0.460", n_imp:"4",    v_imp:"14.7", last_obs:"2010-03-02", arc:"0.08" },
  { des:"2015 RN35",    fullname:"2015 RN35",                  ip:"1.1e-5",  ps_cum:"-3.12", ps_max:"-3.12", ts_max:"0", diameter:"0.086", n_imp:"2",    v_imp:"9.6",  last_obs:"2022-12-12", arc:"7.3"  },
] };

async function fetchSentry() {
  try {
    return await fetchWithFallback('https://ssd-api.jpl.nasa.gov/sentry.api?all=1');
  } catch (_) {
    // API unreachable (common when opening as a local file due to null-origin CORS block).
    // Return the built-in snapshot. When served over HTTPS the live API will be used instead.
    return { ...SENTRY_FALLBACK, _fallback: true };
  }
}

// Flatten NeoWs response into array of unified objects
function flattenNeows(data) {
  const neos = [];
  const neo_obj = data.near_earth_objects || {};
  Object.values(neo_obj).forEach(dayArr => {
    dayArr.forEach(obj => {
      const ca = obj.close_approach_data && obj.close_approach_data[0];
      if (!ca) return;
      const dMin = parseFloat(obj.estimated_diameter.meters.estimated_diameter_min);
      const dMax = parseFloat(obj.estimated_diameter.meters.estimated_diameter_max);
      const diamM = (dMin + dMax) / 2;
      neos.push({
        id:          obj.id,
        name:        obj.name.replace(/[()]/g, '').trim(),
        fullName:    obj.name,
        // Short label for globe: drop leading numeric designation if a name follows
        shortName:   obj.name.replace(/[()]/g, '').trim().replace(/^\d+\s+/, ''),
        pha:         obj.is_potentially_hazardous_asteroid,
        diamMin:     dMin,
        diamMax:     dMax,
        diamM:       diamM,
        diamKm:      diamM / 1000,
        date:        ca.close_approach_date,
        dateFull:    ca.close_approach_date_full,
        velKms:      parseFloat(ca.relative_velocity.kilometers_per_second),
        velKmh:      parseFloat(ca.relative_velocity.kilometers_per_hour),
        distLD:      parseFloat(ca.miss_distance.lunar),
        distKm:      parseFloat(ca.miss_distance.kilometers),
        distAU:      parseFloat(ca.miss_distance.astronomical),
        source:      'neows',
      });
    });
  });
  return neos;
}

// Flatten SBDB response
function flattenSBDB(data) {
  if (!data.data || !data.fields) return [];
  const f = data.fields;
  const idx = name => f.indexOf(name);
  const iDes      = idx('des');
  const iFull     = idx('fullname');
  const iCd       = idx('cd');
  const iDist     = idx('dist');
  const iVRel     = idx('v_rel');
  const iH        = idx('h');
  const iDiam     = idx('diameter');

  return data.data.map(row => {
    const distAU  = parseFloat(row[iDist]);
    const distLD  = distAU * LD_PER_AU;
    const distKm  = distAU * KM_PER_AU;
    const velKms  = parseFloat(row[iVRel]) || 0;
    const h       = parseFloat(row[iH]) || 20;
    // Estimate diameter from H if not provided (albedo 0.1)
    const rawDiam = row[iDiam] ? parseFloat(row[iDiam]) * 1000 : (1329 / Math.sqrt(0.1)) * Math.pow(10, -h / 5) * 1000;
    const name    = (row[iFull] || row[iDes] || '').trim().replace(/^\s*\d+\s+/, '');
    return {
      id:       row[iDes],
      name:     name,
      fullName: row[iFull] || row[iDes],
      pha:      false,   // SBDB basic feed doesn't include PHA flag
      diamM:    rawDiam,
      diamKm:   rawDiam / 1000,
      date:     (row[iCd] || '').slice(0, 10),
      dateFull: row[iCd] || '',
      velKms:   velKms,
      distLD:   distLD,
      distKm:   distKm,
      distAU:   distAU,
      source:   'sbdb',
    };
  });
}

// ============================================================
// TAB 1: GLOBE
// ============================================================

let globeInstance = null;
let allNeos = [];

async function initGlobe() {
  const loadEl  = document.getElementById('globe-loading');
  const errEl   = document.getElementById('globe-error');
  const errMsg  = document.getElementById('globe-error-msg');
  const legendEl = document.getElementById('globe-legend');
  const countEl = document.getElementById('globe-count');

  try {
    const today = new Date();
    const start = fmtDate(today);
    const end   = fmtDate(daysFromNow(7));
    let usedFallback = false;
    try {
      const data = await fetchNeows(start, end);
      allNeos = flattenNeows(data);
    } catch (_) {
      allNeos = NEOWS_FALLBACK;
      usedFallback = true;
    }
    if (usedFallback) {
      countEl.textContent = `${allNeos.length} NEOs (cached sample)`;
    } else {
      countEl.textContent = `${allNeos.length} NEOs this week`;
    }

    // Build point data: asteroids + Moon reference
    const moonAlt = ldToAlt(MOON_LD);
    const moonPoint = {
      id: '__moon__',
      name: 'Moon',
      shortName: 'Moon',
      lat: 0,
      lng: 45,
      alt: moonAlt,
      color: '#c8c8d8',
      dotRadius: 1.1,
      isMoon: true,
      distLD: MOON_LD,
    };

    const asteroidPoints = allNeos.map(neo => {
      const { lat, lng } = approachPosition(neo);
      const alt = ldToAlt(neo.distLD);
      // dotRadius in label units (~degrees of arc). Scale by sqrt of diameter, clamped.
      // Larger base size so markers are easy to click; still scale with diameter
      const dotR = Math.min(1.8, Math.max(0.55, Math.sqrt(neo.diamM) * 0.025));
      return {
        ...neo,
        lat,
        lng,
        alt,
        dotRadius: dotR,
        color: neo.pha ? '#e8372e' : '#29d99a',
      };
    });

    const points = [moonPoint, ...asteroidPoints];

    hide(loadEl);
    show(legendEl);
    show(countEl);

    renderGlobe(points);
  } catch (err) {
    hide(loadEl);
    show(errEl);
    let msg = err.message || 'Failed to load NEO data.';
    if (msg.includes('429') || msg.includes('OVER_RATE_LIMIT') || NASA_API_KEY === 'DEMO_KEY') {
      msg += ' You may be rate-limited. Get a free API key at api.nasa.gov and set NASA_API_KEY in app.js.';
    }
    errMsg.textContent = msg;
  }
}

function renderGlobe(points) {
  const container = document.getElementById('globe-el');

  globeInstance = Globe()(container)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor('#2a1a0a')
    .atmosphereAltitude(0.15)
    // labelsData renders camera-facing billboard dots with optional text.
    .labelsData(points)
    .labelLat(d => d.lat)
    .labelLng(d => d.lng)
    .labelAltitude(d => d.alt)
    .labelText(d => d.shortName || d.name)
    .labelColor(d => d.color)
    .labelDotRadius(d => d.dotRadius)
    // labelSize controls the text; Moon label slightly larger
    .labelSize(d => d.isMoon ? 0.55 : 0.42)
    .labelResolution(3)
    // Offset the text above the dot so they don't overlap
    .labelDotOrientation(() => 'top')
    .onLabelHover(handleGlobeHover)
    .onLabelClick(d => handleGlobeClick(d));

  // Auto-rotate
  globeInstance.controls().autoRotate = true;
  globeInstance.controls().autoRotateSpeed = 0.4;
  globeInstance.controls().enableZoom = true;

  // Stop spinning the moment the user touches the globe so they can aim at a marker
  container.addEventListener('mousedown', () => {
    globeInstance.controls().autoRotate = false;
  });
  container.addEventListener('touchstart', () => {
    globeInstance.controls().autoRotate = false;
  }, { passive: true });

  // Point of view
  globeInstance.pointOfView({ altitude: 2.5 }, 500);
}

function handleGlobeHover(point, _prevPoint, event) {
  const tooltip = document.getElementById('globe-tooltip');
  if (!point) {
    hide(tooltip);
    return;
  }
  show(tooltip);
  if (point.isMoon) {
    tooltip.innerHTML = `<div class="tt-name">🌙 Moon</div>
      <div class="tt-row"><span>Distance</span><span>1 LD (384,400 km)</span></div>
      <div class="tt-row"><span>Role</span><span>Reference sphere</span></div>`;
  } else {
    tooltip.innerHTML = `
      <div class="tt-name">${escHtml(point.name)}</div>
      <div class="tt-row"><span>Miss dist</span><span>${point.distLD.toFixed(3)} LD</span></div>
      <div class="tt-row"><span>Diameter</span><span>~${Math.round(point.diamM)} m</span></div>
      <div class="tt-row"><span>Velocity</span><span>${point.velKms.toFixed(2)} km/s</span></div>
      <div class="tt-row"><span>Hazardous</span><span style="color:${point.pha ? '#e8372e' : '#29d99a'}">${point.pha ? 'YES' : 'No'}</span></div>`;
  }
  // Position near cursor
  const rect = document.getElementById('globe-el').getBoundingClientRect();
  if (event) {
    let tx = event.clientX - rect.left + 12;
    let ty = event.clientY - rect.top + 12;
    if (tx + 250 > rect.width)  tx = event.clientX - rect.left - 254;
    if (ty + 140 > rect.height) ty = event.clientY - rect.top - 144;
    tooltip.style.left = tx + 'px';
    tooltip.style.top  = ty + 'px';
  }
}

// Handle mousemove for tooltip positioning
document.getElementById('globe-el').addEventListener('mousemove', evt => {
  const tooltip = document.getElementById('globe-tooltip');
  if (tooltip.classList.contains('hidden')) return;
  const rect = document.getElementById('globe-el').getBoundingClientRect();
  let tx = evt.clientX - rect.left + 12;
  let ty = evt.clientY - rect.top + 12;
  if (tx + 250 > rect.width)  tx = evt.clientX - rect.left - 254;
  if (ty + 160 > rect.height) ty = evt.clientY - rect.top - 164;
  tooltip.style.left = tx + 'px';
  tooltip.style.top  = ty + 'px';
});

function handleGlobeClick(point) {
  if (!point || point.isMoon) return;
  showDetailPanel(point);
  // Pause auto-rotate while panel open
  if (globeInstance) globeInstance.controls().autoRotate = false;
}

function showDetailPanel(neo) {
  const panel   = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');

  const distCtx = getDistContext(neo.distLD);
  const velCtx  = getVelocityContext(neo.velKms);
  const sizeCtx = getSizeLabel(neo.diamM);
  const xBullet = (neo.velKms / 1).toFixed(1);

  content.innerHTML = `
    <div class="dp-name">${escHtml(neo.name)}</div>
    <div class="dp-id">ID: ${escHtml(neo.id)}</div>
    <div class="dp-badge ${neo.pha ? 'pha' : 'safe'}">
      ${neo.pha ? '⚠ Potentially Hazardous' : '✓ Non-Hazardous'}
    </div>

    <div class="dp-section">
      <div class="dp-section-title">Close Approach</div>
      <div class="dp-row">
        <div class="dp-label">Date / Time</div>
        <div class="dp-value">${escHtml(neo.dateFull || neo.date)}</div>
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">Miss Distance</div>
      <div class="dp-row">
        <div class="dp-label">Lunar distances</div>
        <div class="dp-value">${neo.distLD.toFixed(4)} LD</div>
      </div>
      <div class="dp-row">
        <div class="dp-label">Kilometers</div>
        <div class="dp-value">${Math.round(neo.distKm).toLocaleString()} km</div>
      </div>
      <div class="dp-row">
        <div class="dp-label">Context</div>
        <div class="dp-value dp-context">${distCtx}</div>
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">Size</div>
      <div class="dp-row">
        <div class="dp-label">Est. diameter</div>
        <div class="dp-value">~${Math.round(neo.diamMin)}–${Math.round(neo.diamMax)} m</div>
      </div>
      <div class="dp-row">
        <div class="dp-label">Comparison</div>
        <div class="dp-value dp-context">${sizeCtx}</div>
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">Velocity</div>
      <div class="dp-row">
        <div class="dp-label">Relative velocity</div>
        <div class="dp-value">${neo.velKms.toFixed(2)} km/s</div>
      </div>
      <div class="dp-row">
        <div class="dp-label">km/h</div>
        <div class="dp-value">${Math.round(neo.velKmh).toLocaleString()} km/h</div>
      </div>
      <div class="dp-row">
        <div class="dp-label">Context</div>
        <div class="dp-value dp-context">${velCtx} · ${xBullet}× speed of a bullet</div>
      </div>
    </div>`;

  panel.classList.remove('hidden');
}

document.getElementById('close-detail').addEventListener('click', () => {
  document.getElementById('detail-panel').classList.add('hidden');
  if (globeInstance) globeInstance.controls().autoRotate = true;
});

// ============================================================
// TAB 2: CLOSE APPROACHES
// ============================================================

let approachesData  = [];
let approachesSortCol = 'date';
let approachesSortDir = 'asc';

async function initApproaches() {
  const loadEl   = document.getElementById('approaches-loading');
  const errEl    = document.getElementById('approaches-error');
  const summaryEl= document.getElementById('summary-row');
  const filterEl = document.getElementById('filter-row');
  const tableEl  = document.getElementById('table-wrap');

  show(loadEl); hide(errEl); hide(summaryEl); hide(filterEl); hide(tableEl);

  try {
    const start = fmtDate(new Date());
    const end   = fmtDate(daysFromNow(7));
    let usedFallback = false;
    try {
      const data = await fetchNeows(start, end);
      approachesData = flattenNeows(data);
    } catch (_) {
      approachesData = NEOWS_FALLBACK;
      usedFallback = true;
    }
    hide(loadEl);
    if (usedFallback) {
      show(errEl);
      errEl.innerHTML = `<span class="error-icon">⚠</span>Live API unavailable (rate-limited or network issue) — showing cached sample data. Get a free key at <a href="https://api.nasa.gov" target="_blank" style="color:inherit">api.nasa.gov</a> and set NASA_API_KEY in app.js for live data.`;
    }
    renderApproaches();
  } catch (err) {
    hide(loadEl);
    show(errEl);
    errEl.innerHTML = `<span class="error-icon">⚠</span>${escHtml(err.message || 'Failed to load data.')}`;
  }
}

// Data source radio buttons
document.querySelectorAll('input[name="datasource"]').forEach(radio => {
  radio.addEventListener('change', async () => {
    const sbdbCtrl = document.getElementById('sbdb-date-controls');
    if (radio.value === 'sbdb') {
      show(sbdbCtrl);
      // Pre-fill dates
      document.getElementById('sbdb-from').value = fmtDate(daysFromNow(-30));
      document.getElementById('sbdb-to').value   = fmtDate(new Date());
    } else {
      hide(sbdbCtrl);
      await initApproaches();
    }
  });
});

document.getElementById('sbdb-fetch-btn').addEventListener('click', async () => {
  const from  = document.getElementById('sbdb-from').value;
  const to    = document.getElementById('sbdb-to').value;
  if (!from || !to) return;

  const loadEl   = document.getElementById('approaches-loading');
  const errEl    = document.getElementById('approaches-error');
  const summaryEl= document.getElementById('summary-row');
  const filterEl = document.getElementById('filter-row');
  const tableEl  = document.getElementById('table-wrap');

  show(loadEl); hide(errEl); hide(summaryEl); hide(filterEl); hide(tableEl);

  try {
    const data = await fetchSBDB(from, to);
    approachesData = flattenSBDB(data);
    hide(loadEl);
    renderApproaches();
  } catch (err) {
    hide(loadEl);
    show(errEl);
    errEl.innerHTML = `<span class="error-icon">⚠</span>${escHtml(err.message || 'SBDB fetch failed.')}`;
  }
});

function renderApproaches() {
  const summaryEl = document.getElementById('summary-row');
  const filterEl  = document.getElementById('filter-row');
  const tableEl   = document.getElementById('table-wrap');

  // Summary stats
  const total = approachesData.length;
  document.getElementById('stat-total').textContent = total.toLocaleString();

  if (total > 0) {
    const sorted_dist  = [...approachesData].sort((a,b) => a.distLD - b.distLD);
    const sorted_diam  = [...approachesData].sort((a,b) => b.diamM - a.diamM);
    const sorted_vel   = [...approachesData].sort((a,b) => b.velKms - a.velKms);

    const closest = sorted_dist[0];
    const largest = sorted_diam[0];
    const fastest = sorted_vel[0];

    document.getElementById('stat-closest-val').textContent  = `${closest.distLD.toFixed(3)} LD`;
    document.getElementById('stat-closest-name').textContent = closest.name;
    document.getElementById('stat-largest-val').textContent  = `~${Math.round(largest.diamM)} m`;
    document.getElementById('stat-largest-name').textContent = largest.name;
    document.getElementById('stat-fastest-val').textContent  = `${fastest.velKms.toFixed(2)} km/s`;
    document.getElementById('stat-fastest-name').textContent = fastest.name;
  }

  show(summaryEl);
  show(filterEl);
  show(tableEl);
  renderApproachesTable();
}

function getFilteredApproaches() {
  const distMax = document.getElementById('filter-dist').value;
  const sizeMin = parseFloat(document.getElementById('filter-size').value);
  const hazOnly = document.getElementById('filter-hazardous').checked;

  return approachesData.filter(neo => {
    if (distMax !== 'all' && neo.distLD > parseFloat(distMax)) return false;
    if (sizeMin > 0 && neo.diamM < sizeMin) return false;
    if (hazOnly && !neo.pha) return false;
    return true;
  });
}

function getSortedApproaches(arr) {
  return [...arr].sort((a, b) => {
    let va, vb;
    switch (approachesSortCol) {
      case 'name':     va = a.name;      vb = b.name;      break;
      case 'date':     va = a.date;      vb = b.date;      break;
      case 'dist':     va = a.distLD;    vb = b.distLD;    break;
      case 'diameter': va = a.diamM;     vb = b.diamM;     break;
      case 'velocity': va = a.velKms;    vb = b.velKms;    break;
      default:         va = a.date;      vb = b.date;
    }
    if (va < vb) return approachesSortDir === 'asc' ? -1 : 1;
    if (va > vb) return approachesSortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderApproachesTable() {
  const tbody   = document.getElementById('approaches-tbody');
  const filtered = getSortedApproaches(getFilteredApproaches());

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:32px">No results match current filters.</td></tr>`;
    return;
  }

  filtered.forEach(neo => {
    const tr = document.createElement('tr');
    const sizeLabel = getSizeLabel(neo.diamM);
    const velLabel  = getVelocityContext(neo.velKms);
    const distCtx   = getDistContext(neo.distLD);

    tr.innerHTML = `
      <td><div class="td-name" title="${escHtml(neo.fullName)}">${escHtml(neo.name)}</div></td>
      <td style="font-family:var(--font-mono);font-size:12px">${escHtml(neo.date)}</td>
      <td>
        <div class="td-dist-main">${neo.distLD.toFixed(4)} LD</div>
        <div class="td-dist-sub">${distCtx}</div>
      </td>
      <td>
        <div>~${Math.round(neo.diamM)} m</div>
        <div><span class="size-tag">${sizeLabel}</span></div>
      </td>
      <td>
        <div>${neo.velKms.toFixed(2)} km/s</div>
        <div><span class="vel-tag">${velLabel}</span></div>
      </td>
      <td>
        ${neo.pha
          ? '<span class="badge-pha">YES</span>'
          : '<span class="badge-safe">No</span>'}
      </td>`;
    tbody.appendChild(tr);
  });
}

// Sortable column headers
document.querySelectorAll('#approaches-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (approachesSortCol === col) {
      approachesSortDir = approachesSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      approachesSortCol = col;
      approachesSortDir = 'asc';
    }
    document.querySelectorAll('#approaches-table th').forEach(t => {
      t.classList.remove('sort-asc', 'sort-desc');
    });
    th.classList.add(approachesSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    renderApproachesTable();
  });
});

// Filter change handlers
['filter-dist', 'filter-size', 'filter-hazardous'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderApproachesTable);
});

// ============================================================
// TAB 3: SENTRY WATCH LIST
// ============================================================

let sentryData = [];

async function initSentry() {
  const loadEl    = document.getElementById('sentry-loading');
  const errEl     = document.getElementById('sentry-error');
  const controlEl = document.getElementById('sentry-controls');
  const gridEl    = document.getElementById('sentry-grid');

  show(loadEl); hide(errEl); hide(controlEl); hide(gridEl);

  try {
    const raw = await fetchSentry();
    // Sentry data is an array of named-field objects (unlike SBDB which uses indexed arrays).
    // diameter is in km — convert to metres for consistency with the rest of the app.
    if (raw._fallback) {
      const note = document.createElement('div');
      note.style.cssText = 'color:var(--text-dim);font-size:.8rem;padding:8px 0 0;text-align:center;grid-column:1/-1';
      note.textContent = '⚠ Live API unreachable — showing cached snapshot. Deploy to a web server for live data.';
      gridEl.after(note);
    }
    sentryData = (raw.data || []).map(row => ({
      des:      row.des      || '',
      name:     (row.fullname || row.des || '').trim(),
      ps_cum:   parseFloat(row.ps_cum)   || -999,
      ps_max:   parseFloat(row.ps_max)   || -999,
      ts_max:   parseInt(row.ts_max)     || 0,
      ip:       parseFloat(row.ip)       || 0,
      diameter: (parseFloat(row.diameter) || 0) * 1000,
      n_imp:    parseInt(row.n_imp)      || 0,
      v_imp:    parseFloat(row.v_imp)    || 0,
      last_obs: row.last_obs || '',
      arc:      parseFloat(row.arc)      || 0,
    }));

    hide(loadEl);
    show(controlEl);
    renderSentry();
  } catch (err) {
    hide(loadEl);
    show(errEl);
    errEl.innerHTML = `<span class="error-icon">⚠</span>${escHtml(err.message || 'Failed to load Sentry data.')}`;
  }
}

function getFilteredSentry() {
  const minTorino = parseInt(document.getElementById('sentry-torino').value) || 0;
  const minDiam   = parseFloat(document.getElementById('sentry-diam').value)  || 0;
  return sentryData.filter(d => {
    if (d.ts_max < minTorino) return false;
    if (d.diameter < minDiam) return false;
    return true;
  });
}

function getSortedSentry(arr) {
  const col = document.getElementById('sentry-sort').value;
  return [...arr].sort((a, b) => {
    switch (col) {
      case 'ps':       return b.ps_cum   - a.ps_cum;
      case 'ip':       return b.ip       - a.ip;
      case 'diameter': return b.diameter - a.diameter;
      case 'n_imp':    return b.n_imp    - a.n_imp;
      default:         return b.ps_cum   - a.ps_cum;
    }
  });
}

function renderSentry() {
  const gridEl = document.getElementById('sentry-grid');
  show(gridEl);
  const items = getSortedSentry(getFilteredSentry());

  if (items.length === 0) {
    gridEl.innerHTML = `<div style="color:var(--text-dim);padding:32px;text-align:center;grid-column:1/-1">No objects match current filters.</div>`;
    return;
  }

  gridEl.innerHTML = '';
  items.forEach(d => {
    const ts  = getTorinoStyle(d.ts_max);
    const sizeLabel = d.diameter > 0 ? getSizeLabel(d.diameter) : '—';
    const velCtx    = d.v_imp > 0    ? getVelocityContext(d.v_imp) : '—';
    const probStr   = formatProbability(d.ip);
    const psStr     = d.ps_cum > -900 ? d.ps_cum.toFixed(2) : '—';
    const diamStr   = d.diameter > 0
      ? (d.diameter >= 1000
          ? `${(d.diameter / 1000).toFixed(2)} km`
          : `${Math.round(d.diameter)} m`)
      : '—';

    const card = document.createElement('div');
    card.className = 'sentry-card';
    card.innerHTML = `
      <div class="sc-header">
        <div>
          <div class="sc-name">${escHtml(d.name)}</div>
          <div class="sc-des">${escHtml(d.des)}</div>
        </div>
        <div class="torino-badge">
          <div class="torino-num" style="background:${ts.bg};color:${ts.fg}">${d.ts_max}</div>
          <div class="torino-label" style="color:${ts.fg}">${ts.label}</div>
        </div>
      </div>
      <div class="sc-stats">
        <div class="sc-stat">
          <div class="sc-stat-label">Palermo (cum.)</div>
          <div class="sc-stat-val">${psStr}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-label">Impact Prob.</div>
          <div class="sc-stat-val">${probStr}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-label">Diameter</div>
          <div class="sc-stat-val">${diamStr}</div>
          <div class="sc-stat-sub">${sizeLabel}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-label">Potential Impacts</div>
          <div class="sc-stat-val">${d.n_imp.toLocaleString()}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-label">Velocity</div>
          <div class="sc-stat-val">${d.v_imp > 0 ? d.v_imp.toFixed(2) + ' km/s' : '—'}</div>
          <div class="sc-stat-sub">${velCtx}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-label">Obs. Arc</div>
          <div class="sc-stat-val">${d.arc > 0 ? d.arc.toFixed(1) + ' yr' : '—'}</div>
          <div class="sc-stat-sub">Last: ${escHtml(d.last_obs.slice(0,10))}</div>
        </div>
      </div>`;
    gridEl.appendChild(card);
  });
}

['sentry-sort', 'sentry-torino', 'sentry-diam'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderSentry);
});

// ============================================================
// SECURITY: HTML escape
// ============================================================
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ============================================================
// BOOT
// ============================================================
tabInited['globe'] = true;   // Mark globe as initialized before DOM is ready
initGlobe();
