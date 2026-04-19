# spec.md — Blackjack AI Agent

## 1. Overview

A **static webpage** (plain HTML, CSS, and vanilla JavaScript — no build step, no server) that implements a full-rules Blackjack game with an AI agent advisor. The agent observes the current game state, queries the OpenAI API for a recommendation, and surfaces that recommendation to the user. The user reviews the recommendation alongside their own analysis of the hand and clicks **Execute Recommendation** to apply the action.

The assignment's central technical challenge is extracting a reliable action from the LLM's response. A naive keyword search fails because a single reply can contain multiple action words ("it is not recommended that you *hit*; you should *stand*"). This spec resolves that by requiring the LLM to return **structured JSON** conforming to a fixed schema, which is parsed deterministically.

## 2. Scope and Deliverables

### In scope
- Static page deployable as a folder of files opened directly in a browser or served via any static host.
- Full casino-rules Blackjack engine (multi-deck shoe, insurance, surrender, splits, doubles).
- OpenAI API integration via user-supplied key.
- Agent recommendation workflow with manual confirmation.
- All four stretch enhancements listed in the assignment.

### Out of scope
- Any server-side component.
- Persistent storage across browser sessions (no localStorage for game state; see §7 on bankroll handling).
- User accounts, multiplayer, or networked play.
- Real-money or gambling features of any kind.

### Reference implementation (`temp/`)
Before the Blackjack build, a `temp/` folder at the project root will contain a minimal static page that:
- Accepts a `.env` file upload,
- Parses `OPENAI_API_KEY` from it in-memory,
- Makes a single `fetch()` call to the OpenAI Chat Completions endpoint,
- Logs request and response to the console,
- Handles common failure modes (missing key, malformed file, HTTP error, network failure).

The `temp/` folder serves only as a pattern reference for the coding agent and **must be excluded from the final deliverable**. It will not be linked from the main page and will not be imported by any production file.

## 3. File Layout

```
blackjack-agent/
├── index.html              # Single-page entry point
├── css/
│   └── styles.css
├── js/
│   ├── main.js             # Bootstraps app, wires events
│   ├── env.js              # .env file parser
│   ├── deck.js             # Shoe, shuffle, card abstractions
│   ├── game.js             # Rules engine, hand scoring, game state machine
│   ├── agent.js            # OpenAI fetch, JSON extraction, retries
│   ├── strategy.js         # Basic strategy table for visualization
│   ├── analytics.js        # Session metrics tracking
│   └── ui.js               # DOM rendering, card graphics, event handlers
├── temp/                   # Reference implementation — NOT shipped
│   └── ...
└── README.md
```

No bundler, no npm, no transpilation. `<script type="module">` imports are used for organization.

## 4. API Key Handling

1. On page load, the UI shows a file input labeled "Upload .env file."
2. The user selects a local `.env` file. The file is read via the `FileReader` API as text.
3. The file is parsed line-by-line. Lines matching `OPENAI_API_KEY=<value>` (with optional surrounding whitespace, optional `export` prefix, and optional quote wrapping) are extracted. Only `OPENAI_API_KEY` is consumed; other variables are ignored.
4. The key is held in a module-scoped variable in `env.js`. It is never written to `localStorage`, `sessionStorage`, cookies, the DOM, or the page URL.
5. The key is attached only to the `Authorization: Bearer <key>` header on outbound requests to `https://api.openai.com/v1/chat/completions`.
6. If no file is uploaded or the key is absent, the "Deal" and "Ask Agent" buttons remain disabled and a visible message instructs the user to upload a key.

**Security note baked into the README:** this is an educational pattern. The key is visible in browser DevTools during the request. The user should use a key with low spend limits and revoke it after class. This is not a production authentication pattern.

## 5. Blackjack Rules (Full Casino)

### Shoe and shuffle
- **6-deck shoe** (312 cards), reshuffled when the cut card is reached (~75% penetration, i.e., after ~234 cards dealt).
- Fisher-Yates shuffle seeded by `crypto.getRandomValues`.

### Dealer rules
- Dealer stands on all 17s (S17). (If you want H17, flip the constant in `game.js`; S17 is the default.)
- Dealer checks for blackjack when showing an Ace (after insurance is offered) and when showing a 10-value card.

### Player actions
| Action | When available | Effect |
|---|---|---|
| **Hit** | Any hand total < 21 | Draw one card |
| **Stand** | Any hand | End turn on this hand |
| **Double** | Only on initial 2-card hand, sufficient bankroll | Double the bet, draw exactly one card, stand |
| **Split** | Initial 2 cards of equal rank (10-J-Q-K treated as equal), sufficient bankroll | Split into two hands, one card dealt to each, bet matched on the new hand |
| **Surrender** | Only on initial 2-card hand, before any other action, not after split | Forfeit hand, recover half the bet |
| **Insurance** | Offered when dealer's up card is Ace, before hole-card check | Side bet up to half the main bet; pays 2:1 if dealer has blackjack |

### Splits
- Up to **3 resplits** (max 4 hands).
- **Split Aces**: each hand receives exactly one card and cannot be hit further. Split-Ace 21 counts as 21, not natural blackjack.
- Doubling after split (DAS) is **allowed**.

### Payouts
- Natural blackjack: **3:2**
- Regular win: 1:1
- Push: bet returned
- Insurance: 2:1 on the side bet
- Surrender: 0.5× bet returned

### Scoring
- Aces count as 11 unless that busts the hand, then 1. Standard soft/hard distinction tracked explicitly in game state.

## 6. Game Flow

```
BET → DEAL → [INSURANCE prompt if dealer Ace]
    → [dealer peek if Ace or 10]
    → PLAYER_TURN (loop per hand)
        → Ask Agent → show recommendation → Execute or override
        → apply action → update state
    → DEALER_TURN (dealer plays out)
    → SETTLE (resolve bets across all player hands)
    → update bankroll → update analytics
    → return to BET (or GAME_OVER if bankroll = 0)
```

### UI controls per hand
- **Bet input** (number, min $1, max = current bankroll). Disabled during a hand.
- **Deal** button.
- **Ask Agent** button (always visible during PLAYER_TURN; can be pressed multiple times if user wants a re-analysis, though it costs another API call).
- Action buttons: **Hit, Stand, Double, Split, Surrender** — enabled/disabled based on legality.
- **Insurance: Yes / No** prompt when triggered.
- **Execute Recommendation** button — appears after the agent responds, applies the recommended action via the same code path as the manual buttons.

## 7. Bankroll

- Starting bankroll: **$1,000**.
- Bet is user-adjustable each hand (integer dollars, min $1).
- When bankroll reaches $0 and the current hand resolves, a **Game Over** modal appears with session summary (hands played, win/loss record, peak bankroll, longest streak). The only option is to refresh the page to restart. No localStorage persistence.

## 8. Agent Integration

### Endpoint
`POST https://api.openai.com/v1/chat/completions`

### Default model
`gpt-5.4` (OpenAI's current flagship as of April 2026). Model string is a single constant in `agent.js` for easy swapping.

### Request construction
The agent receives a **state snapshot** built from `game.js`, not a natural-language description. Example payload:

```json
{
  "model": "gpt-5.4",
  "response_format": { "type": "json_object" },
  "messages": [
    { "role": "system", "content": "<system prompt, see below>" },
    { "role": "user", "content": "<JSON game state, see below>" }
  ],
  "temperature": 0.2
}
```

### System prompt (verbatim, stored as a constant)
```
You are a Blackjack strategy advisor. You will receive the current game
state as JSON and must respond with a single JSON object — no prose, no
code fences, no commentary outside the object.

Schema:
{
  "action": "hit" | "stand" | "double" | "split" | "surrender" | "insurance_yes" | "insurance_no",
  "confidence": number between 0 and 1,
  "reasoning_terse": string (one sentence, no more than 25 words),
  "reasoning_detailed": string (2-4 sentences, may reference probabilities)
}

Only recommend actions that are legal given the state. The "legal_actions"
array in the input tells you what is available this turn. If you recommend
an illegal action you will be retried.

Respect the risk_tolerance field: "conservative" prefers surrender and
stand in marginal spots; "standard" plays textbook basic strategy;
"aggressive" prefers double and split on thin edges.
```

### User message (game state payload)
```json
{
  "player_hand": [{"rank": "A", "suit": "S"}, {"rank": "7", "suit": "H"}],
  "player_total_hard": 18,
  "player_total_soft": 18,
  "is_soft": true,
  "dealer_up_card": {"rank": "9", "suit": "C"},
  "legal_actions": ["hit", "stand", "double"],
  "hand_number": 1,
  "total_hands_this_round": 1,
  "bet": 25,
  "bankroll": 975,
  "rules": {
    "decks": 6,
    "dealer_stands_soft_17": true,
    "das_allowed": true,
    "surrender_allowed": true,
    "blackjack_payout": "3:2"
  },
  "risk_tolerance": "standard"
}
```

### Response extraction
1. `response_format: json_object` forces valid JSON from the model.
2. `JSON.parse` the content. If it throws, retry once with an appended instruction ("Your previous response was not valid JSON. Reply with only the JSON object."). If it fails again, surface an error to the UI and disable Execute Recommendation.
3. Validate that `action` is in the enum **and** in `legal_actions`. If not, retry once. If still invalid, surface an error.
4. Only `action` drives the game. The `reasoning_*` fields feed the UI explanation panel.

### Console logging (debugging aid)
Every API interaction logs to the console with a consistent prefix:
```
[AGENT] → request  {state summary}
[AGENT] ← response {parsed JSON}
[AGENT] ✓ validated action=hit (legal)
[AGENT] ✗ invalid action=split (not in legal_actions), retrying
```
This mirrors the debugging pattern the assignment explicitly hints at.

## 9. Stretch Enhancements (all four)

### 9.1 Strategy Visualization
- A **basic strategy chart** rendered as an HTML table, always visible in a side panel.
- Rows: player hand totals (hard 5–21, soft 13–21, pairs 2s–As).
- Columns: dealer up card (2–10, A).
- Cells colored by action: H (hit), S (stand), D (double), P (split), R (surrender).
- When the agent responds, the relevant cell is **highlighted** (e.g., thick border + glow). If the agent's action matches basic strategy, the highlight is green; if it diverges, amber. This gives the user an at-a-glance sanity check.
- The chart data lives in `strategy.js` as a 2D lookup table (standard 6-deck S17 DAS surrender chart).

### 9.2 Performance Analytics
Tracked in-memory from session start, rendered in a collapsible panel:
- Hands played, hands won, hands lost, pushes, blackjacks dealt to player.
- Win rate (%).
- **Bankroll curve**: an inline SVG line chart (no chart library; drawn by hand with `<polyline>`) showing bankroll over hand number.
- **Agent agreement rate**: what % of hands the user executed the agent's recommendation vs. overrode it.
- **Agent vs basic-strategy agreement**: what % of agent recommendations matched the chart.
- Longest win streak, longest loss streak, peak bankroll.

### 9.3 Explainability Toggle
- A three-way control in the UI: **Terse / Standard / Detailed**.
- Terse: shows only `reasoning_terse` from the agent response.
- Standard: shows `reasoning_terse` plus the agent's action and confidence.
- Detailed: shows `reasoning_detailed`, action, confidence, and a line noting whether the action matches basic strategy.
- The toggle does not change the prompt — the LLM always returns both fields — so switching is instant and free.

### 9.4 Risk Tolerance Settings
- A dropdown: **Conservative / Standard / Aggressive**.
- The selected value is passed into the game state JSON as `risk_tolerance` and honored by the system prompt.
- The dropdown is editable between hands but locked during a hand.
- For pedagogical value, the UI shows a small "How this changes play" tooltip with one-sentence descriptions of each mode.

## 10. Error Handling

| Condition | Behavior |
|---|---|
| No API key loaded | Agent buttons disabled; banner prompts upload |
| Malformed `.env` (no `OPENAI_API_KEY`) | Alert + banner; file input resets |
| Network failure on fetch | Red toast "Agent unreachable — play manually"; game continues |
| HTTP 401 | Toast "Invalid API key — re-upload .env"; key is cleared |
| HTTP 429 | Toast "Rate limited — wait a moment"; disable Ask Agent for 10s |
| HTTP 5xx | Toast "OpenAI error, retry?" with a retry button |
| JSON parse failure after retry | Toast "Agent response malformed — play manually"; log full raw response to console |
| Illegal action after retry | Toast + fallback to basic-strategy chart lookup (agent failed, chart wins) |

## 11. Testing Checklist

Before submitting, play at minimum **30 hands** and verify:
- [ ] Bankroll updates correctly on win, loss, push, blackjack, surrender, insurance win/loss, double, split (both hands settle independently).
- [ ] Agent's `action` always appears in `legal_actions` from the state payload.
- [ ] Clicking **Execute Recommendation** results in the exact action the agent named.
- [ ] Agent reasoning (terse and detailed) is coherent with the chosen action.
- [ ] Basic strategy chart highlight correctly lights up on each turn.
- [ ] Deck reshuffles at the cut card; card counts never exceed 4-per-rank × 6 decks.
- [ ] Split Aces receive exactly one card each and cannot be hit.
- [ ] Natural blackjack pays 3:2; split 21 does not.
- [ ] Game Over screen fires exactly when bankroll hits $0 after settlement.
- [ ] Console logs show the full request/response cycle per agent call.
- [ ] `temp/` folder is deleted (or explicitly excluded) in the final submission.

## 12. README Contents (for the submission)

- One-paragraph description.
- How to run: "Open `index.html` in a recent Chrome or Firefox."
- How to supply an API key: explain the `.env` format (`OPENAI_API_KEY=sk-...`).
- Security disclaimer (§4, final paragraph).
- Known limitations (no persistence, single player, educational only).
- Credits / attribution for the assignment.

---

**Key design commitments, summarized:**
1. Structured JSON output from the LLM is the solution to the keyword-ambiguity problem.
2. The agent recommends; the user executes. No autonomous play.
3. All four stretch enhancements are included and designed to reinforce each other (the basic strategy chart validates the agent; the analytics panel quantifies agreement; the risk toggle perturbs behavior in a controlled way; the explainability toggle gates how much reasoning text is surfaced without incurring extra API cost).
4. The `temp/` reference page is built first and used as scaffolding, then excluded from submission.
