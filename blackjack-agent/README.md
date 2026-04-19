# Blackjack AI Agent

A static single-page Blackjack game with an AI advisor powered by the OpenAI API. The agent observes the current game state, returns a structured JSON recommendation, and the player chooses whether to follow it.

## How to Run

Open `index.html` in a recent Chrome or Firefox. No build step, no server required.

## Supplying an API Key

Create a `.env` file with the following content:

```
OPENAI_API_KEY=sk-...your-key-here...
```

Click "Upload .env" on the page and select that file. The key is parsed in memory and never stored anywhere.

## Security Disclaimer

Your API key is visible in browser DevTools during outbound requests. Use a key with a low spend limit and revoke it after use. This is an educational pattern, not a production authentication pattern.

## Features

- Full casino-rules Blackjack: 6-deck shoe, S17, DAS, splits (up to 4 hands), insurance, surrender, 3:2 blackjack payout
- AI agent recommendations via OpenAI structured JSON output
- Basic strategy chart with real-time cell highlighting
- Session analytics with bankroll curve (SVG)
- Explainability toggle (Terse / Standard / Detailed)
- Risk tolerance settings (Conservative / Standard / Aggressive)

## Known Limitations

- No persistence across browser sessions
- Single player only
- Educational use only — no real money
