const ac = new AudioContext();
const out = ac.createGain();
out.gain.value = 0.88;
out.connect(ac.destination);
let beat = 480,
  lift = 0,
  mI = 0,
  step = 0,
  sc,
  mW,
  tW,
  rev;
const TRI = [0, 2, 4, 7, 9];
const S = "014578aCDE,023579aCDE,02479CDEGI,01578CDEG,01478CDEG,024579bCDE"
  .split(",")
  .map((s) => [...s].map((c) => parseInt(c, 36)));
const wv = ["sine", "triangle"];
const F = (n) => 440 * 2 ** ((n - 69) / 12);
const musicRand = () => {
  sc = (Math.random() * 5) | 0;
  mW = Math.random() < 0.5 ? 0 : 1;
  tW = Math.random() < 0.5 ? 0 : 1;
};
const musicWin = () => {
  sc = 5;
  mW = tW = 0;
  lift += 16;
  beat = 360;
};
function startMusic() {
  const X = ac;
  if (X.state === "suspended") return X.resume().then(startMusic);
  if (startMusic._on) return;
  startMusic._on = 1;
  const R = X.sampleRate,
    n = (R * 3.5) | 0,
    buf = X.createBuffer(2, n, R);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.5;
  }
  rev = X.createConvolver();
  rev.buffer = buf;
  const wet = X.createGain();
  wet.gain.value = 0.55;
  rev.connect(wet).connect(out);
  musicRand();
  const vo = (ty, f, v, d) => {
    const t = X.currentTime,
      o = X.createOscillator(),
      g = X.createGain();
    o.type = ty;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(1e-4, t + d);
    o.connect(g).connect(out);
    g.connect(rev);
    o.start(t);
    o.stop(t + d + 0.05);
  };
  const tick = () => {
    const scale = S[sc],
      ps = step++ % 16,
      b = beat / 1e3;
    if (ps >= 12) mI > 0 && mI--;
    else mI = Math.max(0, Math.min(scale.length - 1, mI + ((Math.random() * 3) | 0) - 1));
    const mF = F(60 + lift + scale[mI]),
      tI = TRI.reduce((p, c) => (Math.abs(c - mI) < Math.abs(p - mI) ? c : p));
    vo(wv[mW], mF, 0.1, b * 1.35);
    vo(wv[tW], F(48 + lift + scale[tI]), 0.12, b * 2.1);
    if (!(ps & 3)) {
      const t = X.currentTime,
        o = X.createOscillator(),
        g = X.createGain(),
        d = b * 0.55;
      o.type = sc > 4 ? "sine" : "triangle";
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(40, t + d);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(1e-4, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    }
    setTimeout(tick, beat);
  };
  tick();
}
const armMusicStart = () => {
  const go = () => {
    window.removeEventListener("pointerdown", go, true);
    window.removeEventListener("keydown", go, true);
    startMusic();
  };
  window.addEventListener("pointerdown", go, true);
  window.addEventListener("keydown", go, true);
};
armMusicStart();
