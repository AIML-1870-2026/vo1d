# Turing Patterns Explorer — Specification

## Overview

A self-contained, single-file HTML web application that lets users interactively explore reaction-diffusion systems (Turing patterns). The app runs a GPU-accelerated simulation in real time, offers multiple mathematical models, rich interaction tools, and a polished UI suitable for both casual exploration and educational use.

**Deliverable:** One `index.html` file with all CSS, JavaScript, and GLSL shaders inlined. No build step, no external dependencies except optional CDN imports for icons/fonts.

---

## 1. Simulation Engine

### 1.1 Rendering & Compute

- Use **WebGL 2** (with WebGL 1 fallback) for all simulation computation and rendering.
- The simulation runs as a ping-pong framebuffer technique: two framebuffers alternate as source/destination each step, with a fragment shader performing the reaction-diffusion update.
- A separate rendering pass maps chemical concentrations to colors using the selected color map.
- Target a **default grid resolution of 512×512**. Provide a resolution selector (256, 512, 1024) so users can trade quality for performance.
- Run a configurable number of **simulation steps per animation frame** (default: 8, range: 1–32) to allow speed control without changing dt.

### 1.2 Reaction-Diffusion Models

Implement the following models, selectable from a dropdown:

#### Gray-Scott

The default and most feature-rich model.

```
∂u/∂t = Du * ∇²u - u*v² + f*(1 - u)
∂v/∂t = Dv * ∇²v + u*v² - (f + k)*v
```

- **Parameters:** Feed rate `f` (0.0–0.1), Kill rate `k` (0.0–0.1), Diffusion `Du` (0.0–1.0, default 0.21), Diffusion `Dv` (0.0–1.0, default 0.105)
- **Presets (named, with f, k pairs):**
  - Mitosis (f=0.0367, k=0.0649)
  - Coral (f=0.0545, k=0.062)
  - Maze (f=0.029, k=0.057)
  - Spots (f=0.035, k=0.065)
  - Worms / Solitons (f=0.031, k=0.063)
  - Spirals (f=0.014, k=0.045)
  - Pulsating (f=0.025, k=0.06)
  - U-Skate World (f=0.062, k=0.0609)

#### FitzHugh-Nagumo

A simplified model of excitable media (nerve impulse propagation).

```
∂u/∂t = Du * ∇²u + u - u³ - v + a
∂v/∂t = Dv * ∇²v + ε * (u - v)
```

- **Parameters:** `a` (-0.5–0.5), `ε` (epsilon, 0.001–0.1), `Du`, `Dv`
- **Presets:** Traveling Waves, Spiral Waves, Labyrinth

#### Brusselator

A theoretical model from chemical kinetics.

```
∂u/∂t = Du * ∇²u + A - (B + 1)*u + u²*v
∂v/∂t = Dv * ∇²v + B*u - u²*v
```

- **Parameters:** `A` (0.0–5.0), `B` (0.0–10.0), `Du`, `Dv`
- **Presets:** Turing Spots, Turing Stripes, Honeycomb

#### Schnakenberg

A minimal activator-inhibitor model.

```
∂u/∂t = Du * ∇²u + a - u + u²*v
∂v/∂t = Dv * ∇²v + b - u²*v
```

- **Parameters:** `a` (0.0–1.0), `b` (0.0–2.0), `Du`, `Dv`
- **Presets:** Spots, Stripes, Mixed

### 1.3 Boundary Conditions

- **Periodic (wrap-around)** — default
- **Neumann (zero-flux)** — no gradient at edges

Selectable via a toggle in the sidebar.

### 1.4 Initial Conditions

- **Default:** Uniform steady state with a small square or circular seed of chemical V in the center.
- **Random noise:** Option to initialize with random perturbations across the grid.
- **Clear:** Reset to uniform steady state (no seed).

---

## 2. User Interaction & Brush Tools

### 2.1 Brush System

Users can click and drag on the canvas to interact with the simulation:

| Tool | Behavior |
|------|----------|
| **Add Seed (V)** | Paints chemical V onto the grid (default brush) |
| **Remove (Erase)** | Resets the painted area to steady state |
| **Repel** | Sets local region to high U, low V (clears pattern) |

### 2.2 Brush Settings

- **Brush size:** Slider, range 1–50 pixels (default 10)
- **Brush shape:** Circle (default), Square
- **Brush softness:** Hard edge vs. Gaussian falloff (toggle or slider)

### 2.3 Canvas Interaction

- Brush preview: Show a faint circle/square cursor overlay on hover.
- Painting works while simulation is running or paused.
- On touch devices, support single-finger paint and two-finger pan if the canvas is larger than the viewport.

---

## 3. Parameter Space Explorer

### 3.1 Behavior

- Accessed via a prominent **"Parameter Map"** button in the sidebar or toolbar.
- Opens as a **collapsible overlay panel** (modal or slide-in panel) that covers most of the screen.
- Dismissable via a close button or clicking outside.

### 3.2 Content (Gray-Scott specific)

- A **2D heatmap/scatter plot** with Feed rate (f) on the X-axis and Kill rate (k) on the Y-axis.
- The map is pre-rendered or drawn on a canvas showing regions of known pattern types, color-coded by classification (based on Pearson's taxonomy or similar).
- Each named preset is marked on the map with a labeled dot.
- **Clicking anywhere on the map** sets f and k to the clicked coordinates and closes the panel (or updates live if the user toggles "live preview").
- A **crosshair or highlight** shows the current (f, k) position.
- For non-Gray-Scott models, show a simplified version or a message that the map is model-specific, with the option to still explore the 2D space of the two primary parameters.

---

## 4. Visualization & Color Maps

### 4.1 Color Mapping

Render the V concentration (or a configurable blend of U and V) through a color map. Provide at least these built-in palettes:

- Grayscale
- Inferno (perceptually uniform, warm)
- Viridis (perceptually uniform, cool)
- Magma
- Plasma
- Ocean (blue-white)
- Neon (black-cyan-magenta-white)
- Custom two-color gradient (user picks two colors via color pickers)

The color map is applied in the rendering fragment shader as a 1D texture lookup or direct computation.

### 4.2 Display Options

- **Invert** toggle: flip the color map direction.
- **Brightness / Contrast** sliders for fine-tuning visibility.

---

## 5. High-Resolution Image Export

### 5.1 Feature

A **"Download Image"** button in the sidebar/toolbar.

### 5.2 Behavior

1. When clicked, open a small dialog or popover letting the user choose export resolution:
   - Current resolution (e.g., 512×512)
   - 2× (1024×1024)
   - 4× (2048×2048)
   - Custom (width × height input)
2. For resolutions larger than the current simulation grid:
   - **Option A (simpler):** Upscale the current state using bicubic/bilinear interpolation on the GPU, then render with the current color map to an offscreen canvas and export.
   - **Option B (higher quality, stretch goal):** Copy the simulation state to a higher-resolution grid, run a few extra simulation steps to refine detail, then export.
3. Export as **PNG** via `canvas.toBlob()` → `URL.createObjectURL()` → trigger download.
4. Filename format: `turing-{model}-{preset}-{timestamp}.png`

---

## 6. UI Layout & Design

### 6.1 Overall Structure

```
┌─────────────────────────────────────────────────┐
│  Top Bar: Title, Info button, Parameter Map btn  │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │         Main Canvas                  │
│ (280px)  │     (fills remaining space)          │
│          │                                      │
│ Controls │                                      │
│ Sliders  │                                      │
│ Presets  │                                      │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│  Bottom Bar: Play/Pause, Step, Reset, FPS       │
└─────────────────────────────────────────────────┘
```

### 6.2 Sidebar (Left, Collapsible)

Organized into collapsible sections:

1. **Model Selection** — Dropdown (Gray-Scott, FitzHugh-Nagumo, Brusselator, Schnakenberg)
2. **Presets** — Grid of clickable preset cards/buttons (model-specific). Each shows name and a tiny thumbnail if feasible.
3. **Parameters** — Sliders for the current model's parameters. Labels show name and current numeric value. Sliders update simulation in real time.
4. **Simulation Settings** — Resolution selector, Steps/frame slider, Boundary condition toggle, dt slider
5. **Brush Tools** — Tool selector (Add/Erase/Repel), Brush size slider, Brush shape toggle
6. **Visualization** — Color map selector (dropdown or visual swatches), Invert toggle, Brightness/Contrast sliders
7. **Export** — "Download Image" button (opens resolution dialog)

On mobile (viewport < 768px), the sidebar becomes a bottom sheet / drawer that slides up.

### 6.3 Bottom Control Bar

- **Play / Pause** button (toggle, prominent)
- **Step** button (advance one frame while paused)
- **Reset** button (reinitialize grid)
- **Randomize** button (fill grid with noise)
- **FPS counter** (small, right-aligned)
- **Iteration counter** (total steps elapsed)

### 6.4 Top Bar

- App title: **"Turing Patterns Explorer"**
- **"Parameter Map"** button (opens the parameter space overlay)
- **"?"** Info/Help button — opens a modal with brief explanation of reaction-diffusion systems, controls overview, and credits

### 6.5 Visual Design

- Dark theme (dark gray background, light text) — patterns look best on dark backgrounds.
- Smooth, modern aesthetic. Subtle rounded corners, soft shadows.
- Use system fonts or a single Google Font (e.g., Inter) loaded from CDN.
- Accent color for interactive elements (e.g., a teal or cyan).
- Slider styling: custom-styled range inputs matching the theme.
- Transitions: Sidebar collapse, modal open/close should be animated (CSS transitions, ~200ms).

---

## 7. Performance Requirements

- Target **60 FPS** on modern desktop with integrated GPU at 512×512 resolution with 8 steps/frame.
- Degrade gracefully: if frame time exceeds 32ms, automatically reduce steps/frame or show a performance warning.
- All simulation work happens on the GPU; the CPU only handles UI events and WebGL state management.
- Minimize garbage collection: avoid allocations in the render loop.

---

## 8. Technical Implementation Notes

### 8.1 WebGL Architecture

- **Two RGBA float textures** (or half-float if float not available) for ping-pong simulation state. Channel R = U, Channel G = V. Channels B, A available for future use.
- **Simulation shader:** Reads from source texture, computes Laplacian via 5-point stencil (or 9-point for better isotropy), applies reaction-diffusion equations, writes to destination texture.
- **Render shader:** Reads V (or U) from current simulation texture, applies color map, outputs to screen.
- **Brush shader (or blend):** When the user paints, render a quad to the simulation texture at the brush location to modify U/V values.
- Use `OES_texture_float` / `EXT_color_buffer_float` extensions. Fall back to `OES_texture_half_float` if needed.

### 8.2 Initialization

- Create simulation textures filled with steady-state values for the selected model.
- Seed: render a small filled circle of chemical V in the center.

### 8.3 State Management

- All UI state (current model, parameters, brush settings, color map) stored in a single JavaScript state object.
- Slider changes update state immediately; the render loop reads from this state each frame.
- Model/preset changes trigger a full re-initialization of the simulation textures.

---

## 9. File Structure (Single File)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Turing Patterns Explorer</title>
  <style>
    /* All CSS here (~300-500 lines) */
  </style>
</head>
<body>
  <!-- HTML structure: top bar, sidebar, canvas container, bottom bar, modals -->

  <!-- Vertex shader (shared) -->
  <script id="vs-quad" type="x-shader/x-vertex">...</script>

  <!-- Simulation fragment shaders (one per model) -->
  <script id="fs-gray-scott" type="x-shader/x-fragment">...</script>
  <script id="fs-fitzhugh-nagumo" type="x-shader/x-fragment">...</script>
  <script id="fs-brusselator" type="x-shader/x-fragment">...</script>
  <script id="fs-schnakenberg" type="x-shader/x-fragment">...</script>

  <!-- Render fragment shader -->
  <script id="fs-render" type="x-shader/x-fragment">...</script>

  <!-- Brush fragment shader -->
  <script id="fs-brush" type="x-shader/x-fragment">...</script>

  <script>
    /* All JavaScript here (~800-1200 lines) */
    /* - WebGL setup & shader compilation */
    /* - Simulation loop */
    /* - UI event handlers */
    /* - State management */
    /* - Export functionality */
    /* - Parameter space map rendering */
  </script>
</body>
</html>
```

---

## 10. Acceptance Criteria

1. **Simulation runs** in real time at 60 FPS on a modern laptop (512×512, 8 steps/frame).
2. **All four models** are selectable and produce visually distinct, correct patterns.
3. **Presets** load correct parameters and produce the described pattern type within ~10 seconds of simulation.
4. **Brush tools** allow painting seeds, erasing, and repelling in real time (while running or paused).
5. **Parameter sliders** update the simulation in real time without resetting the grid.
6. **Parameter space map** opens/closes smoothly, displays the f/k space for Gray-Scott, and clicking sets parameters.
7. **Color maps** switch instantly and all listed palettes are implemented.
8. **Image export** produces a correctly colored PNG at the selected resolution.
9. **Sidebar collapses** on desktop and converts to a bottom drawer on mobile.
10. **No external dependencies** required at runtime (Google Fonts CDN is acceptable but optional).
11. **File is a single, self-contained HTML file** under 200KB uncompressed.
