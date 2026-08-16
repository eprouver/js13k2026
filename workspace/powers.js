const POWERS = [
  ["perception", "W", 210],
  ["extraction", "E", 32],
  ["assembly", "A", 145],
  ["radiance", "R", 48],
];
const POWER_IDS = POWERS.map((p) => p[0]);
const POWER_KEY = { w: "perception", e: "extraction", a: "assembly", r: "radiance" };
const powStyle = (hue) =>
  toneStyle("pow", { h: hue, s: 70, l: 55 }, { h: hue, s: 50, l: 28 });

const powerState = Object.fromEntries(
  POWER_IDS.map((id) => [id, { level: 0, active: false, cooling: false }])
);
const upgradeSkip = Object.fromEntries(POWER_IDS.map((id) => [id, 0]));
let pentagonClears = 0;

const P = () => OPTS.powers;
const lv1 = (n) => Math.max(1, n | 0);
const huntCount = (level) => 1 + ((lv1(level) / 2) | 0);
const perceptionMs = (level) => P().perceptionBaseMs + level * P().perceptionPerLevelMs;
const huntCdMs = (level) =>
  Math.max(P().huntCdMinMs, P().huntCdL1Ms - (((lv1(level) - 1) / 2) | 0) * P().huntCdPerStepMs);

const powerCdMs = (level) => Math.max(8e3, 8e3 + (lv1(level) - 1) * 6e3);
const cdFor = (id, level) =>
  id === "radiance"
    ? P().radianceCdMs
    : id === "assembly"
      ? powerCdMs(level)
      : huntCdMs(level);

function createPowerSystem() {
  const slots = POWERS.map(([id, glyph, hue]) => {
    const slot = button({
      className: "ps locked",
      style: powStyle(hue),
    });
    slot.dataset.power = id;
    slot.append(
      div({ className: "pg" }, glyph),
      div({ className: "pl" }, "0")
    );
    slot.disabled = true;
    slot.onclick = () => activatePower(id);
    return slot;
  });
  document.body.append(div({ id: "prk" }, ...slots));

  const gate = (id) =>
    id === "assembly"
      ? levelIndex >= P().assemblyFromLevel
      : id === "radiance"
        ? levelIndex >= P().radianceFromLevel
        : true;
  const unlocked = (id) => powerState[id].level > 0 && gate(id);

  const puzzleHold = () =>
    bodyHas("rewarding") || !!puzzles?.isOpen?.();

  const puzzleList = () => Object.values(puzzles?.map || {});
  const assemblyHasWork = () =>
    puzzleList().some((p) => !p.isSolved?.() && (p.looseCount?.() || 0) > 0);
  const huntPool = () => {
    const names = new Set(levelColors.map((c) => c.name));
    return triangles.filter((t) => !collected.has(t.id) && names.has(t.color.name));
  };

  function syncSlot(id) {
    const st = powerState[id];
    const slot = slots[POWER_IDS.indexOf(id)];
    slot.querySelector(".pl").textContent = String(st.level);
    const lock = !unlocked(id);
    const empty =
      (!lock && id === "assembly" && !assemblyHasWork()) ||
      (!lock && id === "extraction" && !huntPool().length);
    const held = puzzleHold() && id !== "assembly";
    tog(slot, "locked", lock || empty);
    tog(slot, "active", st.active);
    tog(slot, "cooling", st.cooling);
    slot.disabled = lock || empty || st.active || st.cooling || held;
  }
  const syncAll = () => POWER_IDS.forEach(syncSlot);

  function beginBusy(id, activeMs, cdMs) {
    const st = powerState[id];
    st.active = st.cooling = true;
    syncSlot(id);
    const cd = cdMs ?? powerCdMs(st.level);
    setTimeout(() => {
      st.active = false;
      syncSlot(id);
    }, Math.min(activeMs, cd));
    setTimeout(() => {
      st.cooling = false;
      syncSlot(id);
    }, cd);
  }

  function offerUpgrade() {
    return new Promise((resolve) => {
      pentagonClears++;
      const everyN = P().radianceEveryN;
      const skips = P().upgradeSkipAfter;
      const canPick = (id) =>
        !(upgradeSkip[id] > 0) &&
        gate(id) &&
        (id !== "radiance" || pentagonClears % everyN === 0);

      let picked = false;
      const commit = (id) => {
        if (picked || !canPick(id)) return;
        picked = true;
                off(modal, "show");
        setTimeout(() => modal.remove(), 750);
        for (const pid of POWER_IDS) if (upgradeSkip[pid] > 0) upgradeSkip[pid]--;
        const skip = skips[id] ?? 0;
        if (skip) upgradeSkip[id] = skip;
        const st = powerState[id];
        st.level++;
        beginBusy(id, 0, cdFor(id, st.level));
        syncSlot(id);
        resolve(id);
      };

      const choices = POWERS.map(([id, glyph, hue]) => {
        const st = powerState[id];
        const ok = canPick(id);
        const btn = button({
          className: ok ? "ppk" : "ppk locked",
          style: powStyle(hue),
        });
        btn.disabled = !ok;
        btn.append(
          div({ className: "ppk-glyph" }, glyph),
          div({ className: "ppk-lvl" }, `${st.level}→${st.level + 1}`)
        );
        if (ok) btn.onclick = () => commit(id);
        return btn;
      });

      const modal = div(
        { className: "pmod" },
        div({ className: "pmc" }, div({ className: "ppks" }, ...choices))
      );
      document.body.append(modal);
      nextFrame().then(() => on(modal, "show"));
    });
  }

  let perceptionTargets = new Set();
  let perceptionGen = 0;

  function endPerceptionHints() {
    perceptionTargets = new Set();
    clearAllHintMasks();
    const st = powerState.perception;
    if (st.active) {
      st.active = false;
      syncSlot("perception");
    }
  }

  function noteCollected(id) {
    clearHintMask(qs(`.cl[data-id="${id}"]`));
    if (perceptionTargets.delete(id) && !perceptionTargets.size) {
      perceptionGen++;
      endPerceptionHints();
    }
    syncAll();
  }

  function runPerception(level) {
    const facing = facingFaceKey?.();
    const opp = { N: "S", S: "N", E: "W", W: "E" }[facing];
    const all = huntPool();
    const pool = opp
      ? all.filter((t) => !(t.room === player.room && t.face === opp))
      : all;
    const picks = shuffle((pool.length ? pool : all).slice()).slice(0, huntCount(level));
    const p = P();
    const wash =
      level <= 1
        ? p.washL1Pct
        : Math.max(p.washMinPct, 100 - (level - 1) * p.washShrinkPct);
    const rTarget = (R_MAX * Math.min(140, wash)) / 100;
    const stagger = p.perceptionStaggerMs;
    const holdMs = perceptionMs(level);

    perceptionGen++;
    const gen = perceptionGen;
    perceptionTargets = new Set(picks.map((t) => t.id));

    picks.forEach((t, i) => {
      setTimeout(() => {
        if (gen !== perceptionGen) return;
        const layer = qs(`.cl[data-id="${t.id}"]`);
        if (!layer) return;
        clearHintMask(layer);
        addWashRect(layer, colorHsl(t.color));
        playHintMask(layer, rTarget);
      }, i * stagger);
    });

    setTimeout(() => {
      if (gen === perceptionGen) endPerceptionHints();
    }, (picks.length - 1) * stagger + holdMs);
  }

  function runExtraction(level) {
    if (puzzles?.isOpen?.()) return;
    const pool = huntPool();
    if (!pool.length) return;
    const colorName = shuffle([...new Set(pool.map((t) => t.color.name))])[0];
    const picks = shuffle(pool.filter((t) => t.color.name === colorName)).slice(
      0,
      huntCount(level)
    );
    const puzzle = puzzles?.map?.[colorName];
    const tab = qs(`.ct[data-color="${colorName}"]`);
    if (!puzzle || !tab) return;

    picks.forEach((t, i) => {
      const claim = claimTriangle(t.id);
      if (!claim) return;
      const { layer } = claim;
      if (!layer) return void puzzle.addPieceToTray(t.id);
      flyThen(
        layer,
        tab,
        { fill: colorHsl(t.color), delay: i * 90, fromOffscreen: true },
        () => puzzle.addPieceToTray(t.id)
      );
    });
  }

  function runAssembly(level) {
    const n = Math.max(1, level);
    const list = puzzleList();
    const openP = list.find((p) => p.isOpen?.());
    if (openP) return void openP.assemble?.(n);
    if (bodyHas("po")) return;
    const unsolved = list.filter((p) => !p.isSolved?.());
    (unsolved.find((p) => (p.looseCount?.() || 0) > 0) || unsolved[0])?.assemble?.(n);
  }

  function runRadiance(n) {
    if (!dodeRack?.openFaceCount?.()) return;
    triggerReward?.();
    Promise.resolve(dodeRack.addFaces?.(n)).then(() => {
      if (dodeRack.allComplete?.()) endGameWon?.();
      else if (levelCleared?.()) transitionToLevel?.(levelIndex + 1);
    });
  }

  function activatePower(id) {
    const st = powerState[id];
    if (!unlocked(id) || st.active || st.cooling) return;
    if (puzzleHold() && id !== "assembly") return;
    if (id === "assembly" && !assemblyHasWork()) return;
    if (id === "extraction" && !huntPool().length) return;

    if (id === "perception") {
      const n = huntCount(st.level);
      const stagger = P().perceptionStaggerMs;
      runPerception(st.level);
      beginBusy(id, (n - 1) * stagger + perceptionMs(st.level), huntCdMs(st.level));
    } else if (id === "extraction") {
      runExtraction(st.level);
      beginBusy(id, 900, huntCdMs(st.level));
    } else if (id === "assembly") {
      runAssembly(st.level);
      beginBusy(id, 700);
    } else {
      const n = Math.max(1, st.level);
      runRadiance(n);
      beginBusy(id, OPTS.fly.trophyMs * n + 400, P().radianceCdMs);
    }
  }

  syncAll();
  return { offerUpgrade, activatePower, syncAll, powerState, noteCollected };
}
