const player = {
  room: 0,
  ins: false,
  right: [1, 0, 0],
  up: [0, 1, 0],
  forward: [0, 0, -1],
};

const FACE_KEYS = "NESWUD";

let levelIndex = 0;
let rooms = [];
let triangles = [];
let levelColors = [];
let collected = new Set();
let solvedColors = new Set();
let puzzles = null;

const hiddensOn = (roomId, faceKey) =>
  triangles.filter(
    (h) => h.room === roomId && h.face === faceKey && !collected.has(h.id)
  );

const snap = (n) => Math.round(n);
const vDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vCross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const rotAround = (v, axis, ang) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const d = vDot(v, axis);
  const [cx, cy, cz] = vCross(axis, v);
  const k = 1 - c;
  return [
    v[0] * c + cx * s + axis[0] * d * k,
    v[1] * c + cy * s + axis[1] * d * k,
    v[2] * c + cz * s + axis[2] * d * k,
  ];
};
const rot90 = (v, axis, sign) => rotAround(v, axis, (sign * Math.PI) / 2).map(snap);
const poseCSS = (r, u, f) =>
  `matrix3d(${r[0]},${u[0]},${-f[0]},0,${r[1]},${u[1]},${-f[1]},0,${r[2]},${u[2]},${-f[2]},0,0,0,0,1)`;
const look = () => {
  pivot.style.transform = poseCSS(player.right, player.up, player.forward);
};

let turnRaf,
  turnBusy,
  walkBusy,
  walkGen = 0,
  turnQ = [];

const haltTurns = () => {
  cancelAnimationFrame(turnRaf);
  turnRaf = turnBusy = walkBusy = 0;
  walkGen++;
  turnQ.length = 0;
};

const pumpQ = () => turnQ.length && doTurn(turnQ.shift());

const animateTurn = (fr, fu, ff, axis, s) => {
  turnBusy = 1;
  runTween(O.turn, {
    ease: easeInOut,
    setRaf: (id) => (turnRaf = id),
    onTick: (eased) => {
      const ang = s * (Math.PI / 2) * eased;
      pivot.style.transform = poseCSS(
        rotAround(fr, axis, ang),
        rotAround(fu, axis, ang),
        rotAround(ff, axis, ang)
      );
    },
    onDone: () => {
      turnBusy = 0;
      look();
      pumpQ();
    },
  });
};

function facingFaceKey() {
  const [fx, fy, fz] = player.forward;
  const ax = Math.abs(fx);
  const ay = Math.abs(fy);
  const az = Math.abs(fz);
  if (ay >= ax && ay >= az) return fy > 0 ? "U" : "D";
  if (ax >= az) return fx > 0 ? "E" : "W";
  return fz < 0 ? "N" : "S";
}

function buildRoom(spec) {
  const walls = [...FACE_KEYS]
    .filter((key) => !(key in spec.doors))
    .map((key) => {
      const face = div({ className: "face" });
      face.dataset.f = key;
      const hides = hiddensOn(spec.id, key);
      paintWall(
        face,
        hides.map((h) => ({ id: h.id, color: h.color }))
      );
      return div({ className: `wall f${key.toLowerCase()}` }, face);
    });

  return div(
    {
      id: `r${spec.id}`,
      className: "room",
      style: {
        transform: `translate3d(calc(${spec.x} * var(--S)), 0px, calc(${spec.z} * var(--S)))`,
      },
    },
    ...walls
  );
}

const world = div({ id: "w" });
const pivot = div({ id: "pv" }, world);
const camera = div({ id: "cam" }, pivot);
const viewport = div({ id: "vp" }, camera);
const inspectStage = div({ id: "is", hidden: true });

document.body.append(viewport, inspectStage);

let chromeless;
const tryChromeless = () => {
  if (chromeless++ || !matchMedia("(hover:none)").matches) return;
  document.documentElement.requestFullscreen?.().catch?.(() => {});
};

viewport.addEventListener("click", (e) => {
  tryChromeless();
  if (turnBusy || hasRw() || isWon()) return;
  const r = rect(viewport);
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  const t = 1 / 3;
  if (x < t || x > 1 - t || y < t || y > 1 - t) {
    const dx = Math.abs(x - 0.5);
    const dy = Math.abs(y - 0.5);
    if (dx >= dy) return doTurn(+(x > 0.5));
    return doTurn(2 + +(y > 0.5));
  }
  primaryAction();
});

const cubeRack = createCubeRack();
const powers = createPowerSystem();

function levelCleared() {
  return (
    triangles.every((t) => collected.has(t.id)) &&
    levelColors.every((c) => solvedColors.has(c.i))
  );
}

function retireColorFromLevel(i) {
  if (i == null) return;
  solvedColors.add(i);
  let stripped = false;
  for (const t of triangles) {
    if (t.color.i !== i) continue;
    clearHintMask(t.id);
    if (collected.has(t.id)) continue;
    collected.add(t.id);
    layerById(t.id)?.remove();
    stripped = true;
  }
  puzzles?.map?.[i]?.remove();
  if (puzzles?.map) delete puzzles.map[i];
  levelColors = levelColors.filter((c) => c.i !== i);
  if (stripped && player.ins) {
    const layers = faceLayers(inspectFace());
    if (layers.length) trackInspectHits(layers);
    else stopHitTracking();
  }
  powers.syncAll();
}

let rewardInflight = 0;

async function onColorComplete(color, puzzle) {
  if (isWon()) return;
  rewardInflight++;
  solvedColors.add(color.i);
  sfxReward(3 / 4, 0.2);
  try {
    const left = triangles.filter(
      (t) => t.color.i === color.i && !collected.has(t.id)
    ).length;

    await wait(O.hold);
    if (isWon()) return;

    const gem = await puzzle.collapseToGem();
    if (isWon()) return;
    await cubeRack.deliver(color, gem);
    if (isWon() || cubeRack.allComplete()) {
      endGameWon();
      return;
    }

    if (cubeRack.isColorComplete(color)) {
      retireColorFromLevel(color.i);
    } else if (left >= O.per) {
      puzzle.reset();
    } else {
      puzzle.remove();
    }

    await wait(300);
    if (isWon()) return;
    await powers.offerUpgrade();
    if (isWon() || rewardInflight > 1) return;

    if (cubeRack.allComplete()) {
      endGameWon();
      return;
    }
    if (levelCleared()) await transitionToLevel(levelIndex + 1);
  } finally {
    rewardInflight--;
    if (!isWon() && !qs(".pmod")) bodyOff("rw");
    powers.syncAll();
  }
}

let t0, tid;
const tcl = div({ id: "tcl" });
const tFmt = (s) =>
  ((s / 60 | 0) + 100 + "").slice(1) + ":" + ((s % 60) + 100 + "").slice(1);
const tTick = () => (tcl.textContent = tFmt(((Date.now() - t0) / 1e3) | 0));
const tStart = () => {
  t0 = Date.now();
  tid = setInterval(tTick, 1e3);
  tTick();
};
const tStop = () => clearInterval(tid);

function endGameWon() {
  if (isWon()) return;
  tStop();
  bodyOn("won");
  qs(".pmod")?.remove();
  bodyOff("rw");
  document.body.append(div({ id: "win" }, "Winner!"));
  musicWin();
  cubeRack.slots.forEach((_, i) =>
    setTimeout(() => sfxReward(4 / 3), i * 200)
  );
  powers.syncAll();
}

function showHelp() {
  bodyOn("hi");
  const modal = showModal([
    v.h2(
      { className: "ph" },
      "Find the Rainbow's Triangles"
    ),
    div(
      { className: "ph" },
      "Tap edges or arrows to turn\nTap center or space to move\nW / E / R are powerups"
    ),
  ]);
  const go = () => {
    tryChromeless();
    removeEventListener("keydown", go);
    modal.onclick = null;
    on(modal, "out");
    setTimeout(() => {
      modal.remove();
      bodyOff("rw", "hi");
      powers.syncAll();
      tStart();
    }, 520);
  };
  addEventListener("keydown", go);
  modal.onclick = go;
}

async function transitionToLevel(index) {
  bodyOff("rw");
  player.ins = false;
  clearInspectTarget();
  stopHitTracking();
  off(viewport, "ins");
  off(uni, "act");

  haltTurns();
  doTurn((Math.random() * 4) | 0);
  on(viewport, "lx");
  await wait(O.lx);

  on(viewport, "le");
  startLevel(index);
  off(viewport, "lx");
  void world.offsetWidth;
  on(viewport, "li");
  await wait(O.li);
  off(viewport, "le", "li");
}

function startLevel(index) {
  const L = buildLevel(index, cubeRack.completed(), cubeRack.lit);
  if (!L.colors.length) {
    endGameWon();
    return;
  }
  applyLevelMood(index);
  levelIndex = L.index;
  rooms = L.rooms;
  triangles = L.triangles;
  levelColors = L.colors;
  collected = new Set();
  solvedColors = new Set();
  haltTurns();
  player.room = 0;
  player.ins = false;
  player.right = [1, 0, 0];
  player.up = [0, 1, 0];
  player.forward = [0, 0, -1];

  puzzles?.destroy();
  puzzles = createPuzzleSet(L.colors, L.perColor, onColorComplete);

  clearAllHintMasks();
  world.replaceChildren(...rooms.map(buildRoom));
  updateView(false);
  if (index === 0 && powerState[0].l < 1) powerState[0].l = 1;
  powers.syncAll();
}

function passageTarget() {
  const dir = facingFaceKey();
  if (dir === "U" || dir === "D") return null;
  const to = rooms[player.room].doors[dir];
  return to === undefined ? null : to;
}

function getFacingFaceEl() {
  const key = facingFaceKey();
  return qs(`#r${player.room} .face[data-f="${key}"]`);
}

function updateView(animate = true) {
  tog(world, "na", !animate);
  tog(camera, "na", !animate);

  if (!turnBusy) look();
  const r = rooms[player.room];
  if (!r) return;
  world.style.transform = `translate3d(calc(${-r.x} * var(--S)), 0px, calc(${-r.z} * var(--S)))`;
  tog(viewport, "ins", player.ins);
  tog(uni, "act", player.ins);
}

function navigateFromView(applyBasis, axis, s) {
  const kick = () => {
    const fr = [...player.right],
      fu = [...player.up],
      ff = [...player.forward];
    applyBasis();
    animateTurn(fr, fu, ff, axis, s);
  };

  if (!player.ins) {
    kick();
    return;
  }

  turnBusy = 1;
  const face = inspectFace();
  const layers = faceLayers(face);
  stopHitTracking();
  resetRevealMask();
  layers.forEach(resetLayerMask);
  player.ins = false;
  clearInspectTarget();

  off(camera, "na");
  off(world, "na");
  off(viewport, "ins");
  off(uni, "act");

  onceEndOrTimeout(
    camera,
    O.cam + 80,
    () => {
      turnBusy = 0;
      kick();
    },
    (e) => e.target === camera && e.propertyName === "transform"
  );
}

const TURNS = [
  ["up", "right", 1],
  ["up", "right", -1],
  ["right", "up", -1],
  ["right", "up", 1],
];
const doTurn = (i) => {
  if (turnBusy || walkBusy) return turnQ.length < 8 && turnQ.push(i);
  const [ax, other, s] = TURNS[i];
  const axis = player[ax];
  navigateFromView(() => {
    player.forward = rot90(player.forward, axis, s);
    player[other] = rot90(player[other], axis, s);
  }, axis, s);
};

function clearInspectTarget() {
  qsa(".face.it").forEach((f) => off(f, "it"));
}

let hitRaf = null;
let inspectHits = [];

function stopHitTracking() {
  if (hitRaf != null) {
    cancelAnimationFrame(hitRaf);
    hitRaf = null;
  }
  inspectHits = [];
  inspectStage.hidden = true;
  inspectStage.replaceChildren();
}

function trackInspectHits(layers) {
  stopHitTracking();
  if (!layers.length) return;

  inspectHits = layers.map((layer) => {
    const hit = button({
      className: "ihit",
    });
    hit.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!layer.dataset.id) return;
      collectTriangle(layer.dataset.id, layer);
    });
    return { hit, layer };
  });

  inspectStage.hidden = false;
  inspectStage.replaceChildren(...inspectHits.map((h) => h.hit));

  const sync = () => {
    if (!player.ins || !inspectHits.length) return;
    const stage = rect(inspectStage);
    const pad = 6;
    for (const { hit, layer } of inspectHits) {
      const poly = layer.querySelector(".ctri");
      const face = layer.closest(".face");
      const target = poly || face || layer;
      const r = rect(target);
      box(hit, {
        x: r.left - stage.left - pad,
        y: r.top - stage.top - pad,
        w: Math.max(12, r.width + pad * 2),
        h: Math.max(12, r.height + pad * 2),
      });
    }
    hitRaf = requestAnimationFrame(sync);
  };

  hitRaf = requestAnimationFrame(sync);
}

function enterInspect() {
  if (passageTarget() !== null) return;
  pruneWashes();
  player.ins = true;
  clearInspectTarget();

  const face = getFacingFaceEl();
  if (face) {
    on(face, "it");
    const layers = faceLayers(face);
    if (layers.length) {
      playRevealMask(layers);
      trackInspectHits(layers);
    } else {
      stopHitTracking();
    }
  }

  updateView();
}

function exitInspect() {
  const face = inspectFace();
  const layers = faceLayers(face);

  player.ins = false;
  stopHitTracking();
  updateView();

  if (layers.length) {
    playHideMask(layers, () => {
      off(face, "it");
    });
  } else {
    clearInspectTarget();
    resetRevealMask();
  }
}

function primaryAction() {
  if (turnBusy) return;
  if (player.ins) {
    exitInspect();
    return;
  }
  const to = passageTarget();
  if (to !== null) {
    player.room = to;
    walkBusy = 1;
    const gen = ++walkGen;
    updateView();
    setTimeout(() => {
      if (gen !== walkGen) return;
      walkBusy = 0;
      pumpQ();
    }, 780);
    return;
  }
  enterInspect();
}

function claimTriangle(id, el) {
  if (collected.has(id)) return null;
  const tri = triangles.find((t) => t.id === id);
  if (!tri) return null;
  collected.add(id);
  const layer =
    el?.closest?.(".cl") ||
    el ||
    layerById(id);
  const face = layer?.closest?.(".face");
  powers.noteCollected(id);
  if (layer) hide(layer);
  return { tri, layer, face };
}

function collectTriangle(id, el) {
  const claim = claimTriangle(id, el);
  if (!claim) return;
  const { tri, layer, face } = claim;
  const others = face
    ? faceLayers(face).filter((l) => l !== layer)
    : [];

  if (player.ins && others.length) {
    for (const l of others) {
      const c = l.querySelector(".rc");
      setCircleR(c, R_MAX);
      on(l, "rd");
      off(l, "rv", "hd");
    }
    revealLayers = others;
    trackInspectHits(others);
  } else {
    stopHitTracking();
    resetRevealMask();
    player.ins = false;
    clearInspectTarget();
    updateView();
  }

  puzzles?.flyIn(id, layer, tri.color);
}

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (hasRw() || isWon()) return;
  const powerId = PK[e.key.toLowerCase()];
  if (powerId != null) {
    e.preventDefault();
    powers.activatePower(powerId);
    return;
  }
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    primaryAction();
    return;
  }
  const d = { Left: 0, Right: 1, Up: 2, Down: 3 }[e.key.slice(5)];
  if (d != null) {
    e.preventDefault();
    if (!e.repeat) doTurn(d);
  }
});

ensureRevealDefs();
document.body.append(tcl);
startLevel(0);
showHelp();
