const OPTS = {
  time: {
    turnMs: 450,
    camMs: 550,
    levelExitMs: 580,
    levelEnterMs: 700,
    solveHoldMs: 400,
    sealMs: 800,
  },
  fly: {
    ms: 1100,
    trophyMs: 1400,
    crazy: 0.55,
    trophyCrazy: 0.9,
  },
  powers: {
    rallyFromLevel: 4,
    washFadeMs: 3e4,
    cd: [24e3, 4e3, 5e3],
    evokeCd: [48e3, 4e3, 16e3],
    rallyCd: [12e4, 16e3, 28e3],
  },
  reveal: { ms: 4e3, rMax: 80 },
  level: {
    perColor: 4,
    maxMazeSize: 4,
    maxMazeRows: 3,
    defs: [
      { mazeSize: 0, colorCount: 1 },
      { mazeSize: 2, colorCount: 2 },
      { mazeSize: 2, mazeRows: 3, colorCount: 2 },
      { mazeSize: 3, colorCount: 3 },
      { mazeSize: 4, colorCount: 4 },
    ],
  },
  cube: { minLightness: 58 },
};
