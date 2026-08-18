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
uni.innerHTML = `<svg viewBox="0 0 128 128"><ellipse cx="55" cy="49" fill="${uniPink}" rx="24" ry="16" transform="rotate(-19 55 49)"/><path fill="#fff" d="m32 112 19-66 32 2 7 37-18 4 6 24z"/><path fill="${uniCyan}" d="M31 78c-5-2-6-13-2-24q9-19 18-17c5 2 6 13 2 24q-8 19-18 17z"/><path fill="#fff" d="m50 56 4-21 12 18zm20-4 11-17 3 21z"/><circle cx="60" cy="64" r="5" fill="#222"/><circle cx="80" cy="64" r="5" fill="#222"/><ellipse cx="79" cy="84" fill="#fde8f6" rx="11" ry="10"/><path fill="${uniGold}" d="m63 49 7-35 2 36z"/><ellipse cx="59" cy="63" fill="#fff" rx="1.4" ry="1.3"/><ellipse cx="78" cy="63" fill="#fff" rx="1.4" ry="1.3"/><ellipse cx="78" cy="82" fill="${uniPink}" rx="2.4" ry="2.6"/><ellipse cx="86" cy="82" fill="${uniPink}" rx="2.4" ry="2.6"/><g fill="none" stroke-linecap="round" stroke-width="21"><path stroke="${uniPink}" d="m38 62-12 59"/><path stroke="${uniCyan}" d="m33 86-12 60"/></g></svg>`;
document.body.append(uni);
const uniDone = () => off(uni, "go");
const uniGo = () => {
  off(uni, "go");
  uni.removeEventListener("animationend", uniDone);
  void uni.offsetWidth;
  on(uni, "go");
  uni.addEventListener("animationend", uniDone, { once: true });
};
