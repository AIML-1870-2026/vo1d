// Dungeon Snake - minimal MVP implementation
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleScreen = document.getElementById('title-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over');
const levelAnn = document.getElementById('level-announcement');
const hsDisplay = document.getElementById('hs');
const finalScore = document.getElementById('final-score');

// Grid config (spec suggests 40x30)
const GRID_W = 40, GRID_H = 30;
let tileSize = 20;
let canvasW = GRID_W * tileSize, canvasH = GRID_H * tileSize;

// Game state
let running = false, paused = false, gameOver = false;
let level = 1;
let baseSpeed = 6; // tiles/sec
let snakeSpeed = baseSpeed;
let lastMove = 0;
let snake = [];
let dir = {x:1,y:0};
let pendingDir = null;
let fruits = [];
let fruitsNeeded = 3;
let fruitsCollected = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('dungeon-snake-highscore')||'0',10);
hsDisplay.textContent = 'HIGH SCORE: ' + highScore;
// transition guard to avoid multiple rapid level advances
let inTransition = false;

// Permanent Upgrade System
let coins = parseInt(localStorage.getItem('dungeon-snake-coins')||'0',10);
const UPGRADES = {
  extraTime: { name: 'Extra Time', desc: '+10s per level', cost: 500, max: 3, effect: 10 },
  slowBoss: { name: 'Slow Boss', desc: 'Boss 15% slower', cost: 750, max: 3, effect: 0.15 },
  scoreBonus: { name: 'Score Boost', desc: '+25% score', cost: 1000, max: 3, effect: 0.25 },
  startShield: { name: 'Start Shield', desc: 'Begin with Shield', cost: 1500, max: 1, effect: 1 }
};
let upgradeLevels = JSON.parse(localStorage.getItem('dungeon-snake-upgrades')||'{}');
// Initialize missing upgrades
for(let key in UPGRADES) if(!(key in upgradeLevels)) upgradeLevels[key] = 0;

function saveUpgrades(){
  localStorage.setItem('dungeon-snake-coins', coins);
  localStorage.setItem('dungeon-snake-upgrades', JSON.stringify(upgradeLevels));
}
function getUpgradeEffect(key){
  return UPGRADES[key].effect * upgradeLevels[key];
}
function getLevelTime(){
  return LEVEL_TIME + getUpgradeEffect('extraTime');
}
function getBossSpeedMultiplier(){
  return 1 - getUpgradeEffect('slowBoss');
}
function getScoreMultiplier(){
  return 1 + getUpgradeEffect('scoreBonus');
}

// Timer / torches
const LEVEL_TIME = 60; // seconds
let levelStart = 0;

// Boss
let boss = null; // {x,y,w,h,active,spawnAt}

// Powerup system
// Types: 1=Shield, 2=Time Freeze, 3=Extra Life, 4=Level Skip
const POWERUP_TYPES = [
  { id: 1, name: 'Shield', color: '#4488ff', icon: '🛡️', duration: 5000 },
  { id: 2, name: 'Time Freeze', color: '#88ffff', icon: '⏱️', duration: 5000 },
  { id: 3, name: 'Extra Life', color: '#ff4444', icon: '❤️', duration: 0 }, // passive
  { id: 4, name: 'Level Skip', color: '#aa44ff', icon: '🚪', duration: 0 }  // instant
];
let powerupsOnMap = []; // {x, y, type} - spawned items on the map
let inventory = [null, null, null, null]; // slots 0-3 for powerup types 1-4
let activeEffects = { shield: 0, timeFreeze: 0 }; // timestamps when effects expire

// Obstacles (spikes/rocks on non-boss levels)
let obstacles = []; // {x, y, type} - type: 'spike' or 'rock'
let frozenTimeAccumulated = 0; // total ms the timer was frozen
let lastFreezeCheck = 0; // for tracking freeze duration
let bossLastMove = 0;

function distance(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }

function findBossSpawn(head, w, h){
  // prefer positions on the perimeter that are far from the snake head
  const candidates = [];
  // sample edges (every 4 tiles)
  for(let x=1;x<GRID_W-w-1;x+=4){ candidates.push({x:x,y:0}); candidates.push({x:x,y:GRID_H-1}); }
  for(let y=1;y<GRID_H-h-1;y+=4){ candidates.push({x:0,y:y}); candidates.push({x:GRID_W-w-1,y:y}); }
  // sort by distance descending
  candidates.sort((p1,p2)=>{ return distance(p2,head) - distance(p1,head); });
  // pick the first candidate that's not overlapping snake
  for(let p of candidates){
    let ok = true;
    for(let sx of snake){
      if(sx.x >= p.x && sx.x < p.x + w && sx.y >= p.y && sx.y < p.y + h){ ok = false; break; }
    }
    if(ok) return {x: p.x, y: p.y};
  }
  // fallback: place opposite side
  return {x: Math.max(1, Math.min(GRID_W - w -1, head.x + Math.sign(head.x - GRID_W/2) * 8)), y: Math.max(1, Math.min(GRID_H - h -1, head.y + Math.sign(head.y - GRID_H/2) * 6)) };
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function bossCanOccupy(x,y,w,h){
  if(x < 0 || y < 0 || x > GRID_W - w || y > GRID_H - h) return false;
  for(let f of fruits){
    if(f.x >= x && f.x < x + w && f.y >= y && f.y < y + h) return false;
  }
  return true;
}

function findPathAStar(start, goal, w, h){
  const key = (n)=>`${n.x},${n.y}`;
  const startKey = key(start), goalKey = key(goal);
  if(!bossCanOccupy(goal.x, goal.y, w, h)) return null;
  const open = new Map();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  function neighbors(n){
    return [ {x:n.x+1,y:n.y}, {x:n.x-1,y:n.y}, {x:n.x,y:n.y+1}, {x:n.x,y:n.y-1} ];
  }
  function hCost(a,b){ return Math.abs(a.x-b.x)+Math.abs(a.y-b.y); }
  open.set(startKey, start);
  gScore.set(startKey, 0);
  fScore.set(startKey, hCost(start, goal));
  while(open.size){
    // pick node in open with lowest fScore
    let currentKey=null, current=null, minF=Infinity;
    for(let [k,n] of open){ const f = fScore.get(k) || Infinity; if(f < minF){ minF = f; currentKey = k; current = n; } }
    if(!current) break;
    if(current.x === goal.x && current.y === goal.y){
      // reconstruct path
      const path=[]; let k = currentKey;
      while(cameFrom.has(k)){ path.unshift(current); current = cameFrom.get(k); k = key(current); }
      path.unshift(start);
      return path.map(n=>({x:n.x, y:n.y}));
    }
    open.delete(currentKey);
    const closedKey = currentKey;
    for(let nb of neighbors(current)){
      const nk = key(nb);
      if(!bossCanOccupy(nb.x, nb.y, w, h)) continue;
      const tentativeG = (gScore.get(currentKey)||Infinity) + 1;
      if(tentativeG < (gScore.get(nk) || Infinity)){
        cameFrom.set(nk, current);
        gScore.set(nk, tentativeG);
        const fval = tentativeG + hCost(nb, goal);
        fScore.set(nk, fval);
        if(!open.has(nk)) open.set(nk, nb);
      }
    }
  }
  return null;
}

// Utilities
function resizeCanvas(){
  const maxW = Math.min(window.innerWidth - 40, 1200);
  const maxH = Math.min(window.innerHeight - 80, 900);
  tileSize = Math.floor(Math.min(maxW/GRID_W, maxH/GRID_H));
  canvasW = tileSize*GRID_W;
  canvasH = tileSize*GRID_H;
  canvas.width = canvasW; canvas.height = canvasH;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function resetSnake(){
  snake = [];
  const cx = Math.floor(GRID_W/2), cy = Math.floor(GRID_H/2);
  for(let i=0;i<8;i++) snake.push({x:cx-i,y:cy});
  dir = {x:1,y:0}; pendingDir = null;
}

function requiredFruitsForLevel(l){
  const base = 3 + Math.floor((l-1)/5);
  // Make early levels (1-5) quicker: require half the fruits (rounded up)
  if(l <= 5) return Math.max(1, Math.ceil(base / 2));
  return base;
}

function spawnFruit(){
  for(let attempts=0;attempts<200;attempts++){
    const p = {x:randInt(1,GRID_W-2), y:randInt(1,GRID_H-2)};
    if(!isOccupied(p)) { fruits.push(p); return; }
  }
}

function isOccupied(p){
  if(snake.some(s=>s.x===p.x && s.y===p.y)) return true;
  if(boss && boss.active){
    if(p.x>=boss.x && p.x<boss.x+boss.w && p.y>=boss.y && p.y<boss.y+boss.h) return true;
  }
  if(fruits.some(f=>f.x===p.x && f.y===p.y)) return true;
  if(powerupsOnMap.some(pw=>pw.x===p.x && pw.y===p.y)) return true;
  if(obstacles.some(o=>o.x===p.x && o.y===p.y)) return true;
  return false;
}

function spawnPowerup(){
  for(let attempts=0;attempts<200;attempts++){
    const p = {x:randInt(2,GRID_W-3), y:randInt(2,GRID_H-3)};
    if(!isOccupied(p)) {
      // random type 1-4
      const type = randInt(1, 4);
      powerupsOnMap.push({x: p.x, y: p.y, type: type});
      return;
    }
  }
}

function spawnObstacles(count){
  obstacles = [];
  const types = ['spike', 'rock'];
  for(let i=0; i<count; i++){
    for(let attempts=0; attempts<200; attempts++){
      // Keep obstacles away from center spawn area
      const p = {x:randInt(2,GRID_W-3), y:randInt(2,GRID_H-3)};
      const cx = Math.floor(GRID_W/2), cy = Math.floor(GRID_H/2);
      const distFromCenter = Math.abs(p.x - cx) + Math.abs(p.y - cy);
      if(distFromCenter > 5 && !isOccupied(p)){
        obstacles.push({x: p.x, y: p.y, type: types[randInt(0,1)]});
        break;
      }
    }
  }
}

function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function startLevel(){
  resetSnake();
  fruits = [];
  fruitsCollected = 0;
  inTransition = false;
  fruitsNeeded = requiredFruitsForLevel(level);
  // spawn initial fruits
  for(let i=0;i<Math.max(1,fruitsNeeded);i++) spawnFruit();
  snakeSpeed = baseSpeed * Math.pow(1.02, level-1);
  levelStart = performance.now();
  // ensure movement timing starts cleanly
  lastMove = performance.now();
  boss = null;
  running = true; paused = false; gameOver = false;
  // boss spawn marker (every 5 levels)
  if(level % 5 === 0){ boss = {x:2,y:2,w:6,h:6,active:false,spawnAt:levelStart+2000}; }

  // Obstacles on non-boss levels (scales with level)
  if(level % 5 !== 0){
    const obstacleCount = Math.min(15, 2 + Math.floor(level / 2)); // 2-15 obstacles
    spawnObstacles(obstacleCount);
  } else {
    obstacles = []; // no obstacles on boss levels
  }

  // Powerups: clear map powerups, spawn 1 new one
  // Inventory persists between levels
  powerupsOnMap = [];
  activeEffects = { shield: 0, timeFreeze: 0 };
  frozenTimeAccumulated = 0;
  lastFreezeCheck = 0;
  spawnPowerup(); // just 1 powerup per level

  // Apply Start Shield upgrade on level 1
  if(level === 1 && upgradeLevels.startShield > 0){
    inventory[0] = 1; // give shield powerup
  }
}

function showLevelAnn(text, ms, isHighScore = false){
  levelAnn.textContent = text;
  levelAnn.classList.remove('hidden', 'highscore');
  if(isHighScore) levelAnn.classList.add('highscore');
  // trigger CSS animation
  requestAnimationFrame(()=> levelAnn.classList.add('visible'));
  // hide after ms (fade out then set hidden)
  setTimeout(()=>{
    levelAnn.classList.remove('visible');
    // wait for CSS fade then hide
    setTimeout(()=> levelAnn.classList.add('hidden', 'highscore'), 300);
  }, ms);
}

function gameOverNow(bypassExtraLife = false){
  // Check for Extra Life first (unless bypassed, e.g., for timer expiration the spec allows it)
  if(!bypassExtraLife && useExtraLife()){
    showLevelAnn('EXTRA LIFE!', 1000);
    return; // survived!
  }

  running = false; gameOver = true; pauseScreen.classList.add('hidden');
  // show main menu (title screen) on death and display last score
  try { gameOverScreen.classList.add('hidden'); } catch(e){}
  titleScreen.classList.remove('hidden');

  // Award coins (10% of score)
  const earnedCoins = Math.floor(score * 0.1);
  coins += earnedCoins;
  saveUpgrades();
  updateCoinDisplay();

  const lastScoreEl = document.getElementById('last-score');
  if(lastScoreEl) lastScoreEl.textContent = 'SCORE: ' + score + ' (+' + earnedCoins + ' coins)';
  finalScore.textContent = 'SCORE: ' + score;
  inTransition = false;
  // Reset inventory on true game over
  inventory = [null, null, null, null];

  if(score>highScore){ highScore = score; localStorage.setItem('dungeon-snake-highscore', highScore); hsDisplay.textContent = 'HIGH SCORE: ' + highScore; showLevelAnn('🏆 NEW HIGH SCORE! 🏆', 2000, true); }
}

function nextLevel(){
  if(inTransition) return;
  inTransition = true;
  // score bonuses (with multiplier)
  const levelBonus = 500 * level;
  const timeLeft = Math.max(0, Math.ceil(getLevelTime() - ((performance.now()-levelStart-frozenTimeAccumulated)/1000)));
  const timeBonus = 10 * timeLeft * level;
  let levelPoints = Math.floor((levelBonus + timeBonus) * getScoreMultiplier());
  score += levelPoints;
  // boss multiplier (2x on boss levels)
  if(level % 5 === 0) score = Math.floor(score * 2);

  level++;
  // show next-level announcement and start level after animation
  showLevelAnn('LEVEL ' + level, 700);
  setTimeout(()=>{
    // clear transition and start the level
    inTransition = false; startLevel();
  }, 700 + 300); // wait for announce duration + fade-out buffer
  // keep rendering during transition
  requestAnimationFrame(update);
}

// Input
window.addEventListener('keydown', (e)=>{
  if(e.key===' '){
    // Start/restart game when on title screen (covers both initial start and after game over)
    if(!running || gameOver){
      // Reset all game state
      try { gameOverScreen.classList.add('hidden'); } catch(e){}
      titleScreen.classList.add('hidden');
      level = 1;
      score = 0;
      gameOver = false;
      running = false; // will be set true by startLevel
      inventory = [null, null, null, null];
      obstacles = [];
      // clear last-score display
      const lastScoreEl = document.getElementById('last-score');
      if(lastScoreEl) lastScoreEl.textContent = '';
      inTransition = true;
      showLevelAnn('LEVEL ' + level, 700);
      setTimeout(()=>{ inTransition = false; startLevel(); }, 700 + 300);
    }
    e.preventDefault();
  }
  if(e.key==='Escape' || e.key==='p' || e.key==='P'){ if(!running) return; paused = !paused; pauseScreen.classList.toggle('hidden', !paused); e.preventDefault(); }
  const k = e.key;
  if(k==='ArrowUp' || k==='w' || k==='W') pendingDir = {x:0,y:-1};
  if(k==='ArrowDown' || k==='s' || k==='S') pendingDir = {x:0,y:1};
  if(k==='ArrowLeft' || k==='a' || k==='A') pendingDir = {x:-1,y:0};
  if(k==='ArrowRight' || k==='d' || k==='D') pendingDir = {x:1,y:0};

  // Powerup activation (1-4 keys)
  if(running && !paused && !gameOver){
    if(k === '1') activatePowerup(1);
    if(k === '2') activatePowerup(2);
    // Note: 3 (Extra Life) is passive/automatic
    if(k === '4') activatePowerup(4);
  }
});

function activatePowerup(type){
  const slotIndex = type - 1;
  if(inventory[slotIndex] === null) return; // don't have this powerup

  const now = performance.now();
  if(type === 1){ // Shield
    activeEffects.shield = now + 5000;
    inventory[slotIndex] = null;
  } else if(type === 2){ // Time Freeze
    activeEffects.timeFreeze = now + 5000;
    inventory[slotIndex] = null;
  } else if(type === 4){ // Level Skip
    inventory[slotIndex] = null;
    // Grant full points for remaining fruits (with multiplier)
    const remainingFruits = fruitsNeeded - fruitsCollected;
    score += Math.floor(remainingFruits * 100 * level * getScoreMultiplier());
    fruitsCollected = fruitsNeeded; // mark as complete
    nextLevel();
  }
}

function useExtraLife(){
  if(inventory[2] === null) return false; // slot index 2 = type 3
  inventory[2] = null;
  // Respawn snake at center, keep level progress
  resetSnake();
  lastMove = performance.now();
  return true;
}

// Pause menu skip control hookup
const skipInput = document.getElementById('skip-level-input');
const skipBtn = document.getElementById('skip-level-btn');
if(skipBtn){
  skipBtn.addEventListener('click', ()=>{
    const v = Math.max(1, parseInt(skipInput.value || '1'));
    level = v;
    inTransition = true;
    showLevelAnn('LEVEL ' + level, 700);
    setTimeout(()=>{ inTransition = false; startLevel(); paused = false; pauseScreen.classList.add('hidden'); }, 700 + 300);
  });
}

function update(now){
  if(!running || paused || gameOver || inTransition) { draw(); requestAnimationFrame(update); return; }
  // boss activation
  if(boss && !boss.active && now >= boss.spawnAt){ boss.active = true; // place far from snake head
    const head = snake[0];
    const pos = findBossSpawn(head, boss.w, boss.h);
    boss.x = pos.x; boss.y = pos.y;
    bossLastMove = now;
  }

  const elapsed = (now - lastMove);
  const tickInterval = 1000 / snakeSpeed;
  if(elapsed >= tickInterval){
    // apply pending direction if not reversing
    if(pendingDir){
      if(!(pendingDir.x === -dir.x && pendingDir.y === -dir.y)) dir = pendingDir;
      pendingDir = null;
    }
    lastMove = now;
    // move snake
    const head = {x:snake[0].x + dir.x, y:snake[0].y + dir.y};
    // wall collision
    if(head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H){ gameOverNow(); return; }
    // self collision
    if(snake.some(seg=>seg.x===head.x && seg.y===head.y)){ gameOverNow(); return; }
    // obstacle collision (shield allows passing through)
    const shieldActiveForObstacle = performance.now() < activeEffects.shield;
    if(!shieldActiveForObstacle && obstacles.some(o=>o.x===head.x && o.y===head.y)){ gameOverNow(); return; }
    snake.unshift(head);
    // fruit collision
    let ate = false;
    for(let i=0;i<fruits.length;i++){
      if(fruits[i].x===head.x && fruits[i].y===head.y){
        fruits.splice(i,1);
        ate = true;
        fruitsCollected++;
        score += Math.floor(100 * level * getScoreMultiplier());
        // Only spawn a replacement if the player still needs more fruits this level
        if(fruitsCollected < fruitsNeeded) spawnFruit();
        // If we've collected the required fruits, advance immediately (guarded)
        if(!inTransition && fruitsCollected >= fruitsNeeded){ nextLevel(); return; }
        break;
      }
    }
    if(!ate) snake.pop();

    // powerup collection
    for(let i=powerupsOnMap.length-1; i>=0; i--){
      const pw = powerupsOnMap[i];
      if(pw.x === head.x && pw.y === head.y){
        // Add to inventory if slot is empty (type 1 goes to slot 0, etc.)
        const slotIndex = pw.type - 1;
        if(inventory[slotIndex] === null){
          inventory[slotIndex] = pw.type;
        }
        powerupsOnMap.splice(i, 1);
      }
    }
    // boss collision (shield protects from boss)
    if(boss && boss.active){
      const shieldActive = performance.now() < activeEffects.shield;
      if(!shieldActive && head.x>=boss.x && head.x < boss.x+boss.w && head.y>=boss.y && head.y<boss.y+boss.h){ gameOverNow(); return; }
    }
  }

  // boss movement (continuous) - only when active and not frozen
  const timeFrozen = performance.now() < activeEffects.timeFreeze;
  if(boss && boss.active && !timeFrozen){
    const head = snake[0];
    // decide a goal top-left for the boss so it overlaps the head
    const goal = { x: clamp(Math.floor(head.x - Math.floor(boss.w/2)), 0, GRID_W - boss.w), y: clamp(Math.floor(head.y - Math.floor(boss.h/2)), 0, GRID_H - boss.h) };
    // recompute path occasionally (every 400ms) or when no path
    if(!boss.path || !boss.path.length || (now - (boss.repathTimer||0) > 400)){
      const startNode = {x: Math.floor(boss.x), y: Math.floor(boss.y)};
      const p = findPathAStar(startNode, goal, boss.w, boss.h);
      if(p && p.length > 0){ boss.path = p; boss.pathIndex = 0; }
      else { boss.path = null; boss.pathIndex = 0; }
      boss.repathTimer = now;
    }

    // Boss moves slower than the snake. Use 45% of snake speed, modified by upgrades
    const bossSpeedBase = Math.max(0.5, snakeSpeed * 0.45);
    const bossSpeed = bossSpeedBase * getBossSpeedMultiplier(); // apply slow boss upgrade
    const dt = (now - bossLastMove) / 1000;
    bossLastMove = now;

    if(boss.path && boss.path.length && boss.pathIndex < boss.path.length){
      const node = boss.path[boss.pathIndex];
      const targetX = node.x + 0.5;
      const targetY = node.y + 0.5;
      const dx = targetX - (boss.x + boss.w/2);
      const dy = targetY - (boss.y + boss.h/2);
      const dist = Math.hypot(dx,dy);
      if(dist < 0.05){
        boss.pathIndex++;
      } else {
        const moveAmount = bossSpeed * dt;
        boss.x += (dx/dist) * moveAmount;
        boss.y += (dy/dist) * moveAmount;
      }
    } else {
      // fallback: direct pursuit
      const bx = boss.x + boss.w/2, by = boss.y + boss.h/2;
      const diffx = head.x + 0.5 - bx, diffy = head.y + 0.5 - by;
      const angle = Math.atan2(diffy, diffx);
      const moveAmount = bossSpeed * dt;
      boss.x += Math.cos(angle) * moveAmount;
      boss.y += Math.sin(angle) * moveAmount;
    }

    // clamp inside arena bounds
    boss.x = Math.max(0, Math.min(GRID_W - boss.w, boss.x));
    boss.y = Math.max(0, Math.min(GRID_H - boss.h, boss.y));

    // collision between boss and any snake segment (use floored boss area)
    // Shield protects from boss contact
    const shieldActiveNow = performance.now() < activeEffects.shield;
    if(!shieldActiveNow){
      for(let seg of snake){
        if(seg.x >= Math.floor(boss.x) && seg.x < Math.floor(boss.x)+boss.w && seg.y >= Math.floor(boss.y) && seg.y < Math.floor(boss.y)+boss.h){ gameOverNow(); return; }
      }
    }
  }

  // level completion (check before timer to allow finishing on final tick)
  if(!inTransition && fruitsCollected >= fruitsNeeded){ nextLevel(); return; }

  // Track frozen time for timer pause
  if(timeFrozen){
    if(lastFreezeCheck > 0){
      frozenTimeAccumulated += (now - lastFreezeCheck);
    }
    lastFreezeCheck = now;
  } else {
    lastFreezeCheck = 0;
  }

  // timer check (accounting for frozen time and upgrades)
  const elapsedLevel = (now - levelStart - frozenTimeAccumulated)/1000;
  if(elapsedLevel >= getLevelTime()){ gameOverNow(); return; }

  draw();
  requestAnimationFrame(update);
}

function draw(){
  const now = performance.now();

  // background with stone floor pattern
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,canvasW,canvasH);

  // Draw floor tiles with subtle variation
  for(let x=1; x<GRID_W-1; x++){
    for(let y=1; y<GRID_H-1; y++){
      const shade = ((x + y) % 2 === 0) ? '#252525' : '#222';
      ctx.fillStyle = shade;
      ctx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize);
    }
  }

  // Floor tile grid lines
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
  for(let x=1;x<GRID_W;x++){ ctx.beginPath(); ctx.moveTo(x*tileSize,tileSize); ctx.lineTo(x*tileSize,canvasH-tileSize); ctx.stroke(); }
  for(let y=1;y<GRID_H;y++){ ctx.beginPath(); ctx.moveTo(tileSize,y*tileSize); ctx.lineTo(canvasW-tileSize,y*tileSize); ctx.stroke(); }

  // Walls with brick pattern
  const wallColor1 = '#3d3d3d';
  const wallColor2 = '#333';
  const mortarColor = '#2a2a2a';

  // Draw brick walls
  function drawBrickWall(startX, startY, width, height){
    ctx.fillStyle = mortarColor;
    ctx.fillRect(startX, startY, width, height);

    const brickW = tileSize * 0.8;
    const brickH = tileSize * 0.4;
    let row = 0;
    for(let y = startY + 2; y < startY + height - 2; y += brickH + 2){
      const offset = (row % 2) * (brickW / 2);
      for(let x = startX + 2 - offset; x < startX + width; x += brickW + 2){
        const bx = Math.max(startX, x);
        const bw = Math.min(brickW, startX + width - bx - 2);
        if(bw > 4){
          ctx.fillStyle = ((row + Math.floor(x/brickW)) % 2 === 0) ? wallColor1 : wallColor2;
          ctx.fillRect(bx, y, bw, brickH);
        }
      }
      row++;
    }
  }

  // Draw four walls
  drawBrickWall(0, 0, canvasW, tileSize); // top
  drawBrickWall(0, canvasH-tileSize, canvasW, tileSize); // bottom
  drawBrickWall(0, 0, tileSize, canvasH); // left
  drawBrickWall(canvasW-tileSize, 0, tileSize, canvasH); // right

  // Torches with animated flames
  const elapsedSec = Math.floor((now - levelStart - frozenTimeAccumulated)/1000);
  const torchInterval = getLevelTime() / 12; // dynamic based on level time
  const extinguished = Math.max(0, Math.floor(elapsedSec / torchInterval));
  const posOrder = [
    {x:Math.floor(GRID_W/2), y:0},
    {x:Math.floor(GRID_W*3/4), y:0}, {x:GRID_W-1, y:Math.floor(GRID_H/6)}, {x:GRID_W-1, y:Math.floor(GRID_H/2)},
    {x:GRID_W-1, y:Math.floor(GRID_H*5/6)}, {x:Math.floor(GRID_W*3/4), y:GRID_H-1},
    {x:Math.floor(GRID_W/2), y:GRID_H-1},
    {x:Math.floor(GRID_W/4), y:GRID_H-1}, {x:0, y:Math.floor(GRID_H*5/6)}, {x:0, y:Math.floor(GRID_H/2)},
    {x:0, y:Math.floor(GRID_H/6)}, {x:Math.floor(GRID_W/4), y:0}
  ];

  for(let i=0;i<12;i++){
    const p = posOrder[i];
    const px = p.x*tileSize + tileSize/2;
    const py = p.y*tileSize + tileSize/2;
    const lit = i >= extinguished;
    const isWarning = (12 - extinguished) <= 3 && lit;

    // Torch holder
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(px - tileSize*0.15, py, tileSize*0.3, tileSize*0.4);

    if(lit){
      // Animated flame glow
      const flicker = Math.sin(now/100 + i*0.5) * 0.3 + 0.7;
      const glowSize = tileSize * (isWarning ? 0.8 : 0.6) * flicker;

      // Outer glow
      const gradient = ctx.createRadialGradient(px, py - tileSize*0.1, 0, px, py - tileSize*0.1, glowSize);
      gradient.addColorStop(0, isWarning ? 'rgba(255,100,50,0.8)' : 'rgba(255,150,50,0.6)');
      gradient.addColorStop(0.5, isWarning ? 'rgba(255,50,0,0.4)' : 'rgba(255,100,0,0.3)');
      gradient.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(px, py - tileSize*0.1, glowSize, 0, Math.PI*2); ctx.fill();

      // Inner flame
      ctx.fillStyle = isWarning ? '#ffaa00' : '#ff9933';
      ctx.beginPath(); ctx.arc(px, py - tileSize*0.1, tileSize*0.25*flicker, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffdd66';
      ctx.beginPath(); ctx.arc(px, py - tileSize*0.1, tileSize*0.12*flicker, 0, Math.PI*2); ctx.fill();
    } else {
      // Extinguished - smoke wisp
      ctx.fillStyle = '#444';
      ctx.beginPath(); ctx.arc(px, py - tileSize*0.1, tileSize*0.15, 0, Math.PI*2); ctx.fill();
    }
  }

  // Fruits (red apples with shine)
  for(let f of fruits){
    const fx = f.x * tileSize + tileSize/2;
    const fy = f.y * tileSize + tileSize/2;
    // Apple body
    ctx.fillStyle = '#cc2222';
    ctx.beginPath(); ctx.arc(fx, fy, tileSize*0.4, 0, Math.PI*2); ctx.fill();
    // Highlight
    ctx.fillStyle = '#ff6666';
    ctx.beginPath(); ctx.arc(fx - tileSize*0.1, fy - tileSize*0.1, tileSize*0.15, 0, Math.PI*2); ctx.fill();
    // Stem
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(fx - 2, fy - tileSize*0.45, 4, tileSize*0.15);
  }

  // Obstacles (spikes and rocks)
  for(let o of obstacles){
    const ox = o.x * tileSize;
    const oy = o.y * tileSize;
    const ocx = ox + tileSize/2;
    const ocy = oy + tileSize/2;

    if(o.type === 'spike'){
      // Metal spike trap
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(ocx, oy + tileSize*0.1);
      ctx.lineTo(ox + tileSize*0.2, oy + tileSize*0.9);
      ctx.lineTo(ox + tileSize*0.8, oy + tileSize*0.9);
      ctx.closePath();
      ctx.fill();
      // Spike highlight
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(ocx, oy + tileSize*0.15);
      ctx.lineTo(ocx - tileSize*0.1, oy + tileSize*0.5);
      ctx.lineTo(ocx, oy + tileSize*0.4);
      ctx.closePath();
      ctx.fill();
      // Base
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(ox + tileSize*0.15, oy + tileSize*0.8, tileSize*0.7, tileSize*0.15);
    } else {
      // Rock/boulder
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.ellipse(ocx, ocy + tileSize*0.05, tileSize*0.4, tileSize*0.35, 0, 0, Math.PI*2);
      ctx.fill();
      // Rock highlight
      ctx.fillStyle = '#5a5a5a';
      ctx.beginPath();
      ctx.ellipse(ocx - tileSize*0.1, ocy - tileSize*0.05, tileSize*0.2, tileSize*0.15, -0.3, 0, Math.PI*2);
      ctx.fill();
      // Rock shadow
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(ocx + tileSize*0.1, ocy + tileSize*0.15, tileSize*0.25, tileSize*0.1, 0.2, 0, Math.PI);
      ctx.fill();
    }
  }

  // powerups on map
  for(let pw of powerupsOnMap){
    const ptype = POWERUP_TYPES[pw.type - 1];
    ctx.fillStyle = ptype.color;
    ctx.beginPath();
    ctx.arc(pw.x * tileSize + tileSize/2, pw.y * tileSize + tileSize/2, tileSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // draw icon
    ctx.font = `${Math.floor(tileSize * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ptype.icon, pw.x * tileSize + tileSize/2, pw.y * tileSize + tileSize/2);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; // reset

  // Snake with improved visuals
  const shieldActive = now < activeEffects.shield;

  // Shield aura effect
  if(shieldActive){
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 20;
    // Draw shield bubble around snake
    for(let seg of snake){
      ctx.fillStyle = 'rgba(68,136,255,0.2)';
      ctx.beginPath();
      ctx.arc(seg.x * tileSize + tileSize/2, seg.y * tileSize + tileSize/2, tileSize*0.6, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Draw snake segments (tail to head)
  for(let i=snake.length-1; i>=0; i--){
    const s = snake[i];
    const sx = s.x * tileSize + tileSize/2;
    const sy = s.y * tileSize + tileSize/2;

    // Gradient from tail to head
    const t = i / snake.length;
    const baseGreen = shieldActive ? 100 : (50 + Math.floor(t * 150));
    const r = shieldActive ? 100 : 30;
    const g = shieldActive ? (150 + Math.floor(t * 100)) : baseGreen;
    const b = shieldActive ? 255 : 30;

    // Body segment
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(sx, sy, tileSize*0.45, 0, Math.PI*2);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = `rgba(255,255,255,0.15)`;
    ctx.beginPath();
    ctx.arc(sx - tileSize*0.1, sy - tileSize*0.1, tileSize*0.2, 0, Math.PI*2);
    ctx.fill();

    // Head features
    if(i === 0){
      // Eyes
      const eyeOffset = tileSize * 0.15;
      const eyeX1 = sx + dir.y * eyeOffset - dir.x * eyeOffset * 0.5;
      const eyeX2 = sx - dir.y * eyeOffset - dir.x * eyeOffset * 0.5;
      const eyeY1 = sy + dir.x * eyeOffset - dir.y * eyeOffset * 0.5;
      const eyeY2 = sy - dir.x * eyeOffset - dir.y * eyeOffset * 0.5;

      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(eyeX1, eyeY1, tileSize*0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX2, eyeY2, tileSize*0.12, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(eyeX1 + dir.x*2, eyeY1 + dir.y*2, tileSize*0.06, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX2 + dir.x*2, eyeY2 + dir.y*2, tileSize*0.06, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.shadowBlur = 0;

  // Boss (troll) with improved visuals
  if(boss && boss.active){
    const bx = Math.floor(boss.x) * tileSize;
    const by = Math.floor(boss.y) * tileSize;
    const bw = boss.w * tileSize;
    const bh = boss.h * tileSize;
    const bcx = bx + bw/2;
    const bcy = by + bh/2;

    // Body shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(bcx + 5, bcy + bh*0.4, bw*0.45, bh*0.15, 0, 0, Math.PI*2);
    ctx.fill();

    // Main body
    const bodyGrad = ctx.createRadialGradient(bcx, bcy, 0, bcx, bcy, bw*0.5);
    bodyGrad.addColorStop(0, '#7a9a33');
    bodyGrad.addColorStop(0.7, '#5a7a23');
    bodyGrad.addColorStop(1, '#4a6a13');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(bcx, bcy, bw*0.45, bh*0.4, 0, 0, Math.PI*2);
    ctx.fill();

    // Face
    const faceY = bcy - bh*0.1;
    // Eyes
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(bcx - bw*0.15, faceY - bh*0.05, bw*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bcx + bw*0.15, faceY - bh*0.05, bw*0.08, 0, Math.PI*2); ctx.fill();
    // Pupils
    ctx.fillStyle = '#220000';
    ctx.beginPath(); ctx.arc(bcx - bw*0.15, faceY - bh*0.05, bw*0.04, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bcx + bw*0.15, faceY - bh*0.05, bw*0.04, 0, Math.PI*2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#3a4a13';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bcx, faceY + bh*0.1, bw*0.15, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Time freeze overlay effect
  const timeFreezeActive = now < activeEffects.timeFreeze;
  if(timeFreezeActive){
    ctx.fillStyle = 'rgba(136, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // HUD: score, level, high score, timer
  ctx.fillStyle = '#fff'; ctx.font = `${Math.max(12, tileSize-2)}px serif`;
  ctx.fillText('SCORE: ' + score, 8, 20);
  ctx.fillText('HIGH: ' + highScore, canvasW - 140, 20);
  ctx.fillText('LEVEL: ' + level, 8, 40);
  // time bar / torches textual (accounting for frozen time and upgrades)
  const elapsedLevelHud = Math.floor((now - levelStart - frozenTimeAccumulated)/1000);
  const timeLeft = Math.max(0, Math.floor(getLevelTime()) - elapsedLevelHud);
  ctx.fillStyle = timeFreezeActive ? '#88ffff' : '#fff';
  ctx.fillText('TIME: ' + timeLeft + (timeFreezeActive ? ' ❄️' : ''), canvasW - 140, 40);
  ctx.fillStyle = '#fff';
  ctx.fillText('FRUITS: ' + fruitsCollected + '/' + fruitsNeeded, 8, 60);

  // Powerup inventory UI at bottom
  const invY = canvasH - tileSize * 1.8;
  const invStartX = canvasW / 2 - (4 * tileSize * 1.5) / 2;
  ctx.font = `${Math.max(10, tileSize * 0.5)}px serif`;
  for(let i = 0; i < 4; i++){
    const slotX = invStartX + i * tileSize * 1.5;
    const ptype = POWERUP_TYPES[i];
    const hasPowerup = inventory[i] !== null;

    // slot background
    ctx.fillStyle = hasPowerup ? ptype.color + '44' : '#333';
    ctx.fillRect(slotX, invY, tileSize * 1.2, tileSize * 1.2);
    ctx.strokeStyle = hasPowerup ? ptype.color : '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(slotX, invY, tileSize * 1.2, tileSize * 1.2);

    // key number
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(i === 2 ? 'auto' : (i + 1).toString(), slotX + 2, invY + tileSize * 0.4);

    // icon if has powerup
    if(hasPowerup){
      ctx.font = `${Math.floor(tileSize * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ptype.icon, slotX + tileSize * 0.6, invY + tileSize * 0.85);
    }
    ctx.font = `${Math.max(10, tileSize * 0.5)}px serif`;
  }
  ctx.textAlign = 'left';

  // Active effect indicators
  if(shieldActive){
    const remaining = Math.ceil((activeEffects.shield - now) / 1000);
    ctx.fillStyle = '#4488ff';
    ctx.fillText('SHIELD: ' + remaining + 's', canvasW / 2 - 40, 20);
  }
  if(timeFreezeActive){
    const remaining = Math.ceil((activeEffects.timeFreeze - now) / 1000);
    ctx.fillStyle = '#88ffff';
    ctx.fillText('FROZEN: ' + remaining + 's', canvasW / 2 - 40, 40);
  }
}

function drawRect(x,y,color){ ctx.fillStyle = color; ctx.fillRect(x*tileSize + 1, y*tileSize + 1, tileSize-2, tileSize-2); }

// game initialization
resetSnake();
lastMove = performance.now();
requestAnimationFrame(update);

// Spawn initial fruits for title preview
for(let i=0;i<3;i++) spawnFruit();

// Upgrade Shop System
function updateCoinDisplay(){
  const coinEl = document.getElementById('coin-display');
  if(coinEl) coinEl.textContent = '🪙 ' + coins;
  updateUpgradeButtons();
}

function updateUpgradeButtons(){
  for(let key in UPGRADES){
    const btn = document.getElementById('upgrade-' + key);
    if(!btn) continue;
    const upg = UPGRADES[key];
    const lvl = upgradeLevels[key];
    const cost = upg.cost * (lvl + 1);
    const maxed = lvl >= upg.max;

    if(maxed){
      btn.textContent = upg.name + ' (MAX)';
      btn.disabled = true;
      btn.classList.add('maxed');
    } else {
      btn.textContent = upg.name + ' Lv' + lvl + ' → ' + (lvl+1) + ' (🪙' + cost + ')';
      btn.disabled = coins < cost;
      btn.classList.remove('maxed');
    }
  }
}

function buyUpgrade(key){
  const upg = UPGRADES[key];
  const lvl = upgradeLevels[key];
  const cost = upg.cost * (lvl + 1);

  if(lvl >= upg.max || coins < cost) return;

  coins -= cost;
  upgradeLevels[key]++;
  saveUpgrades();
  updateCoinDisplay();
}

// Initialize upgrade buttons
document.addEventListener('DOMContentLoaded', ()=>{
  updateCoinDisplay();

  // Attach click handlers
  for(let key in UPGRADES){
    const btn = document.getElementById('upgrade-' + key);
    if(btn) btn.addEventListener('click', ()=> buyUpgrade(key));
  }
});

// Initial display update
setTimeout(updateCoinDisplay, 100);

// expose some debug
window._gs = {startLevel, coins: ()=>coins, upgrades: ()=>upgradeLevels};
