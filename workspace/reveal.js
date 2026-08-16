let revealRaf = null;
let revealLayers = [];

const REVEAL_MS = OPTS.reveal.revealMs;
const HIDE_MS = OPTS.reveal.hideMs;
const R_MAX = OPTS.reveal.rMax;
const easeOut3 = (t) => 1 - (1 - t) ** 3;

const runTween = (ms, { onTick, onDone, setRaf }) => {
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    onTick(easeOut3(t), t);
    if (t < 1) setRaf(requestAnimationFrame(tick));
    else {
      setRaf(null);
      onDone?.();
    }
  };
  setRaf(requestAnimationFrame(tick));
};

const setCircleR = (circle, r) =>
  circle?.setAttribute?.("r", String(Math.max(0, r)));
const readCircleR = (circle, fallback = 0) => {
  const v = parseFloat(circle?.getAttribute?.("r"));
  return Number.isFinite(v) ? Math.max(0, v) : fallback;
};

function ensureRevealDefs() {
  if (document.getElementById("reveal-defs")) return;
  const wrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrap.id = "reveal-defs";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText =
    "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  wrap.innerHTML =
    `<defs><filter id="df" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="48" xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter></defs>`;
  document.body.prepend(wrap);
}

function stopRevealRaf() {
  if (revealRaf != null) {
    cancelAnimationFrame(revealRaf);
    revealRaf = null;
  }
}

function resetLayerMask(layer) {
  if (!layer) return;
  stopHintRaf(layer);
  setCircleR(layer.querySelector(".rc"), 0);
  off(layer, "revealing", "hiding", "revealed");
}

function resetRevealMask() {
  stopRevealRaf();
  revealLayers.forEach(resetLayerMask);
  revealLayers = [];
}

const asLayers = (x) => (Array.isArray(x) ? x : [x]).filter(Boolean);

function playRevealMask(layerOrLayers) {
  ensureRevealDefs();
  stopRevealRaf();
  const layers = asLayers(layerOrLayers);
  for (const prev of revealLayers) if (!layers.includes(prev)) resetLayerMask(prev);
  if (!layers.length) {
    revealLayers = [];
    return;
  }
  revealLayers = layers;
  const circles = layers.map((layer) => {
    stopHintRaf(layer);
    off(layer, "revealed", "hiding");
    on(layer, "revealing");
    return layer.querySelector(".rc");
  });
  if (circles.some((c) => !c)) return;
  const r0s = circles.map((c) => readCircleR(c, 0));
  runTween(REVEAL_MS, {
    setRaf: (id) => {
      revealRaf = id;
    },
    onTick: (eased) =>
      circles.forEach((c, i) => setCircleR(c, r0s[i] + (R_MAX - r0s[i]) * eased)),
    onDone: () =>
      layers.forEach((layer, i) => {
        setCircleR(circles[i], R_MAX);
        off(layer, "revealing");
        on(layer, "revealed");
      }),
  });
}

function playHideMask(layerOrLayers, onDone) {
  ensureRevealDefs();
  stopRevealRaf();
  const layers = asLayers(layerOrLayers);
  if (!layers.length) return void onDone?.();
  revealLayers = layers;
  const circles = layers.map((layer) => {
    off(layer, "revealed", "revealing");
    on(layer, "hiding");
    return layer.querySelector(".rc");
  });
  if (circles.some((c) => !c)) return void onDone?.();
  const r0s = circles.map((c) => readCircleR(c, R_MAX));
  const dur = Math.max(400, HIDE_MS * (Math.max(...r0s, 1) / R_MAX));
  runTween(dur, {
    setRaf: (id) => {
      revealRaf = id;
    },
    onTick: (eased) =>
      circles.forEach((c, i) => setCircleR(c, r0s[i] * (1 - eased))),
    onDone: () => {
      layers.forEach(resetLayerMask);
      revealLayers = [];
      onDone?.();
    },
  });
}

function stopHintRaf(layer) {
  if (layer?._hintRaf != null) {
    cancelAnimationFrame(layer._hintRaf);
    layer._hintRaf = null;
  }
}

function addWashRect(layer, fill) {
  const svg = layer.querySelector("svg");
  const poly = layer.querySelector(".ctri");
  if (!svg || !poly) return;
  layer.querySelectorAll(".wr").forEach((r) => r.remove());
  svg.insertBefore(
    svgEl("rect", {
      class: "wr",
      width: 100,
      height: 100,
      fill,
      "fill-opacity": 0.55,
      mask: poly.getAttribute("mask"),
    }),
    poly
  );
}

function playHintMask(layer, rTarget, ms = REVEAL_MS) {
  ensureRevealDefs();
  const circle = layer?.querySelector?.(".rc");
  if (!circle) return;
  stopHintRaf(layer);
  on(layer, "prv");
  const r0 = readCircleR(circle, 0);
  const target = Math.max(0, rTarget);
  runTween(ms, {
    setRaf: (id) => {
      layer._hintRaf = id;
    },
    onTick: (eased) => setCircleR(circle, r0 + (target - r0) * eased),
    onDone: () => setCircleR(circle, target),
  });
}

function clearHintMask(layer) {
  if (!layer) return;
  stopHintRaf(layer);
  off(layer, "prv");
  layer.querySelectorAll(".wr").forEach((r) => r.remove());
  setCircleR(layer.querySelector(".rc"), 0);
}

function clearAllHintMasks() {
  document
    .querySelectorAll(".cl.prv")
    .forEach(clearHintMask);
}

const clearFaceHints = (face) =>
  face?.querySelectorAll?.(".cl.prv").forEach(clearHintMask);
