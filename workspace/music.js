const ac = new AudioContext();
const out = ac.createGain();
out.gain.value = 0.88;
out.connect(ac.destination);
let beat = 600,
  lift = 0;
const musicWin = () => {
  beat = 400;
  lift = 7;
};

function startMusic() {
  const X = ac;
  if (X.state === "suspended") return X.resume().then(startMusic);
  if (startMusic._on) return;
  startMusic._on = 1;
  const R = X.sampleRate,
    n = (R * 1.25) | 0,
    buf = X.createBuffer(2, n, R);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3.5;
  }
  const conv = X.createConvolver();
  conv.buffer = buf;
  const wet = X.createGain();
  wet.gain.value = 1.2;
  conv.connect(wet).connect(out);
  const bassOsc = X.createOscillator(),
    bassGain = X.createGain(),
    melOsc = X.createOscillator(),
    melGain = X.createGain();
  bassOsc.type = "triangle";
  melOsc.type = "sine";
  bassGain.gain.value = melGain.gain.value = 0;
  bassOsc.connect(bassGain).connect(out);
  bassGain.connect(conv);
  melOsc.connect(melGain).connect(out);
  melGain.connect(conv);
  bassOsc.start();
  melOsc.start();
  const roots = [40, 43, 47, 50];
  const phrases = [
    "7x7x7x7x7x7x7x7x",
    "axaxaxax9x9xaxax",
    "bxbxbxbxbxbxbxbx",
    "cxcxcxcxcxcxcxcx",
  ];
  let step = 0;
  const midi = (m) => 440 * 2 ** ((m - 69) / 12);
  const env = (g, v, d, t) => {
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(v, t + 0.01);
    g.exponentialRampToValueAtTime(1e-4, t + d);
  };
  const pitch = (o, f, t) => o.frequency.setTargetAtTime(f, t, 0.015);
  const tick = () => {
    const t = X.currentTime;
    const ci = ((step / 16) | 0) % 4,
      s = step++ % 16;
    let bn = roots[ci] + lift;
    const p = s % 4;
    if (p & 1) bn += 7;
    if (p === 2) bn += 12;
    env(bassGain.gain, 0.06, 1, t);
    pitch(bassOsc, midi(bn - 12), t);
    const ch = phrases[ci][s];
    if (ch !== "x") {
      env(melGain.gain, 0.05, 1.6, t);
      pitch(melOsc, midi(52 + parseInt(ch, 16) + lift), t);
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
