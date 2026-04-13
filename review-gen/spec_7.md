# Product Review Generator — spec.md

## Project Overview

A clean, minimal single-page web application that lets a user generate product reviews using OpenAI's language models. The user provides product details and preferences, selects an OpenAI model, and receives a formatted review rendered from the model's markdown output.

This project is **browser-only** — no backend server. API calls go directly from the browser to OpenAI's API. This is the same architectural pattern used in the LLM Switchboard.

---

## Reference Implementation

The `temp/` folder contains my complete LLM Switchboard project (HTML, CSS, and JS files). This is **NOT** part of the current project — do not include it in the final build or deployment.

Use it as a reference for:
- How to parse a `.env` file for API keys (in-memory only)
- The `fetch()` call structure for OpenAI's chat completions API
- Error handling patterns for failed API requests
- How the code is organized across separate files
- The general approach to building a single-page LLM tool

Ignore these Switchboard features (not needed here):
- Anthropic integration (this project is OpenAI-only)
- The provider-switching logic
- Structured output mode and JSON schema handling

This project uses **unstructured (free-form) responses only**. Render the model's markdown output as formatted HTML.

---

## Tech Stack

- **HTML / CSS / JavaScript** — separate files, not a single monolithic page
- **No frameworks** — vanilla JS, no React/Vue/etc.
- **Markdown rendering** — use a library like [marked.js](https://cdn.jsdelivr.net/npm/marked/marked.min.js) (CDN) to convert the model's markdown response to HTML
- **No backend / no Node.js server** — direct browser-to-OpenAI API calls
- **`.env` file** — API key loaded client-side, in-memory only (same pattern as the Switchboard)

---

## Supported Models

Provide a single dropdown for model selection with these OpenAI models:

| Display Name     | API Model String     |
|------------------|----------------------|
| GPT-4o           | `gpt-4o`             |
| GPT-4o Mini      | `gpt-4o-mini`        |
| GPT-3.5 Turbo    | `gpt-3.5-turbo`      |

---

## User Interface

### Layout

Clean, minimal design. Single-page app with a centered content column.

### Input Section

The user fills out a form with the following fields:

1. **Product Name** — text input (required)
2. **Product Description** — textarea for the user to describe the product (required)
3. **Rating** — dropdown or slider, 1–5 stars (default: 5)
4. **Tone** — dropdown with options:
   - Enthusiastic
   - Balanced
   - Critical
   - Humorous
   - Professional
5. **Model Selection** — dropdown with the three OpenAI models listed above
6. **Generate Review** — submit button

### Output Section

- Display the generated review below the form
- Render the model's markdown as formatted HTML (headings, bold, lists, etc.)
- Show a loading indicator while the API call is in progress
- Display clear error messages if the API call fails

---

## API Integration

### System Prompt

Use a system prompt that instructs the model to act as a product review writer. The prompt should incorporate the user's selected **rating** and **tone**. Example structure:

```
You are a product review writer. Write a detailed, realistic product review for the given product.

Rating: {rating}/5 stars
Tone: {tone}

Write the review in markdown format. Include:
- A brief summary/headline
- What the reviewer liked
- Any drawbacks or criticisms (appropriate to the rating)
- A final verdict

The review should feel authentic and human-written.
```

### User Message

Send the product name and description as the user message.

### API Call

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Method: POST
- Use the same `fetch()` pattern from the Switchboard
- Parse the response and render the markdown content as HTML

---

## File Structure

```
project-root/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js          # App initialization, DOM event listeners
│   ├── api.js           # OpenAI API call logic
│   └── env.js           # .env file parsing
├── .env                  # OPENAI_API_KEY=sk-...
├── .gitignore            # .env
├── spec.md               # This file
├── temp/                 # Switchboard reference (NOT part of build)
│   └── (switchboard files)
└── README.md
```

---

## Key Constraints

- **OpenAI only** — no Anthropic, no provider switching (CORS restriction)
- **No backend** — all API calls from the browser
- **Unstructured responses** — free-form text, no JSON mode
- **Markdown → HTML** — render model output as formatted HTML using marked.js or similar
- **API key in .env** — loaded in-memory only, never persisted or exposed
- **Do not include `temp/`** in deployment or final build

---

## Deployment

Deploy to the GitHub Organization for the class. Ensure `.env` and `temp/` are in `.gitignore`.
