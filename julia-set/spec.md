# Julia Set Explorer — Specification

## Overview

A browser-based, interactive Julia Set explorer powered by WebGL fragment shaders. The app renders Julia sets in real time, allows smooth panning and zooming into the complex plane, and provides a curated gallery of preset Julia sets alongside multiple color palettes. The goal is a visually stunning, performant, single-page application.

---

## Architecture

### Tech Stack

- **Rendering**: WebGL 2.0 fragment shaders (fallback message if unsupported)
- **UI Framework**: Vanilla HTML/CSS/JS (no framework needed — keep it lean)
- **Bundling**: None required — single `index.html` with inlined or co-located `<script>` and `<style>` blocks, or a small number of files served statically
- **Hosting**: Static files only — no backend

### Rendering Pipeline

All fractal math runs on the GPU via a GLSL fragment shader:

1. A full-screen quad is drawn each frame.
2. The fragment shader receives uniforms for: `c` (vec2), viewport center, zoom level, max iterations, color palette ID, and canvas resolution.
3. Each pixel maps to a point `z₀` in the complex plane. The shader iterates `z = z² + c` and colors based on escape iteration count using smooth coloring (normalized iteration count to avoid banding).
4. On user interaction (pan/zoom/parameter change), re-render by updating uniforms — no data transfer needed, so it's effectively instant.

### Smooth Coloring

Use the normalized iteration count technique:
```
float smooth_iter = float(i) - log2(log2(dot(z, z))) + 4.0;
```
This eliminates the harsh color banding that integer iteration counts produce.

---

## Features

### 1. Real-Time Julia Set Rendering

- Render the Julia set for a given complex constant `c = a + bi`
- Default max iterations: 300 (adjustable 50–1000 via slider)
- Escape radius: 4.0 (squared, i.e. bail out when |z|² > 4)
- Initial view: centered at origin, zoom level showing roughly `[-2, 2]` on both axes

### 2. Navigation

- **Pan**: Click-and-drag on the canvas
- **Zoom**: Mouse scroll wheel, centered on cursor position
- **Pinch-to-zoom**: Touch support for mobile/tablet
- **Reset View**: Button to return to default center and zoom
- Smooth zoom animation is NOT required — direct/snappy response is fine and preferred for a tool like this

### 3. The `c` Parameter Control

- Two input methods, kept in sync:
  - **Sliders**: Real part (`a`) and imaginary part (`b`), range `[-2, 2]`, step `0.001`
  - **Text inputs**: Editable numeric fields next to each slider for precise entry
- Displayed as `c = a + bi` in a formatted readout
- Changes re-render in real time as sliders are dragged

### 4. Preset Gallery

A curated set of famous/beautiful Julia sets. Clicking a preset updates `c`, resets the view, and renders immediately.

Include at least these presets (with descriptive names):

| Name | c value | Notes |
|---|---|---|
| Dendrite | `0 + 1i` | Tree-like branching |
| Douady Rabbit | `-0.123 + 0.745i` | Three-lobed "rabbit" |
| San Marco | `-0.75 + 0i` | Cathedral-like basin |
| Siegel Disk | `-0.391 - 0.587i` | Swirling disk structure |
| Starfish | `-0.5 + 0.563i` | Starfish / spiral arms |
| Lightning | `-0.4 + 0.6i` | Electric / branching filaments |
| Galaxies | `0.285 + 0.01i` | Spiral galaxy shapes |
| Frost | `-0.7 + 0.27015i` | Classic, fern-like frost |
| Dragon | `-0.8 + 0.156i` | Dragon curve variant |
| Spiral | `0.355 + 0.355i` | Tight spirals |

Display presets as small thumbnail-sized preview cards (rendered live or as static previews via a tiny canvas). Presets should appear in a horizontally scrollable strip or a small grid within the sidebar.

### 5. Color Palettes

Implement at least 6 palettes. Each palette is a function in the shader that maps a normalized iteration float `[0, 1]` to an RGB color. Use `cos`-based palettes (Inigo Quilez style) for smooth, beautiful gradients:

```glsl
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}
```

Suggested palettes:

1. **Inferno** — black → red → orange → yellow → white
2. **Ocean** — deep blue → cyan → white
3. **Neon** — dark → magenta → cyan → green
4. **Twilight** — purple → pink → orange → gold
5. **Monochrome** — black → white (classic)
6. **Aurora** — teal → green → purple → pink

Palette selector: clickable swatches or small gradient preview strips. Active palette is visually highlighted.

### 6. Iteration Depth Control

- Slider: range 50–1000, default 300
- Label showing current value
- Higher values reveal more detail at deep zoom but may reduce FPS on weaker GPUs
- Consider showing a subtle FPS counter (toggleable or dev-only) so users know when they've pushed too far

### 7. Coordinates Display

- Show the complex coordinate under the mouse cursor in real time (e.g., `z = -0.42 + 0.31i`)
- Show current zoom level (e.g., `Zoom: 1.0x`)
- Position this info unobtrusively — bottom-left overlay or in the sidebar

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  [App Title / Logo]                    [? Help]     │
├──────────────────────────────┬──────────────────────┤
│                              │  CONTROLS PANEL      │
│                              │                      │
│                              │  ┌─ c Parameter ───┐ │
│                              │  │ Re: [---slider--]│ │
│                              │  │ Im: [---slider--]│ │
│                              │  │ c = -0.4 + 0.6i │ │
│                              │  └─────────────────┘ │
│       MAIN CANVAS            │                      │
│    (WebGL fractal view)      │  ┌─ Iterations ────┐ │
│                              │  │ [---slider--] 300│ │
│                              │  └─────────────────┘ │
│                              │                      │
│                              │  ┌─ Palettes ──────┐ │
│                              │  │ [==] [==] [==]   │ │
│                              │  │ [==] [==] [==]   │ │
│                              │  └─────────────────┘ │
│                              │                      │
│                              │  ┌─ Presets ────────┐ │
│                              │  │ [thumb] [thumb]  │ │
│                              │  │ [thumb] [thumb]  │ │
│                              │  │  ... scrollable  │ │
│                              │  └─────────────────┘ │
│                              │                      │
│  z = -0.42 + 0.31i          │  [Reset View]        │
│  Zoom: 4.2x                 │                      │
├──────────────────────────────┴──────────────────────┤
│  (optional footer / credit)                         │
└─────────────────────────────────────────────────────┘
```

### Layout Behavior

- **Desktop (≥ 1024px)**: Side-by-side — canvas fills left ~70–75%, controls panel on the right ~25–30%, scrollable if needed.
- **Tablet / Mobile (< 1024px)**: Canvas goes full-width at top. Controls collapse into a bottom sheet / drawer that can be pulled up, or a floating action button that opens a modal panel. Touch gestures (pan/pinch) on the canvas.

### Controls Panel Design

- Group controls into clearly labeled, collapsible sections: **Parameter**, **Rendering**, **Palette**, **Presets**
- Keep it compact — no wasted space
- The panel should be scrollable independently of the canvas

---

## Design Direction

Leave the specific aesthetic to the implementer's judgment, but here are guiding principles:

- **Dark theme strongly preferred** — fractal visuals pop against dark backgrounds
- **The fractal is the hero** — UI should recede; controls should feel like a professional tool panel (think Figma's sidebar or a photo editor)
- **Typography**: Use a clean, technical/geometric sans-serif. Monospace for numeric values (coordinates, c values)
- **Palette previews and preset thumbnails add visual richness** — lean into this; the sidebar should feel like a curated gallery
- **Micro-interactions**: Subtle hover effects on presets and palette swatches. Smooth slider interaction.
- **No gratuitous animation** — the fractal itself is the visual spectacle

---

## Interaction Details

### Pan
- `mousedown` → record start position
- `mousemove` while down → translate viewport center in complex-plane units (accounting for zoom)
- `mouseup` → stop panning
- Touch equivalent: single-finger drag

### Zoom
- `wheel` event → adjust zoom factor multiplicatively (e.g., `zoom *= 1.1` or `zoom /= 1.1`)
- Zoom toward cursor: adjust center so the point under the cursor stays fixed
- Touch equivalent: two-finger pinch

### Slider Dragging
- Use `input` event (not `change`) so the fractal updates live as the user drags

---

## Performance Considerations

- At 1080p, each frame computes 2M+ pixel iterations — this is well within WebGL's capability
- The shader does ALL the heavy lifting; JS only manages uniforms and UI state
- No `requestAnimationFrame` loop needed — re-render only on interaction (parameter change, pan, zoom, resize)
- Debounce `resize` events
- For preset thumbnails: render each into a small offscreen canvas (e.g., 80×80) using the same shader, or pre-render once on load

---

## File Structure

```
julia-explorer/
├── index.html          # Main HTML structure
├── style.css           # All styles
├── app.js              # UI logic, event handling, state management
├── renderer.js         # WebGL setup, shader compilation, render calls
├── shaders/
│   ├── vertex.glsl     # Simple passthrough vertex shader
│   └── fragment.glsl   # Julia set computation + coloring
└── presets.js          # Preset definitions and palette parameters
```

Alternatively, a single `index.html` with everything inlined is acceptable if the implementer prefers simplicity. The priority is that it works as a static site with no build step.

---

## Out of Scope (for now)

These are explicitly NOT part of v1 but could be added later:

- Mandelbrot mini-map as a `c` picker
- URL-based state sharing / deep linking
- Orbit trap rendering modes
- Video/GIF export of zoom animations
- Custom user-defined palettes
- Perturbation theory for ultra-deep zoom (>10^15)
- Multibrot / Burning Ship / other fractal variants

---

## Acceptance Criteria

1. Opens in Chrome/Firefox/Safari with no build step (just serve static files or open `index.html`)
2. Renders a Julia set immediately on load with a visually appealing default preset
3. Panning and zooming are smooth and responsive
4. Changing `c` via sliders updates the fractal in real time (no perceptible lag)
5. All 10+ presets render correctly and look distinct
6. All 6+ palettes produce visually distinct, attractive coloring
7. Works on mobile (touch pan/pinch zoom, controls accessible)
8. No console errors or WebGL warnings under normal use
