const OPTS = {
  time: {
    turnMs: 450,
    camMs: 550,
    inspectOutMs: 550,
    walkMs: 700,
    levelExitMs: 580,
    levelEnterPadMs: 40,
    levelEnterMs: 700,
    solveHoldMs: 1100,
  },
  fly: {
    ms: 1100,
    trophyMs: 1400,
  },
  powers: {
    perceptionBaseMs: 5e3,
    perceptionPerLevelMs: 2500,
    perceptionStaggerMs: 550,
    huntCdL1Ms: 24e3,
    huntCdPerStepMs: 4e3,
    huntCdMinMs: 8e3,
    washL1Pct: 120,
    washShrinkPct: 28,
    washMinPct: 32,
    radianceFromLevel: 3,
    radianceEveryN: 3,
    upgradeSkipAfter: { perception: 0, extraction: 1, radiance: 2 },
    radianceCdMs: 12e4,
    solveCheckMs: 480,
  },
  reveal: { revealMs: 4e3, hideMs: 4e3, rMax: 80 },
  level: {
    perColor: 4,
    maxMazeSize: 4,
    defs: [
      { mazeSize: 0, colorCount: 1 },
      { mazeSize: 2, colorCount: 2 },
      { mazeSize: 3, colorCount: 3 },
      { mazeSize: 4, colorCount: 4 },
    ],
  },
  cube: { sideEm: 2, minLightness: 58 },
};

(() => {
  const r = document.documentElement.style;
  const t = OPTS.time;
  r.setProperty("--cam-ms", t.camMs + "ms");
  r.setProperty("--walk-ms", t.walkMs + "ms");
})();
