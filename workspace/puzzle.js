const tinyPipSvg = () =>
  svgEl(
    "svg",
    SVG100,
    svgEl("polygon", { points: "0,100 50,50 100,100", fill: "#333" })
  );

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
  tab.append(div({ className: "tps" }, ...pips));
  const hold = div({ className: "cth" }, tab);
  tabsBar.append(hold);

  const syncPow = () => powers.syncAll();
  const clrTab = () => {
    tab.style.position =
      tab.style.left =
      tab.style.top =
      tab.style.width =
      tab.style.height =
      tab.style.margin =
      tab.style.zIndex =
        "";
    hold.style.cssText = "";
  };

  function refreshPips() {
    const n = ids.length;
    pips.forEach((pip, i) => {
      pip.hidden = i >= total;
      if (i < total)
        pip.querySelector("polygon")?.setAttribute(
          "fill",
          i < n ? fill : "#333"
        );
    });
    tog(tab, "ready", n >= total && !solved);
  }

  function tryComplete() {
    if (solved || completing || ids.length < total) return;
    completing = true;
    solved = true;
    ids.forEach(clearHintMask);
    pruneWashes();
    on(tab, "ready");
    syncPow();
    onComplete();
  }

  function addPieceToTray(id) {
    if (solved || completing || ids.includes(id)) return null;
    ids.push(id);
    clearHintMask(id);
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
    off(tab, "ready", "sealing", "sealed");
    clrTab();
    if (tab.parentNode !== hold) hold.append(tab);
    tab.hidden = false;
    refreshPips();
    syncPow();
  }

  function removeTab() {
    hold.remove();
    const root = tabsBar.closest("#proot");
    if (tabsBar && !tabsBar.childElementCount) root?.remove();
  }

  async function collapseToGem() {
    const slot = cubeRack.slots[color.i];
    const { gem, endSize } = makeGem(color, slot);
    const r0 = tab.getBoundingClientRect();
    hold.style.width = hold.style.minWidth = `${r0.width}px`;
    hold.style.height = `${r0.height}px`;
    tab.style.transition = "none";
    document.body.append(tab);
    tab.style.position = "fixed";
    tab.style.zIndex = "121";
    tab.style.left = `${r0.left}px`;
    tab.style.top = `${r0.top}px`;
    tab.style.width = `${r0.width}px`;
    tab.style.height = `${r0.height}px`;
    tab.style.margin = "0";
    const r1 = tab.getBoundingClientRect();
    tab.style.transition = "";
    on(tab, "sealing");
    tab.style.width = tab.style.height = `${endSize}px`;
    tab.style.left = `${r1.left + r1.width / 2 - endSize / 2}px`;
    tab.style.top = `${r1.top + r1.height / 2 - endSize / 2}px`;
    await wait(OPTS.time.sealMs);
    const r = tab.getBoundingClientRect();
    gem.style.position = "fixed";
    gem.style.zIndex = "121";
    gem.style.width = gem.style.height = `${endSize}px`;
    gem.style.left = `${r.left + r.width / 2 - endSize / 2}px`;
    gem.style.top = `${r.top + r.height / 2 - endSize / 2}px`;
    document.body.append(gem);
    clrTab();
    off(tab, "sealing", "ready");
    on(tab, "sealed");
    hold.append(tab);
    await nextFrame();
    return gem;
  }

  refreshPips();
  return {
    flyIn,
    addPieceToTray,
    reset,
    remove: removeTab,
    collapseToGem,
    tab,
  };
}

function createPuzzleSet(colors, perColor, onColorComplete) {
  const root = div({ id: "proot" });
  const tabsBar = div({ id: "ctabs" });
  root.append(tabsBar);
  document.body.append(root);
  const map = {};
  for (const c of colors) {
    map[c.i] = createPuzzleUI({
      color: c,
      total: perColor,
      tabsBar,
      onComplete: () => onColorComplete(c, map[c.i]),
    });
  }
  return {
    map,
    root,
    flyIn: (id, layer, color) => map[color.i]?.flyIn(id, layer),
    destroy() {
      Object.values(map).forEach((p) => p.remove());
      root.remove();
    },
  };
}
