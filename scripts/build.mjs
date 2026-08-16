#!/usr/bin/env node
/**
 * js13k one-file build
 *
 * Output: a single index.html with an empty body and one <script> that
 * contains addCSSRulesToHead(css) + the entire game. No external CSS/JS links.
 *
 * Usage:
 *   node scripts/build.mjs
 *   node scripts/build.mjs --opt 2
 */
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { createGzip, gzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { Packer } from "roadroller";
import { minify } from "terser";
import CleanCSS from "clean-css";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const workspace = join(root, "workspace");
const dist = join(root, "dist");

const optLevel = (() => {
  const i = process.argv.indexOf("--opt");
  return i >= 0 ? Number(process.argv[i + 1]) || 1 : 1;
})();

const TITLE = "js13k 2026";

/** Script order for the concatenated bundle. */
const SCRIPTS = [
  "options.js",
  "music.js",
  "sfx.js",
  "v.js",
  "u.js",
  "colors.js",
  "fly.js",
  "mesh.js",
  "reveal.js",
  "maze.js",
  "level.js",
  "cube.js",
  "puzzle.js",
  "powers.js",
  "script.js",
];

function addCSSRulesToHeadSource(cssRules) {
  const escaped = cssRules
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  return `function addCSSRulesToHead(cssRules) {
  const styleElement = document.createElement('style');
  styleElement.appendChild(document.createTextNode(cssRules));
  document.head.appendChild(styleElement);
}
const css = \`${escaped}\`;
addCSSRulesToHead(css);
`;
}

/** Empty DOM + one inline script. No src=, no stylesheet links. */
function wrapOneFile(js) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${TITLE}</title>
</head>
<body>
<script>
${js}
</script>
</body>
</html>
`;
}

function kb(n) {
  return `${(n / 1024).toFixed(2)} KB`;
}

function bytes(path) {
  return readFileSync(path).byteLength;
}

async function gzipSize(buf) {
  return gzipSync(buf, { level: 9 }).byteLength;
}

async function zipStore(files, outPath) {
  try {
    execFileSync("zip", ["-9", "-j", "-q", outPath, ...files], { stdio: "inherit" });
    return bytes(outPath);
  } catch {
    const html = readFileSync(files[0]);
    const gzPath = outPath.replace(/\.zip$/, ".html.gz");
    await pipeline(Readable.from([html]), createGzip({ level: 9 }), createWriteStream(gzPath));
    console.warn(`(zip unavailable — wrote ${gzPath} instead)`);
    return bytes(gzPath);
  }
}

mkdirSync(dist, { recursive: true });

const cssRaw = readFileSync(join(workspace, "style.css"), "utf8");
const cssJs = addCSSRulesToHeadSource(cssRaw);

// Dev helper only: keep css.js for multi-file workspace editing
writeFileSync(join(workspace, "css.js"), cssJs);

const parts = [cssJs, ...SCRIPTS.map((f) => readFileSync(join(workspace, f), "utf8"))];
const bundle = parts.join("\n;\n");

// --- One-file game (readable): CSS inject + all JS in a single <script> ---
const oneFile = wrapOneFile(bundle);
writeFileSync(join(dist, "source.html"), oneFile);
writeFileSync(join(root, "index.html"), oneFile);
console.log("wrote index.html (empty body, one <script> with CSS+game)");

const cssMin = new CleanCSS({ level: 2 }).minify(cssRaw).styles;
const minParts = [
  addCSSRulesToHeadSource(cssMin),
  ...SCRIPTS.map((f) => readFileSync(join(workspace, f), "utf8")),
];
const minified = await minify(minParts.join("\n;\n"), {
  ecma: 2020,
  module: false,
  toplevel: true,
  compress: { passes: 3, toplevel: true, unsafe: true, unsafe_arrows: true, booleans_as_integers: true },
  mangle: { toplevel: true },
  format: { comments: false },
});
if (minified.error) throw minified.error;
const bundleMin = minified.code;
writeFileSync(join(dist, "min.html"), wrapOneFile(bundleMin));

console.log(`Roadroller optimize level ${optLevel}…`);
const packer = new Packer([{ data: bundleMin, type: "js", action: "eval" }], {});
await packer.optimize(optLevel);
const { firstLine, secondLine } = packer.makeDecoder();
const rolled = firstLine + secondLine;

// Submission HTML: still one file, one script (Roadroller-packed)
const packed = wrapOneFile(rolled);
const packedPath = join(dist, "index.html");
writeFileSync(packedPath, packed);

const zipPath = join(dist, "game.zip");
if (existsSync(zipPath)) {
  try {
    execFileSync("rm", ["-f", zipPath]);
  } catch {
    /* ignore */
  }
}
const zipBytes = await zipStore([packedPath], zipPath);

const bundleBuf = Buffer.from(bundleMin);
const oneBuf = Buffer.from(oneFile);
const packedBuf = Buffer.from(packed);
const [bundleGz, packedGz] = await Promise.all([
  gzipSize(bundleBuf),
  gzipSize(packedBuf),
]);

console.log(`
── js13k size report ─────────────────────────
  one-file source (index.html): ${kb(oneBuf.length)}  (${oneBuf.length} B)
  minified JS:                  ${kb(bundleMin.length)}  (${bundleMin.length} B)
  minified JS gzip:             ${kb(bundleGz)}  (${bundleGz} B)
  Roadroller one-file:          ${kb(packedBuf.length)}  (${packedBuf.length} B)
  packed gzip (approx):         ${kb(packedGz)}  (${packedGz} B)
  submission zip:               ${kb(zipBytes)}  (${zipBytes} B)  ← 13 KB = 13312 B
  over/under:                   ${zipBytes <= 13312 ? "UNDER" : "OVER"} by ${kb(Math.abs(zipBytes - 13312))}
  Roadroller optimize:          O${optLevel}

  Play:        ./index.html  (or dist/source.html)
  Submit zip:  dist/game.zip (contains dist/index.html)
──────────────────────────────────────────────
`);
