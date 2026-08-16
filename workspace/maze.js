const indexToRC = (index, cols) => ({
  row: (index / cols) | 0,
  col: index % cols,
});

const generateMaze = (size = 5) => {
  const n = size * size;
  const doors = Array.from({ length: n }, () => ({}));
  const seen = new Uint8Array(n);
  const stack = [0];
  seen[0] = 1;
  const dirs = [
    [-1, 0, "N", "S"],
    [1, 0, "S", "N"],
    [0, -1, "W", "E"],
    [0, 1, "E", "W"],
  ];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const { row, col } = indexToRC(cur, size);
    const opts = [];
    for (const [dr, dc, d, opp] of dirs) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || c < 0 || r >= size || c >= size) continue;
      const id = r * size + c;
      if (!seen[id]) opts.push([id, d, opp]);
    }
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [id, d, opp] = opts[(Math.random() * opts.length) | 0];
    doors[cur][d] = id;
    doors[id][opp] = cur;
    seen[id] = 1;
    stack.push(id);
  }
  return { size, doors };
};
