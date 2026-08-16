const RAINBOW = [
  { name: "Red", h: 0, s: 80, l: 55 },
  { name: "Orange", h: 28, s: 85, l: 52 },
  { name: "Yellow", h: 52, s: 85, l: 55 },
  { name: "Green", h: 112, s: 75, l: 48 },
  { name: "Blue", h: 224, s: 80, l: 55 },
  { name: "Purple", h: 280, s: 70, l: 55 },
];

const colorHsl = ({ h, s, l }) => `hsl(${h} ${s}% ${l}%)`;

const colorPair = (c) => ({ ...c, l: 33 });

const toneStyle = (prefix, color, dark = colorPair(color)) => ({
  [`--${prefix}`]: colorHsl(color),
  [`--${prefix}-dark`]: colorHsl(dark),
});

const toRainbow = (c) => {
  let best = RAINBOW[0];
  let bestD = 1e9;
  for (const r of RAINBOW) {
    let d = Math.abs(c.h - r.h) % 360;
    if (d > 180) d = 360 - d;
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
};
