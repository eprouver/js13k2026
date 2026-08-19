const RAINBOW = [
  { h: 3, s: 100, l: 61 },
  { h: 28, s: 100, l: 55 },
  { h: 52, s: 100, l: 50 },
  { h: 127, s: 63, l: 49 },
  { h: 208, s: 100, l: 43 },
  { h: 292, s: 88, l: 42 },
];

const colorHsl = ({ h, s, l }) => `hsl(${h} ${s}% ${l}%)`;
RAINBOW.forEach((c, i) => {
  c.i = i;
  document.documentElement.style.setProperty("--c" + i, colorHsl(c));
});

const applyLevelMood = (i) => {
  const n = RAINBOW.length;
  const a = RAINBOW[i % n].h;
  const b = RAINBOW[(i + 1) % n].h;
  const h = (a + ((b - a + 360) % 360) * (0.35 + Math.random() * 0.3)) % 360;
  const st = document.documentElement.style;
  st.setProperty("--bg", colorHsl({ h, s: 14, l: 10 }));
  st.setProperty("--wall-lo", colorHsl({ h, s: 8, l: 21 }));
  st.setProperty("--wall-hi", colorHsl({ h, s: 8, l: 37 }));
};

const colorPair = (c) => ({ ...c, l: 33 });

const toneStyle = (prefix, color, dark = colorPair(color)) => ({
  [`--${prefix}`]: colorHsl(color),
  [`--${prefix}-dark`]: colorHsl(dark),
});

const uniPink = "#f9a0e5";
const uniCyan = "#7fdbff";
const uniGold = "#ffdc00";

const uni = div({ id: "uni" });
uni.innerHTML = `<svg viewBox="0 0 128 128"><ellipse cx="63" cy="49.4" fill="${uniPink}" rx="24" ry="16.4" transform="rotate(-19 63 49)"/><path fill="#fff" d="m37 130 23-84 31 2 7 37-18 4 7 41z"/><path fill="${uniCyan}" d="M39 78c-5-2-6-13-2-24q9-19 18-17c5 2 6 13 2 24q-8 19-18 17"/><path fill="#fff" d="m58 57 4-22 12 18zm20-5 11-17 3 21z"/><circle cx="67.9" cy="64" r="5" fill="#222"/><circle cx="87.9" cy="64" r="5" fill="#222"/><ellipse cx="86.9" cy="84" fill="#fde8f6" rx="11" ry="10"/><path fill="${uniGold}" d="m71 49 7-35 2 36z"/><circle cx="66.6" cy="62.9" r="1.4" fill="#fff"/><circle cx="86.2" cy="62.9" r="1.4" fill="#fff"/><ellipse cx="85.1" cy="81.6" fill="${uniPink}" rx="2.4" ry="2.2"/><g fill="none" stroke-linecap="round" stroke-width="21"><path stroke="${uniPink}" d="m46 62-12 59"/><path stroke="${uniCyan}" d="m41 86-12 60"/></g><path fill="${uniPink}" d="m94 84-2-2q0-3 2-3t2 3z"/><path fill="none" stroke="#fff" stroke-linecap="round" stroke-width="39" d="m61 112-64 8"/></svg>`;
document.body.append(uni);
const uniDone = () => off(uni, "go");
const uniGo = () => {
  off(uni, "go");
  uni.removeEventListener("animationend", uniDone);
  void uni.offsetWidth;
  on(uni, "go");
  uni.addEventListener("animationend", uniDone, { once: true });
};
