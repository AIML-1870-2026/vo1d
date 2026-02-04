# Particle Playground — Specification

## Summary

Interactive particle playground using an HTML canvas. Users control particle count, speed, size, line thickness, connection radius, colors, and toggles for rainbow particles, motion trails, and a network statistics panel.

## Files

- index.html — UI markup and control elements
- script.js — canvas rendering, particle system, controls binding
- style.css — layout and visual styling

## Key DOM elements

- Canvas: `#canvas`
- Controls container: `aside.controls` (aria-label="Particle controls")
- Open controls button: `#openControlsButton` (aria-label)
- Network stats panel: `#networkStatsPanel` (aria-live="polite")

## Controls (IDs, types, defaults)

- `#countRange` (range) — particles: min 10, max 1000, default 100 — display `#countValue`
- `#speedRange` (range) — speed: 0.1–3, step 0.05, default 1 — display `#speedValue`
- `#sizeRange` (range) — particle size: 0.5–8, step 0.1, default 3 — display `#sizeValue`
- `#thicknessRange` (range) — line width: 0.2–6, step 0.1, default 2.5 — display `#thicknessValue`
- `#connectRange` (range) — connect radius: 10–500, default 250 — display `#connectValue`
- `#colorPicker` (color) — particle color default `#9B00FF`
- `#backgroundPicker` (color) — background default `#071029`
- `#rainbowToggle` (checkbox) — rainbow particles
- `#trailToggle` (checkbox) — motion trail (default: checked)
- `#networkStatsToggle` (checkbox) — show/hide `#networkStatsPanel`

## Network Statistics (panel fields)

- Nodes: `#nodesValue`
- Edges: `#edgesValue`
- Avg connections: `#avgConnValue`
- Density: `#densityValue`

## Expected Behavior

- Particles move on the canvas with speeds scaled by `#speedRange`.
- Particles render as circles sized by `#sizeRange`.
- Lines are drawn between particle pairs inside `#connectRange` with width from `#thicknessRange`.
- Color behavior: if `#rainbowToggle` is enabled, particle colors cycle/hue-shift; otherwise use `#colorPicker` for particles/lines. Background cleared/filled with `#backgroundPicker` unless motion trail is enabled, in which case a translucent fill creates trailing.
- `#networkStatsPanel` shows computed values updated each frame or at a throttled interval; panel `hidden` attribute toggled by `#networkStatsToggle`.

## Accessibility

- Controls grouped in an `aside` with `aria-label` for screen readers.
- Network stats uses `aria-live="polite"` so updates are announced when visible.
- Buttons and inputs have labels; `#openControlsButton` includes an `aria-label`.

## Performance Notes

- Naive pairwise connection computation is O(n²); for large particle counts (>300–500) consider spatial partitioning (grid or quadtree) to reduce work.
- Use devicePixelRatio scaling for crisp rendering on high-DPI displays.
- Throttle expensive DOM updates (e.g., stats) to reduce main-thread load.

## Developer Notes / Implementation Hints

- Initialize canvas size on load and on `resize` events; scale drawing by `devicePixelRatio`.
- Main loop should use `requestAnimationFrame` and separate update + render steps.
- Particle properties: position, velocity, size, color/hue.
- Connection logic: compute distance² vs radius² for speed; draw lines with alpha based on distance.
- Trail effect: draw a semi-transparent rect each frame instead of full clear.
- Toggle handling: bind control input events to update state and reflect current values in the UI (e.g., update `#countValue`).

## Extensibility / Future Ideas

- Add presets (night, neon, minimal) and save/load of settings.
- Add physics forces: gravity, attraction/repulsion, mouse interaction emitters.
- Export current canvas to PNG, or record short GIF/video.
- Performance mode: cap connections or reduce framerate on lower-end devices.

## Usage

Open `index.html` in a browser. Use the top-left controls to modify particle system parameters in real time. Toggle the network stats to view computed metrics.
