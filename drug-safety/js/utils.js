// utils.js — no modules, globals only

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatNumber(n) {
  if (n === null || n === undefined) return '0';
  return Number(n).toLocaleString();
}

function truncateText(text, maxLength) {
  maxLength = maxLength || 800;
  if (!text || text.length <= maxLength) return { text: text || '', truncated: false };
  return { text: text.slice(0, maxLength).replace(/\s+\S*$/, ''), truncated: true };
}

function showGlobalError(message) {
  var el = document.getElementById('global-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-error';
    el.className = 'global-error';
    document.body.prepend(el);
  }
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(function() { el.classList.remove('visible'); }, 5000);
}
