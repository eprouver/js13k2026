const CUBE_FACES = 6;

const CUBE_TURNS = [
  [0, 0],
  [90, 0],
  [180, 0],
  [270, 0],
  [0, 90],
  [0, -90],
];

const cubeFill = (c) =>
  colorHsl({ ...c, l: Math.max(c.l, O.minL) });

const makeGem = (color, slot) => {
  const fill = cubeFill(color);
  const cubeFace = slot?.querySelector?.(".cf");
  const endSize = Math.max(
    16,
    cubeFace?.getBoundingClientRect?.().width ||
      (slot ? rect(slot).width : 52) * 0.34
  );
  const gem = div({ className: "gem" });
  gem.style.setProperty("--fly", fill);
  gem.style.background = fill;
  box(gem, { w: endSize, h: endSize });
  return { gem, fill, endSize };
};

function createCube({ color, lit = [], pd = [] }) {
  const litSet = new Set(lit);
  const pending = new Set(pd);
  const fill = cubeFill(color);

  const faces = CUBE_TURNS.map(([ry, rx], i) => {
    const isPending = pending.has(i);
    const on = litSet.has(i) && !isPending;
    const face = div({
      className: on ? "cf lit" : isPending ? "cf pd" : "cf",
      style: {
        background: on ? fill : "#3a3a42",
        transform: `rotateY(${ry}deg) rotateX(${rx}deg) translateZ(1em)`,
      },
    });
    face.dataset.i = String(i);
    return face;
  });

  return div({ className: "cube", style: { "--cube": fill } }, ...faces);
}

function createCubeRack() {
  const litByColor = RAINBOW.map(() => new Set());

  const slots = RAINBOW.map((c, i) => {
    const slot = div({
      className: "ds",
      style: { ...toneStyle("slot", c), "--slot": cubeFill(c), "--d": i * 0.2 + "s" },
    });
    return slot;
  });

  const rack = div({ id: "drk" }, ...slots);
  document.body.append(rack);

  const slotFor = (color) => slots[color.i];

  function paint(rainbow, pendingFaces = []) {
    const slot = slots[rainbow.i];
    if (!slot) return null;
    const lit = litByColor[rainbow.i];
    if (!lit.size && !pendingFaces.length) {
      slot.replaceChildren();
      return slot;
    }
    const pending = new Set(pendingFaces);
    slot.replaceChildren(
      createCube({
        color: rainbow,
        lit: [...new Set([...lit, ...pending])],
        pd: [...pending],
      })
    );
    return slot;
  }

  const nextFace = (i) => {
    const lit = litByColor[i];
    for (let f = 0; f < CUBE_FACES; f++) if (!lit.has(f)) return f;
    return -1;
  };

  function igniteFace(slot, faceIndex) {
    const face = slot?.querySelector?.(`.cf[data-i="${faceIndex}"]`);
    if (!face) return;
    off(face, "pd");
    void face.offsetWidth;
    on(face, "lit", "ig");
    const fill = slot.querySelector(".cube")?.style.getPropertyValue("--cube");
    if (fill) face.style.background = fill;
  }

  const retireFull = (rainbow, slot, gemEl) => {
    paint(rainbow);
    gemEl?.remove();
    retireColorFromLevel(rainbow.i);
    return slot;
  };

  async function deliver(color, gemEl) {
    const slot = slotFor(color);
    if (!slot) return null;
    const face = nextFace(color.i);
    if (face < 0) return retireFull(color, slot, gemEl);
    await flyThen(gemEl, slot, { node: gemEl, ms: O.tfly, sfx: sfxReward });
    if (isWon()) return null;
    return settleFace(color, face);
  }

  async function settleFace(rainbow, faceIndex) {
    litByColor[rainbow.i].add(faceIndex);
    const slot = paint(rainbow, [faceIndex]);
    await nextFrame();
    igniteFace(slot, faceIndex);
    if (isFull(rainbow.i)) retireColorFromLevel(rainbow.i);
    if (allComplete()) endGameWon();
    else powers.syncAll();
    return slot;
  }

  const litCount = () => {
    let n = 0;
    for (const s of litByColor) n += s.size;
    return n;
  };

  function rallyRoom(spare = 1) {
    let open = 0;
    for (const s of litByColor) {
      if (s.size > 0 && s.size < CUBE_FACES) open += CUBE_FACES - s.size;
    }
    return Math.max(0, Math.min(open, RAINBOW.length * CUBE_FACES - spare - litCount()));
  }

  async function addFaces(n, spare = 0) {
    const picks = [];
    const incoming = RAINBOW.map(() => []);
    for (let i = 0; i < Math.max(0, n); i++) {
      if (rallyRoom(spare) <= 0) break;
      const targets = RAINBOW.filter(
        (c) => litByColor[c.i].size > 0 && !isFull(c.i)
      );
      if (!targets.length) break;
      const c = targets.sort(
        (a, b) => litByColor[a.i].size - litByColor[b.i].size
      )[0];
      const f = nextFace(c.i);
      if (f < 0) continue;
      litByColor[c.i].add(f);
      incoming[c.i].push(f);
      paint(c, incoming[c.i]);
      picks.push([c, f]);
    }
    await Promise.all(
      picks.map(([c, f]) => {
        const slot = slotFor(c);
        const { gem } = makeGem(c, slot);
        return flyIn(null, slot, { node: gem, sfx: sfxReward }, () => {
          if (isWon()) return;
          igniteFace(slot, f);
          if (isFull(c.i)) retireColorFromLevel(c.i);
        });
      })
    );
    if (allComplete()) endGameWon();
    else powers.syncAll();
    return picks.length;
  }

  const isFull = (i) => litByColor[i].size >= CUBE_FACES;
  const isColorComplete = (color) => isFull(color.i);
  const completed = () => RAINBOW.filter((c) => isFull(c.i)).map((c) => c.i);
  const allComplete = () => RAINBOW.every((c) => isFull(c.i));

  return {
    slots,
    deliver,
    addFaces,
    rallyRoom,
    isColorComplete,
    lit: (i) => litByColor[i].size,
    completed,
    allComplete,
  };
}
