const tinyPipSvg = () => isoTriSvg("#000", { svgClass: "tab-pip" });

/** Color bank: collect N triangles → gem. No wedge puzzle. */
function createPuzzleUI(opts) {
  const { color, total, onComplete, tabsBar } = opts;
  const fill = colorHsl(color);
  const ids = [];
  let solved = false;
  let completing = false;

  const pips = Array.from({ length: total }, () => {
    const wrap = div({ className: "tpw" });
    wrap.append(tinyPipSvg());
    return wrap;
  });
  const tab = button({ className: "ct", style: toneStyle("tab", color) });
  tab.dataset.color = color.name;
  tab.append(div({ className: "tps" }, ...pips));
  tabsBar.append(tab);

  const syncPow = () => powers?.syncAll?.();

  function refreshPips() {
    const n = ids.length;
    pips.forEach((pip, i) => {
      pip.hidden = i >= total;
      if (i < total)
        pip.querySelector("polygon")?.setAttribute(
          "fill",
          i < n ? fill : "#000"
        );
    });
    tog(tab, "ready", n >= total && !solved);
  }

  function tryComplete() {
    if (solved || completing || ids.length < total) return;
    completing = true;
    solved = true;
    on(tab, "ready");
    syncPow();
    onComplete?.();
  }

  function addPieceToTray(id) {
    if (solved || completing || ids.includes(id)) return null;
    ids.push(id);
    refreshPips();
    syncPow();
    if (ids.length >= total) tryComplete();
    return tab;
  }

  function flyIn(id, layer) {
    const run = () => addPieceToTray(id);
    if (!layer || !document.body.contains(layer)) return void run();
    flyThen(layer, tab, { fill }, run);
  }

  function reset() {
    solved = false;
    completing = false;
    ids.length = 0;
    off(tab, "ready");
    tab.hidden = false;
    refreshPips();
    syncPow();
  }

  function removeTab() {
    tab.remove();
    const root = tabsBar.closest("#proot");
    if (tabsBar && !tabsBar.childElementCount) root?.remove();
  }

  function collapseToGem() {
    return new Promise((resolve) => {
      const r = tab.getBoundingClientRect();
      const { gem, endSize } = makeGem(color, qs(".ds"));
      const startSize = Math.max(
        endSize * 1.35,
        Math.min(r.width, r.height) * 1.2 || endSize * 2
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
      setTimeout(() => resolve(gem), 280);
    });
  }

  refreshPips();
  return {
    flyIn,
    addPieceToTray,
    isOpen: () => false,
    isSolved: () => solved,
    looseCount: () => (solved ? 0 : Math.max(0, total - ids.length)),
    reset,
    remove: removeTab,
    collapseToGem,
    close: () => {},
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
  return {
    map,
    root,
    flyIn: (id, layer, color) => map[color.name]?.flyIn(id, layer),
    isOpen: () => false,
    destroy() {
      Object.values(map).forEach((p) => p.remove());
      root.remove();
    },
  };
}
