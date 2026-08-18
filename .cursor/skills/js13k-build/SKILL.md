---
name: js13k-build
description: >-
  Builds a js13kGames entry into one HTML file: inject CSS via addCSSRulesToHead,
  concatenate JS (Van proxy UI, empty HTML body), run Roadroller, zip, and report
  byte sizes vs the 13KB limit. Use when the user asks for a js13k build, Roadroller
  pack, submission zip, size report, CSS-in-JS inject, or a reusable js13k pack
  pipeline.
---

# js13k one-file build

## Goal

Ship a **13 KB zip** of **one** HTML file. That file has:

- An empty `<body>` (no markup, no `<link>`, no `src=` scripts)
- **One** `<script>` containing `addCSSRulesToHead(css)` + the entire game

Source stays multi-file in `workspace/` for editing; the build:

1. Reads `workspace/style.css`
2. Emits CSS-in-JS with `addCSSRulesToHead` (verbatim pattern below)
3. Concatenates scripts in load order into that one script body
4. Writes root `index.html` / `dist/source.html` (readable one-file)
5. Runs **Roadroller** (`eval`) → `dist/index.html` (still one file, one script)
6. Zips `dist/index.html` and prints sizes

## Empty HTML + Van

- Built output: **nothing in the DOM** except one inline `<script>`.
- `workspace/` may use multiple `<script src>` tags for editing only.
- Build all DOM with the Van-style proxy (`v.js` / `const { div, button } = v`).
- Prefer `v.div` / `v.button` / `v.canvas` over `document.createElement` for HTML elements.
- SVG may still use `createElementNS`.

## CSS inject (verbatim)

Use this exact helper when embedding CSS into JS:

```js
function addCSSRulesToHead(cssRules) {
  const styleElement = document.createElement('style');
  styleElement.type = 'text/css';
  
  if (styleElement.styleSheet) {
    // For IE
    styleElement.styleSheet.cssText = cssRules;
  } else {
    // For other browsers
    styleElement.appendChild(document.createTextNode(cssRules));
  }
  
  document.head.appendChild(styleElement);
}
const css = `…css here…`;
addCSSRulesToHead(css);
```

Escape `` ` ``, `\`, and `$` when embedding `style.css` into the template literal.

## Project layout

```
package.json          # "type":"module", roadroller devDep, npm run build
scripts/build.mjs     # concat + Roadroller + zip + size report
workspace/
  index.html          # empty body; script tags only (css.js first)
  style.css           # source of truth for styles
  css.js              # generated — do not hand-edit
  v.js                # Van proxy
  *.js                # game modules
dist/
  bundle.js           # concat (debug)
  rolled.js           # Roadroller output
  index.html          # submission HTML
  game.zip            # size that counts
```

## Script order

CSS inject first, then modules in dependency order. Example:

`css.js` → `options.js` → `music.js` → `v.js` → `colors.js` → `mesh.js` → `reveal.js` → `maze.js` → `level.js` → `dode.js` → `puzzle.js` → `powers.js` → `script.js`

Omit unused files (e.g. maze helpers) from the bundle.

## Commands

```bash
npm install
npm run build        # Roadroller O2 + allowFreeVars (submission)
npm run build:fast   # Roadroller O1 (iterate)
```

Report must include **zip bytes** vs **13312** (13 × 1024).

## Reusing in a new entry

1. Copy this project’s `scripts/build.mjs` plus `package.json` scripts / `roadroller` dep.
2. Point `SCRIPTS` / `workspace` paths at the new game.
3. Keep `style.css` as source; regenerate `css.js` on every build.
4. Keep HTML body empty; UI only via Van.

## Notes

- Roadroller on the **concatenated JS** with `action: "eval"`, then minimal HTML around `<script>…</script>`.
- Zip with `zip -9 -X`, Python `zipfile` level 9, and Zopfli; keep the smallest archive.
- Do not commit `node_modules/` or usually `dist/` (regenerate).
