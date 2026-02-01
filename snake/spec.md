# Dungeon Snake - Game Specification

## Overview

A high-score focused Snake game set in a dungeon arena. The player controls a snake navigating themed dungeon rooms, collecting fruit under time pressure while avoiding obstacles and bosses.

---

## Core Mechanics

### Snake Properties
- **Starting length:** 8 units
- **Movement:** Grid-based, continuous movement in current direction
- **Controls:** Arrow keys or WASD for direction changes
- **Collision deaths:** Wall contact, self-contact, or boss contact

### Arena
- **Layout:** Rectangular dungeon room with stone/brick wall boundaries
- **Size:** Fixed arena size (suggest 40x30 grid units)
- **Theme:** Medieval dungeon aesthetic with torches, stone floors, subtle decorations

---

## Progression System

### Difficulty Scaling

**Speed Increase:**
- Base speed at Level 1
- Each level: speed increases by 2% (compounding)
- Formula: `currentSpeed = baseSpeed * (1.02 ^ (level - 1))`

**Fruit Requirements:**
- Levels 1-5: Collect 3 fruits
- Levels 6-10: Collect 4 fruits
- Levels 11-15: Collect 5 fruits
- Pattern: +1 fruit every 5 levels

### Level Flow
1. Snake spawns in center of arena
2. First fruit appears at random valid location
3. Collect required number of fruits before time expires
4. Upon completion, brief transition, then next level begins

---

## Timer System

### Torch Clock
- **12 torches** positioned around the arena perimeter in clock positions
- **Total time:** 60 seconds per level
- **Extinguish rate:** One torch every 5 seconds
- **Visual:** Torches dim/extinguish clockwise starting from 12 o'clock position
- **Warning:** Final 3 torches should flicker more intensely

### Time Expiration
- When all torches extinguish, the snake dies
- Game over screen displays

---

## Boss Encounters

### Trigger
- Every 10th level (10, 20, 30, etc.)

### Boss Properties
- **Type:** Dungeon Troll (visual: large creature sprite)
- **Size:** Approximately 15% of total arena area (roughly 6x6 grid units in a 40x30 arena)
- **Behavior:** Pursues the snake's current head position
- **Movement speed:** Slightly slower than the snake's current speed (suggest 70-80% of snake speed)
- **Pathfinding:** Direct movement toward snake head, updates direction each tick

### Boss Collision
- If any part of the boss touches any part of the snake body, instant death
- Boss ignores walls (moves through arena freely)

### Boss Level Rules
- Fruit collection still required
- Timer still active
- Boss spawns 2 seconds after level starts (grace period)

---

## Powerup System

### Spawning
- 3-4 powerup items spawn at random locations each level
- Powerups appear as distinct collectible icons
- Persist until collected or level ends

### Inventory
- Player can hold up to 4 powerups (one of each type)
- Display collected powerups in UI with corresponding number key (1-4)
- Activate with number keys 1, 2, 3, 4

### Powerup Types

| Slot | Powerup | Icon Suggestion | Effect | Duration |
|------|---------|-----------------|--------|----------|
| 1 | Shield | Blue bubble/aura | Immunity to boss contact | 5 seconds |
| 2 | Time Freeze | Hourglass/clock | Stops timer countdown, freezes boss movement | 5 seconds |
| 3 | Extra Life | Heart/red cross | Revives snake once upon death (auto-triggers) | Passive until used |
| 4 | Level Skip | Door/portal | Immediately completes current level | Instant |

### Powerup Notes
- Shield only protects from boss, not walls or self-collision
- Extra Life is consumed automatically on death, respawns snake at center
- Level Skip grants full points for remaining fruits
- Powerups carry over between levels until used

---

## Scoring System

### Point Values
- Fruit collected: 100 points × current level
- Level completion bonus: 500 points × current level
- Time bonus: 10 points × remaining seconds × current level
- Boss level completion: 2x multiplier on all level points

### High Score
- Persistent high score saved to local storage
- Display in top-right corner: "HIGH SCORE: XXXXX"
- Current score displayed below: "SCORE: XXXXX"
- New high score celebration animation when beaten

---

## Game States

### Title Screen
- Game title: "DUNGEON SNAKE"
- "Press SPACE to Start"
- Display high score
- Brief controls overview

### Gameplay
- Active snake movement
- HUD displaying: Level, Score, High Score, Timer (torch visual), Powerup inventory

### Pause
- Press ESC or P to pause
- Dim overlay with "PAUSED" text
- Resume with same key

### Game Over
- Death animation (snake crumbles/fades)
- "GAME OVER" text
- Final score display
- "New High Score!" if applicable
- "Press SPACE to Restart"

### Level Transition
- Brief "LEVEL X" announcement (1-2 seconds)
- Boss levels: "BOSS LEVEL" warning with dramatic styling

---

## Visual Design

### Color Palette
- **Walls:** Dark stone gray (#3a3a3a) with brick texture
- **Floor:** Darker stone (#2a2a2a) with subtle tile pattern
- **Snake:** Bright green (#22cc22) with darker segment outlines
- **Fruits:** Red apples, golden pears, purple grapes (variety)
- **Boss:** Brownish-green troll color (#6b8e23)
- **Torches:** Orange/yellow flame (#ff9933), gray when extinguished

### UI Elements
- Medieval/fantasy font for text
- Torch sprites around border (functional timer)
- Powerup slots as inventory boxes at bottom of screen
- Score and level in corners

---

## Audio Suggestions (Optional)

- Background: Ambient dungeon music, increases tempo on boss levels
- SFX: Fruit collect chime, powerup collect sound, torch extinguish hiss
- Death: Dramatic failure sound
- Boss: Growling/stomping sounds

---

## Technical Requirements

### Implementation
- HTML5 Canvas or React-based rendering
- 60 FPS target
- Responsive to window size (maintain aspect ratio)
- Local storage for high score persistence

### File Structure Suggestion
```
/dungeon-snake
  /src
    index.html
    game.js (or game.jsx if React)
    styles.css
  /assets (optional)
    (sprite images if used)
```

### Controls Summary
| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move snake |
| 1 | Use Shield |
| 2 | Use Time Freeze |
| 3 | (Extra Life is automatic) |
| 4 | Use Level Skip |
| SPACE | Start / Restart |
| ESC / P | Pause |

---

## Edge Cases to Handle

1. Fruit spawns on snake body → re-roll position
2. Powerup spawns on snake/fruit → re-roll position
3. Boss spawns on snake → ensure spawn point is far from snake start
4. Snake wraps around itself completely → death triggers correctly
5. Multiple powerups used simultaneously → effects should stack appropriately
6. Level skip on boss level → still counts as boss completion for scoring

---

## MVP vs. Polish Features

### MVP (Must Have)
- Snake movement and growth (fixed 8-unit length, growth optional)
- Wall and self-collision death
- Fruit collection and level progression
- Speed increase per level
- Torch timer (can be simplified visual)
- Basic boss chase AI every 10 levels
- Score and high score tracking
- Game over and restart

### Polish (Nice to Have)
- Animated torch flames
- Powerup system
- Sound effects and music
- Particle effects on death/collection
- Level transition animations
- Multiple fruit types
- Snake trail effects
