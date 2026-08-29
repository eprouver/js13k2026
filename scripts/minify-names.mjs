#!/usr/bin/env node
/** CSS var + class rename for js13k byte savings. Run once. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ws = join(root, "workspace");

const varPairs = [
  ["--pill-radius", "--Pr"],
  ["--side-orb", "--O"],
  ["--orb-font", "--Of"],
  ["--orb-base", "--Ob"],
  ["--orb-ring", "--Or"],
  ["--bow-line", "--Bl"],
  ["--wall-lo", "--W1"],
  ["--wall-hi", "--W2"],
  ["--tab-dark", "--tabd"],
  ["--slot-dark", "--slotd"],
  ["--pow-dark", "--powd"],
  ["--tri-sh", "--Ts"],
  ["--dist", "--D"],
  ["--face", "--F"],
  ["--span", "--S"],
  ["--persp", "--P"],
  ["--radius", "--R"],
  ["--ease", "--E"],
];

const classPairs = [
  ["inspecting", "ins"],
  ["rewarding", "rw"],
  ["revealing", "rv"],
  ["revealed", "rd"],
  ["sealing", "sl"],
  ["sealed", "sd"],
  ["cooling", "co"],
  ["locked", "lk"],
  ["picked", "pk"],
  ["pending", "pd"],
  ["ignite", "ig"],
  ["active", "on"],
  ["hiding", "hd"],
  ["ready", "ry"],
];

function applyVars(s) {
  for (const [a, b] of varPairs) s = s.split(a).join(b);
  return s;
}

function applyClassesCss(s) {
  for (const [a, b] of classPairs) {
    s = s.replace(new RegExp(`\\.${a}(?=[\\s,:.{#>+~\\[])`, "g"), `.${b}`);
    s = s.replace(new RegExp(`body\\.${a}(?=[\\s,:.{#>+~\\[])`, "g"), `body.${b}`);
    s = s.replace(new RegExp(`#viewport\\.${a}(?=[\\s,:.{#>+~\\[])`, "g"), `#viewport.${b}`);
  }
  s = s.replace(/cube-ignite/g, "cube-ig");
  return s;
}

function applyClassStrings(s) {
  for (const [a, b] of classPairs) {
    s = s.replace(new RegExp(`"${a}"`, "g"), `"${b}"`);
    s = s.replace(new RegExp(`"${a} `, "g"), `"${b} `);
    s = s.replace(new RegExp(` ${a}"`, "g"), ` ${b}"`);
  }
  return s;
}

const cssFiles = ["style.css"];
const varJs = ["script.js", "colors.js", "mesh.js", "powers.js", "cube.js", "fly.js"];
const classJs = [
  "script.js",
  "u.js",
  "reveal.js",
  "powers.js",
  "puzzle.js",
  "cube.js",
];

for (const f of cssFiles) {
  let s = readFileSync(join(ws, f), "utf8");
  s = applyVars(applyClassesCss(s));
  writeFileSync(join(ws, f), s);
  console.log("css", f);
}

for (const f of varJs) {
  let s = readFileSync(join(ws, f), "utf8");
  s = applyVars(s);
  writeFileSync(join(ws, f), s);
  console.log("vars", f);
}

for (const f of classJs) {
  let s = readFileSync(join(ws, f), "utf8");
  s = applyClassStrings(s);
  writeFileSync(join(ws, f), s);
  console.log("classes", f);
}

// toneStyle: --tab-dark → --tabd etc.
const colorsPath = join(ws, "colors.js");
let colors = readFileSync(colorsPath, "utf8");
colors = colors.replace(
  "[`--${prefix}-dark`]",
  "[`--${prefix}d`]"
);
writeFileSync(colorsPath, colors);
console.log("toneStyle updated");
