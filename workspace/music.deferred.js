// ============================================================================
// MUSIC — lydian ambient + whole-tone reward bursts
// ============================================================================

// ZzFXMicro - Zuper Zmall Zound Zynth - v1.3.2 by Frank Force
let zzfxV = 0.3, // volume
  zzfxX = new AudioContext(), // audio context
  zzfx = // play sound
  (
    p = 1,
    k = 0.05,
    b = 220,
    e = 0,
    r = 0,
    t = 0.1,
    q = 0,
    D = 1,
    u = 0,
    y = 0,
    v = 0,
    z = 0,
    l = 0,
    E = 0,
    A = 0,
    F = 0,
    c = 0,
    w = 1,
    m = 0,
    B = 0,
    N = 0
  ) => {
    let M = Math,
      d = 2 * M.PI,
      R = 44100,
      G = (u *= (500 * d) / R / R),
      C = (b *= (1 - k + 2 * k * M.random((k = []))) * d) / R,
      g = 0,
      H = 0,
      a = 0,
      n = 1,
      I = 0,
      J = 0,
      f = 0,
      h = N < 0 ? -1 : 1,
      x = (d * h * N * 2) / R,
      L = M.cos(x),
      Z = M.sin,
      K = Z(x) / 4,
      O = 1 + K,
      X = (-2 * L) / O,
      Y = (1 - K) / O,
      P = (1 + h * L) / 2 / O,
      Q = -(h + L) / O,
      S = P,
      T = 0,
      U = 0,
      V = 0,
      W = 0;
    e = R * e + 9;
    m *= R;
    r *= R;
    t *= R;
    c *= R;
    y *= (500 * d) / R ** 3;
    A *= d / R;
    v *= d / R;
    z *= R;
    l = (R * l) | 0;
    p *= zzfxV;
    for (h = (e + m + r + t + c) | 0; a < h; k[a++] = f * p)
      ++J % ((100 * F) | 0) ||
        ((f = q
          ? 1 < q
            ? 2 < q
              ? 3 < q
                ? 4 < q
                  ? ((g / d) % 1 < D / 2) * 2 - 1
                  : Z(g ** 3)
                : M.max(M.min(M.tan(g), 1), -1)
              : 1 - (((2 * g) / d) % 2 + 2) % 2
            : 1 - 4 * M.abs(M.round(g / d) - g / d)
          : Z(g)),
        (f =
          (l ? 1 - B + B * Z((d * a) / l) : 1) *
          (4 < q ? f : (f < 0 ? -1 : 1) * M.abs(f) ** D) *
          (a < e
            ? a / e
            : a < e + m
              ? 1 - ((a - e) / m) * (1 - w)
              : a < e + m + r
                ? w
                : a < h - c
                  ? ((h - a - c) / t) * w
                  : 0)),
        (f = c
          ? f / 2 +
            (c > a ? 0 : ((a < h - c ? 1 : (h - a) / c) * k[(a - c) | 0]) / 2 / p)
          : f),
        N
          ? (f = W = S * T + Q * (T = U) + P * (U = f) - Y * V - X * (V = W))
          : 0,
        (x = (b += u += y) * M.cos(A * H++)),
        (g += x + x * E * Z(a ** 5)),
        n && ++n > z && ((b += v), (C += v), (n = 0)),
        !l || ++I % l || ((b = C), (u = G), (n = n || 1)));
    X = zzfxX;
    p = X.createBuffer(1, h, R);
    p.getChannelData(0).set(k);
    b = X.createBufferSource();
    b.buffer = p;
    b.connect(X.destination);
    b.start();
  };

// Only the scales we settled on
const SCALES_RAW = {
  lydian: { s: "-024679bcdfghjklmoqrtv", t: "-37cfjmqtx" },
  whole: { s: "-024579bceghjlnqstvxz", t: "-047cgjosv" },
};

const SCALES = {};
for (const k in SCALES_RAW) {
  SCALES[k] = {
    s: [...SCALES_RAW[k].s].map((c) => parseInt(c, 36) + 45),
    t: [...SCALES_RAW[k].t].map((c) => parseInt(c, 36) + 45),
  };
}

const NORMAL_SCALE = "lydian";
const REWARD_SCALE = "whole";

let audioCtx = null;
let masterGain, masterReverb, crusher, bgBus, bellBus;

let globalVolume = 1.5;
let playing = false;
let rewarding = false;
let doubleTimeBells = true;

let nextNoteTime = 0;
let scheduledTime = 0;
let step = 0;
let beatInMeasure = 0;
let tempo = 0.6;

let scale = SCALES[NORMAL_SCALE].s;
let triad = SCALES[NORMAL_SCALE].t;

let centerIdx = 8;
const startIdx = centerIdx;
let currentMelodyMidi = 69;
let phraseLength = 1;
let maxPhrase = 8;
let phraseStep = 0;
let direction = -1;

const initAudio = () => {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = globalVolume;
  masterGain.connect(audioCtx.destination);

  masterReverb = audioCtx.createConvolver();
  const revLen = audioCtx.sampleRate * 1.25;
  const revBuf = audioCtx.createBuffer(2, revLen, audioCtx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = revBuf.getChannelData(c);
    for (let i = 0; i < revLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 3.5);
    }
  }
  masterReverb.buffer = revBuf;

  const reverbWet = audioCtx.createGain();
  reverbWet.gain.value = 1.2;
  reverbWet.connect(masterGain);
  masterReverb.connect(reverbWet);

  crusher = audioCtx.createScriptProcessor(4096, 1, 1);
  crusher.onaudioprocess = (e) => {
    const i = e.inputBuffer.getChannelData(0);
    const o = e.outputBuffer.getChannelData(0);
    for (let j = 0; j < i.length; j++) o[j] = Math.round(i[j] * 64) / 64;
  };

  bgBus = audioCtx.createGain();
  bellBus = audioCtx.createGain();

  bgBus.connect(crusher);
  crusher.connect(masterGain);

  bellBus.connect(masterReverb);
  bellBus.connect(masterGain);
};

const setEnv = (g, t, peak, d) => {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.setValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + d - 0.02);
  g.gain.linearRampToValueAtTime(0, t + d);
};

const playBigKick = (t) => {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();

  osc.frequency.setValueAtTime(210, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.12, t + 0.01);
  env.gain.linearRampToValueAtTime(0.001, t + 0.4);
  env.gain.linearRampToValueAtTime(0, t + 0.45);

  bgBus.gain.cancelScheduledValues(t);
  bgBus.gain.setTargetAtTime(0.1, t, 0.005);
  bgBus.gain.setTargetAtTime(1.0, t + 0.08, 0.06);

  osc.connect(env).connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.45);
};

const playSnare = (t) => {
  const b = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random();

  const s = audioCtx.createBufferSource();
  s.buffer = b;

  const f = audioCtx.createBiquadFilter();
  f.type = rewarding ? "bandpass" : "lowpass";
  f.frequency.value = 650;

  const e = audioCtx.createGain();
  e.gain.setValueAtTime(0.4, t);
  e.gain.setValueAtTime(0.7, t + 0.01);
  e.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

  s.connect(f).connect(e).connect(bellBus);
  s.start(t);
  s.stop(t + 0.21);
};

const playWoo = (t) => {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
  setEnv(env, t, 0.8, 0.53);

  [400, 800].forEach((f) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = f;
    filter.Q.value = 10;
    osc.connect(filter).connect(env).connect(bellBus);
  });
  osc.start(t);
  osc.stop(t + 0.2);
};

const playFMLead = (f, t, d) => {
  const car = audioCtx.createOscillator();
  const mod = audioCtx.createOscillator();
  const mG = audioCtx.createGain();
  const env = audioCtx.createGain();

  car.type = "sawtooth";
  mod.frequency.value = f * 1.5;
  mG.gain.value = 1000;
  setEnv(env, t, 0.09, d);

  mod.connect(mG).connect(car.frequency);
  car.connect(env).connect(bgBus);

  [car, mod].forEach((o) => {
    o.start(t);
    o.stop(t + d + 0.05);
  });
};

const playGlistenArp = (f, t, d) => {
  if (!f) return;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(f, t);
  setEnv(env, t, 0.15, d);
  osc.connect(env).connect(bgBus);
  osc.start(t);
  osc.stop(t + d);
};

/** Rhodes voice (chosen instrument) */
const playBell = (freq, t, duration, isMelody) => {
  if (!freq) return;

  freq *= rewarding ? 1.3 : 0.65;
  const strikes = isMelody
    ? [
        {
          fRatio: 0.84375,
          tOffset: 0,
          dur: duration * 1.5,
          volMult: rewarding ? 0 : 0.375 * (130 / freq),
        },
      ]
    : [{ fRatio: 1.5, tOffset: 0, dur: duration, volMult: 0.3 }];

  strikes.forEach((strike) => {
    const sTime = t + strike.tOffset;
    const sFreq = freq * strike.fRatio;
    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const mainEnv = audioCtx.createGain();
    const modIndex = audioCtx.createGain();

    carrier.type = "sine";
    carrier.frequency.setValueAtTime(sFreq, sTime);
    modulator.type = "sawtooth";
    modulator.frequency.setValueAtTime(sFreq * 14, sTime);

    const peakBrightness = (isMelody ? 1800 : 800) * strike.volMult;
    modIndex.gain.setValueAtTime(0, sTime);
    modIndex.gain.linearRampToValueAtTime(peakBrightness, sTime + 0.005);
    modIndex.gain.exponentialRampToValueAtTime(0.01, sTime + 0.15);

    const peakVol = (isMelody ? 0.4 : 0.2) * strike.volMult;
    mainEnv.gain.setValueAtTime(0, sTime);
    mainEnv.gain.linearRampToValueAtTime(peakVol, sTime + 0.01);
    mainEnv.gain.exponentialRampToValueAtTime(0.001, sTime + strike.dur);

    modulator.connect(modIndex).connect(carrier.frequency);
    carrier.connect(mainEnv).connect(bellBus);

    [carrier, modulator].forEach((o) => {
      o.start(sTime);
      o.stop(sTime + strike.dur + 0.1);
    });
  });
};

const mToF = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const getTVoice = (melodyMidi, position) => {
  const superior = triad.filter((n) => n >= melodyMidi);
  const inferior = triad.filter((n) => n <= melodyMidi).reverse();

  if (position > 0) {
    const target = superior[position - 1];
    return target !== undefined ? target : triad[triad.length - 1];
  }
  if (position < 0) {
    const target = inferior[Math.abs(position) - 1];
    return target !== undefined ? target : triad[0];
  }
  return melodyMidi;
};

const playHook = (t) => {
  let arp = [
    [1, 0.55, 0.1],
    [14, 0.7, 0.15],
    [7, 0.7, 0.2],
    [9, 0.88, 0.02],
    [11, 0.94, 0.02],
  ];

  if (rewarding) {
    arp = arp.concat([
      [13, 1.0, 0.02],
      [8, 1.15, 0.2],
      [21, 1.3, 0.3],
      [14, 1.3, 0.4],
    ]);
  }

  arp.forEach(([offset, timeDelay, decay]) => {
    playGlistenArp(mToF(scale[centerIdx] + offset), t + timeDelay, decay);
  });
};

function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + 0.1) {
    const sMod8 = step % 8;
    const tNote = getTVoice(currentMelodyMidi, Math.random() > 0.5 ? 1 : -1);

    if (Math.random() > 0.95 && !rewarding) {
      doubleTimeBells = !doubleTimeBells;
    }

    if (scheduledTime > 3) {
      if (sMod8 === 0 || sMod8 === 4) playBigKick(nextNoteTime);
      if (sMod8 === 2 || sMod8 === 6) {
        playSnare(nextNoteTime);
      } else if (Math.random() > 0.75 || rewarding) {
        for (let j = 0; j < 2; j++) {
          playGlistenArp(mToF(tNote), nextNoteTime + j * (tempo / 4), 0.06);
        }
      }
      if (step % 16 === 7) playWoo(nextNoteTime);

      if (step % 4 === 0) {
        playFMLead(rewarding ? mToF(65) : mToF(45), nextNoteTime, 0.4);
        if (!rewarding) {
          for (let i = 0; i < 2; i++) {
            setTimeout(() => {
              zzfx(
                globalVolume * 0.4,
                0,
                90,
                0,
                0.09,
                0.1,
                1,
                0.63,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0.02,
                0.5,
                0.04,
                0,
                -165
              );
            }, 30 + i * 380);
          }
        }
      }

      if (phraseStep > phraseLength) {
        phraseStep = 0;

        if (direction === -1) {
          direction = 1;
        } else {
          direction = Math.random() > 0.5 ? 1 : -1;
          phraseLength = (phraseLength % maxPhrase) + 1;
          scale = SCALES[NORMAL_SCALE].s;
          triad = SCALES[NORMAL_SCALE].t;
          maxPhrase = 8;
          tempo = 0.6;
          centerIdx = startIdx;
          doubleTimeBells = false;
          playHook(nextNoteTime);
          rewarding = false;
        }
      }
    }

    if (beatInMeasure === 0) {
      scheduledTime++;
      const offset = phraseLength - phraseStep;
      let safeIndex;

      phraseStep++;

      if (phraseStep === 1 && direction === -1 && !rewarding) {
        safeIndex = startIdx;
      } else {
        safeIndex = Math.min(
          scale.length - 1,
          Math.max(0, centerIdx + offset * direction)
        );
      }

      currentMelodyMidi = scale[safeIndex];

      playBell(mToF(getTVoice(currentMelodyMidi, -1)), nextNoteTime, 2.5, false);

      if (doubleTimeBells) {
        playBell(
          mToF(getTVoice(currentMelodyMidi, 1)),
          nextNoteTime + tempo / 2,
          1.2,
          false
        );
      }
    } else if (beatInMeasure === 1) {
      playBell(mToF(currentMelodyMidi), nextNoteTime, 1.0, true);

      if (doubleTimeBells) {
        playBell(
          mToF(getTVoice(currentMelodyMidi, Math.random() > 0.5 ? -1 : 2)),
          nextNoteTime + tempo / 2,
          0.6,
          false
        );
      }
    } else if ((beatInMeasure === 2 && Math.random() > 0.5) || rewarding) {
      playBell(mToF(getTVoice(currentMelodyMidi, 1)), nextNoteTime, 2.0, false);

      if (doubleTimeBells) {
        playBell(
          mToF(currentMelodyMidi + 12),
          nextNoteTime + tempo / 2,
          0.8,
          true
        );
      }
    } else if ((beatInMeasure === 3 && Math.random() > 0.5) || rewarding) {
      playBell(
        mToF(getTVoice(currentMelodyMidi, Math.random() > 0.5 ? 0 : 2)),
        nextNoteTime,
        0.6,
        false
      );

      if (doubleTimeBells) {
        playBell(
          mToF(getTVoice(currentMelodyMidi, -1)),
          nextNoteTime + tempo / 2,
          0.4,
          false
        );
      }
    }

    beatInMeasure = (beatInMeasure + 1) % 4;
    step++;
    nextNoteTime += tempo;
  }
  if (playing) requestAnimationFrame(scheduler);
}

/** Start ambient music (must be from a user gesture). */
function startMusic() {
  if (musicMuted) return;
  if (playing) {
    if (audioCtx?.state === "suspended") audioCtx.resume();
    if (zzfxX.state === "suspended") zzfxX.resume();
    return;
  }
  playing = true;
  if (!audioCtx) initAudio();
  else if (audioCtx.state === "suspended") audioCtx.resume();
  if (zzfxX.state === "suspended") zzfxX.resume();
  nextNoteTime = audioCtx.currentTime;
  scheduler();
}

function stopMusic() {
  playing = false;
}

let musicMuted = true; // start muted; unmute starts playback

function toggleMute() {
  musicMuted = !musicMuted;
  if (musicMuted) {
    stopMusic();
    if (audioCtx?.state === "running") audioCtx.suspend();
  } else {
    startMusic();
  }
  return musicMuted;
}

const armMusicStart = () => {
  const go = () => {
    window.removeEventListener("pointerdown", go, true);
    window.removeEventListener("keydown", go, true);
    if (zzfxX.state === "suspended") zzfxX.resume();
    if (!musicMuted) startMusic();
  };
  window.addEventListener("pointerdown", go, true);
  window.addEventListener("keydown", go, true);
};
armMusicStart();

function triggerReward() {
  if (musicMuted) return;
  if (!playing) startMusic();

  doubleTimeBells = false;

  if (!rewarding) {
    scale = SCALES[REWARD_SCALE].s;
    triad = SCALES[REWARD_SCALE].t;
    beatInMeasure = 0;
    centerIdx = 12;
    tempo = 0.15;
    direction = -1;
  } else {
    beatInMeasure = ~~(Math.random() * 3);
    direction = -direction;
    centerIdx = 8 + ~~(Math.random() * 8);
  }

  phraseStep = 0;
  maxPhrase = 6 + beatInMeasure;
  phraseLength = 6 + beatInMeasure;
  rewarding = true;
}
