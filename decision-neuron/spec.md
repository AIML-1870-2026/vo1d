# Decision Neuron — Car Buying Probability Engine

## Overview

An interactive single-page web application that visualizes the probability of a user buying a car based on five influencing factors. The interface features a central 3D-rotating car display with real-time recommendation updates as users adjust sliders and persona selection. The design evokes a sleek automotive showroom meets neural-network data dashboard aesthetic.

---

## Architecture

| File | Purpose |
|------|---------|
| `index.html` | Semantic structure, layout containers, slider controls, car display area |
| `style.css` | All styling — variables, layout, animations, responsive design |
| `app.js` | Logic — persona weights, scoring engine, car database, recommendation algorithm, DOM manipulation |

---

## Core Concept: The Decision Neuron

The "neuron" metaphor: five input signals (factors) feed into a central processing node that outputs a **buying probability percentage** and a **best-match car recommendation**. Visual lines/connections animate from each factor toward the center display, reinforcing the neural metaphor.

---

## Five Influencing Factors

### 1. Persona Type (Categorical Selector)

A horizontal pill/card selector (not a slider) allowing the user to pick one persona. Each persona applies a hidden **weight profile** to the other four factors.

| Persona | Reliability Weight | Speed Weight | Utility Weight | Price Weight |
|---------|--------------------|-------------|----------------|-------------|
| 🔧 Car Guy | 0.15 | 0.45 | 0.05 | 0.05 |
| 👨‍👩‍👧‍👦 Family Man | 0.40 | 0.05 | 0.40 | 0.15 |
| 🎓 Teenager | 0.15 | 0.30 | 0.05 | 0.50 |
| 💼 Commuter | 0.35 | 0.05 | 0.20 | 0.40 |
| 🏔️ Adventurer | 0.20 | 0.15 | 0.45 | 0.20 |

> Weights per persona always sum to 1.0. These weights determine how much each factor contributes to the final score for that persona.

### 2. Reliability (Slider: 0–100)

How important reliability/dependability is to the user.

### 3. Speed / Performance (Slider: 0–100)

How important acceleration, top speed, and driving thrill is.

### 4. Utility / Practicality (Slider: 0–100)

How important cargo space, seating, towing, and everyday practicality is.

### 5. Price Sensitivity (Slider: 0–100)

How important affordability is (100 = must be cheap, 0 = money is no object).

---

## Scoring & Recommendation Engine

### Car Database (20 Vehicles)

Each car has a stat profile rated 0–100 in each factor dimension:

| # | Car | Reliability | Speed | Utility | Price (Affordability) |
|---|-----|------------|-------|---------|----------------------|
| 1 | Toyota Camry | 92 | 35 | 60 | 80 |
| 2 | Honda Civic | 90 | 40 | 50 | 85 |
| 3 | Ford F-150 | 75 | 45 | 95 | 50 |
| 4 | Chevrolet Corvette | 60 | 95 | 10 | 20 |
| 5 | Porsche 911 | 70 | 98 | 10 | 5 |
| 6 | Tesla Model 3 | 72 | 80 | 55 | 45 |
| 7 | Toyota RAV4 | 88 | 30 | 80 | 70 |
| 8 | Subaru Outback | 85 | 28 | 85 | 68 |
| 9 | BMW M3 | 55 | 92 | 25 | 15 |
| 10 | Mazda Miata | 80 | 70 | 10 | 75 |
| 11 | Jeep Wrangler | 60 | 30 | 90 | 45 |
| 12 | Kia Soul | 78 | 25 | 65 | 90 |
| 13 | Dodge Charger | 50 | 88 | 35 | 40 |
| 14 | Honda CR-V | 90 | 28 | 82 | 65 |
| 15 | Toyota Tacoma | 88 | 35 | 88 | 55 |
| 16 | Hyundai Elantra | 82 | 32 | 48 | 92 |
| 17 | Ford Mustang | 55 | 90 | 15 | 50 |
| 18 | Volkswagen Golf GTI | 75 | 75 | 45 | 60 |
| 19 | Chrysler Pacifica | 70 | 20 | 95 | 55 |
| 20 | Nissan Altima | 80 | 35 | 55 | 82 |

### Match Score Algorithm

```
For each car:
  matchScore = (personaWeight.reliability * userSlider.reliability * car.reliability
              + personaWeight.speed * userSlider.speed * car.speed
              + personaWeight.utility * userSlider.utility * car.utility
              + personaWeight.price * userSlider.price * car.price)
              / (personaWeight.reliability * userSlider.reliability * 100
              + personaWeight.speed * userSlider.speed * 100
              + personaWeight.utility * userSlider.utility * 100
              + personaWeight.price * userSlider.price * 100)

  → Normalized to 0–100%
```

The car with the highest `matchScore` is the **recommended car**. The `matchScore` of that car is also the displayed **"Buying Probability"**.

Edge case: if all sliders are at 0, display a neutral state ("Adjust your preferences to find your perfect car").

---

## Page Layout & Visual Design

### Aesthetic Direction

**"Dark Showroom"** — a moody, premium automotive feel. Think dark backgrounds with dramatic accent lighting, soft glows, and clean typography. The neural-network motif uses thin glowing lines connecting the factor controls to the central car display.

### Color Palette (CSS Variables)

```
--bg-primary: #0a0a0f          (near-black)
--bg-secondary: #13131a        (dark panel)
--bg-card: #1a1a25              (card surface)
--accent-primary: #00d4ff       (electric cyan — main accent)
--accent-secondary: #ff6b35     (warm orange — highlights)
--accent-glow: rgba(0,212,255,0.15)
--text-primary: #e8e8ec
--text-secondary: #8888a0
--text-muted: #55556a
--danger: #ff4757
--success: #2ed573
```

### Typography

- **Headings / Display**: `"Orbitron"` (Google Fonts) — geometric, futuristic
- **Body / Labels**: `"Outfit"` (Google Fonts) — clean, modern sans-serif
- **Data / Numbers**: `"JetBrains Mono"` (Google Fonts) — monospace for stats

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  HEADER: "Decision Neuron" logo + tagline           │
├──────────┬──────────────────────────┬───────────────┤
│          │                          │               │
│  LEFT    │    CENTER DISPLAY        │   RIGHT       │
│  PANEL   │                          │   PANEL       │
│          │  ┌────────────────────┐  │               │
│ Persona  │  │                    │  │  Car Stats    │
│ Selector │  │   3D ROTATING      │  │  Radar Chart  │
│          │  │   CAR DISPLAY      │  │               │
│ Slider:  │  │   (CSS animation)  │  │  Match %      │
│ Reliab.  │  │                    │  │  Bar Graph    │
│          │  └────────────────────┘  │               │
│ Slider:  │                          │  Buy Prob.    │
│ Speed    │  Car Name + Year         │  Gauge        │
│          │  Price Tag               │               │
│ Slider:  │                          │  Top 3 Alt.   │
│ Utility  │  Neural connection       │  Cars list    │
│          │  lines (animated)        │               │
│ Slider:  │                          │               │
│ Price    │                          │               │
│          │                          │               │
├──────────┴──────────────────────────┴───────────────┤
│  FOOTER: "Powered by Decision Neuron™"              │
└─────────────────────────────────────────────────────┘
```

On mobile (< 768px): stacks vertically — Persona → Sliders → Car Display → Stats.

---

## Component Details

### Persona Selector

- Horizontal row of 5 clickable cards/pills
- Each shows an emoji + label (e.g., "🔧 Car Guy")
- Selected state: glowing cyan border + slight scale-up + filled background
- On selection: sliders animate a subtle "pulse" to indicate weight shift
- Below the selected persona: a short flavor text description (e.g., "Speed is everything. Price? Irrelevant.")

### Factor Sliders

- Custom-styled range inputs (no default browser chrome)
- Track: thin line with gradient fill from left (dark) to current value (cyan glow)
- Thumb: circular with glow effect
- Each slider has a label on the left and a live numeric value on the right
- A small **weight indicator** dot or bar showing how much the current persona cares about this factor (derived from persona weights — purely visual, non-interactive)
- Sliders default to 50 on page load

### Center Car Display

- A **CSS-only 3D rotating car showcase**:
  - Use a large car silhouette SVG or emoji as placeholder (since we can't load real 3D models)
  - The car "card" rotates on Y-axis via CSS `@keyframes` with `perspective` and `transform: rotateY()`
  - The card shows the car image/emoji on front, and a stat summary on back
  - Smooth crossfade transition when the recommended car changes
- Below the car:
  - **Car name** in large Orbitron font
  - **Year & Price** in secondary text
  - **"Best Match" badge** with glowing animation

### Neural Connection Lines

- SVG or CSS-drawn lines from each slider area to the center display
- Lines pulse/glow with the accent color
- Line thickness or opacity varies with how much that factor is contributing (weight × slider value)
- Animated dashes flowing toward center (CSS `stroke-dashoffset` animation)

### Right Panel — Stats & Results

#### Match Percentage Gauge
- Circular gauge / radial progress bar showing 0–100%
- Fills with gradient (cyan → orange at high values)
- Large number in the center in JetBrains Mono
- Label: "Buying Probability"

#### Car Stat Radar Chart
- CSS-drawn or SVG radar/spider chart showing the recommended car's four stats (Reliability, Speed, Utility, Price)
- Updates with smooth transitions when the car changes

#### Top 3 Alternatives
- Small list below the gauge showing the #2, #3, #4 match cars
- Each row: rank number, car name, match %, mini bar
- Clickable to "preview" that car in the center display

---

## Animations & Micro-interactions

| Element | Animation |
|---------|-----------|
| Page load | Staggered fade-in: header → left panel → center → right panel (200ms delays) |
| Persona select | Selected card scales up with glow; other cards dim slightly |
| Slider drag | Track fill follows thumb; glow intensity on thumb increases |
| Car change | Current car fades/scales down, new car fades/scales up (300ms crossfade) |
| Neural lines | Continuous dash-flow animation; thickness pulses on slider change |
| Match gauge | Smooth counter animation (count up/down to new value) |
| Radar chart | Points animate to new positions (CSS transition on coordinates) |
| Hover on alt cars | Subtle lift + glow effect |

---

## Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| > 1200px | Three-column layout as shown above |
| 768–1200px | Two columns: left panel + stacked center/right |
| < 768px | Single column, vertical stack. Persona becomes horizontally scrollable. Sliders full-width. Car display centered. Stats below. |

---

## Accessibility

- All sliders have proper `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Persona selector uses `role="radiogroup"` with `role="radio"` on each option
- Color contrast meets WCAG AA on dark background
- Keyboard navigable: Tab through personas and sliders, Enter/Space to select persona
- Reduced motion: `@media (prefers-reduced-motion)` disables rotation and flowing line animations

---

## File Responsibilities

### `index.html`
- Google Fonts imports (Orbitron, Outfit, JetBrains Mono)
- Semantic structure with `<header>`, `<main>`, `<aside>`, `<footer>`
- Persona selector markup
- Slider controls with labels
- Car display container with placeholder structure
- Stats/gauge containers
- SVG elements for neural lines
- Links to `style.css` and `app.js`

### `style.css`
- CSS custom properties (color palette, spacing, typography)
- Dark theme base styles
- Grid/flexbox layout for three-column design
- Custom slider styling (`::-webkit-slider-*`, `::-moz-range-*`)
- 3D car rotation keyframes
- Neural line dash-flow animation
- Gauge/progress circle styles
- Radar chart CSS
- Glow effects (box-shadow, filter, text-shadow)
- Responsive breakpoints
- `prefers-reduced-motion` overrides
- Transition definitions for all interactive elements

### `app.js`
- `PERSONAS` object with weight profiles
- `CARS` array of 20 vehicle objects with stat profiles
- `state` object tracking current persona, slider values
- `calculateMatchScores()` — runs the scoring algorithm against all 20 cars
- `getRecommendation()` — returns sorted cars by match score
- `updateDisplay()` — master function that recalculates and re-renders everything
- `renderCarDisplay(car)` — updates center display with car info + animation trigger
- `renderGauge(percentage)` — animates the circular gauge
- `renderRadarChart(car)` — draws/updates radar chart SVG points
- `renderAlternatives(cars)` — updates top 3 list
- `updateNeuralLines()` — adjusts line thickness/opacity based on current weights
- `animateCounter(element, from, to)` — smooth number counting animation
- Event listeners for all sliders (`input` event) and persona buttons (`click`)
- `init()` — sets defaults and renders initial state on `DOMContentLoaded`

---

## Default State on Load

- Persona: **Family Man** selected
- All sliders: **50**
- Recommended car calculated and displayed immediately
- All animations play on load (staggered entrance)

---

## Stretch Goals (Nice to Have)

- **Compare Mode**: click a second car from the alternatives list to see a side-by-side stat comparison
- **Share Results**: generate a shareable URL with encoded slider/persona state as query params
- **Sound Effects**: subtle UI sounds on persona switch and car change (with mute toggle)
- **Dark/Light toggle**: secondary light "dealership" theme