const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// UI elements
const thicknessRange = document.getElementById('thicknessRange');
const thicknessValue = document.getElementById('thicknessValue');
const connectRange = document.getElementById('connectRange');
const connectValue = document.getElementById('connectValue');
const countRange = document.getElementById('countRange');
const countValue = document.getElementById('countValue');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
const sizeRange = document.getElementById('sizeRange');
const sizeValue = document.getElementById('sizeValue');
const colorPicker = document.getElementById('colorPicker');
const rainbowToggle = document.getElementById('rainbowToggle');
const trailToggle = document.getElementById('trailToggle');
const backgroundPicker = document.getElementById('backgroundPicker');
const openControlsButton = document.getElementById('openControlsButton');
const settingsHint = document.getElementById('settingsHint');

let lineWidth = Number(thicknessRange?.value || 1);
if (thicknessValue) thicknessValue.textContent = String(lineWidth.toFixed(1));

let connectRadius = Number(connectRange?.value || 100);
if (connectValue) connectValue.textContent = String(connectRadius);

let desiredCount = null; // when set by user, keep this count across resizes

let speedMultiplier = Number(speedRange?.value || 1);
let prevSpeedMultiplier = speedMultiplier;
if (speedValue) speedValue.textContent = String(speedMultiplier.toFixed(2));

let particleBaseSize = Number(sizeRange?.value || 3);
if (sizeValue) sizeValue.textContent = String(particleBaseSize.toFixed(1));

let colorHex = colorPicker?.value || '#c8e6ff';
let rainbowMode = Boolean(rainbowToggle?.checked);
let trailEnabled = Boolean(trailToggle?.checked);
const defaultBodyBackground = getComputedStyle(document.body).background || '';
let backgroundColorHex = (backgroundPicker && backgroundPicker.value) ? backgroundPicker.value : null;

// Panel visibility state
let panelVisible = true;

// Show transient settings hint then fade it out
if (settingsHint) {
  settingsHint.classList.add('visible');
  setTimeout(() => {
    settingsHint.classList.remove('visible');
    setTimeout(() => { settingsHint.remove(); }, 600);
  }, 3000);
}

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(200,220,255,${alpha})`;
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function computeDefaultCount(w, h) {
  const area = w * h;
  return Math.min(250, Math.max(40, Math.round(area / 4500)));
}

function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

class Particle {
  constructor(w, h, hue) {
    this.r = particleBaseSize * (0.7 + Math.random() * 0.6);
    this.x = Math.random() * (w - this.r * 2) + this.r;
    this.y = Math.random() * (h - this.r * 2) + this.r;
    const baseSpeed = 0.3 + Math.random() * 1.2;
    const speed = baseSpeed * speedMultiplier;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.hue = hue;
    this.alpha = 0.6 + Math.random() * 0.4;
    this.colorHex = colorHex;
  }

  update(w, h) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.r < 0) { this.x = this.r; this.vx *= -1; }
    if (this.x + this.r > w) { this.x = w - this.r; this.vx *= -1; }
    if (this.y - this.r < 0) { this.y = this.r; this.vy *= -1; }
    if (this.y + this.r > h) { this.y = h - this.r; this.vy *= -1; }
  }

  draw(ctx) {
    ctx.beginPath();
    if (rainbowMode) {
      ctx.fillStyle = `hsla(${this.hue},100%,50%,${this.alpha})`;
    } else {
      ctx.fillStyle = hexToRgba(this.colorHex, this.alpha);
    }
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

let particles = [];
function resetParticles(countArg) {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  let count;
  if (typeof countArg === 'number') {
    count = Math.max(1, Math.min(1000, Math.round(countArg)));
  } else if (typeof desiredCount === 'number') {
    count = Math.max(1, Math.min(1000, Math.round(desiredCount)));
  } else {
    count = computeDefaultCount(w, h);
  }
  particles = new Array(count).fill(0).map((_, i) => {
    const p = new Particle(w, h, (i * 137.5) % 360);
    p.colorHex = colorHex;
    return p;
  });
}

// initialize particle count slider based on viewport
{
  const w = window.innerWidth;
  const h = window.innerHeight;
  const initialCount = computeDefaultCount(w, h);
  if (countRange) { countRange.value = String(initialCount); }
  if (countValue) { countValue.textContent = String(initialCount); }
  resetParticles(initialCount);
}

function animate() {
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  if (trailEnabled) {
    const alpha = 0.12;
    let overlay;
    if (backgroundColorHex && backgroundColorHex[0] === '#') {
      overlay = hexToRgba(backgroundColorHex, alpha);
    } else {
      overlay = `rgba(7,16,41,${alpha})`;
    }
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  // draw connecting lines using absolute connectRadius and thickness
  const effectiveRadius = connectRadius;
  const r2 = effectiveRadius * effectiveRadius;
  for (let i = 0; i < particles.length; i++) {
    const pa = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const pb = particles[j];
      const dx = pa.x - pb.x;
      const dy = pa.y - pb.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const d = Math.sqrt(d2);
        const alpha = Math.max(0, 0.12 * (1 - d / effectiveRadius));
        ctx.beginPath();
        if (rainbowMode) {
          const avgHue = ((pa.hue + pb.hue) / 2) % 360;
          ctx.strokeStyle = `hsla(${avgHue},100%,50%,${alpha})`;
        } else {
          ctx.strokeStyle = hexToRgba(colorHex, alpha * 0.9);
        }
        ctx.lineWidth = lineWidth;
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }
  }

  for (let p of particles) {
    p.update(w, h);
    p.draw(ctx);
  }

  requestAnimationFrame(animate);
}

animate();

// Recompute particle positions/count when viewport size changes
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { fitCanvas(); resetParticles(); }, 150);
});

if (countRange) {
  countRange.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    desiredCount = v;
    if (countValue) countValue.textContent = String(v);
    // regenerate particles to the chosen count
    resetParticles(v);
  });
}

// Background color control
if (backgroundPicker) {
  backgroundPicker.addEventListener('input', (e) => {
    const c = e.target.value;
    if (c) {
      backgroundColorHex = c;
      document.body.style.background = c;
    }
  });
}

// View mode: hide/show controls using dropdown
if (openControlsButton) {
  openControlsButton.addEventListener('click', () => {
    const panel = document.querySelector('.controls');
    if (!panel) return;
    // toggle panel
    if (panelVisible) {
      panel.style.display = 'none';
      panelVisible = false;
    } else {
      panel.style.display = '';
      panelVisible = true;
    }
  });
}

if (speedRange) {
  speedRange.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    prevSpeedMultiplier = speedMultiplier;
    speedMultiplier = v;
    if (speedValue) speedValue.textContent = String(speedMultiplier.toFixed(2));
    // scale existing particle velocities
    const ratio = (prevSpeedMultiplier === 0) ? speedMultiplier : (speedMultiplier / prevSpeedMultiplier);
    for (let p of particles) {
      p.vx *= ratio;
      p.vy *= ratio;
    }
  });
}

if (sizeRange) {
  sizeRange.addEventListener('input', (e) => {
    const v = Number(e.target.value);
    particleBaseSize = v;
    if (sizeValue) sizeValue.textContent = String(particleBaseSize.toFixed(1));
    for (let p of particles) {
      p.r = particleBaseSize * (0.7 + Math.random() * 0.6);
    }
  });
}

if (thicknessRange) {
  thicknessRange.addEventListener('input', (e) => {
    lineWidth = Number(e.target.value);
    if (thicknessValue) thicknessValue.textContent = String(lineWidth.toFixed(1));
  });
}

if (connectRange) {
  connectRange.addEventListener('input', (e) => {
    connectRadius = Number(e.target.value);
    if (connectValue) connectValue.textContent = String(connectRadius);
  });
}

if (colorPicker) {
  colorPicker.addEventListener('input', (e) => {
    colorHex = e.target.value;
    for (let p of particles) p.colorHex = colorHex;
  });
}

if (rainbowToggle) {
  rainbowToggle.addEventListener('change', (e) => {
    rainbowMode = Boolean(e.target.checked);
  });
}

if (trailToggle) {
  trailToggle.addEventListener('change', (e) => {
    trailEnabled = Boolean(e.target.checked);
  });
}
