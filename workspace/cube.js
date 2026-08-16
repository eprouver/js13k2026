const CUBE_FACES = 6;

/** [rotateY, rotateX] per cube face. */
const CUBE_TURNS = [
  [0, 0],
  [90, 0],
  [180, 0],
  [270, 0],
  [0, 90],
  [0, -90],
];

const cubeFill = (c) =>
  colorHsl({ ...c, l: Math.max(c.l, OPTS.cube.minLightness) });

const makeGem = (color, slot) => {
  const fill = cubeFill(color);
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

function createCube(opts) {
  const { color, sideLength = 2, unlockedFaces = [], pendingFaces = [] } = opts;
  const lit = new Set(unlockedFaces);
  const pending = new Set(pendingFaces);
  const fill = cubeFill(color);
  const z = sideLength / 2;

  const faces = CUBE_TURNS.map(([ry, rx], i) => {
    const isPending = pending.has(i);
    const on = lit.has(i) && !isPending;
    const face = div({
      className: on ? "cf lit" : isPending ? "cf pending" : "cf",
      style: {
        width: `${sideLength}em`,
        height: `${sideLength}em`,
        marginLeft: `${-sideLength / 2}em`,
        marginTop: `${-sideLength / 2}em`,
        background: on ? fill : "#3a3a42",
        transform: `rotateY(${ry}deg) rotateX(${rx}deg) translateZ(${z}em)`,
      },
    });
    face.dataset.i = String(i);
    return face;
  });

  const el = div({ className: "cube", style: { "--cube": fill } }, ...faces);
  el.dataset.color = color.name;
  return el;
}

function createCubeRack() {
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
      createCube({
        color: rainbow,
        unlockedFaces: [...new Set([...lit, ...pending])],
        pendingFaces: [...pending],
        sideLength: OPTS.cube.sideEm,
      })
    );
    return slot;
  }

  const nextFace = (colorName) => {
    const lit = litByColor[colorName];
    for (let i = 0; i < CUBE_FACES; i++) if (!lit.has(i)) return i;
    return -1;
  };

  function igniteFace(slot, faceIndex) {
    const face = slot?.querySelector?.(`.cf[data-i="${faceIndex}"]`);
    if (!face) return;
    off(face, "pending");
    void face.offsetWidth;
    on(face, "lit", "ignite");
    const fill = slot.querySelector(".cube")?.style.getPropertyValue("--cube");
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
    if (isFull(rainbow.name)) retireColorFromLevel?.(rainbow.name);
    if (allComplete()) endGameWon?.();
    return slot;
  }

  async function flyInFace(rainbow, faceIndex, delay = 0) {
    if (isFull(rainbow.name)) return false;
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
        (c) => litByColor[c.name].size > 0 && !isFull(c.name)
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
      if (s > 0 && s < CUBE_FACES) n += CUBE_FACES - s;
    }
    return n;
  }

  const isFull = (name) => litByColor[name].size >= CUBE_FACES;
  const isColorComplete = (color) => isFull(toRainbow(color).name);
  const completedNames = () =>
    RAINBOW.filter((c) => isFull(c.name)).map((c) => c.name);
  const allComplete = () => RAINBOW.every((c) => isFull(c.name));

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
