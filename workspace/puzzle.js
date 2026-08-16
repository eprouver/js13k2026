const STEP = 72;
const MOD = 5;
const mod5 = (n) => ((n % MOD) + MOD) % MOD;
const tinyPipSvg = () => isoTriSvg("#000", { svgClass: "tab-pip" });

function createPuzzleUI(opts) {
  const { color, total, onComplete, tabsBar } = opts;
  const fill = colorHsl(color);
  const pieces = [];
  let open = false;
  let solved = false;
  let lockKey = null;
  let canLock = false;
  let pulseTemplate = null;
  let solveTimer = null;
  const meshSeed = (Math.random() * 0xffffffff) >>> 0;

  const pips = Array.from({ length: total }, () => {
    const wrap = div({ className: "tpw" });
    wrap.append(tinyPipSvg());
    return wrap;
  });
  const tabBank = div({ className: "tb" });
  const tab = button({ className: "ct", style: toneStyle("tab", color) });
  tab.dataset.color = color.name;
  tab.append(div({ className: "tps" }, ...pips), tabBank);
  tabsBar.append(tab);

  const pentagon = div({ className: "pentagon" });
  const wedges = [];
  for (let i = 0; i < 5; i++) {
    const content = div({ className: "content" });
    const turns = 1 + ((Math.random() * (MOD - 1)) | 0);
    content.dataset.spin = String(turns);
    content.style.setProperty("--spin", `${turns * STEP}deg`);
    const wedge = div({ className: "wedge empty" }, content);
    wedge.dataset.slot = String(i);
    pentagon.append(
      div({ className: "slot", style: { "--base": `${i * STEP + 36}deg` } }, wedge)
    );
    wedges.push({ i, wedge, content, pieceId: null });
  }

  const modal = div(
    { className: "pm", style: toneStyle("tab", color) },
    div({ className: "pb", onclick: () => close() }),
    div({ className: "pp" }, pentagon)
  );
  modal.hidden = true;
  const root = tabsBar.closest("#proot");
  document.body.append(modal);

  const setSpin = (c, n) => {
    c.dataset.spin = String(n);
    c.style.setProperty("--spin", `${n * STEP}deg`);
  };
  const spinOf = (w) => parseInt(w.content.dataset.spin, 10) || 0;
  const keyOf = (w) => (w.pieceId ? mod5(w.i + spinOf(w)) : null);
  const isOn = (w) => has(w.wedge, "aligned");
  const loose = () => pieces.filter((p) => p.placed == null);
  const full = () => pieces.length >= total;
  const seated = () => wedges.every((w) => w.pieceId != null);
  const setWedge = (w, id) => {
    w.pieceId = id;
    w.wedge.className = id == null ? "wedge empty" : "wedge filled";
  };
  const syncPow = () => powers?.syncAll?.();

  function ensurePulseMeshes() {
    if (!pulseTemplate)
      pulseTemplate = createMeshData(meshSeed, { color }).svg;
    for (const { content } of wedges)
      if (!content.querySelector(".pwm"))
        content.append(pulseTemplate.cloneNode(true));
  }

  function refreshPips() {
    const L = loose().length;
    const shown = total - (pieces.length - L);
    pips.forEach((pip, i) => {
      pip.hidden = i >= shown;
      if (i < shown)
        pip.querySelector("polygon")?.setAttribute("fill", i < L ? fill : "#000");
    });
    tog(tab, "ready", full());
  }

  function layoutBank() {
    const rem = [];
    for (const p of pieces) {
      if (p.placed != null) p.el?.remove();
      else if (p.el) rem.push(p.el);
    }
    tabBank.replaceChildren(...rem);
    refreshPips();
    const focus = open && !rem.length && full();
    tab.hidden = focus;
    tog(root, "hidden", focus);
    tog(document.body, "pf", focus);
    syncPow();
  }

  function addPieceToTray(id) {
    if (pieces.some((p) => p.id === id)) return null;
    const el = div({ className: "tp" });
    el.dataset.id = id;
    el.append(isoTriSvg(fill));
    enableDrag(el, id);
    pieces.push({ id, el, placed: null });
    layoutBank();
    if (
      full() &&
      !solved &&
      !open &&
      !puzzles?.isOpen?.() &&
      !bodyHas("po")
    )
      openTray();
    return el;
  }

  function placeIntoWedge(id, slot) {
    const piece = pieces.find((p) => p.id === id);
    const w = wedges[slot];
    if (!piece || !w || w.pieceId) return false;
    if (piece.placed != null) setWedge(wedges[piece.placed], null);
    setWedge(w, id);
    piece.placed = slot;
    piece.el?.remove();
    layoutBank();
    checkSolved();
    return true;
  }

  function seedLock(a, b, k) {
    canLock = true;
    lockKey = k;
    on(a.wedge, "aligned");
    on(b.wedge, "aligned");
  }

  function growLocked(budget = 99) {
    if (lockKey == null || budget < 1) return 0;
    let done = 0;
    for (let g = 0; g < MOD && done < budget; g++) {
      let hit = false;
      for (const w of wedges) {
        if (done >= budget || isOn(w) || keyOf(w) !== lockKey) continue;
        if (isOn(wedges[mod5(w.i - 1)]) || isOn(wedges[mod5(w.i + 1)])) {
          on(w.wedge, "aligned");
          done++;
          hit = true;
        }
      }
      if (!hit) break;
    }
    return done;
  }

  function syncAlignment(spun = null) {
    for (const w of wedges)
      if (lockKey == null || keyOf(w) !== lockKey)
        off(w.wedge, "aligned");
    if (lockKey == null && canLock && spun != null) {
      const s = wedges[spun];
      const k = s && keyOf(s);
      if (k != null) {
        const L = wedges[mod5(spun - 1)];
        const R = wedges[mod5(spun + 1)];
        if (keyOf(L) === k) seedLock(s, L, k);
        else if (keyOf(R) === k) seedLock(s, R, k);
      }
    }
    growLocked();
  }

  function lockAdjacentUpTo(n) {
    if (n < 1) return 0;
    let done = 0;
    if (lockKey == null) {
      for (let i = 0; i < MOD; i++) {
        const a = wedges[i];
        const b = wedges[mod5(i + 1)];
        const ka = keyOf(a);
        if (ka == null || ka !== keyOf(b)) continue;
        seedLock(a, b, ka);
        done = Math.min(2, n);
        break;
      }
    }
    return lockKey == null ? 0 : done + growLocked(n - done);
  }

  const spinToKey = (w, key) => {
    const turns = mod5(key - w.i);
    if (mod5(spinOf(w)) === turns) return 0;
    setSpin(w.content, turns);
    return 1;
  };

  function rotateAssist(n) {
    let done = 0;
    if (lockKey != null) {
      for (const w of wedges) {
        if (done >= n || !w.pieceId || isOn(w)) continue;
        done += spinToKey(w, lockKey);
      }
      return done;
    }
    for (let i = 0; i < MOD && done < n; i++) {
      const a = wedges[i];
      const b = wedges[mod5(i + 1)];
      const ka = keyOf(a);
      const kb = keyOf(b);
      if (ka == null || kb == null || ka === kb) continue;
      if (spinToKey(b, ka)) {
        canLock = true;
        done++;
      }
    }
    return done;
  }

  function checkSolved(spun = null) {
    syncAlignment(spun);
    if (solved || !seated()) return;
    if (lockKey == null || !wedges.every((w) => keyOf(w) === lockKey)) return;
    solved = true;
    on(pentagon, "solved");
    onComplete?.();
  }

  const scheduleSolveCheck = (spun) => {
    clearTimeout(solveTimer);
    solveTimer = setTimeout(() => {
      solveTimer = null;
      checkSolved(spun);
    }, OPTS.powers.solveCheckMs);
  };

  wedges.forEach(({ wedge, content, i }) => {
    wedge.onclick = (e) => {
      e.stopPropagation();
      if (solved || !open) return;
      const w = wedges[i];
      if (!w.pieceId || isOn(w)) return;
            setSpin(content, spinOf(w) + 1);
      canLock = true;
      scheduleSolveCheck(i);
    };
  });

  const wedgeAt = (x, y) => {
    const w = document.elementFromPoint(x, y)?.closest?.(".wedge");
    const idx = w && parseInt(w.dataset.slot || "", 10);
    return Number.isFinite(idx) ? idx : null;
  };

  function enableDrag(el, id) {
    let ox = 0;
    let oy = 0;
    let dragging = false;
    let ghost = null;
    const clearHot = () =>
      wedges.forEach((w) => off(w.wedge, "dh"));
    const onMove = (e) => {
      if (!dragging || !ghost) return;
      ghost.style.transform = `translate(${e.clientX - ox}px,${e.clientY - oy}px)`;
      const idx = wedgeAt(e.clientX, e.clientY);
      wedges.forEach((w, wi) =>
        tog(w.wedge, "dh", idx === wi && !w.pieceId)
      );
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      ghost?.remove();
      ghost = null;
      off(el, "dragging");
      el.style.opacity = "";
      clearHot();
      const idx = wedgeAt(e.clientX, e.clientY);
      if (idx != null) placeIntoWedge(id, idx);
      else layoutBank();
    };
    el.addEventListener("pointerdown", (e) => {
      if (!open || solved) return;
      const piece = pieces.find((p) => p.id === id);
      if (!piece || piece.placed != null) return;
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      dragging = true;
      on(el, "dragging");
      ghost = el.cloneNode(true);
      on(ghost, "dg");
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
      ghost.style.transform = `translate(${r.left}px,${r.top}px)`;
      document.body.append(ghost);
      el.style.opacity = "0.35";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
    el.addEventListener("click", (e) => e.stopPropagation());
  }

  const shake = () => {
    off(tab, "shake");
    void tab.offsetWidth;
    on(tab, "shake");
  };

  function openTray(force) {
    if (!force && !full()) return void shake();
    open = true;
    bodyOn("po");
    syncPow();
    modal.hidden = false;
    ensurePulseMeshes();
    if (loose().length) on(tab, "raised");
    layoutBank();
  }

  function close() {
    open = false;
    bodyOff("po", "pf");
    syncPow();
    modal.hidden = true;
    off(tab, "raised");
    tab.hidden = false;
    off(root, "hidden");
    layoutBank();
  }

  tab.onclick = (e) => {
    if (e.target.closest(".tp")) return;
    if (open) close();
    else openTray();
  };

  function flyIn(id, layer) {
    const run = () => {
      return addPieceToTray(id);
    };
    if (!layer || !document.body.contains(layer)) return void run();
    flyThen(layer, tab, { fill }, run);
  }

  function reset() {
    solved = false;
    lockKey = null;
    canLock = false;
    pieces.length = 0;
    for (const w of wedges) {
      setWedge(w, null);
      setSpin(w.content, 1 + ((Math.random() * (MOD - 1)) | 0));
    }
    off(pentagon, "solved");
    off(tab, "ready", "raised");
    tab.hidden = false;
    root.hidden = false;
    off(root, "hidden");
    tabBank.replaceChildren();
    refreshPips();
    close();
  }

  function removeTab() {
    close();
    tab.remove();
    modal.remove();
    if (tabsBar && !tabsBar.childElementCount) root?.remove();
  }

  function seatFromBank(n) {
    let done = 0;
    for (const w of wedges) {
      if (done >= n || w.pieceId) continue;
      const piece = loose()[0];
      if (!piece) break;
      placeIntoWedge(piece.id, w.i);
      done++;
    }
    layoutBank();
    return done;
  }

  function assistAssemble(n) {
    if (solved) return 0;
    const keepOpen = open;
    const bank = loose().length;
    const empty = wedges.some((w) => !w.pieceId);
    const placed = wedges.some((w) => w.pieceId);
    let done = 0;
    if (empty && bank) {
      if (!open) {
        shake();
        done = seatFromBank(n);
        if (done) openTray(true);
      } else done = seatFromBank(n);
      done += lockAdjacentUpTo(n);
    } else if (open || seated()) {
      if (!open) openTray(true);
      if (lockKey == null) {
        done += lockAdjacentUpTo(n);
        if (lockKey == null && placed) {
          done += rotateAssist(Math.max(1, n - done));
          done += lockAdjacentUpTo(n);
        }
      }
      if (lockKey != null) done += rotateAssist(n);
    } else shake();
    checkSolved();
    layoutBank();
    if (!keepOpen && open && !solved && pieces.length < total) close();
    return done;
  }

  function collapseToGem() {
    return new Promise((resolve) => {
      const panel = pentagon.closest(".pp");
      const backdrop = modal.querySelector(".pb");
      pentagon.style.setProperty("--gem", fill);
      on(panel, "to-gem");
      on(pentagon, "to-gem");
      on(backdrop, "to-gem");
      onceEndOrTimeout(
        panel,
        750,
        () => {
          const r = pentagon.getBoundingClientRect();
          const { gem, endSize } = makeGem(
            color,
            qs(".ds")
          );
          const startSize = Math.max(
            endSize * 1.35,
            Math.min(r.width, r.height) * 0.7 || endSize * 2
          );
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const place = (size) => {
            gem.style.width = gem.style.height = `${size}px`;
            gem.style.left = `${cx - size / 2}px`;
            gem.style.top = `${cy - size / 2}px`;
          };
          gem.style.position = "fixed";
          gem.style.zIndex = "121";
          place(startSize);
          document.body.append(gem);
          nextFrame().then(() => place(endSize));
          open = false;
          bodyOff("po", "pf");
          syncPow();
          modal.hidden = true;
          off(tab, "raised");
          setTimeout(() => resolve(gem), 280);
        },
        (e) =>
          (e.target === panel || e.target === pentagon) &&
          e.propertyName === "transform"
      );
    });
  }

  refreshPips();
  return {
    flyIn,
    addPieceToTray,
    isOpen: () => open,
    isSolved: () => solved,
    looseCount: () => loose().length,
    reset,
    remove: removeTab,
    assemble: assistAssemble,
    collapseToGem,
    close,
  };
}

function createPuzzleSet(colors, perColor, onColorComplete) {
  const root = div({ id: "proot" });
  const tabsBar = div({ id: "ctabs" });
  root.append(tabsBar);
  document.body.append(root);
  const map = {};
  for (const c of colors) {
    map[c.name] = createPuzzleUI({
      color: c,
      total: perColor,
      tabsBar,
      onComplete: () => onColorComplete(c, map[c.name]),
    });
  }
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const p = Object.values(map).find((x) => x.isOpen());
    if (!p) return;
    e.preventDefault();
    p.close();
  });
  return {
    map,
    root,
    flyIn: (id, layer, color) => map[color.name]?.flyIn(id, layer),
    isOpen: () => Object.values(map).some((p) => p.isOpen()),
    destroy() {
      Object.values(map).forEach((p) => p.remove());
      root.remove();
    },
  };
}
