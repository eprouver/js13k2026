const beep = (f, d, ty = "sine", v = 0.12, wait = 0, to) => {
  ac.state === "suspended" && ac.resume();
  const t = ac.currentTime + wait;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = ty;
  o.frequency.setValueAtTime(f, t);
  to && o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.006);
  g.gain.exponentialRampToValueAtTime(1e-4, t + d);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + d);
};
const sfxLand = () => (
  beep(1600, 0.02, "sine", 0.1),
  beep(620, 0.055, "sine", 0.05, 0, 220)
);
const sfxReward = (m = 1, v = 0.1) => (
  beep(523 * m, 0.16, "triangle", v),
  beep(784 * m, 0.28, "triangle", v, 0.12)
);
