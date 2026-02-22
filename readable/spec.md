# ChromaType — Interactive Text & Color Accessibility Lab

## Overview

ChromaType is a single-page interactive tool that lets users experiment with text and background colors in real time, evaluate accessibility through WCAG contrast ratios and relative luminance, adjust typography, and simulate how their color choices appear under four types of color blindness. The page itself should feel like a living color instrument — not a sterile utility panel.

---

## Visual Identity & Atmosphere

### Theme: "Light Through Glass"

The page evokes the feeling of light refracting through stained glass or a prism. The overall aesthetic is dark, sophisticated, and slightly glassy — think frosted-glass panels floating over a subtly animated background.

### Background Layer

- A **full-viewport generative gradient mesh** that slowly morphs and breathes behind the UI. The mesh colors are derived from the user's current background and text RGB values — as sliders move, the ambient background shifts in response, creating a sense that the entire page is *alive* with the user's choices.
- The gradient should use soft, blurred radial shapes (CSS radial gradients or canvas blobs) positioned at 3–4 anchor points, each tinted by a channel of the active RGB selections. Animation should be slow (8–12 second cycles) and organic.
- Opacity of the mesh: ~0.3–0.4 so it tints without overwhelming the UI panels.

### Panel Aesthetic

- All control panels and display areas use **glassmorphism**: semi-transparent backgrounds (`rgba` with ~0.12–0.18 alpha on a dark base), prominent `backdrop-filter: blur(16px)`, subtle 1px borders with low-opacity white or colored highlights, and soft drop shadows.
- Rounded corners: `border-radius: 16px` on major panels, `12px` on sub-elements.
- Accent color: a vibrant gradient derived from the current text color selection, used on slider thumbs, active states, and section dividers.

### Typography

- UI chrome: Inter or system sans-serif, light weight for labels, medium for headings.
- The preview text area uses a user-selectable font stack (see Text Controls below).

---

## Layout (Desktop-First, Responsive)

```
┌──────────────────────────────────────────────────────────┐
│  Header Bar: Logo/Title + Color Blindness Mode Toggle    │
├────────────────────┬─────────────────────────────────────┤
│                    │                                     │
│   CONTROL PANEL    │         PREVIEW CANVAS              │
│                    │                                     │
│  ┌──────────────┐  │  ┌─────────────────────────────┐   │
│  │ Background   │  │  │                             │   │
│  │ RGB Sliders  │  │  │   User text rendered at     │   │
│  └──────────────┘  │  │   chosen size, color, and   │   │
│                    │  │   font on chosen background  │   │
│  ┌──────────────┐  │  │                             │   │
│  │ Text Color   │  │  │                             │   │
│  │ RGB Sliders  │  │  └─────────────────────────────┘   │
│  └──────────────┘  │                                     │
│                    │  ┌─────────────────────────────┐   │
│  ┌──────────────┐  │  │  METRICS BAR                │   │
│  │ Text Controls│  │  │  Contrast · Luminance · Pass│   │
│  │ size / font  │  │  └─────────────────────────────┘   │
│  └──────────────┘  │                                     │
│                    │  ┌─────────────────────────────┐   │
│  ┌──────────────┐  │  │  COLOR BLINDNESS PREVIEW    │   │
│  │ Metrics      │  │  │  (4 mini-previews when      │   │
│  │ (redundant   │  │  │   simulation is active)     │   │
│  │  readout)    │  │  └─────────────────────────────┘   │
│  └──────────────┘  │                                     │
├────────────────────┴─────────────────────────────────────┤
│  Footer: WCAG reference · Keyboard shortcuts · Credits   │
└──────────────────────────────────────────────────────────┘
```

- **Control Panel** (left, ~320px fixed width): All input controls stacked vertically, scrollable if viewport is short.
- **Preview Canvas** (right, fluid): The live text preview, metrics bar, and color blindness simulation grid.
- On viewports below 900px, the layout collapses to a single column with controls above the preview.

---

## Component Specifications

### 1. Header Bar

| Element | Detail |
|---|---|
| Logo | "ChromaType" in a variable-weight font with letters individually tinted by a rotating hue cycle (subtle, decorative only). |
| Color Blindness Toggle | A segmented pill control with five options: **Normal**, **Protanopia**, **Deuteranopia**, **Tritanopia**, **Achromatopsia**. Active segment is highlighted with a smooth sliding indicator. Selecting a mode applies a real-time SVG filter to the entire Preview Canvas area (see §6). |

### 2. Background Color Controls

A panel titled **"Background"** with:

- **Three horizontal sliders** labeled R, G, B.
  - Each slider track is rendered as a gradient showing the range of that channel while the other two channels remain at their current values. (e.g., the R slider shows a gradient from `rgb(0, G, B)` to `rgb(255, G, B)`.)
  - Slider thumb: a circular knob displaying the current channel value (0–255) inside it.
  - Range: integer 0–255.
- **Hex input field**: A text input showing the current hex value (e.g., `#1A1A2E`). Editing this field updates all three sliders immediately. Validates on blur; invalid input reverts.
- **Color swatch**: A 40×40px circle next to the hex field filled with the current background color.
- All updates fire on every `input` event (not just `change`), ensuring continuous synchronization.

### 3. Text Color Controls

Identical structure to Background Color Controls, in a panel titled **"Text Color"**.

- Same triple-slider + hex input + swatch layout.
- Slider track gradients reflect the text color channels.

### 4. Text Controls

A panel titled **"Typography"** with:

| Control | Type | Range / Options | Default |
|---|---|---|---|
| Font Size | Slider + numeric input | 8px – 120px, step 1 | 32px |
| Font Family | Dropdown select | System Sans, System Serif, System Mono, Georgia, Courier New, Verdana | System Sans |
| Font Weight | Segmented toggle | Light (300), Regular (400), Bold (700) | Regular |
| Line Height | Slider | 1.0 – 2.5, step 0.1 | 1.5 |
| Letter Spacing | Slider | -2px – 10px, step 0.5 | 0px |

### 5. Text Display / Preview Area

- **Editable text region**: A `contenteditable` div (or textarea styled to match) where the user can type or paste custom text.
- Default placeholder text: *"The quick brown fox jumps over the lazy dog. 0123456789 — AaBbCcDdEeFf"*
- The region applies:
  - `background-color`: current background RGB.
  - `color`: current text RGB.
  - `font-size`, `font-family`, `font-weight`, `line-height`, `letter-spacing`: as set in Text Controls.
- Minimum height: 200px. Resizable vertically via a drag handle at the bottom edge.
- **Border treatment**: A subtle inner glow whose color is the text color at 15% opacity, giving the box a faint luminous edge that shifts with the user's palette.

#### "Holographic Echo" Effect (Visual Flair)

Behind the preview area, render a **blurred, scaled-up ghost** of the preview text — offset by ~8px down and right, with the text color at ~10% opacity and a 20px Gaussian blur. This creates a soft holographic shadow that makes the preview area feel dimensional. The echo color tracks the text color in real time.

### 6. Metrics Display

A horizontal **Metrics Bar** directly below the preview area, divided into three cells:

#### 6a. Contrast Ratio

- Formula: `(L1 + 0.05) / (L2 + 0.05)` where L1 is the relative luminance of the lighter color and L2 is the relative luminance of the darker color.
- Display: Large numeric readout (e.g., **"4.52 : 1"**) with two decimal places.
- Beneath the ratio, show **WCAG compliance badges**:
  - **AA Normal** (≥ 4.5:1): green badge if passing, dim/red if failing.
  - **AA Large** (≥ 3.0:1): green/dim.
  - **AAA Normal** (≥ 7.0:1): green/dim.
  - **AAA Large** (≥ 4.5:1): green/dim.
- Badges transition smoothly between states (opacity + color shift over 200ms).

#### 6b. Relative Luminance

- Formula per WCAG 2.x:
  1. Convert each sRGB channel to linear: if `C_srgb ≤ 0.04045`, then `C_lin = C_srgb / 12.92`; else `C_lin = ((C_srgb + 0.055) / 1.055) ^ 2.4`, where `C_srgb = channel_value / 255`.
  2. `L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin`.
- Display two luminance values side by side:
  - **BG Luminance**: value (0.0000 – 1.0000, four decimals) with a small swatch.
  - **Text Luminance**: value with a small swatch.
- A thin **luminance bar** visualization: a horizontal gradient from black (L=0) to white (L=1) with two marker pips indicating where the background and text luminances fall. The gap between the pips is highlighted, visually encoding the contrast.

#### 6c. Contrast Quality Meter

- A radial gauge / arc meter from 1:1 (left, red) to 21:1 (right, green) with the current ratio indicated by an animated needle.
- Color zones: 1–3 red, 3–4.5 orange, 4.5–7 yellow-green, 7–21 green.
- This is a purely decorative but informative visualization that makes the contrast ratio tangible at a glance.

### 7. Color Blindness Simulation

When the user selects a mode other than "Normal" in the header toggle:

- The **main Preview Area** is rendered through an **SVG `<feColorMatrix>` filter** that simulates the selected type of color vision deficiency. The filter is applied via a CSS `filter: url(#filter-id)` on the preview container.
- Below the main preview, a **simulation strip** appears showing four mini-preview panels side by side — one for each of the four CVD types (Protanopia, Deuteranopia, Tritanopia, Achromatopsia). Each mini-panel shows the preview text at reduced scale with the appropriate SVG filter applied, labeled underneath. This allows comparison at a glance.
- The simulation strip is always visible regardless of which mode is selected in the header, providing a persistent reference.

#### Color Matrix Values

Use established Machado et al. (2009) simulation matrices or the Brettel/Viénot model for Protanopia, Deuteranopia, and Tritanopia. For Achromatopsia, use a standard luminance-preserving desaturation matrix:

```
Achromatopsia:
0.2126  0.7152  0.0722  0  0
0.2126  0.7152  0.0722  0  0
0.2126  0.7152  0.0722  0  0
0       0       0       1  0
```

Protanopia, Deuteranopia, and Tritanopia matrices should be sourced from peer-reviewed simulation research. Include a comment in the code citing the source.

### 8. Synchronization & Performance

- **All metrics recompute on every `input` event** from any slider or text field. There must be zero perceptible lag between moving a slider and seeing the preview + metrics update.
- Use `requestAnimationFrame` for the ambient background animation; slider-driven updates should be direct DOM mutations (no framework reconciliation overhead unless the chosen framework handles this efficiently).
- Debounce hex input parsing at 150ms to avoid thrashing during typing, but apply immediately on blur or Enter.
- The ambient background gradient animation should not trigger layout recalculations — use `transform` and `opacity` changes only, or render to a `<canvas>` behind the UI.

---

## Interactions & Micro-Details

### Slider Behavior

- Clicking anywhere on a slider track jumps the thumb to that position (no "step toward click" behavior).
- Arrow keys nudge by 1; Shift+Arrow nudges by 10.
- Slider tracks subtly pulse/glow when hovered.

### Color Swatch Interactions

- Clicking a swatch opens a small popover with the color in Hex, RGB, and HSL formats, with a "Copy" button for each.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `S` | Swap background and text colors |
| `R` | Reset all controls to defaults |
| `1–5` | Switch color blindness mode (1=Normal, 2=Prot, 3=Deut, 4=Trit, 5=Achrom) |

Display a small shortcut hint toast on first visit.

### Responsive Behavior

- Below 900px width: single-column layout, controls above preview.
- Below 600px width: simulation strip switches from 4-across to 2×2 grid.
- Touch-friendly slider targets (minimum 44px hit area).

---

## Color & Default Values

| Parameter | Default |
|---|---|
| Background Color | `#0F0F1A` (deep navy-black) |
| Text Color | `#E0E0FF` (soft lavender-white) |
| Font Size | 32px |
| Font Family | System Sans-Serif |
| Font Weight | 400 |
| Line Height | 1.5 |
| Letter Spacing | 0px |
| Color Blindness Mode | Normal |

These defaults produce a high-contrast, accessible starting state (~15.2:1 contrast ratio) while looking visually striking against the dark ambient background.

---

## Technical Notes

### Luminance & Contrast Calculation (Reference Implementation)

```
function srgbToLinear(channel8bit) {
    const c = channel8bit / 255;
    return c <= 0.04045
        ? c / 12.92
        : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
    return 0.2126 * srgbToLinear(r)
         + 0.7152 * srgbToLinear(g)
         + 0.0722 * srgbToLinear(b);
}

function contrastRatio(rgb1, rgb2) {
    const L1 = relativeLuminance(...rgb1);
    const L2 = relativeLuminance(...rgb2);
    const lighter = Math.max(L1, L2);
    const darker  = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
}
```

### SVG Filter Template

```xml
<svg style="position:absolute;width:0;height:0;">
  <defs>
    <filter id="protanopia">
      <feColorMatrix type="matrix" values="...20 matrix values..." />
    </filter>
    <!-- deuteranopia, tritanopia, achromatopsia filters -->
  </defs>
</svg>
```

### Ambient Background (Pseudocode)

```
On each animation frame:
    For each of 4 blob anchors:
        anchor.x += sin(time * speed_x + offset) * amplitude
        anchor.y += cos(time * speed_y + offset) * amplitude
        anchor.color = blend(bgRGB, textRGB, anchor.weight)
    Render radial gradients at each anchor position
```

---

## Accessibility of the Tool Itself

Ironic as it would be to ship an accessibility tool that isn't accessible:

- All sliders are `<input type="range">` with proper `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
- Color blindness mode buttons are `role="radiogroup"` with `aria-checked`.
- Contrast ratio and WCAG badges are in an `aria-live="polite"` region so screen readers announce changes.
- Focus indicators are visible and high-contrast on all interactive elements.
- The preview text area has `aria-label="Text preview area"`.

---

## Stretch Goals (If Time Permits)

- **Palette Suggestions**: A small "Suggest Accessible Pair" button that generates a random text/background combo guaranteed to pass AAA.
- **Export**: Copy a CSS snippet (`color`, `background-color`, `font-size`, etc.) to clipboard.
- **URL State**: Encode all current settings into the URL hash so users can share a specific configuration via link.
- **Dark/Light Mode for Chrome**: Toggle the UI shell between a dark and light theme (preview area is always user-controlled).
