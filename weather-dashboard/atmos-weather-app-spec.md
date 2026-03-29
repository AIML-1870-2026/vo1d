# Atmos — Live Weather App
## Product Specification Document

---

## 1. Overview

**Atmos** is a single-page weather application that delivers real-time weather data, multi-day forecasts, and severe weather alerts for any city worldwide. The app pulls data from the OpenWeatherMap API and presents it through a polished, responsive interface with fluid animations and a distinctive atmospheric visual identity.

**API Key:** `3593e28ff9d2962ebba7c2ec59837bcc`  
**API Provider:** OpenWeatherMap (https://openweathermap.org/api)

---

## 2. Core Features

### 2.1 City Search
- Text input field with autocomplete/suggestion support using the OpenWeatherMap Geocoding API (`/geo/1.0/direct`).
- Accepts city name, optionally with state/country code (e.g., "Omaha", "Omaha, NE, US").
- Debounced input (300ms) to limit API calls during typing.
- Search history persisted in `localStorage` — last 5 searched cities displayed as quick-access chips below the search bar.
- On submit or suggestion selection, fetches weather data for the resolved coordinates (lat/lon).

### 2.2 Current Conditions
- **Data source:** `/data/2.5/weather` endpoint.
- Displayed fields:
  - City name and country code
  - Current temperature (large, dominant display)
  - "Feels like" temperature
  - Weather condition description and corresponding icon (OpenWeatherMap icon set or custom-mapped SVG icons)
  - Humidity (%)
  - Wind speed and direction (with compass arrow visual)
  - Atmospheric pressure (hPa)
  - Visibility (km or mi, matched to unit preference)
  - Cloud cover (%)
  - UV Index (fetched from One Call API if available on the plan tier)

### 2.3 5-Day / 3-Hour Forecast
- **Data source:** `/data/2.5/forecast` endpoint (free tier).
- Horizontal scrollable card strip showing 3-hour intervals for the next 24 hours.
- Below that, a 5-day daily summary view:
  - Each day shows high/low temperature, dominant weather icon, and precipitation probability.
  - Daily summaries derived by aggregating the 3-hour intervals (max temp, min temp, most frequent condition).
- Temperature trend visualized as a subtle sparkline or bar graph spanning the 5 days.

### 2.4 Unit Toggle — Fahrenheit / Celsius
- Toggle switch in the header/nav area, always visible.
- Default unit determined by browser locale (US → °F, else → °C) with manual override.
- Toggling re-renders all temperature displays instantly (client-side conversion, no re-fetch).
- Conversion formulas:
  - `°F = (°C × 9/5) + 32`
  - `°C = (°F − 32) × 5/9`
- Wind speed converts between mph (imperial) and m/s (metric) in tandem.
- Unit preference persisted in `localStorage`.

### 2.5 Weather Warnings & Alerts
- **Data source:** OpenWeatherMap One Call API 3.0 (`/data/3.0/onecall`) — `alerts` array. If plan tier restricts this, fall back to National Weather Service API (`https://api.weather.gov/alerts/active?point={lat},{lon}`) for US locations.
- Alert card rendered prominently at top of the weather display when active alerts exist.
- Each alert shows:
  - Alert type/event name (e.g., "Severe Thunderstorm Warning", "Heat Advisory")
  - Severity level with color coding:
    - **Extreme** → red
    - **Severe** → orange
    - **Moderate** → yellow
    - **Minor** → blue
  - Issuing authority (e.g., "NWS Omaha")
  - Effective and expiration timestamps
  - Expandable description with full alert text (collapsed by default)
- If no alerts are active, display a subtle green "No active alerts" badge.
- Risk assessment panel: a simple qualitative summary ("Low risk", "Moderate risk", "High risk") derived from active alert count and severity.

---

## 3. Additional Features

### 3.1 Air Quality Index (AQI)
- **Data source:** `/data/2.5/air_pollution` endpoint.
- Displayed as a color-coded gauge or badge (1 = Good → 5 = Very Poor, following OpenWeatherMap's scale).
- Pollutant breakdown (PM2.5, PM10, O₃, NO₂, SO₂, CO) shown in an expandable detail panel.
- Health recommendation text mapped to each AQI level (e.g., "Air quality is satisfactory" through "Health alert: everyone may experience serious health effects").

### 3.2 Sunrise / Sunset & Golden Hour
- Sunrise and sunset times pulled from current weather data (`sys.sunrise`, `sys.sunset`).
- Displayed with a visual arc showing current sun position relative to the horizon.
- Golden hour windows calculated:
  - Morning golden hour: sunrise → sunrise + 1 hour
  - Evening golden hour: sunset − 1 hour → sunset
- Useful contextual note for photographers or outdoor planners.

### 3.3 Weather Map Layer
- Embedded interactive map tile layer using Leaflet.js.
- Map centered on the searched city coordinates.
- Toggleable overlay layers from OpenWeatherMap Tile API (`/map/2.0/`):
  - Precipitation
  - Temperature
  - Wind speed
  - Cloud cover
  - Pressure
- Layer selector control in the map corner.

### 3.4 "What to Wear" Suggestion
- Lightweight rule-based recommendation engine based on current conditions:
  - Temperature ranges → clothing suggestions (e.g., <0°C: "Heavy winter coat, gloves, hat", 0–10°C: "Warm jacket and layers", etc.)
  - Rain/snow conditions → "Bring an umbrella" / "Wear waterproof boots"
  - High wind → "Wear a windbreaker"
  - High UV → "Sunscreen and sunglasses recommended"
- Displayed as a friendly card with clothing/accessory icons.

### 3.5 Geolocation Support
- "Use my location" button that triggers `navigator.geolocation.getCurrentPosition()`.
- On permission grant, reverse-geocodes coordinates to city name via OpenWeatherMap Geocoding API (`/geo/1.0/reverse`).
- Fetches weather for detected location automatically.

---

## 4. Technical Architecture

### 4.1 Stack
| Layer | Technology |
|---|---|
| Framework | React (single-page app via `.jsx` artifact or standalone HTML/JS) |
| Styling | Tailwind CSS utility classes + CSS custom properties for theming |
| HTTP | Native `fetch` API with async/await |
| Maps | Leaflet.js (CDN) |
| Charts | Chart.js or Recharts (for temperature sparklines) |
| Icons | Lucide React or custom SVG weather icons |
| State | React `useState` / `useReducer` — no external state library |
| Persistence | `localStorage` for unit preference and search history |

### 4.2 API Endpoints Used

| Endpoint | Purpose | Params |
|---|---|---|
| `GET /geo/1.0/direct` | City name → coordinates | `q`, `limit`, `appid` |
| `GET /geo/1.0/reverse` | Coordinates → city name | `lat`, `lon`, `appid` |
| `GET /data/2.5/weather` | Current conditions | `lat`, `lon`, `units`, `appid` |
| `GET /data/2.5/forecast` | 5-day / 3-hour forecast | `lat`, `lon`, `units`, `appid` |
| `GET /data/2.5/air_pollution` | Air quality index | `lat`, `lon`, `appid` |
| `GET /data/3.0/onecall` | Alerts (if plan permits) | `lat`, `lon`, `appid` |
| `GET /map/2.0/weather/{layer}/{z}/{x}/{y}` | Map tile overlays | `appid` |
| `GET https://api.weather.gov/alerts/active` | NWS alerts fallback (US only) | `point={lat},{lon}` |

### 4.3 Data Flow

```
User Input (city name or geolocation)
        │
        ▼
  Geocoding API  ──►  Resolve (lat, lon)
        │
        ├──►  Current Weather API   ──►  Render current conditions
        ├──►  Forecast API          ──►  Render hourly + daily forecast
        ├──►  Air Pollution API     ──►  Render AQI card
        ├──►  Alerts API            ──►  Render warning banners
        └──►  Map Tile Layer        ──►  Render weather map
```

### 4.4 Error Handling
- **Invalid city:** Display inline error message ("City not found — check spelling or try adding a country code").
- **API rate limit (429):** Display a toast notification with retry timer.
- **Network failure:** Graceful fallback message with retry button.
- **Geolocation denied:** Inform user and fall back to manual city entry.
- **Missing alert data:** If One Call API is unavailable, attempt NWS fallback for US coordinates; for non-US, display "Alert data unavailable for this region."

---

## 5. UI / UX Design Direction

### 5.1 Aesthetic
- **Theme:** Atmospheric, moody, slightly editorial. Think weather as *experience*, not just data.
- **Color palette:** Dark base (#0a0f1a) with cool blue-gray tones. Weather-condition-reactive accent colors:
  - Clear/sunny → warm amber (#f59e0b)
  - Cloudy → muted slate (#94a3b8)
  - Rain → deep teal (#0d9488)
  - Snow → icy white-blue (#bfdbfe)
  - Thunderstorm → electric violet (#7c3aed)
- **Typography:**
  - Display / temperature: `"Instrument Sans"` or `"Space Mono"` — large, bold, confident.
  - Body text: `"DM Sans"` — clean, legible.
- **Motion:** Subtle fade-in on data load, gentle parallax on background weather animations (CSS-only rain, snow, or cloud drift depending on current condition).

### 5.2 Layout (Desktop)
```
┌──────────────────────────────────────────────────────┐
│  [Logo: Atmos]         [Search Bar]     [°F/°C] [📍] │
├──────────────────────────────────────────────────────┤
│  ⚠️ WEATHER ALERT BANNER (conditional)               │
├──────────────┬───────────────────────────────────────┤
│              │                                       │
│  CURRENT     │   HOURLY FORECAST (scrollable strip)  │
│  CONDITIONS  │───────────────────────────────────────│
│  (big temp,  │   5-DAY FORECAST (daily cards)        │
│   icon,      │───────────────────────────────────────│
│   details)   │   AQI  │  SUNRISE/SUNSET  │  WEAR    │
│              │        │     ARC          │  SUGGEST  │
├──────────────┴───────────────────────────────────────┤
│  WEATHER MAP (Leaflet, full-width, collapsible)      │
└──────────────────────────────────────────────────────┘
```

### 5.3 Layout (Mobile)
- Single-column stack: Search → Alert → Current → Hourly → Daily → AQI / Sun / Wear → Map.
- Search bar sticky at top on scroll.
- Horizontal scroll preserved for hourly forecast strip.
- Map collapsed by default with "Show Map" button.

### 5.4 Accessibility
- All interactive elements keyboard-navigable.
- ARIA labels on icon-only buttons (geolocation, unit toggle).
- Color-coded elements (alerts, AQI) also include text labels — never color-only.
- Minimum contrast ratio 4.5:1 on all text.

---

## 6. State Shape (React)

```js
{
  // Search
  query: "",
  suggestions: [],          // from geocoding API
  searchHistory: [],        // persisted, max 5

  // Location
  location: {
    name: "Omaha",
    country: "US",
    lat: 41.2565,
    lon: -95.9345
  },

  // Weather data
  current: { ... },         // /data/2.5/weather response
  forecast: { ... },        // /data/2.5/forecast response
  airQuality: { ... },      // /data/2.5/air_pollution response
  alerts: [],               // from onecall or NWS

  // UI
  units: "imperial",        // "imperial" | "metric"
  loading: false,
  error: null,
  mapLayer: "precipitation",
  mapExpanded: true
}
```

---

## 7. Implementation Priorities

### Phase 1 — MVP
1. City search with geocoding
2. Current conditions display
3. °F / °C toggle with localStorage persistence
4. 5-day forecast (daily view)

### Phase 2 — Alerts & Hourly
5. Weather alerts/warnings panel
6. Hourly forecast (3-hour intervals, scrollable)
7. Geolocation ("Use my location")

### Phase 3 — Enrichment
8. Air Quality Index card
9. Sunrise/sunset arc
10. "What to Wear" suggestion engine
11. Weather map with tile overlays

### Phase 4 — Polish
12. Condition-reactive background animations (rain, snow, clouds)
13. Responsive mobile layout refinement
14. Search history chips
15. Loading skeletons and transition animations

---

## 8. Known Constraints

- **Free tier limits:** OpenWeatherMap free tier allows 60 calls/min and 1,000 calls/day. The One Call API 3.0 requires a subscription (1,000 calls/day free with credit card on file). If unavailable, alerts fall back to NWS (US only).
- **Map tiles:** Weather map tiles (`/map/2.0/`) require an API key and may have separate rate limits. Standard OpenStreetMap tiles used as the base layer are free.
- **No server:** This is a client-side-only app. The API key is embedded in frontend code. For a production deployment, proxy requests through a backend to protect the key.
- **localStorage:** Used for preferences and history only. Not suitable for sensitive data. Falls back gracefully if storage is unavailable (e.g., incognito mode) — defaults applied, history not persisted.

---

## 9. File Deliverable

Final implementation should be a single `.jsx` React artifact (or standalone `.html` file with inline JS) that can be rendered directly in the Claude artifact viewer or deployed as a static page.
