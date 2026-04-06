// autocomplete.js — no modules, globals only

function Autocomplete(inputEl, dropdownEl, onSelect) {
  this.input = inputEl;
  this.dropdown = dropdownEl;
  this.onSelect = onSelect;
  this.results = [];
  this.activeIndex = -1;
  this.selected = null;

  var self = this;
  this._debouncedQuery = debounce(function(val) { self._query(val); }, 300);

  this.input.addEventListener('input', function() {
    self.selected = null;
    var val = self.input.value.trim();
    if (val.length < 2) { self._close(); return; }
    self._debouncedQuery(val);
  });

  this.input.addEventListener('keydown', function(e) { self._onKeydown(e); });

  document.addEventListener('click', function(e) {
    if (!self.input.contains(e.target) && !self.dropdown.contains(e.target)) {
      self._close();
    }
  });
}

Autocomplete.prototype.setValue = function(displayName, genericName) {
  this.input.value = displayName;
  this.selected = { displayName: displayName, generic: genericName };
  this._close();
};

Autocomplete.prototype.clear = function() {
  this.input.value = '';
  this.selected = null;
  this._close();
};

Autocomplete.prototype._query = async function(val) {
  try {
    var items = await fetchAutocomplete(val);
    this.results = items;
    this.activeIndex = -1;
    this._render();
  } catch(e) {
    if (e.name !== 'AbortError') this._close();
  }
};

Autocomplete.prototype._render = function() {
  if (this.results.length === 0) { this._close(); return; }

  var self = this;
  this.dropdown.innerHTML = this.results.map(function(item, i) {
    var primary = item.brand || item.generic;
    var secondary = (item.brand && item.generic) ? '(' + item.generic + ')' : '';
    return '<div class="ac-item" data-index="' + i + '" role="option">' +
      '<span class="ac-primary">' + primary + '</span>' +
      (secondary ? '<span class="ac-secondary">' + secondary + '</span>' : '') +
      '</div>';
  }).join('');

  this.dropdown.querySelectorAll('.ac-item').forEach(function(el) {
    el.addEventListener('mousedown', function(e) {
      e.preventDefault();
      self._select(parseInt(el.dataset.index, 10));
    });
  });

  this.dropdown.classList.add('open');
};

Autocomplete.prototype._select = function(idx) {
  var item = this.results[idx];
  if (!item) return;
  var displayName = item.brand || item.generic;
  var genericName = item.generic || item.brand;
  this.setValue(displayName, genericName);
  this.onSelect({ displayName: displayName, generic: genericName, brand: item.brand });
};

Autocomplete.prototype._onKeydown = function(e) {
  if (!this.dropdown.classList.contains('open')) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    this.activeIndex = Math.min(this.activeIndex + 1, this.results.length - 1);
    this._updateActive();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    this.activeIndex = Math.max(this.activeIndex - 1, -1);
    this._updateActive();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (this.activeIndex >= 0) this._select(this.activeIndex);
  } else if (e.key === 'Escape') {
    this._close();
  }
};

Autocomplete.prototype._updateActive = function() {
  var idx = this.activeIndex;
  this.dropdown.querySelectorAll('.ac-item').forEach(function(el, i) {
    el.classList.toggle('active', i === idx);
  });
};

Autocomplete.prototype._close = function() {
  this.dropdown.classList.remove('open');
  this.dropdown.innerHTML = '';
  this.results = [];
  this.activeIndex = -1;
};
