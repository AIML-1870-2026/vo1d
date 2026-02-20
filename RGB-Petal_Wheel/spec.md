# The Prismatic Engine — Specification Document

## Vision

**The Prismatic Engine** is an interactive single-page web application for exploring RGB color mixing, palette generation, contrast analysis, and color blindness simulation. It is themed as a **retro-futuristic light laboratory** — imagine a 1970s film set lighting rig crossed with a NASA mission control aesthetic. The entire experience takes place on a dark "stage floor" where physical-feeling spotlight projectors cast overlapping beams of colored light.

This is NOT a color picker with sliders. This is a **spatial, tactile, visual instrument** where users learn color theory by *playing with light*.

---

## Concept & Aesthetic Direction

### Theme: Industrial Light Laboratory

- **Tone**: Retro-futuristic. Think analog oscilloscopes, brushed metal, warm CRT phosphor glows, heavy bezels, engraved labels, and chunky toggle switches. The UI should feel like operating a physical machine — not clicking through a web app.
- **Dark environment**: The background is a deep near-black stage floor (not pure black — use `#08080f` with subtle noise texture). All color comes from the user's lights. The UI itself is muted and recessive so the colors are the hero.
- **Typography**: Use `"Familjen Grotesk"` for headings/labels (industrial, geometric) and `"JetBrains Mono"` for data readouts (monospaced, technical). Use `"Cormorant Garamond"` italic for decorative subtitles and poetic flourishes. Load all from Google Fonts.
- **Materials**: UI panels should feel like brushed dark metal — use very subtle linear gradients, 1px borders at ~6% white opacity, and `backdrop-filter: blur()` for depth. No bright white backgrounds anywhere. Panels are `rgba(12, 12, 28, 0.85)` with blur.
- **Motion**: Lights glow and pulse subtly. Beam edges are soft and diffused. UI elements have weighty, analog-feeling transitions (use `cubic-bezier(0.16, 1, 0.3, 1)` for most transitions, ~300-400ms). Nothing should feel snappy/digital — everything should feel like it has mass.
- **Sound metaphor (visual only)**: Treat color values like signal readings. Show hex codes in a monospaced "readout" style. Show RGB channels like VU meters or oscilloscope traces.

### What Makes This Unforgettable

The spotlight mixing canvas. Three large, draggable spotlight projectors sit on a dark stage. Each casts a wide, soft, radial beam of colored light downward onto the floor. Where two beams overlap, additive color mixing occurs in real-time with realistic light falloff (inverse-square-ish via radial gradients). Where all three overlap, you get white (or near-white). The user physically drags these lights around and watches colors emerge. It's the "three spotlights on a theater stage" demonstration that every physics teacher wishes they had.

---

## Technology

- **Single HTML file** with inlined CSS and JavaScript. No build step, no frameworks, no dependencies beyond Google Fonts and one CDN script (see below).
- **Canvas API** for the spotlight mixing stage (the main interactive area). Use 2D canvas with `globalCompositeOperation: 'lighter'` for true additive blending. This is critical — CSS/SVG cannot do proper additive light mixing.
- **DOM/CSS** for all UI panels, controls, and overlays.
- **No external libraries** except Google Fonts. All math, all interactions, all rendering is vanilla JS.
- The file will be large. That's fine. Prioritize a complete, polished experience over file size concerns.

---

## Layout (Desktop-First, Responsive Down)

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: Logo / Title       [Color Blindness ▾] [Help ?]     │
├────────────────────────────────────────┬─────────────────────┤
│                                        │                     │
│                                        │   RIGHT PANEL       │
│        MAIN CANVAS                     │                     │
│    (Spotlight Mixing Stage)            │   Tabbed Interface: │
│                                        │   [Lights] [Palette]│
│    Three draggable spotlights          │   [Contrast] [A11y] │
│    with additive blending              │                     │
│                                        │                     │
│                                        │                     │
├────────────────────────────────────────┴─────────────────────┤
│  FOOTER BAR: Mixed color readout at cursor position          │
└──────────────────────────────────────────────────────────────┘
```

- **Header**: Fixed top bar. Logo (animated conic-gradient circle), title "THE PRISMATIC ENGINE", subtitle "a light laboratory". Right side: color blindness simulation dropdown, help toggle.
- **Main Canvas**: Takes up all remaining space on the left (~70% width). This is the interactive spotlight stage rendered on a `<canvas>` element.
- **Right Panel**: Fixed 380px sidebar. Contains tabbed sections for all tools. Tabs styled as chunky hardware toggle buttons.
- **Footer Bar**: Thin strip at the bottom showing the real-time color value at the cursor's position on the canvas. Shows: hex, RGB, HSL, and a color swatch. This updates live as the mouse moves over the canvas.

### Responsive (< 900px width)

- Stack layout: Canvas on top (60vh), panel below (scrollable).
- Footer bar remains fixed at bottom.
- Spotlights should still be draggable via touch events.

---

## Feature 1: Spotlight Mixing Stage (Main Canvas)

### Core Mechanics

- **Three spotlights**, initially positioned in a triangle formation near the center of the canvas.
- Each spotlight is represented by:
  1. A **projector housing** icon/shape at its position (a small circle or hexagon, ~44px, with a metallic look — dark fill with a bright colored ring matching its light color).
  2. A **radial gradient beam** emanating from the projector, fading from full color at center to transparent at the edges. The beam radius should be ~30% of the smaller canvas dimension.
- **Default colors**: Spotlight 1 = Red (`#ff0000`), Spotlight 2 = Green (`#00ff00`), Spotlight 3 = Blue (`#0000ff`). Each is independently configurable.

### Rendering (Canvas 2D)

- Clear the canvas to the stage color (`#08080f`) each frame.
- For each spotlight, draw a radial gradient circle using `globalCompositeOperation: 'lighter'`. This is the key — `lighter` mode performs additive blending, which is how real light works:
  - Red + Green = Yellow
  - Red + Blue = Magenta
  - Green + Blue = Cyan
  - Red + Green + Blue = White
- The gradient for each spotlight should go from `rgba(R, G, B, 0.9)` at center to `rgba(R, G, B, 0)` at the edge, using a smooth falloff. Apply a non-linear falloff for realism — use multiple color stops:
  - 0%: full color, alpha 0.85
  - 20%: full color, alpha 0.7
  - 50%: full color, alpha 0.35
  - 75%: full color, alpha 0.12
  - 100%: full color, alpha 0.0
- After drawing all spotlights with `lighter` compositing, switch back to `source-over` and draw the projector housings on top.
- Add a very subtle noise texture overlay on the entire canvas (pre-generate a noise pattern on a small offscreen canvas and tile it with low opacity ~3-5%) to simulate film grain and prevent banding.

### Interaction

- **Drag spotlights**: Mousedown/touchstart on a projector housing initiates drag. Mousemove/touchmove updates position. Mouseup/touchend releases. Constrain to canvas bounds.
- **Hover on canvas**: Show a small crosshair cursor. The footer bar displays the pixel color at the cursor position (use `ctx.getImageData()` to sample the pixel).
- **Click on canvas** (not on a spotlight): Place a "sample pin" — a small marker that persists and shows its color value. Allow up to 10 pins. Each pin shows a tiny tooltip with hex value. Clicking a pin removes it.
- **Double-click a spotlight projector**: Opens a color picker popover to change that spotlight's color. Use a custom-built HSL wheel + brightness slider (not the native `<input type="color">`). The picker should match the laboratory aesthetic.

### Spotlight Color Picker Popover

When the user double-clicks a spotlight, show a popover anchored near the spotlight housing with:
- A circular **HSL color wheel** (render on a small canvas — hue around the circumference, saturation from center to edge, separate vertical brightness slider on the side).
- Draggable selector dot on the wheel.
- Brightness/Lightness slider to the right of the wheel.
- Hex input field (editable, validates and applies on Enter/blur).
- RGB sliders (three horizontal sliders with colored tracks for R, G, B).
- "Reset to default" button (returns the spotlight to its original R/G/B).
- Close button (X) or click-outside-to-close.

### Beam Style Variants

Provide a small toggle in the canvas top-left corner (styled as a hardware dial) to switch between beam styles:
1. **Soft Radial** (default): Smooth radial gradients as described above.
2. **Hard Cone**: Beams rendered as conic/triangular shapes with sharper edges (use polygon paths with a slight feathered edge). Simulates stage spotlights with barn doors.
3. **Particle Field**: Instead of smooth gradients, each spotlight emits a cloud of small glowing particles (render ~200-400 small circles per spotlight with randomized positions within the beam radius, each with additive blending). Particles should drift slowly with subtle animation (update positions slightly each frame for a living, breathing feel). This mode will be more CPU-intensive but looks stunning.

Use `requestAnimationFrame` for the render loop. In Soft Radial mode, only re-render when something changes (spotlight position/color) to save CPU. In Particle mode, render continuously.

---

## Feature 2: Palette Generator (Right Panel — "Palette" Tab)

### UI

- A **base color** selector at the top (small color swatch + hex input, clicking the swatch opens the same HSL picker as spotlights).
- A **harmony mode** selector — styled as a row of chunky toggle buttons (not a dropdown). Modes:
  - **Complementary** (2 colors)
  - **Analogous** (5 colors)
  - **Triadic** (3 colors)
  - **Split-Complementary** (3 colors)
  - **Tetradic / Rectangle** (4 colors)
  - **Square** (4 colors)
  - **Monochromatic** (5 shades/tints)
- A **visual harmony wheel**: A small (180px) HSL hue wheel rendered on a canvas, with dots marking the positions of each palette color. Lines connect them to show the geometric relationship. This updates live as the base color changes.
- The **generated palette** displayed as a horizontal row of large color swatches (each ~60px × 80px, rounded corners). Each swatch shows:
  - The color fill
  - Hex code below it in monospaced text
  - A small "copy" icon — clicking copies the hex to clipboard (show a brief "Copied!" toast)
  - The swatch border subtly glows with the color itself (`box-shadow: 0 0 12px <color>40`)

### Harmony Calculation (HSL Math)

Convert the base color to HSL. Generate harmony colors by rotating the hue:
- **Complementary**: base, base + 180°
- **Analogous**: base - 30°, base - 15°, base, base + 15°, base + 30°
- **Triadic**: base, base + 120°, base + 240°
- **Split-Complementary**: base, base + 150°, base + 210°
- **Tetradic**: base, base + 60°, base + 180°, base + 240°
- **Square**: base, base + 90°, base + 180°, base + 270°
- **Monochromatic**: Same hue, same saturation. Vary lightness: 15%, 30%, 50%, 70%, 85%.

All hue rotations wrap at 360°.

### "Send to Stage" Button

Below the palette, a button labeled "LOAD ONTO STAGE" that takes the first 3 colors of the current palette and applies them to the three spotlights. If the palette has fewer than 3 colors, only update that many spotlights.

---

## Feature 3: Contrast Analyzer (Right Panel — "Contrast" Tab)

### Contrast Ratio Calculator

- Two color inputs at the top: **"Foreground"** and **"Background"**. Each has a color swatch + hex input (clickable for the HSL picker). Default foreground: white (#ffffff), default background: the stage color (#08080f).
- Between them, a large **contrast ratio readout** styled like an analog meter:
  - Show the numeric ratio (e.g., "14.7:1") in a large monospaced font inside a rounded-rect "display" with a dark inset look.
  - Below the number, show WCAG compliance badges:
    - **AA Normal Text** (≥ 4.5:1): Green badge "AA ✓" or red "AA ✗"
    - **AA Large Text** (≥ 3:1): Same pattern
    - **AAA Normal Text** (≥ 7:1): Same pattern
    - **AAA Large Text** (≥ 4.5:1): Same pattern
  - Badges are small pill shapes. Green (`#2bff88`) = pass, Red (`#ff3b5c`) = fail.
- A **live preview** area below: A small card showing sample text rendered in the foreground color on the background color. Include both a large heading and a small paragraph of body text so the user can see the real-world impact.

### Contrast Ratio Formula

Implement the WCAG 2.1 relative luminance formula:

```
L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin

where R_lin = (R/255 <= 0.04045) ? R/255/12.92 : ((R/255 + 0.055)/1.055)^2.4
(same for G_lin, B_lin)

contrastRatio = (L_lighter + 0.05) / (L_darker + 0.05)
```

### Palette Contrast Checker

Below the pair-wise calculator, add a section: **"Check Palette Against Background"**.

- A **background color** input (swatch + hex, defaults to #08080f).
- A **target standard** toggle: "AA" or "AAA" (and "Normal Text" or "Large Text" sub-toggle).
- Displays every color from the currently generated palette (Feature 2) as a row. Each row shows:
  - The color swatch
  - The hex code
  - The contrast ratio against the chosen background
  - A pass/fail badge based on the selected target standard
  - If failing, a **"Suggest Fix"** button that adjusts the color's lightness (in HSL) up or down to find the nearest color with the same hue and saturation that meets the target ratio. Show the suggested color alongside the original so the user can compare. Clicking the suggested color replaces the original in the palette.

---

## Feature 4: Color Blindness Simulation (Header Dropdown + Canvas Filter)

### Toggle UI

In the header, a dropdown button labeled "Vision" with an eye icon (use a simple SVG eye). Clicking it reveals a dropdown menu with options:

- **Normal Vision** (default, no filter)
- **Protanopia** (no red cones — red-blind)
- **Deuteranopia** (no green cones — green-blind)
- **Tritanopia** (no blue cones — blue-blind)
- **Achromatopsia** (total color blindness — grayscale)

When a simulation is active:
1. The button text updates to show the active mode (e.g., "Vision: Protanopia").
2. A subtle banner appears below the header: "Viewing through [condition] simulation" with a brief, respectful, one-line description (e.g., "Reduced sensitivity to red light, affecting ~1% of males").
3. **The entire page** — canvas AND UI panels — is filtered through the simulation. This means the user sees the *entire experience* as a color-blind person would, not just the canvas. Apply the filter at the top level.

### Implementation: CSS `filter` with SVG `feColorMatrix`

The most accurate and performant way to simulate color blindness in the browser is with an inline SVG containing `<filter>` elements using `<feColorMatrix>`, then applying `filter: url(#filter-id)` to the root `<div>` wrapping everything.

Define these color matrices (these are well-established simulation matrices):

**Protanopia:**
```
0.567, 0.433, 0.000, 0, 0
0.558, 0.442, 0.000, 0, 0
0.000, 0.242, 0.758, 0, 0
0,     0,     0,     1, 0
```

**Deuteranopia:**
```
0.625, 0.375, 0.000, 0, 0
0.700, 0.300, 0.000, 0, 0
0.000, 0.300, 0.700, 0, 0
0,     0,     0,     1, 0
```

**Tritanopia:**
```
0.950, 0.050, 0.000, 0, 0
0.000, 0.433, 0.567, 0, 0
0.000, 0.475, 0.525, 0, 0
0,     0,     0,     1, 0
```

**Achromatopsia:**
```
0.299, 0.587, 0.114, 0, 0
0.299, 0.587, 0.114, 0, 0
0.299, 0.587, 0.114, 0, 0
0,     0,     0,     1, 0
```

Place an invisible SVG at the top of the document body containing these `<filter>` definitions. Toggle the active filter on the app container via `element.style.filter = 'url(#protanopia-filter)'` etc. Setting to empty string removes the filter.

### Color Blindness Info Panel

When a color blindness mode is active, the "Contrast" tab should also show what the contrast ratios would be *under that simulation*. To do this: when calculating contrast, first transform the foreground and background colors through the active color matrix, then calculate the contrast ratio of the transformed colors. Display both "True Contrast" and "Simulated Contrast" side by side.

---

## Feature 5: "Lights" Tab (Right Panel)

This tab provides direct control over each spotlight without needing to double-click on the canvas:

- **Three spotlight control cards** stacked vertically, one per spotlight. Each card has:
  - A header bar with the spotlight's color as background and a label ("Spotlight 1", "Spotlight 2", "Spotlight 3").
  - A color swatch (clickable → opens inline HSL picker or small popover).
  - Hex input field.
  - Three horizontal sliders for R, G, B (each slider track is colored: red track, green track, blue track). Sliders styled as chunky hardware faders.
  - A **beam radius** slider (controls how wide the beam spreads, range: 50px to 500px, default: ~30% of canvas smaller dimension).
  - A **beam intensity** slider (controls the alpha multiplier, range: 0.1 to 1.0, default: 0.85).
  - An **"On/Off" toggle switch** — styled as a physical toggle. Off = spotlight is hidden from the canvas.
- Below the three cards, a **"Reset All"** button that returns all spotlights to default R/G/B and default positions.

---

## Detailed Interaction Polish

### Cursor Behavior
- Over the canvas (not on a spotlight): Crosshair cursor.
- Over a spotlight housing: Grab cursor. While dragging: Grabbing cursor.
- Over UI elements: Default pointer.

### Toasts / Notifications
- When copying a hex value: Show a small toast in the bottom-left that says "Copied #XXXXXX" and fades out after 1.5s.
- When a palette is loaded onto the stage: Brief toast "Palette loaded onto stage".

### Keyboard Shortcuts
- `1`, `2`, `3`: Select spotlight 1, 2, 3 (selected spotlight gets a pulsing ring).
- Arrow keys (when a spotlight is selected): Nudge the spotlight by 5px (or 1px with Shift held).
- `R`: Reset all spotlights to defaults.
- `Space`: Toggle the beam style (cycle through Soft Radial → Hard Cone → Particle).
- `Escape`: Close any open popover/picker.

### Sample Pins on Canvas
- Clicking the canvas (not on a spotlight or pin) places a pin.
- The pin is a small circle (8px) filled with the sampled color, with a thin white outline.
- A label appears on hover showing the hex value.
- Clicking an existing pin removes it.
- Pins persist across spotlight movements (but their displayed color doesn't update — they captured the color at the moment of placement, like a photograph).
- Maximum 10 pins. If the user tries to place an 11th, the oldest pin is removed.

---

## Startup / Loading Experience

On page load:
1. The stage is black for 0.5s.
2. Spotlight 1 (Red) fades in from 0 to full intensity over 0.8s.
3. Spotlight 2 (Green) fades in 0.3s later.
4. Spotlight 3 (Blue) fades in 0.3s after that.
5. The right panel slides in from the right over 0.6s.
6. The footer bar fades in.

This creates a "the lights are turning on in the lab" feeling.

---

## Responsiveness & Performance

- The canvas should resize with the container. Listen for `resize` events (debounced) and update the canvas dimensions and re-render.
- Use `devicePixelRatio` to render the canvas at native resolution for crisp visuals on HiDPI screens. Set `canvas.width = container.width * dpr` and `canvas.height = container.height * dpr`, then scale the context with `ctx.scale(dpr, dpr)` and style the canvas element to the container dimensions.
- In Particle mode, cap at 60fps and consider reducing particle count on lower-end devices (if `requestAnimationFrame` callback takes > 16ms, reduce particle count by 20% iteratively until it fits).
- The SVG color blindness filters are GPU-accelerated in all modern browsers and have negligible performance impact.

---

## File Structure

This entire application is a **single `index.html` file**. Everything — HTML structure, CSS styles, JavaScript logic — lives in one file. The CSS should be in a `<style>` tag in the `<head>`. The JavaScript should be in a `<script>` tag at the end of the `<body>`.

Organize the JS into clearly commented sections:

```
// ═══════════════════════════════════════
// SECTION: Color Utility Functions
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Canvas Rendering Engine
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Spotlight Interaction (Drag/Drop)
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Color Picker Component
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Palette Generator
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Contrast Analyzer
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Color Blindness Simulation
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: UI Panel Management (Tabs, etc.)
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Keyboard Shortcuts
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// SECTION: Initialization & Startup Sequence
// ═══════════════════════════════════════
```

---

## Color Utility Functions (Reference)

The following utility functions are needed throughout the application and should be implemented first:

```javascript
// --- HEX ↔ RGB ---
hexToRgb(hex)          // "#ff3b5c" → { r: 255, g: 59, b: 92 }
rgbToHex(r, g, b)      // (255, 59, 92) → "#ff3b5c"

// --- RGB ↔ HSL ---
rgbToHsl(r, g, b)      // → { h: 0-360, s: 0-100, l: 0-100 }
hslToRgb(h, s, l)      // → { r: 0-255, g: 0-255, b: 0-255 }

// --- Luminance & Contrast ---
relativeLuminance(r, g, b)      // WCAG 2.1 formula → 0.0 to 1.0
contrastRatio(color1, color2)   // → number (e.g., 14.7)

// --- Color Blindness Transform ---
applyColorMatrix(r, g, b, matrix)   // → { r, g, b } after matrix transform

// --- Palette Harmony ---
generateHarmony(baseHsl, mode)   // → array of { h, s, l } colors

// --- Contrast Fix Suggestion ---
suggestAccessibleColor(fgHsl, bgRgb, targetRatio)
// Adjusts lightness of fgHsl until contrast against bgRgb meets targetRatio.
// Try going lighter first, then darker. Return the closest match.
```

---

## Visual Reference for Aesthetic

Think of this mood board:
- The mixing console from a recording studio (knobs, faders, VU meters)
- NASA Mission Control in the 1960s (dark rooms, glowing screens, analog readouts)
- Stage lighting rigs (Par cans, Fresnel spots, the beams cutting through haze)
- Analog oscilloscopes (green phosphor traces, grid overlays, warm CRT glow)
- The color mixing animations from physics education videos

The UI should feel like you're operating a *machine*, not using a *website*. Every control should feel like it has physical weight and consequence.

---

## Edge Cases & Validation

- Hex input fields should accept with or without `#`, 3-digit or 6-digit hex, and be case-insensitive. Invalid input should revert to the previous valid value and briefly flash the input border red.
- RGB slider values clamp to 0–255 integers.
- HSL values: H clamps to 0–360 (wrapping), S and L clamp to 0–100.
- Contrast ratio should display to one decimal place (e.g., "4.5:1" not "4.53742:1").
- Canvas pixel sampling should handle the case where the cursor is outside the canvas (don't sample, hide the footer readout or show "—").
- Touch events: Support `touchstart`, `touchmove`, `touchend` for spotlight dragging on mobile. Prevent default to avoid scrolling while dragging.
- When the window is resized, spotlight positions should be proportionally remapped so they don't end up outside the new canvas bounds.

---

## Acceptance Criteria

The application is complete when:

1. ✅ Three spotlights can be dragged around a canvas with real additive RGB light mixing.
2. ✅ Three beam styles are available: Soft Radial, Hard Cone, Particle Field.
3. ✅ Each spotlight's color, radius, and intensity can be customized.
4. ✅ Spotlights can be turned on/off individually.
5. ✅ The cursor's position on the canvas shows the mixed color in real-time in the footer.
6. ✅ Sample pins can be placed and removed on the canvas.
7. ✅ A color picker (HSL wheel + RGB sliders + hex input) works for all color inputs.
8. ✅ The palette generator produces correct colors for all 7 harmony modes.
9. ✅ A visual harmony wheel shows the geometric relationships.
10. ✅ Palette colors can be copied to clipboard.
11. ✅ Palette colors can be loaded onto the stage spotlights.
12. ✅ The contrast analyzer correctly calculates WCAG 2.1 contrast ratios.
13. ✅ WCAG AA and AAA compliance badges display correctly for both normal and large text.
14. ✅ A live text preview shows foreground on background.
15. ✅ The palette contrast checker tests all palette colors against a chosen background.
16. ✅ "Suggest Fix" finds accessible alternatives for failing colors.
17. ✅ Color blindness simulation (Protanopia, Deuteranopia, Tritanopia, Achromatopsia) applies to the entire page via SVG filters.
18. ✅ Color blindness info banner appears when a simulation is active.
19. ✅ Contrast tab shows both true and simulated contrast ratios when a simulation is active.
20. ✅ Keyboard shortcuts work (1/2/3, arrows, R, Space, Escape).
21. ✅ The startup sequence animates the lights turning on.
22. ✅ The design follows the retro-futuristic laboratory aesthetic described in this spec.
23. ✅ The application is responsive and functional on screens down to 900px wide (and stacks vertically below that).
24. ✅ Canvas renders at native DPI resolution.
25. ✅ No external dependencies beyond Google Fonts.