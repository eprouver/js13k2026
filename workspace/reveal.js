let revealRaf = null;
let revealLayers = [];

const REVEAL_MS = OPTS.reveal.ms;
const R_MAX = OPTS.reveal.rMax;
const filt = (id, seed, freq = ".03") =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="48" xChannelSelector="R" yChannelSelector="G"/></filter>`;

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
  wrap.innerHTML = `<defs>${filt("df", 1, ".05")}${filt("wf", 9)}</defs>`;
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
  off(layer, "revealing", "hiding", "revealed");
  setCircleR(layer.querySelector(".rc"), 0);
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
    off(layer, "revealed", "hiding");
    on(layer, "revealing");
    const c = layer.querySelector(".rc");
    setCircleR(c, 0);
    return c;
  });
  if (circles.some((c) => !c)) return;
  runTween(REVEAL_MS, {
    setRaf: (id) => {
      revealRaf = id;
    },
    onTick: (eased) => circles.forEach((c) => setCircleR(c, R_MAX * eased)),
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
  const dur = Math.max(400, REVEAL_MS * (Math.max(...r0s, 1) / R_MAX));
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

function stopHintRaf(el) {
  if (el?._hintRaf != null) {
    cancelAnimationFrame(el._hintRaf);
    el._hintRaf = null;
  }
}

function clearHintMask(idOrEl) {
  const id = idOrEl?.dataset?.id ?? idOrEl;
  if (id == null) return;
  qsa(`.wl[data-id="${id}"]`).forEach((wl) => {
    stopHintRaf(wl);
    clearTimeout(wl._wt);
    wl.remove();
  });
}

function pruneWashes() {
  qsa(".wl").forEach((wl) => {
    const id = wl.dataset.id;
    const cl = layerById(id);
    if (collected.has(id) || !cl || cl.style.visibility === "hidden")
      clearHintMask(id);
  });
}

function clearAllHintMasks() {
  qsa(".wl").forEach((wl) => clearHintMask(wl.dataset.id));
}

function playWash(cl, fill) {
  const id = cl?.dataset?.id;
  const face = cl?.closest?.(".face");
  const rc = cl?.querySelector?.(".rc");
  if (
    !id ||
    !face ||
    !rc ||
    collected.has(id) ||
    cl.style.visibility === "hidden"
  )
    return;
  ensureRevealDefs();
  const cx = +rc.getAttribute("cx") || 50;
  const cy = +rc.getAttribute("cy") || 50;
  clearHintMask(id);
  const mid = `wm-${id}`;
  const target =
    Math.max(
      Math.hypot(cx, cy),
      Math.hypot(100 - cx, cy),
      Math.hypot(cx, 100 - cy),
      Math.hypot(100 - cx, 100 - cy)
    ) + 50;
  const wl = div({ className: "wl" });
  wl.dataset.id = id;
  const svg = svgEl("svg", { ...SVG100, preserveAspectRatio: "none" });
  svg.innerHTML =
    `<defs>` +
    `<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">` +
    `<circle class="wc" cx="${cx}" cy="${cy}" r="0" fill="#fff" filter="url(#wf)"/>` +
    `</mask></defs>` +
    `<rect class="wr" width="100" height="100" fill="${fill}" fill-opacity="0.55" mask="url(#${mid})" ` +
    `style="animation-duration:${OPTS.powers.washFadeMs}ms"/>`;
  wl.append(svg);
  face.insertBefore(wl, cl);
  const circle = wl.querySelector(".wc");
  wl._wt = setTimeout(() => clearHintMask(id), OPTS.powers.washFadeMs);
  runTween(REVEAL_MS, {
    setRaf: (raf) => {
      wl._hintRaf = raf;
    },
    onTick: (eased) => setCircleR(circle, target * eased),
    onDone: () => setCircleR(circle, target),
  });
}
