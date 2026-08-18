const player = {
  room: 0,
  inspecting: false,
  right: [1, 0, 0],
  up: [0, 1, 0],
  forward: [0, 0, -1],
};

const FACES = [
  ["N", "face-n"],
  ["E", "face-e"],
  ["S", "face-s"],
  ["W", "face-w"],
  ["U", "face-u"],
  ["D", "face-d"],
];

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
  runTween(OPTS.time.turnMs, {
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
  const walls = FACES.filter(([key]) => !(key in spec.doors)).map(([key, cls]) => {
    const face = div({ className: "face" });
    face.dataset.face = key;
    const hides = hiddensOn(spec.id, key);
    paintWall(
      face,
      hides.map((h) => ({ id: h.id, color: h.color }))
    );
    return div({ className: `wall ${cls}` }, face);
  });

  return div(
    {
      id: `room-${spec.id}`,
      className: "room",
      style: {
        transform: `translate3d(calc(${spec.x} * var(--span)), 0px, calc(${spec.z} * var(--span)))`,
      },
    },
    ...walls
  );
}

const world = div({ id: "world" });
const pivot = div({ id: "pivot" }, world);
const camera = div({ id: "camera" }, pivot);
const viewport = div({ id: "viewport" }, camera);
const inspectStage = div({ id: "istage", hidden: true });

document.body.append(viewport, inspectStage);

let chromeless;
const tryChromeless = () => {
  if (chromeless++) return;
  document.documentElement.requestFullscreen?.().catch?.(() => {});
};

let sx, sy, swiped;
viewport.addEventListener("click", () => {
  tryChromeless();
  if (swiped) return void (swiped = 0);
  if (turnBusy || bodyHas("rewarding") || bodyHas("won")) return;
  primaryAction();
});
viewport.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  sx = t.clientX;
  sy = t.clientY;
  swiped = 0;
}, { passive: true });
viewport.addEventListener("touchend", (e) => {
  if (bodyHas("rewarding") || bodyHas("won")) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - sx;
  const dy = t.clientY - sy;
  if (dx * dx + dy * dy < 576) return;
  swiped = 1;
  doTurn(Math.abs(dx) > Math.abs(dy) ? +(dx > 0) : 2 + (dy > 0));
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
  if (stripped && player.inspecting) {
    const layers = faceLayers(inspectFace());
    if (layers.length) trackInspectHits(layers);
    else stopHitTracking();
  }
  powers.syncAll();
}

let rewardInflight = 0;

async function onColorComplete(color, puzzle) {
  if (bodyHas("won")) return;
  rewardInflight++;
  solvedColors.add(color.i);
  sfxReward(3 / 4, 0.2);
  try {
    const left = triangles.filter(
      (t) => t.color.i === color.i && !collected.has(t.id)
    ).length;

    await wait(OPTS.time.solveHoldMs);
    if (bodyHas("won")) return;

    const gem = await puzzle.collapseToGem();
    if (bodyHas("won")) return;
    await cubeRack.deliver(color, gem);
    if (bodyHas("won") || cubeRack.allComplete()) {
      endGameWon();
      return;
    }

    if (cubeRack.isColorComplete(color)) {
      retireColorFromLevel(color.i);
    } else if (left >= PER_COLOR) {
      puzzle.reset();
    } else {
      puzzle.remove();
    }

    await wait(300);
    if (bodyHas("won")) return;
    await powers.offerUpgrade();
    if (bodyHas("won") || rewardInflight > 1) return;

    if (cubeRack.allComplete()) {
      endGameWon();
      return;
    }
    if (levelCleared()) await transitionToLevel(levelIndex + 1);
  } finally {
    rewardInflight--;
    if (!bodyHas("won") && !qs(".pmod")) bodyOff("rewarding");
    powers.syncAll();
  }
}

function endGameWon() {
  if (bodyHas("won")) return;
  bodyOn("won");
  qs(".pmod")?.remove();
  bodyOff("rewarding");
  document.body.append(div({ id: "win" }, "You Won!"));
  musicWin();
  cubeRack.slots.forEach((_, i) =>
    setTimeout(() => sfxReward(4 / 3), i * 200)
  );
  powers.syncAll();
}

function showHelp() {
  const modal = showModal([
    v.h2(
      { className: "ph" },
      "Find the Triangles: Save the Rainbow"
    ),
    div(
      { className: "ph" },
      "Swipe or arrows to turn\nTap or space to move\nPowerups will help"
    ),
  ]);
  const go = () => {
    tryChromeless();
    removeEventListener("keydown", go);
    modal.onclick = null;
    on(modal, "out");
    setTimeout(() => {
      modal.remove();
      bodyOff("rewarding");
      powers.syncAll();
    }, 520);
  };
  addEventListener("keydown", go);
  modal.onclick = go;
}

async function transitionToLevel(index) {
  bodyOff("rewarding");
  player.inspecting = false;
  clearInspectTarget();
  stopHitTracking();
  off(viewport, "inspecting");

  haltTurns();
  doTurn((Math.random() * 4) | 0);
  on(viewport, "lx");
  await wait(OPTS.time.levelExitMs);

  startLevel(index);

  off(viewport, "lx");
  on(viewport, "le");
  void world.offsetWidth;
  on(viewport, "li");
  await wait(OPTS.time.levelEnterMs);
  off(viewport, "le", "li");
}

function startLevel(index) {
  const exclude = cubeRack.completed();
  const L = buildLevel(index, exclude);
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
  player.inspecting = false;
  player.right = [1, 0, 0];
  player.up = [0, 1, 0];
  player.forward = [0, 0, -1];

  puzzles?.destroy();
  puzzles = createPuzzleSet(L.colors, L.perColor, onColorComplete);

  clearAllHintMasks();
  world.replaceChildren(...rooms.map(buildRoom));
  updateView(false);
  if (index === 0 && powerState.wash.level < 1) powerState.wash.level = 1;
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
  return qs(
    `#room-${player.room} .face[data-face="${key}"]`
  );
}

function updateView(animate = true) {
  tog(world, "na", !animate);
  tog(camera, "na", !animate);

  if (!turnBusy) look();
  const r = rooms[player.room];
  if (!r) return;
  world.style.transform = `translate3d(calc(${-r.x} * var(--span)), 0px, calc(${-r.z} * var(--span)))`;
  tog(viewport, "inspecting", player.inspecting);
}

function navigateFromView(applyBasis, axis, s) {
  const kick = () => {
    const fr = [...player.right],
      fu = [...player.up],
      ff = [...player.forward];
    applyBasis();
    animateTurn(fr, fu, ff, axis, s);
  };

  if (!player.inspecting) {
    kick();
    return;
  }

  turnBusy = 1;
  const face = inspectFace();
  const layers = faceLayers(face);
  stopHitTracking();
  resetRevealMask();
  layers.forEach(resetLayerMask);
  player.inspecting = false;
  clearInspectTarget();

  off(camera, "na");
  off(world, "na");
  off(viewport, "inspecting");

  onceEndOrTimeout(
    camera,
    OPTS.time.camMs + 80,
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
    if (!player.inspecting || !inspectHits.length) return;
    const stage = inspectStage.getBoundingClientRect();
    const pad = 6;
    for (const { hit, layer } of inspectHits) {
      const poly = layer.querySelector(".ctri");
      const face = layer.closest(".face");
      const target = poly || face || layer;
      const r = target.getBoundingClientRect();
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
  player.inspecting = true;
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

  player.inspecting = false;
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
  if (player.inspecting) {
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
  if (layer) layer.style.visibility = "hidden";
  return { tri, layer, face };
}

function collectTriangle(id, el) {
  const claim = claimTriangle(id, el);
  if (!claim) return;
  const { tri, layer, face } = claim;
  const others = face
    ? faceLayers(face).filter((l) => l !== layer)
    : [];

  if (player.inspecting && others.length) {
    for (const l of others) {
      const c = l.querySelector(".rc");
      setCircleR(c, R_MAX);
      on(l, "revealed");
      off(l, "revealing", "hiding");
      l.style.filter = "none";
    }
    revealLayers = others;
    trackInspectHits(others);
  } else {
    stopHitTracking();
    resetRevealMask();
    player.inspecting = false;
    clearInspectTarget();
    updateView();
  }

  puzzles?.flyIn(id, layer, tri.color);
}

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (bodyHas("rewarding") || bodyHas("won")) return;
  const powerId = POWER_KEY[e.key.toLowerCase()];
  if (powerId) {
    e.preventDefault();
    powers.activatePower(powerId);
    return;
  }
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    primaryAction();
    return;
  }
  const map = {
    ArrowLeft: 0,
    ArrowRight: 1,
    ArrowUp: 2,
    ArrowDown: 3,
  };
  if (map[e.key] != null) {
    e.preventDefault();
    if (!e.repeat) doTurn(map[e.key]);
  }
});

ensureRevealDefs();
startLevel(0);
showHelp();
