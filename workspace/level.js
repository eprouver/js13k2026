const PER_COLOR = OPTS.level.perColor;

const LEVEL_DEFS = OPTS.level.defs;

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const tutorialRooms = () => [
  { id: 0, x: 0, z: 0, doors: { N: 1 } },
  { id: 1, x: 0, z: -1, doors: { S: 0 } },
];

const mazeRooms = (size) => {
  const { doors } = generateMaze(size);
  return doors.map((d, id) => {
    const { row, col } = indexToRC(id, size);
    return {
      id,
      x: col,
      z: row,
      doors: { ...d },
    };
  });
};

const pickLevelColors = (count, excludeNames = []) => {
  const ban = new Set(excludeNames);
  const pool = RAINBOW.filter((c) => !ban.has(c.name));
  return shuffle(pool.slice()).slice(0, Math.min(count, pool.length));
};

const placeTriangles = (rooms, colors, perColor = PER_COLOR) => {
  const slots = [];
  for (const r of rooms) {
    for (const face of ["N", "E", "S", "W"]) {
      if (face in r.doors) continue;
      slots.push({ room: r.id, face });
    }
  }
  shuffle(slots);
  const tris = [];
  let i = 0;
  for (const color of colors) {
    for (let n = 0; n < perColor; n++) {
      const s = slots[i % slots.length];
      i++;
      tris.push({
        id: `t${tris.length}`,
        room: s.room,
        face: s.face,
        color,
      });
    }
  }
  return tris;
};

const buildLevel = (index, excludeNames = []) => {
  const maxSize = OPTS.level.maxMazeSize;
  const raw =
    LEVEL_DEFS[index] || {
      mazeSize: Math.min(maxSize, 2 + index),
      colorCount: Math.min(6, 1 + index),
    };
  const mazeSize =
    raw.mazeSize <= 0 ? 0 : Math.min(maxSize, raw.mazeSize);
  const ban = new Set(excludeNames);
  const pool = RAINBOW.filter((c) => !ban.has(c.name));
  const colorCount = Math.min(
    pool.length,
    Math.min(6, Math.max(1, raw.colorCount || 1))
  );
  const rooms = mazeSize <= 0 ? tutorialRooms() : mazeRooms(mazeSize);
  const colors = pickLevelColors(colorCount, excludeNames);
  return {
    index,
    mazeSize,
    rooms,
    colors,
    triangles: colors.length
      ? placeTriangles(rooms, colors, PER_COLOR)
      : [],
    perColor: PER_COLOR,
  };
};
