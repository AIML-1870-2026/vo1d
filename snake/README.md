Dungeon Snake — Minimal playable MVP

Open `index.html` in a browser. For best results run a local server (recommended):

```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Controls:
- Arrow keys / WASD: Move
- SPACE: Start / Restart
- ESC / P: Pause

Notes:
- Implements MVP features described in `spec.md`: snake movement, fruit collection, level progression, torch timer, boss every 10 levels, scoring and high-score persistence.
- Powerups from spec are not implemented in this MVP.
