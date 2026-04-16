# Science Experiment Generator — Spec

## Project Overview

A static webpage (HTML, CSS, and JavaScript only — no server, no build step, no npm) that lets a user generate grade-appropriate K-12 science experiments using the OpenAI API. The user uploads a `.env` file containing their OpenAI API key, picks a grade level, types in a list of supplies they have on hand, and the app returns a full experiment rendered on the page. The page is retro-chemistry-set themed.

The project runs entirely in the browser. The user's API key is read in-memory only and is never stored, persisted, or transmitted anywhere except in the direct `fetch()` call to OpenAI.

---

## Reference Implementation

The `temp/` folder contains a minimal reference implementation — a stripped-down "mini Switchboard" — that demonstrates the core patterns this project should follow. This is **NOT** part of the current project and should not be included in the final build or deployment.

Use `temp/` as a reference for:

- How to parse a `.env` file for API keys (in-memory only, no persistence)
- The `fetch()` call structure for OpenAI's chat completions API
- Error handling patterns for failed API requests
- How the code is organized across separate HTML / CSS / JS files
- The general approach to building a single-page LLM tool

Ignore anything in `temp/` related to:

- Anthropic integration (this project is OpenAI-only)
- Provider-switching dropdowns
- Structured output / JSON schema handling

This project uses unstructured (free-form) responses only and renders the model's markdown output as formatted HTML.

---

## File Structure

```
/
├── index.html
├── styles.css
├── app.js
├── spec.md
└── temp/              (reference only — do not deploy)
    ├── index.html
    ├── styles.css
    └── app.js
```

Separate files are required — no inline `<style>` or `<script>` blocks in `index.html` beyond the bare minimum needed to link them.

---

## User Flow

### 1. Gate Screen (initial state)

When the page first loads, the user sees **only** a centered upload gate. The main app UI is not visible or rendered yet.

The gate contains:

- The app title and a short tagline
- A file input for uploading a `.env` file
- A brief note explaining that the key is read in-memory only and never stored
- An error message area (hidden by default) for invalid `.env` files

### 2. Key Loaded → Main App Revealed

Once a valid `.env` file is parsed and an OpenAI API key is extracted:

- The gate disappears
- The main app UI is revealed
- A small persistent indicator somewhere in the header shows the key is loaded (e.g. a small "🔬 Key loaded" badge) with a "Change key" link that returns the user to the gate screen

### 3. Main App

The main app has three sections:

**Input area:**

- **Grade Level** — dropdown with these options:
  - K-2
  - 3-5
  - 6-8
  - 9-12
- **Available Supplies** — single-line text input. The user enters supplies separated by commas. Spacing and capitalization should not matter — the app should normalize input (trim whitespace, collapse multiple spaces, split on commas, strip empty entries) before sending to the model.
- **Model** — dropdown with these options:
  - `gpt-4o-mini` (default — fast and cheap)
  - `gpt-4o` (higher quality)
  - `gpt-5` (premium)
- **Generate Experiment** button

**Results area:**

- Initially empty with a subtle placeholder like "Your experiment will appear here."
- While a request is in flight, shows the flask-filling loading animation
- When the response arrives, renders the markdown-formatted experiment as HTML
- If an error occurs, the error displays here instead of the experiment (see Error Handling below)
- Below a successful experiment, a **Download as PDF** button appears

### 4. Persistence Within Session

- Grade level, supplies, and model selection stay populated after generation — the user can tweak one field and regenerate without re-entering everything
- Nothing persists across page reloads — the key, inputs, and results all reset
- No `localStorage`, no `sessionStorage`, no cookies

---

## The Prompt

The system prompt sent to OpenAI should instruct the model to act as a K-12 science educator. The user prompt assembles the grade level and supplies.

**System prompt (approximate):**

> You are a K-12 science educator designing hands-on experiments for students. Given a grade level and a list of available supplies, generate a single age-appropriate science experiment that uses only those supplies (plus universally available items like water, paper, or a pen/pencil). The experiment should be safe for the specified grade level — avoid fire, sharp objects, toxic chemicals, or anything requiring adult supervision beyond normal classroom oversight unless clearly appropriate for the grade. Format your response in markdown with the following sections:
>
> - **Title** (a catchy experiment name)
> - **Grade Level**
> - **Scientific Concept** (one or two sentences on what the experiment demonstrates)
> - **Hypothesis** (a testable prediction, phrased in age-appropriate language)
> - **Materials** (bulleted list of what's needed)
> - **Procedure** (numbered steps)
> - **What's Happening** (age-appropriate explanation of the underlying science)
> - **Extension Questions** (2-3 questions to deepen student thinking)

**User prompt:**

> Grade level: `{grade}`
> Available supplies: `{normalized_supplies_list}`

---

## Markdown Rendering

Claude Code should pick a lightweight markdown library (suggestion: `marked.js` via CDN — it's tiny, has no dependencies, and handles everything needed here). The library must be loaded via CDN from `<script>` tag in `index.html`. No npm, no bundling.

The rendered HTML should be sanitized or inserted in a way that won't execute scripts from the model's output — in practice this means using the library's safe-rendering option.

---

## Error Handling

All errors display in the **results area** (replacing whatever was there before) with a clear retro-chemistry styled error card. Handle at minimum:

- **Invalid `.env` file** (can't parse, no key found) — shown on the gate screen, not the results area
- **Malformed API key** (OpenAI returns 401) — "Your API key looks invalid. Check it and re-upload your .env file." Include a direct link to the gate screen.
- **Rate limit / quota exceeded** (OpenAI returns 429) — "You've hit OpenAI's rate limit or run out of credits. Wait a moment or check your account."
- **Network failure** (`fetch` rejects) — "Couldn't reach OpenAI. Check your internet connection."
- **Any other error** — show the raw error message so the user has something useful to debug with.

Errors should never crash the app or leave the loading animation stuck. The generate button must always return to its normal state.

---

## PDF Download

When an experiment has been successfully generated, a **Download as PDF** button appears below the rendered experiment.

Clicking the button produces a printable PDF of the experiment. Recommended approach: use the browser's built-in `window.print()` with a dedicated print stylesheet that:

- Hides the form, header, loader, and download button itself
- Shows only the rendered experiment
- Uses a clean, readable print-friendly style (standard serif type, black text on white background — overriding the retro theme for print readability)
- Fits well on standard letter paper

The user then selects "Save as PDF" in the browser's print dialog. This requires zero external libraries and works everywhere.

Alternative if a library is preferred: `html2pdf.js` via CDN. Claude Code can pick based on simplicity.

---

## Visual Design — Retro Chemistry Set Theme

The aesthetic is a vintage chemistry set from the 1950s-60s: warm cream/parchment backgrounds, bold primary colors (deep red, mustard yellow, teal, burnt orange), serif display type for headings, and subtle period-appropriate illustrations or iconography (flasks, beakers, molecular diagrams, periodic table fragments).

**Palette suggestions:**

- Background: warm cream `#f4ead5` or parchment
- Primary text: near-black or deep brown `#2a1f14`
- Accent 1 (headings, buttons): deep red `#a63a2a`
- Accent 2: mustard `#d4a017`
- Accent 3: teal `#2d6b6b`
- Error state: a darker, more saturated red than the accent

**Typography:**

- Headings: a retro serif or slab-serif display face (suggestion: Google Fonts — `Fraunces`, `Playfair Display`, or `DM Serif Display`)
- Body: a readable serif or slab (suggestion: `Lora` or `Roboto Slab`)
- Monospace for any technical bits: `JetBrains Mono` or similar

**Decorative elements:**

- Subtle beaker/flask/molecule SVG icons in corners or section dividers
- Hand-drawn-feel borders or dividers between sections
- Buttons styled like retro lab labels or vintage poster callouts

**Loader:**

A flask-filling animation in the results area while awaiting the API response. Implementation approach: an SVG flask outline, with a liquid-colored `<rect>` (or `<path>`) inside it that animates its height or `y` position from empty to full, looping. Bubbles (small animated circles) rising inside the liquid add life. The liquid color can shift hue over the loop for a "reacting" feel. CSS animations only — no JavaScript animation loop.

---

## OpenAI API Call

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Method: `POST`
- Headers:
  - `Authorization: Bearer {key}`
  - `Content-Type: application/json`
- Body: `{ model, messages: [{role: "system", ...}, {role: "user", ...}] }`
- No streaming — wait for the full response, then render

---

## Deployment

Deploy to the class's GitHub organization as a GitHub Pages static site. The `temp/` folder should be excluded from deployment (either via `.gitignore` in `temp/` being re-added for the deployed repo, or by placing `temp/` outside the deployed directory — Claude Code can decide cleanest approach).

---

## Out of Scope

- No backend, no server, no Node.js, no build step
- No `localStorage`/`sessionStorage`/cookies
- No provider switching (OpenAI only)
- No structured JSON output
- No user accounts, no history, no saved experiments beyond the current session
- No streaming responses
- No rate limiting / throttling (the user controls their own usage)
- No accessibility beyond what comes for free with semantic HTML
