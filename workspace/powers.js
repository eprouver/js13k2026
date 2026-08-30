const W = 0,
  E = 1,
  R = 2;
const POWERS = [
  ["W", uniCyan],
  ["E", uniPink],
  ["R", uniGold],
];
const PK = { w: W, e: E, r: R };
const PCD = [
  [24e3, 4e3, 5e3],
  [48e3, 4e3, 16e3],
  [12e4, 16e3, 28e3],
];
const powStyle = (fill) => ({
  "--pow": `color-mix(in srgb, ${fill} 65%, #000)`,
  "--powd": `color-mix(in srgb, ${fill} 27%, #201018)`,
});

const powerState = [
  { l: 0, a: 0, c: 0 },
  { l: 0, a: 0, c: 0 },
  { l: 0, a: 0, c: 0 },
];

const lv1 = (n) => Math.max(1, n | 0);
const powerCd = (id, level) => {
  const [base, step, min] = PCD[id];
  return Math.max(min, base - (lv1(level) - 1) * step);
};

const powerBtn = ([glyph, fill], n, extra) => {
  const btn = button({
    className: extra ? `ps ${extra}` : "ps",
    style: powStyle(fill),
  });
  btn.append(div({ className: "pg" }, glyph), div({ className: "pl" }, String(n)));
  return btn;
};

let upgradeQueue = Promise.resolve();
let upgradeWait = 0;

function createPowerSystem() {
  const slots = POWERS.map((p, id) => {
    const slot = powerBtn(p, 0, "lk");
    slot.disabled = true;
    slot.onclick = () => activatePower(id);
    return slot;
  });
  document.body.append(div({ id: "prk" }, ...slots));

  const gate = (id) => (id === R ? levelIndex >= O.rallyLv : true);
  const unlocked = (id) => powerState[id].l > 0 && gate(id);

  const openPool = () => {
    const ids = new Set(levelColors.map((c) => c.i));
    return triangles.filter((t) => {
      const el = layerById(t.id);
      return (
        !collected.has(t.id) &&
        ids.has(t.color.i) &&
        el && !isHid(el)
      );
    });
  };

  function syncSlot(id) {
    const st = powerState[id];
    const slot = slots[id];
    slot.querySelector(".pl").textContent = String(st.l);
    const lock = !unlocked(id);
    const empty =
      !lock &&
      ((id === E && !openPool().length) || (id === R && !(cubeRack.rallyRoom() > 0)));
    const held = hasRw();
    tog(slot, "lk", lock || empty);
    tog(slot, "on", st.a);
    tog(slot, "co", st.c);
    slot.disabled = lock || empty || st.a || st.c || held;
  }
  const syncAll = () => POWERS.forEach((_, id) => syncSlot(id));

  function beginBusy(id, activeMs) {
    const st = powerState[id];
    st.a = st.c = true;
    syncSlot(id);
    const cd = powerCd(id, st.l);
    setTimeout(() => {
      st.a = false;
      syncSlot(id);
    }, Math.min(activeMs, cd));
    setTimeout(() => {
      st.c = false;
      syncSlot(id);
    }, cd);
  }

  function showUpgrade() {
    return new Promise((resolve) => {
      if (isWon()) {
        upgradeWait--;
        resolve();
        return;
      }
      const canPick = (id) => gate(id);
      let picked = false;
      let onKey;

      const choices = POWERS.map((p, id) => {
        const ok = canPick(id);
        const btn = powerBtn(p, "+", ok ? "ppk" : "ppk lk");
        btn.disabled = !ok;
        if (ok) btn.onclick = () => commit(id);
        return btn;
      });
      const modal = showModal(div({ className: "ppks" }, ...choices), 4 / 3);
      syncAll();

      const finish = (id) => {
        upgradeWait--;
        if (isWon()) {
          resolve(id);
          return;
        }
        if (upgradeWait > 0) {
          resolve(id);
          return;
        }
        modal?.remove();
        bodyOff("rw");
        syncAll();
        resolve(id);
      };
      const close = (id) => {
        if (picked || isWon()) return;
        picked = true;
        removeEventListener("keydown", onKey);
        const more = upgradeWait > 1;
        if (!more) on(modal, "out");
        setTimeout(() => finish(id), more ? 400 : 520);
      };
      const commit = (id) => {
        if (picked || isWon() || !canPick(id)) return;
        sfxReward(16 / 9);
        on(choices[id], "pk");
        close(id);
        powerState[id].l++;
        syncSlot(id);
      };

      onKey = (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const id = PK[e.key.toLowerCase()];
        if (id == null) return;
        e.preventDefault();
        commit(id);
      };
      addEventListener("keydown", onKey);
    });
  }

  const offerUpgrade = () => {
    if (isWon()) return Promise.resolve();
    upgradeWait++;
    const p = upgradeQueue.then(showUpgrade, showUpgrade);
    upgradeQueue = p.catch(() => {});
    return p;
  };

  function noteCollected(id) {
    clearHintMask(id);
    syncAll();
  }

  function runWash(level) {
    const facing = facingFaceKey();
    const opp = { N: "S", S: "N", E: "W", W: "E" }[facing];
    const all = openPool();
    const pool = opp
      ? all.filter((t) => !(t.room === player.room && t.face === opp))
      : all;
    const picks = shuffle((pool.length ? pool : all).slice()).slice(0, lv1(level));

    picks.forEach((t) => {
      if (collected.has(t.id)) return;
      const layer = layerById(t.id);
      if (!layer || isHid(layer)) return;
      playWash(layer, colorHsl(colorPair(t.color)));
    });
  }

  function runEvoke(level) {
    const pool = openPool();
    if (!pool.length) return;
    const i = shuffle([...new Set(pool.map((t) => t.color.i))])[0];
    const picks = shuffle(pool.filter((t) => t.color.i === i)).slice(0, lv1(level));
    const puzzle = puzzles.map[i];
    if (!puzzle) return;

    picks.forEach((t) => {
      const claim = claimTriangle(t.id);
      if (!claim) return;
      const { layer } = claim;
      if (!layer) return void puzzle.addPieceToTray(t.id);
      flyIn(layer, puzzle.tab, { fill: colorHsl(t.color) }, () =>
        puzzle.addPieceToTray(t.id)
      );
    });
    pruneWashes();
  }

  function runRally(n) {
    if (!(cubeRack.rallyRoom() > 0)) return;
    Promise.resolve(cubeRack.addFaces(n, 1)).then(() => {
      syncAll();
      if (levelCleared()) transitionToLevel(levelIndex + 1);
    });
  }

  function activatePower(id) {
    const st = powerState[id];
    if (!unlocked(id) || st.a || st.c || hasRw() || isWon()) return;
    if (id === E && !openPool().length) return;
    if (id === R && !(cubeRack.rallyRoom() > 0)) return;

    uniGo();
    sfxReward(4 / 3);

    if (id === R) {
      runRally(lv1(st.l));
      beginBusy(id, O.tfly + 400);
    } else {
      if (id === W) runWash(st.l);
      else runEvoke(st.l);
      beginBusy(id, 900);
    }
  }

  syncAll();
  return {
    offerUpgrade,
    activatePower,
    syncAll,
    noteCollected,
  };
}
