#!/usr/bin/env node
/**
 * js13k one-file build
 *
 * Terser → Roadroller + allowFreeVars → tiny <body><script> shell → smallest zip
 * (infozip / Python zipfile / Zopfli / advzip).
 *
 * Usage:
 *   node scripts/build.mjs                 # O2, 3 search passes
 *   node scripts/build.mjs --opt 1         # fast iterate
 *   node scripts/build.mjs --opt 2 --passes 6
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { Packer } from "roadroller";
import { minify } from "terser";
import CleanCSS from "clean-css";
import { deflateAsync } from "@gfx/zopfli";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const workspace = join(root, "workspace");
const dist = join(root, "dist");

function argNum(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) || fallback : fallback;
}

const optLevel = argNum("--opt", 2);
const searchPasses = argNum("--passes", optLevel >= 2 ? 3 : 1);

const TITLE = "js13k 2026";

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
  return `document.head.appendChild(document.createElement("style")).append(\`${escaped}\`);`;
}

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

function wrapPacked(js) {
  // <body> must exist before the script runs (document.body.append).
  return `<body><script>${js}</script>`;
}

function kb(n) {
  return `${(n / 1024).toFixed(2)} KB`;
}

function bytes(path) {
  return readFileSync(path).byteLength;
}

function gzipSize(buf) {
  return gzipSync(buf, { level: 9 }).byteLength;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

async function zipWithZopfli(htmlPath, outPath) {
  const name = "index.html";
  const raw = readFileSync(htmlPath);
  const compressed = Buffer.from(
    await deflateAsync(raw, { numiterations: 15, blocksplitting: true })
  );
  const nameBuf = Buffer.from(name);
  const crc = crc32(raw);
  const dosDate = 0x0021;
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(dosDate),
    u32(crc),
    u32(compressed.length),
    u32(raw.length),
    u16(nameBuf.length),
    u16(0),
    nameBuf,
    compressed,
  ]);
  const central = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(8),
    u16(0),
    u16(dosDate),
    u32(crc),
    u32(compressed.length),
    u32(raw.length),
    u16(nameBuf.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    nameBuf,
  ]);
  const eocd = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(1),
    u16(1),
    u32(central.length),
    u32(local.length),
    u16(0),
  ]);
  writeFileSync(outPath, Buffer.concat([local, central, eocd]));
  return bytes(outPath);
}

function zipWithInfozip(filePath, outPath) {
  execFileSync("zip", ["-9", "-X", "-j", "-q", outPath, filePath]);
  return bytes(outPath);
}

function zipWithPython(htmlPath, outPath) {
  const py = `
import zipfile, sys
html = open(sys.argv[1], "rb").read()
out = sys.argv[2]
info = zipfile.ZipInfo("index.html")
info.compress_type = zipfile.ZIP_DEFLATED
info.date_time = (1980, 1, 1, 0, 0, 0)
info.create_system = 0
info.external_attr = 0
with zipfile.ZipFile(out, "w") as z:
    z.writestr(info, html, compresslevel=9)
`;
  execFileSync("python3", ["-c", py, htmlPath, outPath]);
  return bytes(outPath);
}

async function zipStore(filePath, outPath) {
  const a = outPath + ".infozip";
  const b = outPath + ".pyzip";
  const c = outPath + ".zopfli";
  const d = outPath + ".advzip";
  const aBytes = zipWithInfozip(filePath, a);
  const bBytes = zipWithPython(filePath, b);
  const cBytes = await zipWithZopfli(filePath, c);
  let dBytes = Infinity;
  try {
    execFileSync("cp", [c, d]);
    execFileSync("advzip", ["-z", "-4", "-i", "1000", "-q", d]);
    dBytes = bytes(d);
  } catch {
    try {
      execFileSync("rm", ["-f", d]);
    } catch {
      /* ignore */
    }
  }
  const candidates = [
    [aBytes, a],
    [bBytes, b],
    [cBytes, c],
    ...(dBytes < Infinity ? [[dBytes, d]] : []),
  ];
  candidates.sort((x, y) => x[0] - y[0]);
  execFileSync("cp", [candidates[0][1], outPath]);
  execFileSync("rm", ["-f", a, b, c, d]);
  return {
    zipBytes: bytes(outPath),
    infozip: aBytes,
    pyzip: bBytes,
    zopfli: cBytes,
    advzip: dBytes < Infinity ? dBytes : null,
  };
}

mkdirSync(dist, { recursive: true });

const cssRaw = readFileSync(join(workspace, "style.css"), "utf8");
const cssJs = addCSSRulesToHeadSource(cssRaw);
writeFileSync(join(workspace, "css.js"), cssJs);

const bundle = [cssJs, ...SCRIPTS.map((f) => readFileSync(join(workspace, f), "utf8"))].join(
  "\n;\n"
);
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
  compress: {
    passes: 5,
    toplevel: true,
    unsafe: true,
    unsafe_arrows: true,
    unsafe_comps: true,
    unsafe_math: true,
    unsafe_methods: true,
    unsafe_proto: true,
    booleans_as_integers: true,
    pure_getters: true,
    hoist_funs: true,
    drop_console: true,
    arguments: true,
    keep_infinity: true,
  },
  mangle: { toplevel: true, safari10: false },
  format: { comments: false, wrap_iife: false, ascii_only: false, beautify: false },
});
if (minified.error) throw minified.error;
const bundleMin = minified.code;
writeFileSync(join(dist, "min.html"), wrapPacked(bundleMin));

console.log(
  `Roadroller O${optLevel} × ${searchPasses} pass${searchPasses === 1 ? "" : "es"} (allowFreeVars)…`
);
const packer = new Packer([{ data: bundleMin, type: "js", action: "eval" }], {
  allowFreeVars: true,
});
let optResult;
let bestParams = {};
for (let p = 1; p <= searchPasses; p++) {
  const t0 = Date.now();
  optResult = await packer.optimize(optLevel);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const size = Array.isArray(optResult.bestSize)
    ? optResult.bestSize[0]
    : optResult.bestSize;
  console.log(`  pass ${p}/${searchPasses}: ~${size} B  (${secs}s)`);
  if (optResult.best && Object.keys(optResult.best).length) bestParams = optResult.best;
}
writeFileSync(join(dist, "roadroller.json"), JSON.stringify(bestParams, null, 2));
const { firstLine, secondLine } = packer.makeDecoder();
const rolled = firstLine + secondLine;

const packed = wrapPacked(rolled);
const packedPath = join(dist, "index.html");
writeFileSync(packedPath, packed);

const zipPath = join(dist, "game.zip");
const { zipBytes, infozip, pyzip, zopfli, advzip } = await zipStore(packedPath, zipPath);

const bundleBuf = Buffer.from(bundleMin);
const oneBuf = Buffer.from(oneFile);
const packedBuf = Buffer.from(packed);
const bundleGz = gzipSize(bundleBuf);
const packedGz = gzipSize(packedBuf);

console.log(`
── js13k size report ─────────────────────────
  one-file source (index.html): ${kb(oneBuf.length)}  (${oneBuf.length} B)
  minified JS:                  ${kb(bundleMin.length)}  (${bundleMin.length} B)
  minified JS gzip:             ${kb(bundleGz)}  (${bundleGz} B)
  Roadroller one-file:          ${kb(packedBuf.length)}  (${packedBuf.length} B)
  packed gzip (approx):         ${kb(packedGz)}  (${packedGz} B)
  zip (infozip / python / zopfli / advzip): ${infozip} / ${pyzip} / ${zopfli} / ${advzip ?? "n/a"} B
  submission zip:               ${kb(zipBytes)}  (${zipBytes} B)  ← 13 KB = 13312 B
  over/under:                   ${zipBytes <= 13312 ? "UNDER" : "OVER"} by ${kb(Math.abs(zipBytes - 13312))}
  Roadroller optimize:          O${optLevel} × ${searchPasses} + allowFreeVars

  Play:        ./index.html  (or dist/source.html)
  Submit zip:  dist/game.zip (contains dist/index.html)
──────────────────────────────────────────────
`);
