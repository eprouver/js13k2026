const dodeFill = (c) =>
  colorHsl({ ...c, l: Math.max(c.l, OPTS.dode.minLightness) });

const makeGem = (color, slot) => {
  const fill = dodeFill(color);
  const endSize = Math.max(
    28,
    (slot?.getBoundingClientRect?.().width || 52) * 0.72
  );
  const gem = div({ className: "gem" });
  gem.style.setProperty("--fly", fill);
  gem.style.background = fill;
  box(gem, { w: endSize, h: endSize });
  return { gem, fill, endSize };
};

function createDodecahedron(opts) {
  const {
    color,
    sideLength = 4.5,
    unlockedFace = 0,
    unlockedFaces,
    pendingFaces = [],
  } = opts;
  const lit = new Set(
    unlockedFaces ?? (unlockedFace != null ? [unlockedFace] : [0])
  );
  const pending = new Set(pendingFaces);
  const fill = dodeFill(color);
  const tilt = 26.565;
  const z = sideLength * OPTS.dode.facePush;
  const faces = [];

  for (let i = 0; i < 12; i++) {
    const top = i < 6;
    const pole = i === 0 || i === 11;
    const rx = pole ? (top ? 90 : -90) : top ? tilt : -tilt;
    const ry = pole ? (top ? 0 : 9) : top ? (i - 1) * 72 : (i - 6) * 72 + 36;
    const rz = pole ? (top ? 0 : -9) : top ? 180 : 0;
    const isPending = pending.has(i);
    const on = lit.has(i) && !isPending;
    const face = div({
      className: on
        ? "dface lit"
        : isPending
          ? "dface pending"
          : "dface",
      style: {
        width: `${sideLength}em`,
        height: `${sideLength}em`,
        marginLeft: `${-sideLength / 2}em`,
        marginTop: `${-sideLength / 2}em`,
        background: on ? fill : "#3a3a42",
        transform: `rotateY(${ry}deg) rotateX(${rx}deg) translateZ(${z}em) rotateZ(${rz}deg)`,
      },
    });
    face.dataset.i = String(i);
    faces.push(div({ className: "dhold" }, face));
  }

  const el = div({ className: "dode", style: { "--dode": fill } }, ...faces);
  el.dataset.color = color.name;
  return el;
}

function createDodeRack() {
  const litByColor = Object.fromEntries(
    RAINBOW.map((c) => [c.name, new Set()])
  );

  const slots = RAINBOW.map((c) => {
    const slot = div({
      className: "ds",
      style: toneStyle("slot", c),
    });
    slot.dataset.color = c.name;
    return slot;
  });

  const rack = div({ id: "drk" }, ...slots);
  document.body.append(rack);

  const slotFor = (color) =>
    slots[RAINBOW.indexOf(toRainbow(color))] || null;

  function paint(rainbow, pendingFaces = []) {
    const slot = slots[RAINBOW.indexOf(rainbow)];
    if (!slot) return null;
    const lit = litByColor[rainbow.name];
    if (!lit.size && !pendingFaces.length) {
      slot.replaceChildren();
      return slot;
    }
    const pending = new Set(pendingFaces);
    slot.replaceChildren(
      createDodecahedron({
        color: rainbow,
        unlockedFaces: [...new Set([...lit, ...pending])].sort((a, b) => a - b),
        pendingFaces: [...pending],
        sideLength: OPTS.dode.sideEm,
      })
    );
    return slot;
  }

  const nextFace = (colorName) => {
    const lit = litByColor[colorName];
    for (let i = 0; i < 12; i++) if (!lit.has(i)) return i;
    return -1;
  };

  function igniteFace(slot, faceIndex) {
    const face = slot?.querySelector?.(`.dface[data-i="${faceIndex}"]`);
    if (!face) return;
    off(face, "pending");
    void face.offsetWidth;
    on(face, "lit", "ignite");
    const fill = slot.querySelector(".dode")?.style.getPropertyValue("--dode");
    if (fill) face.style.background = fill;
  }

  const retireFull = (rainbow, slot, gemEl) => {
    paint(rainbow);
    gemEl?.remove?.();
    retireColorFromLevel?.(rainbow.name);
    return slot;
  };

  async function deliver(color, gemEl) {
    const rainbow = toRainbow(color);
    const slot = slotFor(rainbow);
    if (!slot) return null;
    if (litByColor[rainbow.name].size >= 12) return retireFull(rainbow, slot, gemEl);
    const face = nextFace(rainbow.name);
    if (face < 0) return retireFull(rainbow, slot, gemEl);
    await flyThen(gemEl, slot, { node: gemEl, ms: OPTS.fly.trophyMs });
    return settleFace(rainbow, face);
  }

  async function settleFace(rainbow, faceIndex) {
    litByColor[rainbow.name].add(faceIndex);
    const slot = paint(rainbow, [faceIndex]);
    await nextFrame();
    igniteFace(slot, faceIndex);
    if (litByColor[rainbow.name].size >= 12) retireColorFromLevel?.(rainbow.name);
    if (allComplete()) endGameWon?.();
    return slot;
  }

  async function flyInFace(rainbow, faceIndex, delay = 0) {
    if (litByColor[rainbow.name].size >= 12) return false;
    const slot = slotFor(rainbow);
    if (!slot || faceIndex < 0) return false;
    const { gem } = makeGem(rainbow, slot);
    await flyThen(null, slot, {
      node: gem,
      fromOffscreen: true,
      delay,
      ms: OPTS.fly.trophyMs,
    });
    await settleFace(rainbow, faceIndex);
    return true;
  }

  async function addFaces(n) {
    let done = 0;
    for (let i = 0; i < Math.max(0, n); i++) {
      const targets = RAINBOW.filter(
        (c) => litByColor[c.name].size > 0 && litByColor[c.name].size < 12
      );
      if (!targets.length) break;
      const c = shuffle(targets.slice())[0];
      const f = nextFace(c.name);
      if (f < 0) continue;
      await flyInFace(c, f, i === 0 ? 0 : 80);
      done++;
    }
    return done;
  }

  function openFaceCount() {
    let n = 0;
    for (const c of RAINBOW) {
      const s = litByColor[c.name].size;
      if (s > 0 && s < 12) n += 12 - s;
    }
    return n;
  }

  const isColorComplete = (color) =>
    litByColor[toRainbow(color).name].size >= 12;
  const completedNames = () =>
    RAINBOW.filter((c) => litByColor[c.name].size >= 12).map((c) => c.name);
  const allComplete = () =>
    RAINBOW.every((c) => litByColor[c.name].size >= 12);

  return {
    rack,
    slots,
    deliver,
    addFaces,
    openFaceCount,
    slotFor,
    isColorComplete,
    completedNames,
    allComplete,
  };
}
