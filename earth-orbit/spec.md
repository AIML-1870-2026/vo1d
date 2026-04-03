# NEO Close Approach Tracker — spec.md

## Overview
A single-page web dashboard that visualizes near-Earth object (NEO) data from NASA/JPL APIs. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step. All API calls happen client-side (all three APIs support CORS).

The dashboard has **three tabs**. The landing page is a 3D interactive globe. The other two tabs present tabular/card-based data with filtering, sorting, and contextual comparisons that make raw astronomical numbers intuitive.

---

## APIs

### 1. NeoWs (Near Earth Object Web Service)
- **Endpoint:** `https://api.nasa.gov/neo/rest/v1/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&api_key=API_KEY`
- **Auth:** API key from api.nasa.gov (use `DEMO_KEY` as fallback, but it rate-limits fast)
- **Returns:** All NEOs with close approaches in the given date range (max 7 days). Each object includes:
  - Name, NASA/JPL ID
  - Estimated diameter (min/max in meters, km, feet, miles)
  - Is potentially hazardous (boolean)
  - Close approach data: date, relative velocity (km/s, km/h, mph), miss distance (km, lunar distances, AU), orbiting body
- **Used by:** Tab 1 (Globe), Tab 2 (Close Approaches)

### 2. SBDB Close-Approach Data (JPL)
- **Endpoint:** `https://ssd-api.jpl.nasa.gov/cad.api`
- **Auth:** None required
- **Key params:** `date-min`, `date-max`, `dist-max` (AU), `sort` (e.g. `dist`, `date`), `diameter`, `fullname`
- **Returns:** Close approach records with object designation, date, distance (AU), velocity (km/s), estimated diameter (when available)
- **Used by:** Tab 2 (Close Approaches — historical/future queries)

### 3. Sentry (Impact Monitoring)
- **Endpoint:** `https://ssd-api.jpl.nasa.gov/sentry.api`
- **Auth:** None required
- **Key params:** `all=1` (returns full list), or query by `des` (designation)
- **Returns:** Objects with non-zero Earth impact probability. Each record includes:
  - Object designation, fullname
  - Impact probability (cumulative)
  - Palermo scale (max and cumulative)
  - Torino scale
  - Estimated diameter (km)
  - Number of potential impacts
  - Velocity (km/s)
  - Last observation date, arc span
- **Used by:** Tab 3 (Sentry Watch List)

---

## Tab Structure

### Tab 1: Globe View (Landing Page)
**Library:** [globe.gl](https://globe.gl/) via CDN (`https://unpkg.com/globe.gl`)

**Layout:**
- Full-width 3D interactive Earth globe occupying the main content area
- Sidebar or bottom panel for asteroid detail on click
- Small legend overlay (color key, scale reference)

**Data source:** NeoWs (current 7-day window)

**Globe features:**
- Earth rendered with a dark, clean aesthetic (night texture or dark blue with subtle country outlines)
- **Moon** rendered at 1 LD (~384,400 km) as a reference sphere — labeled
- **Asteroids** rendered as points/markers at their respective miss distances above the globe surface
  - Since NeoWs doesn't give geographic coordinates for closest approach, place asteroids at **random lat/lng positions** (or evenly distributed) — the important axis is altitude (miss distance), not ground position
  - **Non-linear altitude scale:** Use a logarithmic or square-root compression so that objects at 0.01 LD and 50 LD are both visible and distinguishable. Document the scale in the legend.
  - **Color coding:**
    - Red/orange: potentially hazardous asteroids (PHA)
    - Blue/cyan: non-hazardous
    - Size of marker proportional to estimated diameter
- **Interaction:**
  - Drag to rotate, scroll to zoom
  - Hover over asteroid: tooltip with name, miss distance (LD), diameter, velocity
  - Click asteroid: detail panel slides in with full stats including size comparisons, velocity context, and miss distance in intuitive units

**Detail panel contents (on asteroid click):**
- Name and ID
- Close approach date/time
- Miss distance: shown in lunar distances, km, and a human comparison (e.g., "X trips around Earth's equator")
- Estimated diameter with size comparison (e.g., "About the size of a 6-story building", "Roughly 3 school buses")
- Relative velocity with context (e.g., "X times the speed of a bullet", "X times faster than the ISS")
- Hazard status badge

---

### Tab 2: Close Approaches
**Layout:** Data table with filter controls at top, summary stat cards above the table

**Data sources:**
- Default view: NeoWs (current week) — loads on tab open
- Toggle or date picker to switch to SBDB for historical/future queries

**Summary stat cards (top of tab):**
- Total close approaches this week
- Closest approach (name + distance in LD)
- Largest object (name + diameter)
- Fastest flyby (name + velocity)

**Table columns:**
- Name
- Date of closest approach
- Miss distance (displayed in LD by default; raw km on hover/expand)
- Estimated diameter (meters, with size comparison tag like "bus-sized", "building-sized", "stadium-sized")
- Velocity (km/s, with context tag like "15× speed of sound")
- Hazardous (badge: yes/no)

**Filters & sorting:**
- Date range picker (for SBDB queries — past/future)
- Distance filter: slider or dropdown (e.g., "within 1 LD", "within 5 LD", "within 10 LD", "all")
- Size filter: dropdown (e.g., "all sizes", ">100m", ">500m", ">1km")
- Hazardous only toggle
- Click any column header to sort ascending/descending

**Size comparison logic (estimated diameter → label):**
- < 10m → "Car-sized"
- 10–25m → "House-sized"
- 25–50m → "Building-sized" (like Chelyabinsk)
- 50–100m → "Stadium-sized"
- 100–300m → "Skyscraper-sized"
- 300–1000m → "Mountain-sized"
- \> 1000m → "City-killer"

**Velocity comparison logic (km/s → label):**
- Convert to multiples of:
  - Speed of sound (0.343 km/s)
  - Bullet (~1 km/s)
  - ISS orbital speed (7.66 km/s)
- Display most intuitive comparison (e.g., "42× speed of sound" or "3× ISS speed")

**Miss distance intuitive units:**
- Lunar distances (LD) as primary
- Also show: "X Earth circumferences" (1 circumference = 40,075 km)
- For very close approaches: "X× altitude of ISS" (ISS ≈ 420 km)

---

### Tab 3: Sentry Watch List
**Layout:** Card grid or ranked list, with sort controls

**Data source:** Sentry API (`all=1`)

**Default sort:** Palermo scale (cumulative), descending (highest risk first)

**Each card/row displays:**
- Object name/designation
- **Torino scale** value with color badge:
  - 0 = white/gray ("No hazard")
  - 1 = green ("Normal")
  - 2–4 = yellow ("Meriting attention")
  - 5–7 = orange ("Threatening")
  - 8–10 = red ("Certain collision")
- **Palermo scale** (cumulative) — the technical risk metric
- **Impact probability** (displayed as "1 in X" format, e.g., "1 in 2,700,000")
- **Estimated diameter** (with size comparison label)
- **Number of potential impact events**
- **Velocity** (km/s with context)
- **Observation arc** (years of data)

**Sort options:**
- Palermo scale (default)
- Impact probability
- Estimated diameter
- Number of potential impacts

**Filter:**
- Torino scale level (show all, ≥1 only, etc.)
- Minimum diameter

**Additional context:**
- Brief explainer text at top of tab: what Sentry is, what Torino/Palermo scales mean
- Tooltip or info icon for each scale explaining the rating

---

## Visual Design

### Theme: Dark Modern Minimal
- **Background:** Near-black (#0a0a0f) with subtle gradient or noise texture for depth
- **Surface/card color:** Dark gray (#14141f or similar) with slight transparency
- **Primary accent:** Cyan/teal (#00d4ff or similar) — evokes space UI, mission control
- **Danger accent:** Warm red/orange (#ff4444 / #ff8c00) — for hazardous objects
- **Safe accent:** Cool blue (#4488ff) — for non-hazardous
- **Text:** Off-white (#e8e8f0) for body, brighter white for headings
- **Typography:**
  - Headings: A distinctive sans-serif from Google Fonts (e.g., Outfit, Syne, or Chakra Petch for a techy feel)
  - Body/data: A clean monospace or sans-serif (e.g., JetBrains Mono for data, the heading font at lighter weight for prose)
- **Borders/dividers:** Subtle, 1px, low-opacity white or accent color
- **Cards:** Slight border-radius (8–12px), subtle box-shadow or border glow on hover
- **Tab bar:** Horizontal, top of page. Active tab indicated by underline or accent-color highlight. Clean, not bulky.

### Micro-interactions
- Tab transitions: smooth fade or slide
- Table rows: subtle highlight on hover
- Cards: gentle scale or glow on hover
- Globe: smooth rotation, markers pulse subtly
- Loading states: skeleton screens or a subtle spinner while APIs respond

### Responsive
- Desktop-first but should remain usable on tablet
- Globe tab: full viewport height
- Data tabs: scrollable table/cards within viewport

---

## File Structure
```
index.html      — single HTML file, all tabs
style.css       — all styles
app.js          — all JavaScript (API calls, tab switching, globe setup, table rendering, filtering/sorting)
```

Three files total. No build step. CDN dependencies only:
- globe.gl (includes Three.js): `https://unpkg.com/globe.gl`
- Google Fonts (1–2 fonts)

---

## API Key Handling
- Store the NASA API key as a constant at the top of `app.js`
- Default to `DEMO_KEY` if none provided
- Add a comment noting users should replace with their own key from api.nasa.gov for higher rate limits

---

## Error Handling
- If an API call fails, show a friendly error message in the relevant tab (not a blank screen)
- If rate-limited (NeoWs DEMO_KEY), show a message suggesting the user get a free API key
- Loading spinners/skeletons while data is fetching

---

## Summary

| Tab | Data Source | Key Features |
|-----|-----------|--------------|
| 1. Globe View | NeoWs | 3D Earth, asteroid markers at miss distance altitude, Moon reference, click-for-detail |
| 2. Close Approaches | NeoWs + SBDB | Filterable/sortable table, summary stats, size/velocity/distance context |
| 3. Sentry Watch List | Sentry | Impact risk ranking, Torino/Palermo scales, probability display, diameter context |
