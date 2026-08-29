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

const mazeRooms = (cols, rows = cols) => {
  const { doors } = generateMaze(cols, rows);
  return doors.map((d, id) => {
    const { row, col } = indexToRC(id, cols);
    return {
      id,
      x: col,
      z: row,
      doors: { ...d },
    };
  });
};

const pickLevelColors = (count, exclude = [], lit = () => 0) => {
  const ban = new Set(exclude);
  return RAINBOW.filter((c) => !ban.has(c.i))
    .sort((a, b) => lit(a.i) - lit(b.i) || a.i - b.i)
    .slice(0, count);
};

const placeTriangles = (rooms, colors, perColor = O.per) => {
  const slots = [];
  for (const r of rooms) {
    for (const face of ["N", "E", "S", "W", "U", "D"]) {
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

const buildLevel = (index, exclude = [], lit = () => 0) => {
  const raw = O.defs[index] || [O.maxC, 1 + index];
  const cols = raw[0] <= 0 ? 0 : Math.min(O.maxC, raw[0]);
  const rows = cols ? Math.min(O.maxR, raw[2] || raw[0]) : 0;
  const rooms = cols ? mazeRooms(cols, rows) : tutorialRooms();
  const colors = pickLevelColors(Math.min(6, raw[1] || 1), exclude, lit);
  return {
    index,
    mazeSize: cols,
    rooms,
    colors,
    triangles: colors.length ? placeTriangles(rooms, colors) : [],
    perColor: O.per,
  };
};
