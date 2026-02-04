const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let w = innerWidth;
let h = innerHeight;

const ui = {
  speed: document.getElementById('speed'),
  density: document.getElementById('density'),
  mask: document.getElementById('mask'),
  maskOpacity: document.getElementById('maskOpacity'),
  color: document.getElementById('color'),
  size: document.getElementById('size'),
  speedVal: document.getElementById('speedVal'),
  densityVal: document.getElementById('densityVal'),
  maskVal: document.getElementById('maskVal'),
  maskOpacityVal: document.getElementById('maskOpacityVal'),
  colorVal: document.getElementById('colorVal'),
  sizeVal: document.getElementById('sizeVal')
};
const menuBtn = document.getElementById('menuBtn');

let particles = [];
let last = performance.now();
// pooling / spawn control to avoid large alloc spikes
let targetDensity = 0;
let activeCount = 0; // number of active particles from the pool to draw
const SPAWN_BATCH = 40; // create at most this many particles per frame when increasing
const MAX_POOL = 1200; // hard cap for safety (matches previous maxSafe)

function onResize(){
  const dpr = Math.max(1, devicePixelRatio || 1);
  w = innerWidth;
  h = innerHeight;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', onResize);

function rand(min,max){return Math.random()*(max-min)+min}

class Particle{
  constructor(maxZ){
    this.maxZ = maxZ;
    this.reset();
  }
  reset(){
    // spawn near center with a small radial offset so projection expands outward
    const minDim = Math.min(w, h) || 600;
    this.angle = rand(0, Math.PI * 2);
    // spawn just outside the central mask/center area so particles emerge from
    // slightly beyond the center instead of exactly at the origin
    const spawnRadius = rand(minDim * 0.06, minDim * 0.12);
    this.x = Math.cos(this.angle) * spawnRadius;
    this.y = Math.sin(this.angle) * spawnRadius;
    this.z = rand(this.maxZ * 0.6, this.maxZ);
    this.px = null; this.py = null; // previous screen pos
    this.size = Math.random();
    this.hueSeed = rand(-40, 40); // per-particle hue offset from UI color
  }
  update(dt, cfg){
    // move toward camera by decreasing z
    const speed = cfg.speed * (0.6 + this.size*0.8);
    // warp amplification was removed; use neutral factor
    const warpFactor = 1;
    this.z -= speed * dt * warpFactor;
    if(this.z <= 0.02){ this.reset(); this.z = this.maxZ; this.px = this.py = null; }
  }
  screenPos(focal){
    const sx = (this.x / this.z) * focal + w/2;
    const sy = (this.y / this.z) * focal + h/2;
    return [sx,sy];
  }
}

function initParticles(count){
  // legacy helper kept for compatibility: set the target density and let the
  // incremental spawner create the pool over subsequent frames.
  setTargetDensity(count);
}

function setTargetDensity(count){
  targetDensity = Math.min(MAX_POOL, Math.max(0, Math.floor(count || 0)));
  // ensure activeCount doesn't exceed new target
  activeCount = Math.min(activeCount, targetDensity);
}

function adjustParticlePool(){
  const maxZ = 2000;
  // if pool already has enough objects, nothing to do on alloc side
  if(particles.length >= targetDensity) return;
  const toCreate = Math.min(SPAWN_BATCH, targetDensity - particles.length);
  const earlyPct = 0.18;
  const minDim = Math.min(w, h) || 600;
  const startIndex = particles.length;
  for(let i=0;i<toCreate;i++){
    const p = new Particle(maxZ);
    // for initial batch of the whole density, keep some nearer as before
    const globalIndex = startIndex + i;
    if(globalIndex < Math.round(targetDensity * earlyPct)){
      p.z = rand(30, maxZ * 0.28);
      const r = rand(minDim * 0.06, minDim * 0.36);
      p.x = Math.cos(p.angle) * r;
      p.y = Math.sin(p.angle) * r;
    }
    particles.push(p);
  }
  // gradually increase number of active particles to avoid sudden spikes
  activeCount = Math.min(particles.length, Math.max(activeCount, Math.min(particles.length, SPAWN_BATCH)));
}

function draw(cfg, dt){
  // slight trail by drawing translucent rect (lighter to leave some streaks)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0,0,w,h);

  // focal length controls perspective
  const focal = (Math.min(w,h) * 0.9);
  // ensure new particles are created gradually if density increased
  adjustParticlePool();

  ctx.globalCompositeOperation = 'lighter';

  // draw only active particles (first activeCount in the pool)
  const drawCount = Math.min(activeCount, particles.length);
  for(let i = 0; i < drawCount; i++){
    const p = particles[i];
    p.update(dt, cfg);
    const [sx,sy] = p.screenPos(focal);
    if(!(sx >= -60 && sx <= w+60 && sy >= -60 && sy <= h+60)){
      p.px = null; p.py = null;
      continue;
    }

    // size based on depth
    const s = (cfg.baseSize * (1.5 - (p.z / p.maxZ))) * (1 + p.size*0.6);

    // For distant particles, draw a cheap pixel/rect (fast)
      if(p.z > p.maxZ * 0.6){
        const alpha = 0.5 - (p.z / p.maxZ) * 0.35;
        const hue = ((cfg.color || 40) + p.hueSeed + 360) % 360;
        ctx.fillStyle = `hsla(${hue},90%,60%,${Math.max(0.06, alpha)})`;
        const ps = Math.max(1, Math.round(s * 0.6));
        ctx.fillRect(Math.round(sx) - (ps>>1), Math.round(sy) - (ps>>1), ps, ps);
        p.px = sx; p.py = sy;
        continue;
      }

    // draw streak from previous to current for nearer particles
    if(p.px !== null){
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(sx, sy);
      const hueStroke = ((cfg.color || 40) + p.hueSeed + 360) % 360;
      ctx.strokeStyle = `hsla(${hueStroke},90%,70%,${0.08 + (1 - p.z/p.maxZ) * 0.6})`;
      ctx.lineWidth = Math.max(0.6, s*0.6);
      ctx.stroke();
    }

    // bright head for nearer particles
    ctx.beginPath();
    const hueHead = ((cfg.color || 40) + p.hueSeed + 360) % 360;
    const lightness = 60 - (p.size*20);
    const alphaHead = 0.9 - p.z/p.maxZ*0.6;
    ctx.fillStyle = `hsl(${hueHead} 80% ${lightness}% / ${alphaHead})`;
    // avoid per-particle shadowing (heavy); keep drawing simple and fast
    ctx.arc(sx, sy, Math.max(0.35, s), 0, Math.PI*2);
    ctx.fill();

    p.px = sx; p.py = sy;
  }

  ctx.globalCompositeOperation = 'source-over';

  // mask: size from slider, draw a tinted, softly transparent radial mask
  const maskPct = cfg && typeof cfg.maskPercent === 'number' ? cfg.maskPercent : (ui.mask ? parseFloat(ui.mask.value) : 4);
  const maskRadius = Math.max(6, Math.min(w, h) * (maskPct / 100));
  const hue = (cfg && typeof cfg.color === 'number') ? cfg.color : (ui.color ? parseInt(ui.color.value,10) : 40);

  // radial gradient: center more opaque, edges transparent for soft fade
  const cx = w/2, cy = h/2;
  const innerR = Math.max(1, maskRadius * 0.15);
  const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maskRadius);
  const mo = (cfg && typeof cfg.maskOpacity === 'number') ? cfg.maskOpacity : (ui.maskOpacity ? parseFloat(ui.maskOpacity.value) : 0.55);
  // stronger center alpha scaled by maskOpacity so slider visibly changes mask and sun
  grad.addColorStop(0, `hsla(${hue},92%,45%,${Math.min(0.95, 0.75 * mo)})`);
  grad.addColorStop(0.6, `hsla(${hue},88%,25%,${Math.min(0.85, 0.45 * mo)})`);
  grad.addColorStop(1, `hsla(${hue},85%,12%,0)`);
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = grad;
  ctx.arc(cx, cy, maskRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // draw glowing sun slightly smaller than the mask so the glow sits nicely inside
  const sunRadius = Math.max(4, maskRadius * 0.88);
  // sun brightness/alpha follows mask opacity so slider changes the visible glow
  const sunAlpha = Math.max(0.12, Math.min(1, 0.9 * mo + 0.08));
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = `hsl(${hue} 95% 72% / ${sunAlpha})`;
  ctx.shadowColor = `hsl(${hue} 95% 62% / ${Math.min(1, 0.95 * mo + 0.05)})`;
  ctx.shadowBlur = Math.max(8, sunRadius * (1.6 + mo * 2.0));
  ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animate(t){
  const now = t || performance.now();
  const dt = Math.min(60, now - last) / 16.6667; // normalized to 60fps units
  last = now;

  const cfg = {
    speed: parseFloat(ui.speed.value),
    density: parseInt(ui.density.value,10),
    maskPercent: ui.mask ? parseFloat(ui.mask.value) : 4,
    color: ui.color ? parseInt(ui.color.value,10) : 40,
    maskOpacity: ui.maskOpacity ? parseFloat(ui.maskOpacity.value) : 0.55,
    baseSize: parseFloat(ui.size.value)
  };

  // apply turbo multiplier if active
  if(turbo.active){
    if(now < turbo.end){
      cfg.speed *= turbo.mult;
    } else {
      turbo.active = false;
    }
  }

  // if density changed, resize particle list
  if(particles.length !== cfg.density){
    initParticles(cfg.density);
  }

  draw(cfg, dt);
  requestAnimationFrame(animate);
}

function updateUI(){
  ui.speedVal.textContent = ui.speed.value;
  ui.densityVal.textContent = ui.density.value;
  if(ui.maskVal && ui.mask) ui.maskVal.textContent = ui.mask.value + '%';
  if(ui.colorVal && ui.color) ui.colorVal.textContent = ui.color.value;
  if(ui.maskOpacityVal && ui.maskOpacity) ui.maskOpacityVal.textContent = Math.round(ui.maskOpacity.value*100) + '%';
  ui.sizeVal.textContent = ui.size.value;
  updateColorSliderBackground();
}

// wire controls
['input','change'].forEach(ev => {
  ui.speed.addEventListener(ev, updateUI);
  ui.density.addEventListener(ev, updateUI);
  if(ui.mask) ui.mask.addEventListener(ev, updateUI);
  if(ui.color) ui.color.addEventListener(ev, updateUI);
  if(ui.maskOpacity) ui.maskOpacity.addEventListener(ev, updateUI);
  ui.size.addEventListener(ev, updateUI);
});

function updateColorSliderBackground(){
  if(!ui.color) return;
  // create a colorful gradient across hues 0->360
  const stops = [];
  const steps = 12;
  for(let i=0;i<=steps;i++){
    const h = Math.round((i/steps) * 360);
    stops.push(`hsl(${h} 100% 50%) ${Math.round((i/steps)*100)}%`);
  }
  ui.color.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
}

// menu button toggles the control panel
if(menuBtn){
  menuBtn.addEventListener('click', () => {
    const panel = document.getElementById('ui');
    if (!panel) return;
    const hidden = panel.style.display === 'none' || panel.classList.contains('hidden');
    if (hidden) {
      panel.style.display = 'block';
      panel.classList.remove('hidden');
      panel.classList.add('left-panel');
      menuBtn.classList.remove('closed');
    } else {
      panel.style.display = 'none';
      panel.classList.add('hidden');
      panel.classList.remove('left-panel');
      menuBtn.classList.add('closed');
    }
  });
}

// ensure canvas DPI/resizing is set before initializing particles
onResize();
updateUI();
initParticles(parseInt(ui.density.value,10));
requestAnimationFrame(animate);

// transient turbo burst when Space is pressed: briefly multiply speed
const turbo = { active: false, end: 0, mult: 10, duration: 800 };
addEventListener('keydown', e => {
  if(e.code === 'Space'){
    const now = performance.now();
    turbo.active = true;
    turbo.end = now + turbo.duration;
  }
});