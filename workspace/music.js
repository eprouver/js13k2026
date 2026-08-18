const ac = new AudioContext();
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
    n = (R * 2.5) | 0,
    buf = X.createBuffer(2, n, R);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.5;
  }
  const conv = X.createConvolver();
  conv.buffer = buf;
  const wet = X.createGain();
  wet.gain.value = 0.4;
  conv.connect(wet).connect(X.destination);
  const bassOsc = X.createOscillator(),
    bassGain = X.createGain(),
    melOsc = X.createOscillator(),
    melGain = X.createGain();
  bassOsc.type = "triangle";
  melOsc.type = "sine";
  bassGain.gain.value = melGain.gain.value = 0;
  bassOsc.connect(bassGain).connect(X.destination);
  bassGain.connect(conv);
  melOsc.connect(melGain).connect(X.destination);
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
  const tick = () => {
    const t = X.currentTime;
    const ci = ((step / 16) | 0) % 4,
      s = step++ % 16;
    let bn = roots[ci] + lift;
    const p = s % 4;
    if (p & 1) bn += 7;
    if (p === 2) bn += 12;
    bassGain.gain.cancelScheduledValues(t);
    bassGain.gain.setValueAtTime(0.06, t);
    bassGain.gain.exponentialRampToValueAtTime(1e-4, t + 1);
    bassOsc.frequency.setValueAtTime(midi(bn - 12), t);
    const ch = phrases[ci][s];
    if (ch !== "x") {
      melGain.gain.cancelScheduledValues(t);
      melGain.gain.setValueAtTime(0.05, t);
      melGain.gain.exponentialRampToValueAtTime(1e-4, t + 1.6);
      melOsc.frequency.setValueAtTime(midi(52 + parseInt(ch, 16) + lift), t);
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
