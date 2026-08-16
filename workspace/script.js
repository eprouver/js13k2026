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

// Camera basis (±90° on integer axes)

const snap = (n) => Math.round(n);

const rot90 = (v, axis, sign) => {
  const [x, y, z] = v;
  const [ax, ay, az] = axis;
  const dot = ax * x + ay * y + az * z;
  const cx = ay * z - az * y;
  const cy = az * x - ax * z;
  const cz = ax * y - ay * x;
  return [snap(ax * dot + sign * cx), snap(ay * dot + sign * cy), snap(az * dot + sign * cz)];
};

const basisToCSS = (right, up, forward) => {
  const [rx, ry, rz] = right;
  const [ux, uy, uz] = up;
  const [fx, fy, fz] = forward;
  return `matrix3d(${rx},${ux},${-fx},0, ${ry},${uy},${-fy},0, ${rz},${uz},${-fz},0, 0,0,0,1)`;
};

const vDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vCross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const same3 = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

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

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

const TURN_MS = OPTS.time.turnMs;
const INSPECT_OUT_MS = OPTS.time.inspectOutMs;
let turnRaf = null;
let turnBusy = false;

const animateTurn = (fromRight, fromUp, fromForward) => {
  if (turnRaf != null) cancelAnimationFrame(turnRaf);
  turnBusy = true;

  const axis = same3(fromUp, player.up)
    ? fromUp
    : same3(fromRight, player.right)
      ? fromRight
      : fromForward;
  const sign = Math.sign(vDot(vCross(fromForward, player.forward), axis)) || 1;
  const start = performance.now();

  const tick = (now) => {
    const t = Math.min(1, (now - start) / TURN_MS);
    if (t < 1) {
      const ang = sign * (Math.PI / 2) * easeInOut(t);
      pivot.style.transform = basisToCSS(
        rotAround(fromRight, axis, ang),
        rotAround(fromUp, axis, ang),
        rotAround(fromForward, axis, ang)
      );
      turnRaf = requestAnimationFrame(tick);
    } else {
      turnRaf = null;
      turnBusy = false;
      pivot.style.transform = basisToCSS(
        player.right,
        player.up,
        player.forward
      );
      updateView(false);
    }
  };

  turnRaf = requestAnimationFrame(tick);
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
    paintWallMesh(
      face,
      undefined,
      hides.length
        ? {
            collectibles: hides.map((h) => ({ id: h.id, color: h.color })),
          }
        : {}
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

const leftBtn = button("◀");
const upBtn = button("▲");
const rightBtn = button("▶");
const downBtn = button("▼");
const actionBtn = button({}, "Go");

leftBtn.dataset.act = "left";
upBtn.dataset.act = "up";
rightBtn.dataset.act = "right";
downBtn.dataset.act = "down";
actionBtn.dataset.act = "action";

const controls = div(
  { id: "controls" },
  leftBtn,
  upBtn,
  rightBtn,
  downBtn,
  actionBtn
);

document.body.append(viewport, inspectStage, controls);

viewport.addEventListener("click", () => {
  if (
    player.inspecting ||
    turnBusy ||
    puzzles?.isOpen() ||
    bodyHas("rewarding") ||
    bodyHas("won")
  )
    return;
  primaryAction();
});

const dodeRack = createDodeRack();
const powers = createPowerSystem();

function levelCleared() {
  return (
    triangles.every((t) => collected.has(t.id)) &&
    levelColors.every((c) => solvedColors.has(c.name))
  );
}

function retireColorFromLevel(colorOrName) {
  const name =
    typeof colorOrName === "string" ? colorOrName : colorOrName?.name;
  if (!name) return;
  solvedColors.add(name);
  let stripped = false;
  for (const t of triangles) {
    if (t.color.name !== name || collected.has(t.id)) continue;
    collected.add(t.id);
    layerById(t.id)?.remove();
    stripped = true;
  }
  puzzles?.map?.[name]?.remove?.();
  if (puzzles?.map) delete puzzles.map[name];
  levelColors = levelColors.filter((c) => c.name !== name);
  if (stripped && player.inspecting) {
    const layers = faceLayers(inspectFace());
    if (layers.length) trackInspectHits(layers);
    else stopHitTracking();
  }
  powers?.syncAll?.();
}

async function onColorComplete(color, puzzle) {
  bodyOn("rewarding");
  powers?.syncAll?.();
  try {
    triggerReward();
    solvedColors.add(color.name);
    const left = triangles.filter(
      (t) => t.color.name === color.name && !collected.has(t.id)
    ).length;

    await wait(OPTS.time.solveHoldMs);

    const gem = await puzzle.collapseToGem();
    await dodeRack.deliver(color, gem);

    if (dodeRack.isColorComplete?.(color)) {
      retireColorFromLevel(color);
    } else if (left >= PER_COLOR) {
      puzzle.reset();
    } else {
      puzzle.remove();
    }

    if (dodeRack.allComplete?.()) {
      endGameWon();
      return;
    }
    await powers.offerUpgrade();
    if (levelCleared()) await transitionToLevel(levelIndex + 1);
  } finally {
    bodyOff("rewarding");
    powers?.syncAll?.();
  }
}

function endGameWon() {
  if (bodyHas("won")) return;
  bodyOn("won");
  qs(".pmod")?.remove();
  if (!document.getElementById("win")) {
    document.body.append(div({ id: "win" }, "You win"));
  }
}

async function transitionToLevel(index) {
  bodyOff("po", "pf");
  player.inspecting = false;
  clearInspectTarget();
  stopHitTracking();

  on(viewport, "lx");
  await wait(OPTS.time.levelExitMs);

  startLevel(index);

  off(viewport, "lx");
  on(viewport, "le");
  void world.offsetWidth;
  await wait(OPTS.time.levelEnterPadMs);
  on(viewport, "li");
  await wait(OPTS.time.levelEnterMs);
  off(viewport, "le", "li");
}

function startLevel(index) {
  const exclude = dodeRack.completedNames?.() || [];
  const L = buildLevel(index, exclude);
  if (!L.colors.length) {
    endGameWon();
    return;
  }
  levelIndex = L.index;
  rooms = L.rooms;
  triangles = L.triangles;
  levelColors = L.colors;
  collected = new Set();
  solvedColors = new Set();
  player.room = 0;
  player.inspecting = false;
  player.right = [1, 0, 0];
  player.up = [0, 1, 0];
  player.forward = [0, 0, -1];

  puzzles?.destroy();
  puzzles = createPuzzleSet(L.colors, L.perColor, onColorComplete);

  clearAllHintMasks?.();
  world.replaceChildren(...rooms.map(buildRoom));
  updateView(false);
  powers?.syncAll?.();
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

  if (!turnBusy) {
    pivot.style.transform = basisToCSS(player.right, player.up, player.forward);
  }
  const r = rooms[player.room];
  if (!r) return;
  world.style.transform = `translate3d(calc(${-r.x} * var(--span)), 0px, calc(${-r.z} * var(--span)))`;
  tog(viewport, "inspecting", player.inspecting);

  const passage = passageTarget();

  if (player.inspecting) {
    setNavDisabled(turnBusy);
    actionBtn.disabled = false;
    actionBtn.textContent = "Back";
  } else {
    setNavDisabled(turnBusy);
    actionBtn.disabled = turnBusy;
    actionBtn.textContent = passage !== null ? "Go" : "Inspect";
  }
}

function setNavDisabled(busy) {
  leftBtn.disabled = busy;
  rightBtn.disabled = busy;
  upBtn.disabled = busy;
  downBtn.disabled = busy;
}

function navigateFromView(applyBasis) {
  if (turnBusy) return;

  const startTurn = () => {
    const fr = [...player.right],
      fu = [...player.up],
      ff = [...player.forward];
    applyBasis();
    animateTurn(fr, fu, ff);
    updateView(false);
  };

  if (!player.inspecting) {
    startTurn();
    return;
  }

  turnBusy = true;
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
  setNavDisabled(true);
  actionBtn.disabled = true;

  onceEndOrTimeout(
    camera,
    INSPECT_OUT_MS + 80,
    () => {
      turnBusy = false;
      startTurn();
    },
    (e) => e.target === camera && e.propertyName === "transform"
  );
}

function turnLeft() {
  navigateFromView(() => {
    player.forward = rot90(player.forward, player.up, 1);
    player.right = rot90(player.right, player.up, 1);
  });
}

function turnRight() {
  navigateFromView(() => {
    player.forward = rot90(player.forward, player.up, -1);
    player.right = rot90(player.right, player.up, -1);
  });
}

function lookUp() {
  navigateFromView(() => {
    player.forward = rot90(player.forward, player.right, -1);
    player.up = rot90(player.up, player.right, -1);
  });
}

function lookDown() {
  navigateFromView(() => {
    player.forward = rot90(player.forward, player.right, 1);
    player.up = rot90(player.up, player.right, 1);
  });
}

function clearInspectTarget() {
  document
    .querySelectorAll(".face.it")
    .forEach((f) => off(f, "it"));
  document
    .querySelectorAll(".cl.hot, .ctri.hot")
    .forEach((el) => off(el, "hot"));
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
    hit.addEventListener("pointerenter", () => on(layer, "hot"));
    hit.addEventListener("pointerleave", () => off(layer, "hot"));
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
  player.inspecting = true;
  clearInspectTarget();

  const face = getFacingFaceEl();
  if (face) {
    on(face, "it");
    clearFaceHints(face);
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
  if (turnBusy || puzzles?.isOpen()) return;
  if (player.inspecting) {
        exitInspect();
    return;
  }
  const to = passageTarget();
  if (to !== null) {
        player.room = to;
    updateView();
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
  powers?.noteCollected?.(id);
  if (layer) layer.style.visibility = "hidden";
  return { tri, layer, face };
}

function collectTriangle(id, el) {
  const claim = claimTriangle(id, el);
  if (!claim) return;
    const { tri, layer, face } = claim;
  clearFaceHints(face);
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

controls.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  ({
    left: turnLeft,
    right: turnRight,
    up: lookUp,
    down: lookDown,
    action: primaryAction,
  })[btn.dataset.act]?.();
});

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const powerId = POWER_KEY[e.key.toLowerCase()];
  if (powerId) {
    e.preventDefault();
    if (
      bodyHas("rewarding") ||
      qs(".pmod")
    )
      return;
    // Only Assembly while a puzzle is open (E/W/R must wait)
    if (puzzles?.isOpen() && powerId !== "assembly") return;
    powers.activatePower(powerId);
    return;
  }
  if (puzzles?.isOpen()) {
    if (e.key === " " || e.key === "Enter") e.preventDefault();
    return;
  }
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    primaryAction();
    return;
  }
  const map = {
    ArrowLeft: turnLeft,
    ArrowRight: turnRight,
    ArrowUp: lookUp,
    ArrowDown: lookDown,
  };
  if (map[e.key]) {
    e.preventDefault();
    map[e.key]();
  }
});

ensureRevealDefs();
startLevel(0);
powerState.perception.level = 1;
powers.syncAll();
