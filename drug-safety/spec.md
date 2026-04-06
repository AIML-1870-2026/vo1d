# CompaRx — Drug Safety Explorer

## Overview

**CompaRx** is a side-by-side drug comparison tool that queries the OpenFDA API in real time to help users explore drug safety information. It is designed for a general audience — patients, caregivers, students, and curious people — not just clinicians. The visual tone is **accessible and friendly**: warm, approachable, and confidence-inspiring without being clinical or intimidating.

---

## Core Interaction Model

Two drugs, side by side. The user selects two medications via autocomplete search fields, and CompaRx loads their safety profiles into a tabbed comparison interface.

---

## Tech Stack

- **Pure HTML / CSS / JavaScript** — no frameworks (React, Vue, etc.)
- **Chart.js** via CDN (`https://cdn.jsdelivr.net/npm/chart.js`) for bar charts and data visualizations
- **Google Fonts** via CDN for typography
- **OpenFDA API** — no API key required, client-side fetch calls only
- **No build step** — the project is a single `index.html` file (or a small set of static files) that runs directly in the browser

---

## Visual Design Direction

### Tone: Accessible & Friendly
CompaRx should feel like a well-designed health-tech product — the kind of tool a patient might actually trust and use. Think: calm confidence, not sterile authority.

### Design Principles
- **Warm color palette** — soft blues, muted teals, warm grays. Avoid harsh clinical whites. Use color intentionally to encode meaning (e.g., severity levels).
- **Rounded UI elements** — rounded corners on cards, buttons, and modals. Nothing sharp or aggressive.
- **Generous whitespace** — let the data breathe. Dense safety information needs room.
- **Typography** — pair a distinctive, friendly display font (for headings and the logo) with a highly legible body font. Avoid Inter, Roboto, Arial. Consider fonts like:
  - Display: **Outfit**, **Plus Jakarta Sans**, **Nunito**, or **Sora**
  - Body: **Source Sans 3**, **Lato**, or **Karla**
- **Micro-interactions** — subtle hover states, smooth tab transitions, gentle fade-ins on data load. Nothing flashy, but enough to feel polished.
- **Iconography** — use simple, recognizable icons (ⓘ for help buttons, pill/capsule for drug identity, chart icons for tabs). Consider Lucide icons via CDN or inline SVGs.

### Color System (CSS Variables)
```
--color-primary: #2B7A78       /* Teal — primary actions, active tabs */
--color-primary-light: #3AAFA9 /* Lighter teal — hover states */
--color-primary-dark: #17252A  /* Dark teal — headings, emphasis */
--color-background: #FAFBFC    /* Off-white page background */
--color-surface: #FFFFFF        /* Card/panel backgrounds */
--color-text: #2D3436           /* Primary text */
--color-text-secondary: #636E72 /* Secondary/muted text */
--color-border: #E0E6E8         /* Subtle borders */
--color-warning: #E17055        /* Warnings, Class I recalls */
--color-caution: #FDCB6E        /* Caution, Class II */
--color-info: #74B9FF           /* Informational, Class III */
--color-success: #00B894        /* Positive indicators */
--color-danger: #D63031         /* Serious outcomes, critical alerts */
```

---

## Page Structure

### Header
- **CompaRx** logo/wordmark (left-aligned)
- Tagline: *"Compare drug safety profiles side by side"*
- A small global **"How to Read This Data"** help button (top right) that opens a general orientation modal

### Search Area
- Two autocomplete search input fields, side by side on desktop, stacked on mobile
- Placeholder text: `"Search for a drug (e.g., Ibuprofen)"` and `"Search a second drug (e.g., Warfarin)"`
- Below the inputs: a row of **suggested pair chips** — clickable pills that auto-populate both fields:
  - Warfarin + Ibuprofen
  - Lisinopril + Metformin
  - Sertraline + Tramadol
  - Atorvastatin + Amlodipine
- A **"Compare"** button that triggers data fetching (also triggered on chip click)
- Loading state: skeleton/shimmer placeholders in the results area while data loads

### Autocomplete Behavior
- On each keystroke (debounced ~300ms), query OpenFDA:
  ```
  https://api.fda.gov/drug/label.json?search=openfda.brand_name:"QUERY"&limit=5
  ```
  Also search `openfda.generic_name` and merge/deduplicate results.
- Display a dropdown list of matching drug names below the input
- Each suggestion shows the **brand name** and **generic name** in parentheses (or vice versa)
- On selection, store both the display name and the `openfda.generic_name` value (used for API queries)

### Tab Interface
Three tabs below the search area. Tabs are **inactive/hidden until both drugs are selected and data is loaded**.

| Tab | Label | Icon |
|-----|-------|------|
| 1 | Drug Labeling | 📋 or document icon |
| 2 | Adverse Events | 📊 or chart icon |
| 3 | Co-Administration | 🔗 or link/interaction icon |

Active tab has a colored bottom border and bold text. Inactive tabs are muted. Smooth transition when switching.

---

## Tab 1: Drug Labeling

### Data Source
`/drug/label.json` — query by `openfda.generic_name`

### Layout
Side-by-side panels (two columns on desktop, stacked on mobile). Each panel contains collapsible/accordion sections for the following label fields:

| Section | API Field | Help Button |
|---------|-----------|-------------|
| Indications & Usage | `indications_and_usage` | No |
| Warnings | `warnings` | Yes — explains what warnings mean in context |
| Contraindications | `contraindications` | Yes — defines contraindications in plain language |
| Drug Interactions | `drug_interactions` | Yes — explains interaction severity and what to do |
| Adverse Reactions | `adverse_reactions` | Yes — clarifies that this is from clinical trial data, not FAERS |

### Behavior
- Each section header is clickable to expand/collapse
- Label text is rendered as-is (it's usually plain text with some formatting)
- If a field is missing or empty for a drug, display: *"No [section] data available for this drug."*
- First section (Indications & Usage) is expanded by default; others are collapsed

### Help Button: "What Drug Labels Actually Tell You"
Explains that label data comes from FDA-approved prescribing information, is reviewed before approval, and is the most authoritative source of drug safety info.

---

## Tab 2: Adverse Events

### Data Source
`/drug/event.json` — query by `patient.drug.medicinalproduct` for each drug independently

### Layout
Side-by-side panels with:

#### Top 15 Reported Adverse Events (per drug)
- **Horizontal bar chart** (Chart.js) showing the 15 most frequently reported adverse event terms
- X-axis: report count. Y-axis: event term (e.g., "NAUSEA", "HEADACHE", "FATIGUE")
- Bars colored with the drug's assigned color (Drug A = teal, Drug B = a complementary color like coral or warm amber)
- Query:
  ```
  /drug/event.json?search=patient.drug.medicinalproduct:"DRUG_NAME"&count=patient.reaction.reactionmeddrapt.exact&limit=15
  ```

#### Serious Outcome Breakdown (per drug)
- A secondary visualization (donut chart or stacked bar) showing the distribution of serious outcomes:
  - Hospitalization
  - Life-Threatening
  - Death
  - Disability
  - Congenital Anomaly
  - Other Serious
- Query using `serious` field and `seriousnesshospitalization`, `seriousnessdeath`, etc.
- Alternative approach: query with `&count=serious` to get serious vs. non-serious counts

### Help Buttons
- **ⓘ "How to Interpret Adverse Event Data"** — FAERS reports are voluntary; correlation ≠ causation; higher counts may reflect higher prescribing volume, not greater danger; report quality varies.
- **ⓘ "Why Some Drugs Have More Reports Than Others"** — explains reporting bias and prescribing volume.

---

## Tab 3: Co-Administration Analysis

### Data Source
`/drug/event.json` — query for reports where BOTH drugs appear:
```
/drug/event.json?search=patient.drug.medicinalproduct:"DRUG_A"+AND+patient.drug.medicinalproduct:"DRUG_B"&count=patient.reaction.reactionmeddrapt.exact&limit=15
```

### Layout
- **Single panel** (not side-by-side — this is about the *combination*)
- Header: *"When [Drug A] and [Drug B] are reported together"*
- **Horizontal bar chart** showing the top 15 adverse events reported in cases where both drugs appeared in the same FAERS report
- Below the chart: a **total report count** — how many FAERS reports mention both drugs together
- If zero reports exist for the pair, display a friendly message: *"No co-administration reports found for this drug pair. This may mean the combination is uncommon, not that it's safe."*

### Contextual Comparison
- Optionally (if feasible): below the co-administration chart, show a small summary comparing the top events from Tab 2 for each drug individually vs. what appears in co-administration. Highlight any events that are **disproportionately represented** in the co-administration data (i.e., events that rank higher when both drugs are taken together than either drug alone).

### Help Button
- **ⓘ "What Co-Administration Data Can Tell You"** — explains that these are FAERS reports where both drugs were listed, not controlled studies; doesn't prove interaction; can surface signals worth discussing with a healthcare provider.

---

## Help / Info Modal System

### Design
- Triggered by small **ⓘ** buttons placed inline next to section headers
- Modal: centered overlay with backdrop blur, max-width ~560px
- Close via: ✕ button (top right), clicking backdrop, pressing Escape
- Smooth fade-in/fade-out animation
- Content written in **plain, conversational language** — assume the reader has no medical or technical background

### Required Help Modals

1. **"How to Read This Data"** (global, accessible from header)
   - General orientation: what CompaRx does, where the data comes from, what it can and can't tell you, when to talk to a doctor

2. **"What Drug Labels Tell You"** (Tab 1)
   - Labels are FDA-approved prescribing information; most authoritative source; reviewed during drug approval process

3. **"Understanding Warnings & Contraindications"** (Tab 1)
   - Warnings = important safety info; contraindications = situations where the drug should NOT be used; difference between the two

4. **"Understanding Drug Interactions"** (Tab 1)
   - What an interaction is; severity spectrum; why your pharmacist asks about other meds

5. **"How to Interpret Adverse Event Data"** (Tab 2)
   - FAERS is voluntary; correlation ≠ causation; report counts ≠ incidence; popular drugs get more reports

6. **"Why Report Counts Vary"** (Tab 2)
   - Reporting bias; prescribing volume; duration on market; media attention effects

7. **"What Co-Administration Data Means"** (Tab 3)
   - Reports where both drugs appear; not causal evidence; can surface signals; consult a professional

---

## Onboarding / Empty State

When no drugs are selected, the results area shows a friendly onboarding prompt:

```
🔍 Start by searching for two medications above

Compare their safety profiles, adverse event reports, and
co-administration data — all from the FDA's public databases.

Try a suggested pair:
[ Warfarin + Ibuprofen ] [ Lisinopril + Metformin ] [ Sertraline + Tramadol ]
```

The suggested pair chips are the same ones shown below the search inputs.

---

## Footer

- **Disclaimer:** *"CompaRx is an educational tool. It is not intended to provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before making decisions about your medications."*
- **FDA Attribution:** *"This product uses publicly available data from the U.S. Food and Drug Administration (FDA). FDA is not responsible for the product and does not endorse or recommend this or any other product."*
- **Data source link:** [open.fda.gov](https://open.fda.gov)

---

## Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Drug not found in OpenFDA | Display: *"We couldn't find [drug name] in the FDA database. Try a different spelling or the generic name."* |
| API returns empty results for a field | Display: *"No [data type] available for [drug name]."* with a brief explanation of why data might be missing |
| API rate limit hit (240 req/min) | Display a temporary message: *"We're fetching data too quickly. Please wait a moment and try again."* |
| Network error / API down | Display: *"Unable to connect to the FDA database. Please check your connection and try again."* |
| Both search fields have the same drug | Allow it (user might want to see the data), but display a subtle note: *"You're comparing a drug with itself."* |
| Very long label text | Cap displayed text with a "Show more / Show less" toggle |

---

## Responsive Design

- **Desktop (>1024px):** Side-by-side layout for search fields and comparison panels
- **Tablet (768–1024px):** Side-by-side search fields, panels may shrink
- **Mobile (<768px):** Stacked search fields, stacked comparison panels, tabs become horizontally scrollable if needed

---

## Performance Considerations

- **Debounce** autocomplete queries (300ms) to avoid hammering the API
- **Cache** API responses in a session-level JS object — if the user switches tabs, don't re-fetch data
- **Abort controller** — cancel in-flight API requests if the user changes their search before results return
- **Progressive loading** — render each tab's data as it arrives; don't block the whole UI waiting for all three endpoints

---

## File Structure

```
/
├── index.html          # Main page structure
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── app.js          # Main app logic, state management, tab switching
│   ├── api.js          # OpenFDA API query functions and caching
│   ├── autocomplete.js # Search autocomplete logic
│   ├── charts.js       # Chart.js configuration and rendering
│   ├── modals.js       # Help modal system
│   └── utils.js        # Debounce, formatting, error handling utilities
└── README.md           # Project documentation
```

---

## Required Attributions & Disclaimers

1. Educational purpose disclaimer (in footer)
2. FDA attribution text (in footer, exact wording specified above)
3. Chart.js attribution (in README.md)
4. FAERS data limitation notice (in adverse events tab and co-administration tab)
