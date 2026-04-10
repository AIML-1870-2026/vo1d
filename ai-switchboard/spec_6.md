# LLM Switchboard — spec.md

## Project Overview

A single-file (`index.html`) LLM Switchboard web app that lets users send prompts to large language model APIs and view responses in both unstructured (free text) and structured (JSON schema) output modes. The app supports side-by-side model comparison and a real-time metrics dashboard. The entire UI is themed as a cyberpunk neon terminal — a glowing monitor within a monitor — dark backgrounds, neon accents, scanline textures, and monospace typography that makes the user feel like they're operating a terminal inside a game world.

---

## Visual Identity & Theme

- **Aesthetic:** Cyberpunk neon terminal. Dark (#0a0a0f–#111125 range) backgrounds with neon cyan, magenta, and green glowing accents. The app should feel like a monitor embedded inside another monitor — a framed "screen" element centered on the page with subtle CRT-style edge vignetting or scanline overlay.
- **Typography:** `Orbitron` for headings/labels (display), `Share Tech Mono` for code/output/response areas (monospace), `Rajdhani` for body text and UI controls.
- **Borders & Glow:** Panels use thin neon-colored borders with CSS box-shadow glow effects. Active/focused elements intensify the glow.
- **Animations:** Subtle pulsing glow on active elements, a faint scanline CSS animation scrolling over the "monitor" frame, and smooth fade-in transitions for responses loading in.
- **Layout:** The outer page is the "desk." A centered container acts as the "monitor bezel." All UI lives inside this bezel, reinforcing the monitor-within-a-monitor concept.

---

## API Key Handling

- **Input Method:** Paste-only text fields. One field for OpenAI, one for Anthropic.
- **Storage:** In-memory only (JavaScript variables). Keys are never written to localStorage, cookies, or any persistent storage.
- **Privacy Indicator:** A small lock icon and label next to each field reading "In-memory only — never stored" to reassure users.
- **Validation:** On entry, run a lightweight format check (OpenAI keys start with `sk-`, Anthropic keys start with `sk-ant-`). Display a green neon checkmark on valid format, red on invalid.
- **Visibility Toggle:** A show/hide toggle (eye icon) on each key field so users can verify what they pasted.

---

## Provider & Model Selection

### OpenAI
- Models: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`
- All calls go directly to `https://api.openai.com/v1/chat/completions`
- Structured output uses OpenAI's `response_format` parameter with `json_schema` type

### Anthropic
- Models: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307`
- **CORS Limitation:** Anthropic's API does not allow direct browser-side requests. When a user selects Anthropic and attempts to send a prompt, the app should:
  - NOT attempt the API call
  - Display a styled, themed explanation panel describing the CORS restriction
  - Explain that Anthropic's API is designed for server-side calls and that a backend proxy would be needed for browser integration
  - Keep the UI functional (model selector, prompt area) so the layout doesn't break — just intercept at the send step

### UI
- A provider toggle (styled as a neon switch or segmented control) at the top of the prompt area: `OpenAI | Anthropic`
- A model dropdown below the toggle that dynamically updates based on selected provider
- Provider switch should have distinct color coding: cyan glow for OpenAI, magenta glow for Anthropic

---

## Output Modes

### Unstructured Mode (default)
- The user types a prompt, sends it, and the LLM response renders as free-form text in a styled output panel.
- Response text displays in monospace font inside a dark terminal-style box with a neon top-border accent.
- Support basic markdown rendering (bold, italic, headers, code blocks, lists) for readability.

### Structured Mode
- A toggle switches the UI into structured mode. When active:
  - A **JSON Schema Editor** panel appears alongside (or above) the prompt area. This is a textarea where the user defines or edits the JSON schema that the model's response must conform to.
  - **Schema Templates** — a dropdown of pre-loaded templates the user can select to auto-populate the schema editor (see Example Schemas below).
  - The prompt is sent with instructions telling the model to respond strictly in JSON matching the provided schema.
  - The response is parsed as JSON and displayed in a syntax-highlighted, formatted code block.
  - If the response isn't valid JSON, display a warning with the raw text fallback.

### Mode Toggle UI
- A neon-styled toggle switch labeled `FREEFORM` / `STRUCTURED` — visually distinct states with different glow colors (e.g., cyan for freeform, green for structured).

---

## Example Prompts

Pre-loaded prompts accessible via a dropdown or clickable chip/button row. Selecting one populates the prompt textarea. All prompts are gaming/player-facing:

1. **"Tier List Generator"** — "Create a tier list ranking the weapons in [game]. For each weapon, include its tier (S/A/B/C/D), a one-sentence reason, and a recommended playstyle."
2. **"Build Guide"** — "Write a detailed build guide for a [class/character] in [game]. Include stat allocation, key equipment, skill priority, and early/mid/late game strategy."
3. **"Boss Strategy Breakdown"** — "Analyze the boss fight against [boss name] in [game]. Cover the attack patterns, optimal loadout, phase transitions, and common mistakes players make."
4. **"Loadout Optimizer"** — "Here's my current loadout: [paste loadout]. Analyze its strengths and weaknesses, and suggest specific swaps to improve it for [activity type: PvP/PvE/Raid]."
5. **"Game Mechanic Explainer"** — "Explain how [mechanic name] works in [game] as if I'm a new player. Include how it interacts with other systems and any hidden depth most players miss."
6. **"Patch Notes Analyst"** — "Here are the latest patch notes for [game]: [paste notes]. Summarize the biggest meta shifts, which builds got buffed/nerfed, and what players should change about their playstyle."

---

## Example Schemas (Structured Mode Templates)

Pre-loaded JSON schema templates selectable from a dropdown:

### 1. Weapon Tier List Entry
```json
{
  "type": "object",
  "properties": {
    "weapon_name": { "type": "string" },
    "tier": { "type": "string", "enum": ["S", "A", "B", "C", "D"] },
    "damage_type": { "type": "string" },
    "best_for": { "type": "string" },
    "reason": { "type": "string" }
  },
  "required": ["weapon_name", "tier", "damage_type", "best_for", "reason"]
}
```

### 2. Character Build
```json
{
  "type": "object",
  "properties": {
    "character_class": { "type": "string" },
    "game": { "type": "string" },
    "stats": {
      "type": "object",
      "properties": {
        "primary_stat": { "type": "string" },
        "secondary_stat": { "type": "string" },
        "dump_stat": { "type": "string" }
      }
    },
    "equipment": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "slot": { "type": "string" },
          "item_name": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "skill_priority": {
      "type": "array",
      "items": { "type": "string" }
    },
    "playstyle_summary": { "type": "string" }
  },
  "required": ["character_class", "game", "stats", "equipment", "skill_priority", "playstyle_summary"]
}
```

### 3. Boss Fight Analysis
```json
{
  "type": "object",
  "properties": {
    "boss_name": { "type": "string" },
    "game": { "type": "string" },
    "difficulty_rating": { "type": "integer", "minimum": 1, "maximum": 10 },
    "phases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "phase_number": { "type": "integer" },
          "description": { "type": "string" },
          "key_attacks": { "type": "array", "items": { "type": "string" } },
          "strategy": { "type": "string" }
        }
      }
    },
    "recommended_loadout": { "type": "string" },
    "common_mistakes": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["boss_name", "game", "difficulty_rating", "phases", "recommended_loadout", "common_mistakes"]
}
```

### 4. Patch Meta Shift
```json
{
  "type": "object",
  "properties": {
    "game": { "type": "string" },
    "patch_version": { "type": "string" },
    "buffs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "target": { "type": "string" },
          "change": { "type": "string" },
          "impact": { "type": "string", "enum": ["minor", "moderate", "major", "meta-defining"] }
        }
      }
    },
    "nerfs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "target": { "type": "string" },
          "change": { "type": "string" },
          "impact": { "type": "string", "enum": ["minor", "moderate", "major", "meta-defining"] }
        }
      }
    },
    "meta_summary": { "type": "string" }
  },
  "required": ["game", "patch_version", "buffs", "nerfs", "meta_summary"]
}
```

---

## Side-by-Side Model Comparison (Stretch)

- A "Compare Mode" toggle in the top toolbar. When active:
  - The output area splits into two equal side-by-side panels.
  - Each panel has its own provider and model selector (independent of each other).
  - The prompt textarea is shared — one prompt goes to both models simultaneously.
  - Both requests fire in parallel (`Promise.all`). Each panel shows a loading spinner independently and renders its response when ready.
  - Metrics display below each respective panel for direct comparison.
- When Compare Mode is off, the UI collapses back to a single output panel.
- If one of the two selected providers is Anthropic, that panel shows the CORS explanation while the other panel returns its response normally.

---

## Response Metrics Dashboard (Stretch)

A collapsible metrics bar that appears below the response area after each request. Displays:

- **Response Time:** Measured client-side from request send to response received (in ms).
- **Token Count:** Extracted from the API response metadata (`usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` for OpenAI). If unavailable, estimate from response character count.
- **Response Length:** Character count and word count of the response body.
- **Estimated Cost:** Calculated from token counts using approximate per-token pricing:
  - `gpt-4o`: ~$2.50/1M input, ~$10.00/1M output
  - `gpt-4o-mini`: ~$0.15/1M input, ~$0.60/1M output
  - `gpt-4-turbo`: ~$10.00/1M input, ~$30.00/1M output
  - `gpt-3.5-turbo`: ~$0.50/1M input, ~$1.50/1M output
  - Anthropic models: display "N/A — CORS restricted" when applicable

### Metrics UI
- Styled as a horizontal neon-bordered stat bar with icon+value pairs.
- Each metric has a small label and a large monospace value.
- In Compare Mode, each panel gets its own metrics row so users can directly compare speed, cost, and verbosity.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No API key entered | Disable send button; tooltip: "Enter an API key to begin" |
| Invalid key format | Red border on key field; inline message: "Key format not recognized" |
| API returns 401 | Display in output panel: "Authentication failed — check your API key" |
| API returns 429 | Display: "Rate limited — wait a moment and try again" |
| API returns 500+ | Display: "Server error on the provider's end — try again shortly" |
| Network failure | Display: "Network error — check your connection" |
| Anthropic CORS block | Display themed CORS explanation panel (see Provider section) |
| Structured mode returns non-JSON | Show warning banner + raw response as fallback |
| Request timeout (>30s) | Abort request; display: "Request timed out" |

All error messages should be styled consistently — neon red/orange accent border, warning icon, and clear language.

---

## Layout Structure (Top to Bottom)

1. **Monitor Bezel Frame** — Outer wrapper styled as a CRT/cyberpunk monitor. Faint scanline overlay, vignette edges, subtle border glow.
2. **Title Bar** — App name "LLM SWITCHBOARD" in Orbitron. Neon underline. Small subtitle: "// NEON_TERMINAL v1.0"
3. **API Key Bar** — Collapsible section. Two paste fields (OpenAI / Anthropic) with format validation and lock icon labels.
4. **Toolbar Row** — Provider toggle, model dropdown, output mode toggle (Freeform/Structured), Compare Mode toggle.
5. **Prompt Area** — Large textarea for user prompt. Example prompt selector (dropdown or chip row) above it.
6. **Schema Editor** (visible in Structured mode only) — Textarea with schema template dropdown. Sits beside or below the prompt area.
7. **Send Button** — Large, neon-glowing, centered. Pulses gently when ready. Disabled + dimmed when no key is entered.
8. **Output Area** — Single panel in normal mode, split side-by-side in Compare Mode. Terminal-styled dark boxes with neon top accents. Markdown-rendered for unstructured, syntax-highlighted JSON for structured.
9. **Metrics Dashboard** — Horizontal stat bar below output. Shows response time, tokens, length, cost. Duplicated per-panel in Compare Mode.

---

## Technical Notes

- **Single file:** Everything (HTML, CSS, JS) lives in one `index.html`.
- **No frameworks:** Vanilla HTML/CSS/JS only. No React, no build tools.
- **Fonts:** Loaded from Google Fonts (Orbitron, Share Tech Mono, Rajdhani).
- **API Calls:** Fetch API with appropriate headers. OpenAI calls go direct. Anthropic calls are intercepted before sending.
- **Structured Output (OpenAI):** Use `response_format: { type: "json_schema", json_schema: { name: "schema_name", strict: true, schema: <user_schema> } }` in the request body.
- **Markdown Rendering:** Lightweight custom parser or a small inline library (e.g., marked.js via CDN) for rendering unstructured responses.
- **JSON Syntax Highlighting:** Custom CSS-based highlighting or a minimal inline solution — no heavy dependencies.
- **Deploy Target:** GitHub Pages (static hosting, no server).
