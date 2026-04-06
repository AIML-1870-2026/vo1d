// api.js — no modules, globals only

var API_BASE = 'https://api.fda.gov';
var _apiCache = {};
var _controllers = {};

var OUTCOME_META = [
  { key: 'hospitalization', field: 'seriousnesshospitalization', label: 'Hospitalization' },
  { key: 'lifeThreatening', field: 'seriousnesslifethreatening', label: 'Life-Threatening' },
  { key: 'death', field: 'seriousnessdeath', label: 'Death' },
  { key: 'disability', field: 'seriousnessdisabling', label: 'Disability' },
  { key: 'congenital', field: 'seriousnesscongenitalanomali', label: 'Congenital Anomaly' },
  { key: 'other', field: 'seriousnessother', label: 'Other Serious' },
];

async function _fetchJSON(url, signal) {
  if (_apiCache[url] !== undefined) return _apiCache[url];

  var opts = signal ? { signal: signal } : {};
  var res = await fetch(url, opts);

  if (res.status === 429) {
    var err = new Error("We're fetching data too quickly. Please wait a moment and try again.");
    err.code = 'RATE_LIMIT';
    throw err;
  }
  if (res.status === 404) {
    _apiCache[url] = null;
    return null;
  }
  if (!res.ok) {
    throw new Error('Unable to connect to the FDA database. Please check your connection and try again.');
  }

  var data = await res.json();
  _apiCache[url] = data;
  return data;
}

function _getSignal(key) {
  if (_controllers[key]) _controllers[key].abort();
  _controllers[key] = new AbortController();
  return _controllers[key].signal;
}

async function fetchAutocomplete(query) {
  var signal = _getSignal('autocomplete');
  var q = encodeURIComponent(query.trim());

  var results = await Promise.allSettled([
    _fetchJSON(API_BASE + '/drug/label.json?search=openfda.brand_name:"' + q + '"&limit=5', signal),
    _fetchJSON(API_BASE + '/drug/label.json?search=openfda.generic_name:"' + q + '"&limit=5', signal),
  ]);

  var seen = new Map();

  function ingest(data) {
    if (!data || !data.results) return;
    for (var i = 0; i < data.results.length; i++) {
      var item = data.results[i];
      var brands = (item.openfda && item.openfda.brand_name) || [];
      var generics = (item.openfda && item.openfda.generic_name) || [];
      var brand = brands[0] || '';
      var generic = generics[0] || '';
      var key = (brand + generic).toLowerCase();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, { brand: brand, generic: generic });
    }
  }

  if (results[0].status === 'fulfilled') ingest(results[0].value);
  if (results[1].status === 'fulfilled') ingest(results[1].value);

  return Array.from(seen.values()).slice(0, 8);
}

async function fetchLabelData(drugName) {
  var q = encodeURIComponent(drugName.trim());
  var urls = [
    API_BASE + '/drug/label.json?search=openfda.generic_name:"' + q + '"&limit=1',
    API_BASE + '/drug/label.json?search=openfda.brand_name:"' + q + '"&limit=1',
  ];

  for (var i = 0; i < urls.length; i++) {
    try {
      var data = await _fetchJSON(urls[i]);
      if (data && data.results && data.results.length) return data.results[0];
    } catch(e) {
      if (e.name === 'AbortError') throw e;
    }
  }
  return null;
}

async function fetchAdverseEvents(drugName) {
  var q = encodeURIComponent(drugName.trim());
  var url = API_BASE + '/drug/event.json?search=patient.drug.medicinalproduct:"' + q + '"&count=patient.reaction.reactionmeddrapt.exact&limit=15';
  try {
    var data = await _fetchJSON(url);
    return (data && data.results) ? data.results : [];
  } catch(e) {
    if (e.name === 'AbortError') throw e;
    return [];
  }
}

async function fetchSeriousOutcomes(drugName) {
  var q = encodeURIComponent(drugName.trim());
  var results = {};

  await Promise.all(OUTCOME_META.map(async function(meta) {
    var url = API_BASE + '/drug/event.json?search=patient.drug.medicinalproduct:"' + q + '"+AND+' + meta.field + ':1&limit=1';
    try {
      var data = await _fetchJSON(url);
      results[meta.key] = (data && data.meta && data.meta.results) ? data.meta.results.total : 0;
    } catch(e) {
      results[meta.key] = 0;
    }
  }));

  return results;
}

async function fetchCoAdministration(drugA, drugB) {
  var qA = encodeURIComponent(drugA.trim());
  var qB = encodeURIComponent(drugB.trim());
  var search = 'patient.drug.medicinalproduct:"' + qA + '"+AND+patient.drug.medicinalproduct:"' + qB + '"';

  try {
    var both = await Promise.all([
      _fetchJSON(API_BASE + '/drug/event.json?search=' + search + '&count=patient.reaction.reactionmeddrapt.exact&limit=15'),
      _fetchJSON(API_BASE + '/drug/event.json?search=' + search + '&limit=1'),
    ]);
    return {
      events: (both[0] && both[0].results) ? both[0].results : [],
      total: (both[1] && both[1].meta && both[1].meta.results) ? both[1].meta.results.total : 0,
    };
  } catch(e) {
    if (e.name === 'AbortError') throw e;
    return { events: [], total: 0 };
  }
}
