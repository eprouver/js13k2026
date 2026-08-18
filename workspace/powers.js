const POWERS = [
  ["wash", "W", uniCyan],
  ["evoke", "E", uniPink],
  ["rally", "R", uniGold],
];
const POWER_IDS = POWERS.map((p) => p[0]);
const POWER_KEY = { w: "wash", e: "evoke", r: "rally" };
const powStyle = (fill) => ({
  "--pow": `color-mix(in srgb, ${fill} 65%, #000)`,
  "--pow-dark": `color-mix(in srgb, ${fill} 27%, #201018)`,
});

const powerState = Object.fromEntries(
  POWER_IDS.map((id) => [id, { level: 0, active: false, cooling: false }])
);

const lv1 = (n) => Math.max(1, n | 0);
const powerCd = (id, level) => {
  const [base, step, min] = OPTS.powers[id + "Cd"] || OPTS.powers.cd;
  return Math.max(min, base - (lv1(level) - 1) * step);
};

const powerBtn = ([id, glyph, fill], n, extra) => {
  const btn = button({
    className: extra ? `ps ${extra}` : "ps",
    style: powStyle(fill),
  });
  btn.dataset.power = id;
  btn.append(div({ className: "pg" }, glyph), div({ className: "pl" }, String(n)));
  return btn;
};

let upgradeQueue = Promise.resolve();
let upgradeWait = 0;

function createPowerSystem() {
  const slots = POWERS.map((p) => {
    const slot = powerBtn(p, 0, "locked");
    slot.disabled = true;
    slot.onclick = () => activatePower(p[0]);
    return slot;
  });
  document.body.append(div({ id: "prk" }, ...slots));

  const gate = (id) =>
    id === "rally" ? levelIndex >= OPTS.powers.rallyFromLevel : true;
  const unlocked = (id) => powerState[id].level > 0 && gate(id);

  const openPool = () => {
    const ids = new Set(levelColors.map((c) => c.i));
    return triangles.filter((t) => {
      const el = layerById(t.id);
      return (
        !collected.has(t.id) &&
        ids.has(t.color.i) &&
        el &&
        el.style.visibility !== "hidden"
      );
    });
  };

  function syncSlot(id) {
    const st = powerState[id];
    const slot = slots[POWER_IDS.indexOf(id)];
    slot.querySelector(".pl").textContent = String(st.level);
    const lock = !unlocked(id);
    const empty =
      !lock &&
      ((id === "evoke" && !openPool().length) ||
        (id === "rally" && !(cubeRack.rallyRoom() > 0)));
    const held = bodyHas("rewarding");
    tog(slot, "locked", lock || empty);
    tog(slot, "active", st.active);
    tog(slot, "cooling", st.cooling);
    slot.disabled = lock || empty || st.active || st.cooling || held;
  }
  const syncAll = () => POWER_IDS.forEach(syncSlot);

  function beginBusy(id, activeMs) {
    const st = powerState[id];
    st.active = st.cooling = true;
    syncSlot(id);
    const cd = powerCd(id, st.level);
    setTimeout(() => {
      st.active = false;
      syncSlot(id);
    }, Math.min(activeMs, cd));
    setTimeout(() => {
      st.cooling = false;
      syncSlot(id);
    }, cd);
  }

  function showUpgrade() {
    return new Promise((resolve) => {
      if (bodyHas("won")) {
        upgradeWait--;
        resolve();
        return;
      }
      const canPick = (id) => gate(id);
      let picked = false;
      let onKey;

      const choices = POWERS.map((p) => {
        const [id] = p;
        const ok = canPick(id);
        const btn = powerBtn(
          p,
          "+",
          ok ? "ppk" : "ppk locked"
        );
        btn.disabled = !ok;
        if (ok) btn.onclick = () => commit(id);
        return btn;
      });
      const modal = showModal(div({ className: "ppks" }, ...choices), 4 / 3);
      syncAll();

      const finish = (id) => {
        upgradeWait--;
        if (bodyHas("won")) {
          resolve(id);
          return;
        }
        if (upgradeWait > 0) {
          resolve(id);
          return;
        }
        modal?.remove();
        bodyOff("rewarding");
        syncAll();
        resolve(id);
      };
      const close = (id) => {
        if (picked || bodyHas("won")) return;
        picked = true;
        removeEventListener("keydown", onKey);
        const more = upgradeWait > 1;
        if (!more) on(modal, "out");
        setTimeout(() => finish(id), more ? 400 : 520);
      };
      const commit = (id) => {
        if (picked || bodyHas("won") || !canPick(id)) return;
        sfxPick();
        on(choices[POWER_IDS.indexOf(id)], "picked");
        close(id);
        const st = powerState[id];
        st.level++;
        syncSlot(id);
      };

      onKey = (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const id = POWER_KEY[e.key.toLowerCase()];
        if (!id) return;
        e.preventDefault();
        commit(id);
      };
      addEventListener("keydown", onKey);
    });
  }

  const offerUpgrade = () => {
    if (bodyHas("won")) return Promise.resolve();
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
      if (!layer || layer.style.visibility === "hidden") return;
      playWash(layer, colorHsl(colorPair(t.color)));
    });
  }

  function runEvoke(level) {
    const pool = openPool();
    if (!pool.length) return;
    const i = shuffle([...new Set(pool.map((t) => t.color.i))])[0];
    const picks = shuffle(pool.filter((t) => t.color.i === i)).slice(
      0,
      lv1(level)
    );
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
    if (!unlocked(id) || st.active || st.cooling || bodyHas("rewarding") || bodyHas("won")) return;
    if (id === "evoke" && !openPool().length) return;
    if (id === "rally" && !(cubeRack.rallyRoom() > 0)) return;

    uniGo();
    sfxReward(4 / 3);

    if (id === "rally") {
      runRally(lv1(st.level));
      beginBusy(id, OPTS.fly.trophyMs + 400);
    } else {
      if (id === "wash") runWash(st.level);
      else runEvoke(st.level);
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
