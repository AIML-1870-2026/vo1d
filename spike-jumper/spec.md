# PULSE RUNNER — Game Specification

> A rhythm-driven spike-jumper platformer with parallax scrolling, procedural terrain, and beat-synced obstacles.

---

## 1. Overview

**Pulse Runner** is a single-button, auto-scrolling platformer where the player navigates a geometric avatar through increasingly hostile terrain. The world scrolls left-to-right at a constant (and gradually accelerating) pace. The player's only input is **jump** — but the timing, duration, and rhythm of jumps determine survival.

The game features a **multi-layer parallax background** system that creates depth and atmosphere, **beat-reactive visuals** that pulse with gameplay intensity, and a **procedural obstacle pipeline** that generates fair-but-punishing sequences.

---

## 2. Core Mechanics

### 2.1 Player Avatar

- **Shape**: A rotating square (45° tilt on jump, snaps back on land). Customizable skins: triangle, pentagon, diamond, circle.
- **Size**: 32×32 px at 1x scale.
- **Physics**:
  - Gravity: `0.6 px/frame²` (tunable)
  - Jump impulse: `-10 px/frame` (tunable)
  - Terminal velocity: `12 px/frame`
  - **No air control** — horizontal position is fixed relative to the screen (≈20% from left edge).
- **States**: `running`, `jumping`, `falling`, `dead`, `orb-boosted`
- **Death**: Instant on collision with any hazard. Avatar shatters into 8–12 triangular particles that inherit velocity + random spread. Screen flashes white for 1 frame, then fades to a desaturated freeze-frame over 400ms.

### 2.2 Jump Mechanics

| Input | Behavior |
|---|---|
| Tap / Click / Spacebar | Single jump (fixed impulse) |
| Hold (on jump pad) | Charged jump — 1.5× height if held >150ms on a launch pad |
| Tap while on orb | Mid-air direction change (see §2.5) |

- **Coyote time**: 4 frames after leaving a platform edge, a jump is still valid.
- **Input buffer**: If jump is pressed within 6 frames before landing, it fires immediately on contact.

### 2.3 Ground & Platforms

- The ground is a continuous strip of **tiled blocks** (32×32 px each).
- Ground can have **gaps** (1–6 blocks wide), **pillars** (1–4 blocks tall), and **slopes** (NYI for v1 — flat only).
- **Moving platforms**: Horizontal or vertical oscillation, period 1–3 seconds. Indicated by a pulsing glow outline.
- **Crumbling platforms**: Begin shaking on contact, collapse after 500ms. Particles fall downward.

### 2.4 Hazards

| Hazard | Description | Hitbox |
|---|---|---|
| **Spike (▲)** | Static triangle on ground or ceiling. The signature obstacle. | Triangle inscribed in 32×32 box, shrunk 4px per side for fairness |
| **Spike Wall** | Vertical column of spikes on a wall face | Same per-spike hitbox |
| **Saw Blade** | Circular spinning hazard, can be static or on a rail | Circle, radius 20px, spinning visually at 360°/s |
| **Laser Gate** | Horizontal or vertical beam that toggles on/off on a timer | 4px-wide rect when active; telegraph 300ms before activation with a flicker |
| **Crusher** | Block that slams down from ceiling periodically | 64×64 rect; telegraphs with 2-frame shake before drop |
| **Gravity Inverter** | Portal that flips gravity (player runs on ceiling) | 32×64 rect; visual: shimmering vertical ribbon |

### 2.5 Interactables

| Object | Behavior |
|---|---|
| **Launch Pad (▲ yellow)** | Applies upward impulse of `-14 px/frame`. Auto-triggers on contact. |
| **Boost Ring** | Mid-air collectible. On tap: grants a second jump in the direction the ring faces (up, diagonal, etc.). Glows and rotates. |
| **Gravity Orb** | Flips gravity on tap while overlapping. Purple with swirling particle trail. |
| **Speed Gate** | Increases scroll speed by 1.3× for 3 seconds. Visual: motion blur intensifies. |
| **Checkpoint Crystal** | Saves respawn position. Shatters and reforms with a prismatic flash on activation. |
| **Coin / Shard** | Collectible. 3 hidden per level segment. Used to unlock cosmetics. |

---

## 3. Scrolling & Camera

### 3.1 Auto-Scroll

- Base speed: `6 px/frame` at 60 FPS.
- Speed ramps linearly per level segment: `base × (1 + 0.05 × segmentIndex)`.
- Max speed cap: `12 px/frame`.

### 3.2 Camera

- Player X is **locked** at 20% of viewport width.
- Camera Y **follows** the player with a damped spring:
  - `cameraY += (targetY - cameraY) * 0.08`
- On death: camera freezes, slight zoom-in (scale 1.0 → 1.05 over 400ms).

---

## 4. Parallax Background System

The game uses a **5-layer parallax** system to create a sense of depth and atmosphere. Each layer scrolls at a different rate relative to the camera.

### 4.1 Layer Definitions

| Layer | Depth | Scroll Rate | Content | Opacity |
|---|---|---|---|---|
| **L0 — Sky** | Farthest | 0.02× | Gradient sky, slow-drifting color shifts | 1.0 |
| **L1 — Far Mountains** | Far | 0.08× | Jagged silhouette range, procedural peaks | 0.4 |
| **L2 — Near Mountains** | Mid-far | 0.2× | Larger silhouette, slightly more detail/texture | 0.6 |
| **L3 — City / Structures** | Mid | 0.45× | Abstract geometric structures, towers, arches | 0.8 |
| **L4 — Foreground Particles** | Nearest BG | 0.7× | Floating particles, dust, light streaks | 0.3 |
| **L5 — Ground & Gameplay** | Reference | 1.0× | Player, platforms, hazards, interactables | 1.0 |

### 4.2 Rendering

- Each BG layer is a **horizontally-tiling strip** rendered to an offscreen canvas or drawn procedurally.
- Layers L1–L3 are generated with a **1D Perlin noise heightmap** for silhouettes, rendered as filled polygons below the noise line.
- L4 particles are spawned at random Y positions and drift with slight sinusoidal wobble.
- **Color theming** is per-zone (see §6). All layers tint to match.

### 4.3 Parallax Math

```
layerOffsetX = cameraX * scrollRate
drawX = -(layerOffsetX % layerWidth)
```

Draw each layer strip twice side-by-side to cover the viewport seamlessly during scroll.

### 4.4 Atmospheric Effects

- **Gradient sky (L0)**: Top-to-bottom linear gradient. Colors shift over time with a `hueRotation` tied to distance traveled.
- **Stars / Particles (L0.5)**: In night-themed zones, tiny white dots at scroll rate 0.03× with random twinkle (opacity oscillation).
- **Fog overlay**: A semi-transparent gradient strip at the horizon line that blends L1/L2 into L0. Creates aerial perspective.
- **Screen-space glow**: Bright objects (launch pads, boost rings, lasers) emit a soft radial glow rendered as an additive-blend circle.

---

## 5. Visual Style

### 5.1 Aesthetic Direction

- **Neon-geometric minimalism**. Dark backgrounds (#0a0a1a base) with vivid, saturated accent colors.
- All game objects are **geometric primitives**: squares, triangles, circles, polygons. No bitmap sprites for gameplay elements.
- Hazards are tinted in **warning red/orange** (#ff3344, #ff8822).
- Interactables are tinted in **cool/warm highlights**: yellow (#ffdd33), cyan (#33eeff), purple (#bb44ff).
- The player avatar has a **bright white core** with a colored trail matching the selected theme.

### 5.2 Trail System

- The player emits a **trail** of fading afterimages (6–10 copies, 3 frames apart, opacity decays linearly).
- On jump: trail brightens momentarily.
- On death: trail particles scatter.
- Trail color is customizable (unlockable palette).

### 5.3 Particle Systems

| Event | Particles | Count | Lifetime | Behavior |
|---|---|---|---|---|
| Landing | Dust puffs | 4–6 | 300ms | Spread horizontally, fade out |
| Death | Avatar shards | 8–12 | 800ms | Explode outward, gravity-affected |
| Coin collect | Sparkles | 6–8 | 400ms | Spiral outward, shrink |
| Checkpoint | Prismatic flash | 12–16 | 600ms | Radial burst, rainbow hue shift |
| Launch pad | Flame wisps | 4–6 | 500ms | Rise upward, wobble, fade |

### 5.4 Screen Effects

- **Screen shake**: On death (amplitude 6px, decay 300ms), on crusher slam (amplitude 3px, decay 150ms).
- **Chromatic aberration**: Subtle (1–2px RGB split) during speed gates. Intensifies with speed.
- **Vignette**: Constant light vignette (0.15 opacity). Intensifies to 0.4 during danger zones.
- **Flash**: White overlay, 1 frame, opacity 0.6 on death. Colored flash on checkpoint/collect.

---

## 6. Zone Theming

Each level is divided into **zones** (~15–30 seconds of gameplay each). Zones define the palette and background content.

| Zone | Sky Gradient | Accent | BG Structures | Mood |
|---|---|---|---|---|
| **Ember Fields** | Deep navy → burnt orange | #ff5533 | Jagged volcanic ridges | Aggressive |
| **Neon Drift** | Dark indigo → electric blue | #33eeff | Floating circuit-like grids | Futuristic |
| **Void Pulse** | Pure black → deep purple | #bb44ff | Abstract fractal spires | Ominous |
| **Solar Crest** | Dark gold → white | #ffdd33 | Towering crystalline arches | Triumphant |
| **Glacier Sync** | Steel blue → white | #88ccff | Smooth frozen plateaus | Serene |
| **Crimson Gauntlet** | Black → blood red | #ff1133 | Dense spike forests, chains | Brutal |

Zone transitions are **crossfaded** over 2 seconds: all parallax layers interpolate their colors simultaneously.

---

## 7. Level Structure

### 7.1 Segment-Based Design

Levels are composed of **segments** — hand-designed or procedurally generated chunks of terrain, each 640–1280px wide.

- **Segment difficulty tags**: `easy`, `medium`, `hard`, `insane`
- **Segment pools**: The level generator draws from pools matching the current difficulty curve.
- **Transition segments**: Short, low-difficulty bridges between zones.

### 7.2 Difficulty Curve

```
difficulty(t) = min(1.0, 0.1 + 0.9 * (t / totalDuration)^1.4)
```

Where `t` is elapsed time. The exponent creates a gentle start that ramps sharply in the back half.

### 7.3 Procedural Generation Rules

1. **No blind jumps**: Every gap must be survivable with a visible landing zone at least 3 frames before the player reaches the gap.
2. **Hazard telegraphing**: Spikes on the ceiling must appear ≥64px before the player passes under them at current speed.
3. **Breathing room**: After every `hard` or `insane` segment, insert at least one `easy` transition segment.
4. **Rhythm grouping**: Obstacles tend to cluster in groups of 2–4 with consistent spacing, creating a rhythmic "tap-tap-tap-pause" feel.
5. **Fairness constraint**: No obstacle combination requires frame-perfect input unless difficulty ≥ 0.85.

---

## 8. Audio Design (Specification Only)

> Audio implementation is optional for v1. This section defines the spec for future integration.

### 8.1 Music

- Tempo-locked electronic tracks (128–174 BPM).
- Obstacle patterns ideally align to beat divisions (quarter notes, eighth notes).
- Music intensity layers in/out with difficulty (add bass at 0.3, add leads at 0.6, full mix at 0.8+).

### 8.2 SFX

| Event | Sound Character |
|---|---|
| Jump | Short sine blip, pitch up |
| Land | Soft thud, low-pass filtered |
| Death | Glassy shatter + bass hit |
| Coin | Bright chime, pitch varies by coin index |
| Checkpoint | Rising arpeggio, reverb tail |
| Launch pad | Whoosh + sub bass |
| Speed gate | Doppler-like sweep |

---

## 9. UI / HUD

### 9.1 In-Game HUD

- **Progress bar**: Thin line at top of screen. Fill = % of level completed. Checkpoint markers shown as diamonds on the bar.
- **Attempt counter**: Small, top-right. Shows current attempt #.
- **Coin counter**: Top-right, below attempts. Shows `collected / total` for current level.
- **No health bar** — death is instant and binary.

### 9.2 Menus

- **Title Screen**: Game logo (stylized geometric text), pulsing background with parallax active, "TAP TO START" prompt.
- **Level Select**: Horizontal scrolling list of level cards. Each shows: name, difficulty stars (1–5), best progress %, coin count.
- **Death Screen**: Overlay on freeze-frame. Shows progress %, attempt #, "TAP TO RETRY" prompt. No delay — instant retry.
- **Pause**: Dim overlay, resume / restart / quit options.

### 9.3 Transitions

- Level start: Camera zooms from 1.5× to 1.0× over 500ms while parallax layers slide into position.
- Level complete: Player avatar dissolves into a burst of particles, progress bar fills to 100% with a satisfying snap, zone colors shift to gold.

---

## 10. Technical Architecture

### 10.1 Rendering Pipeline

```
1. Clear canvas
2. Draw L0 (sky gradient)
3. Draw L1–L2 (mountain silhouettes) with parallax offset
4. Draw L3 (structures) with parallax offset
5. Draw L4 (ambient particles) with parallax offset
6. Draw L5 (ground tiles, hazards, interactables)
7. Draw player avatar + trail
8. Draw foreground particles (dust, sparks, death shards)
9. Apply post-processing (vignette, chromatic aberration, screen shake)
10. Draw HUD overlay
```

### 10.2 Game Loop

```
function gameLoop(timestamp) {
    const dt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Fixed timestep physics
    accumulator += dt;
    while (accumulator >= PHYSICS_STEP) {
        updatePhysics();
        accumulator -= PHYSICS_STEP;
    }

    // Interpolated render
    const alpha = accumulator / PHYSICS_STEP;
    render(alpha);

    requestAnimationFrame(gameLoop);
}
```

- **Physics step**: 1/60s (16.67ms) fixed.
- **Render**: Interpolated between physics states for smooth display on any refresh rate.

### 10.3 Collision Detection

- All hitboxes are **axis-aligned bounding boxes (AABB)** with a few exceptions:
  - Spike triangles use **triangle-point** intersection test (shrunk by 4px per side for forgiving feel).
  - Saw blades use **circle-AABB** intersection.
- Collision is checked **after** physics update, **before** render.
- On collision with hazard → immediate death state.
- On collision with interactable → trigger effect, mark as consumed for this attempt.

### 10.4 Object Pooling

- Particles, trail images, and terrain tiles use **object pools** to avoid GC pressure.
- Pool sizes: particles (200), trail copies (30), terrain tiles (80).

### 10.5 State Machine

```
MENU → PLAYING → DEAD → PLAYING (retry)
                → COMPLETE → MENU
PLAYING → PAUSED → PLAYING
```

---

## 11. Controls

| Platform | Jump | Pause | Retry (on death) |
|---|---|---|---|
| Desktop | Spacebar, Up Arrow, Left Click | Escape, P | Spacebar, Click |
| Mobile | Tap anywhere | Tap pause icon | Tap anywhere |
| Gamepad | A / Cross button | Start | A / Cross |

---

## 12. Cosmetics & Progression

### 12.1 Unlockables

- **Avatar shapes**: Square (default), triangle, diamond, pentagon, circle, hexagon, star.
- **Trail colors**: 12 palettes, unlocked by collecting coins.
- **Death effects**: Shatter (default), dissolve, pixelate, implode.
- **Trail styles**: Afterimage (default), ribbon, dotted, flame.

### 12.2 Progression

- Completing a level unlocks the next.
- Coins unlock cosmetics from a linear track.
- Each level tracks: best progress %, total attempts, coins found, completion status.

---

## 13. Performance Targets

| Metric | Target |
|---|---|
| Frame rate | 60 FPS constant (drop to 30 FPS on low-end with reduced particles) |
| Input latency | ≤ 1 frame (16.67ms) |
| Memory | < 64MB total |
| Load time | < 2s for any level |
| Canvas resolution | Native device resolution, max 1920×1080 |

---

## 14. Implementation Priorities (v1)

1. **Core loop**: Player, ground, spikes, jump, death, retry.
2. **Parallax system**: 5-layer scrolling with procedural silhouettes.
3. **Hazard set**: Spikes, gaps, saw blades, launch pads.
4. **Visual polish**: Trail, particles, screen shake, vignette.
5. **Zone theming**: At least 3 zones with distinct palettes.
6. **HUD & menus**: Progress bar, death screen, title screen.
7. **Level design**: 3 hand-crafted levels of increasing difficulty.
8. **Cosmetics**: Basic avatar + trail customization.
9. **Audio hooks**: SFX triggers wired up (actual audio files TBD).
10. **Mobile support**: Touch input, responsive canvas scaling.