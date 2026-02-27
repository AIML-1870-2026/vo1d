# Blackjack: Royal Table — Specification

## Overview

A premium, casino-grade blackjack game built with vanilla HTML, CSS, and JavaScript. Features two modes — **Classic** (standard play) and **Learner** (training mode with hints, strategy engine, and card counting overlay). Designed to look and feel like a real blackjack table with animated card dealing, chip betting, and immersive atmosphere.

---

## Architecture

**Single-page application** — one `index.html` with embedded `<style>` and `<script>` blocks. No frameworks, no build tools, no dependencies beyond Google Fonts.

### File Structure

```
index.html      — Complete application (HTML structure + CSS + JS)
spec.md         — This document
```

---

## Screens

### 1. Home Screen
- Dark green radial gradient background with felt texture overlay
- Floating card-suit particles (♠ ♥ ♦ ♣) animated vertically
- Gold-accented title "BLACKJACK" with subtitle "Royal Table"
- Two mode-selection cards:
  - **Classic** — Standard play, $500 buy-in
  - **Learner** — Training mode with hints, rules panel, and card counting

### 2. Game Table
- Curved felt table shape with wood-grain border
- Top bar: Menu button, shoe progress indicator, balance display
- Dealer area (top): face-down hole card + visible cards
- Player area (bottom): one or more hands with animated cards
- Action bar: context-sensitive controls (betting → playing → results)

---

## Game Rules Implemented

| Rule | Detail |
|------|--------|
| Decks | 6-deck shoe (312 cards) |
| Shuffle | Fisher-Yates; reshuffle when ≤25% of shoe remains (cut card) |
| Blackjack pays | 3:2 |
| Dealer stands | Hard/Soft 17 |
| Double down | On any first two cards; one card only |
| Splitting | Same-rank pairs; split Aces receive one card each |
| Insurance | Half the original bet when dealer shows Ace; pays 2:1 |
| Starting balance | $500 |
| Chip denominations | $5, $25, $50, $100, $500 |
| Rebuy | Available when balance reaches $0 |

---

## Learner Mode Features

### Hint System
- **💡 Hint** button appears during player turn
- Runs full basic strategy engine against current hand vs. dealer upcard
- Covers: hard hands, soft hands, pair splitting, double-down opportunities
- Displays recommended action + plain-English explanation

### Rules Panel
- **📖 Rules** button in top bar
- Overlay explaining: Hit, Stand, Double Down, Split, Insurance, Blackjack, Card Counting

### Card Counting Overlay
- **🔢 Count** toggle in top bar
- Displays:
  - **Running Count** (Hi-Lo system: +1 for 2-6, 0 for 7-9, -1 for 10-A)
  - **True Count** (running count ÷ decks remaining)
  - Color-coded advice (green = favorable, red = unfavorable)
- Count resets on shoe reshuffle

---

## Card Dealing Animation

- Cards slide in from above with a spring-ease curve
- Staggered delays per card (150ms apart)
- Hole card flip uses CSS 3D transform (rotateY)
- Result text pops in with scale animation

---

## State Machine

```
  ┌─────────┐
  │ BETTING │ ← user places chips
  └────┬────┘
       │ DEAL
  ┌────▼────┐
  │DEALING  │ ← cards animate in
  └────┬────┘
       │
  ┌────▼─────┐    dealer shows Ace?
  │INSURANCE?│ ── yes → offer insurance
  └────┬─────┘
       │ no / after insurance
  ┌────▼────┐
  │ PLAYER  │ ← hit / stand / double / split
  └────┬────┘
       │ stand or bust all hands
  ┌────▼────┐
  │ DEALER  │ ← dealer draws to 17+
  └────┬────┘
       │
  ┌────▼────┐
  │ RESULT  │ ← payout calculated, NEW HAND button
  └─────────┘
```

---

## Basic Strategy Engine

Covers all standard basic strategy decisions:

- **Pair splitting**: Always split A-A and 8-8. Never split 10-10 or 5-5. Conditional splits for 2, 3, 4, 6, 7, 9.
- **Soft hands**: Stand on soft 19+. Hit/double soft 17-18 based on dealer upcard. Hit soft ≤16 (double vs. 4-6).
- **Hard hands**: Stand on 17+. Stand on 13-16 vs. dealer 2-6. Double on 11 always, 10 vs. 2-9, 9 vs. 3-6. Hit otherwise.

---

## CSS Architecture

- CSS custom properties (variables) for theming
- Keyframe animations: `floatParticle`, `fadeIn`, `popIn`, `slideIn`, `flipCard`
- 3D card flip via `perspective` + `rotateY` transform
- Radial gradients for felt texture
- SVG data-URI background pattern for felt grain
- Responsive: `clamp()` for typography, `min()` for table dimensions

---

## JavaScript Architecture

- Pure vanilla JS with DOM manipulation
- State object pattern (single `game` state object)
- Event delegation for chip/button clicks
- `requestAnimationFrame`-based dealing sequences via `setTimeout` chains
- Fisher-Yates shuffle for cryptographically-fair card ordering
- Modular functions: `createShoe()`, `drawCard()`, `handValue()`, `basicStrategy()`, etc.
