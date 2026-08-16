# js13k 2026

[js13kGames](https://js13kgames.com/) entry for 2026.

**Theme:** Unicorns and Rainbows  
**Deadline:** September 13, 2026  
**Limit:** 13 KB zip

## Layout

- `workspace/` — editable source (multi-file; empty body, Van builds the UI)
- Root `index.html` — **one-file game** (empty body + one `<script>` with CSS-in-JS + game)
- `dist/index.html` + `dist/game.zip` — Roadroller-packed submission

## Dev

Edit under `workspace/`, or open root `index.html` after a build.

```bash
npm install
npm run build        # one-file index.html + Roadroller zip + size report
npm run build:max    # Roadroller -O2 (slower, tighter)
```

## Prior entries

- 2024: [The Lonely 13](https://github.com/eprouver/js13k2024)
- 2025: [Celestial Paws](https://github.com/eprouver/js13k2005)
