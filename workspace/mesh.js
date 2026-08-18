const SVG_NS = "http://www.w3.org/2000/svg";

const svgEl = (name, attrs = {}, ...kids) => {
  const e = document.createElementNS(SVG_NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  for (const c of kids.flat(0xff)) if (c != null) e.append(c);
  return e;
};

const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const buildMesh = (rand, n = 3) => {
  const xs = [0];
  const ys = [0];
  const xw = [];
  const yw = [];
  let wx = 0;
  let wy = 0;
  for (let i = 0; i < n; i++) {
    const a = 0.5 + rand();
    const b = 0.5 + rand();
    xw.push(a);
    yw.push(b);
    wx += a;
    wy += b;
  }
  for (let i = 0; i < n; i++) {
    xs.push(xs[i] + xw[i] / wx);
    ys.push(ys[i] + yw[i] / wy);
  }
  xs[n] = ys[n] = 1;
  const pts = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      let x = xs[i];
      let y = ys[j];
      if (i && i < n) x += (rand() - 0.5) * (xs[i] - xs[i - 1]) * 0.45;
      if (j && j < n) y += (rand() - 0.5) * (ys[j] - ys[j - 1]) * 0.45;
      pts.push([Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
    }
  const at = (i, j) => pts[j * (n + 1) + i];
  const tris = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      if (rand() < 0.5) tris.push([a, b, c], [a, c, d]);
      else tris.push([a, b, d], [b, c, d]);
    }
  return tris;
};

const createMeshData = (seed) => {
  const rand = mulberry32(seed >>> 0);
  const tris = buildMesh(rand, 3);
  const svg = svgEl("svg", {
    ...SVG100,
    preserveAspectRatio: "none",
    class: "wm",
  });
  const g = svgEl("g", matchMedia("(hover:none)").matches ? {} : { filter: "url(#sf)" });
  g.append(svgEl("rect", { width: 100, height: 100, fill: "var(--wall-lo)" }));
  for (const [a, b, c] of tris) {
    g.append(
      svgEl("polygon", {
        points: [a, b, c].map(([x, y]) => `${x * 100},${y * 100}`).join(" "),
        fill: `color-mix(in srgb,var(--wall-lo) ${(rand() * 100) | 0}%,var(--wall-hi))`,
      })
    );
  }
  svg.append(g);
  return { svg, tris };
};

const triCentroid = ([[x1, y1], [x2, y2], [x3, y3]]) => [
  (x1 + x2 + x3) / 3,
  (y1 + y2 + y3) / 3,
];

const pickCollectTris = (tris, seed, count) => {
  if (count < 1 || !tris.length) return [];
  const pick = mulberry32((seed ^ 0xc0ffee) >>> 0);
  let pool = tris.filter((t) => {
    const [cx, cy] = triCentroid(t);
    return cx > 0.18 && cx < 0.82 && cy > 0.18 && cy < 0.82;
  });
  if (!pool.length) pool = tris.slice();
  const chosen = [];
  const rest = pool.slice();
  while (chosen.length < count && rest.length)
    chosen.push(rest.splice((pick() * rest.length) | 0, 1)[0]);
  while (chosen.length < count) chosen.push(chosen[chosen.length - 1] || tris[0]);
  return chosen;
};

const createCollectLayer = (id, tri, color) => {
  const maskId = `cm-${id}`;
  const pts = tri.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
  const [cx, cy] = triCentroid(tri);
  const mask = svgEl("mask", {
    id: maskId,
    maskUnits: "userSpaceOnUse",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  mask.append(
    svgEl("circle", {
      class: "rc",
      cx: cx * 100,
      cy: cy * 100,
      r: 0,
      fill: "#fff",
      filter: "url(#df)",
    })
  );
  const layer = div({ className: "cl" });
  layer.dataset.id = id;
  layer.append(
    svgEl(
      "svg",
      {
        ...SVG100,
        preserveAspectRatio: "none",
      },
      svgEl("defs", {}, mask),
      svgEl("polygon", {
        class: "ctri",
        points: pts,
        fill: colorHsl(color),
        mask: `url(#${maskId})`,
      })
    )
  );
  return layer;
};

const paintWall = (face, items = []) => {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const { svg, tris } = createMeshData(seed);
  face.replaceChildren(svg);
  if (!items.length) return;
  const shapes = pickCollectTris(tris, seed, items.length);
  items.forEach((it, i) => face.append(createCollectLayer(it.id, shapes[i], it.color)));
};
