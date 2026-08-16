
const generatePathData = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 80;
  const j = len * 0.28;
  const nx = -dy / len;
  const ny = dx / len;
  const side = Math.random() < 0.5 ? 1 : -1;
  const c1x = x1 + dx * 0.3 + nx * j * side * (0.4 + Math.random() * 0.6);
  const c1y = y1 + dy * 0.3 + ny * j * side * (0.4 + Math.random() * 0.6);
  const c2x = x1 + dx * 0.7 + nx * j * -side * (0.3 + Math.random() * 0.5);
  const c2y = y1 + dy * 0.7 + ny * j * -side * (0.3 + Math.random() * 0.5);
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
};

const offscreenUpperThird = () => {
  const W = innerWidth;
  const H = innerHeight;
  return Math.random() < 0.5
    ? { x: W * (0.35 + Math.random() * 0.65), y: -56 }
    : { x: W + 56, y: H * (0.02 + Math.random() * 0.31) };
};

const flyStartPoint = (fromEl, opts, node) => {
  if (opts.fromOffscreen) return offscreenUpperThird();
  const origin = fromEl || node;
  if (!origin?.getBoundingClientRect) return offscreenUpperThird();
  const a = origin.getBoundingClientRect();
  const x = a.left + a.width / 2;
  const y = a.top + a.height / 2;
  const tiny = a.width < 4 || a.height < 4;
  const offView =
    !node &&
    (y < -20 || y > innerHeight + 20 || x < -20 || x > innerWidth + 20);
  if (tiny || offView) return offscreenUpperThird();
  return { x, y };
};

const flyOnPath = (fromEl, toEl, opts = {}) =>
  new Promise((resolve) => {
    const node = opts.node;
    if (!toEl || (node != null && !node)) {
      if (!node) fromEl?.remove?.();
      resolve();
      return;
    }

    const b = toEl.getBoundingClientRect();
    const { x: x1, y: y1 } = flyStartPoint(fromEl, opts, node);
    const x2 = b.left + b.width / 2;
    const y2 = b.top + b.height / 2;
    const ms = opts.ms ?? (node ? OPTS.fly.trophyMs : OPTS.fly.ms);
    const delay = opts.delay ?? 0;

    const mover = div({
      className: node ? "fly flyn" : "fly",
    });
    mover.style.offsetPath = `path("${generatePathData(x1, y1, x2, y2)}")`;
    mover.style.offsetDistance = "0%";
    mover.style.animationDuration = `${ms}ms`;
    mover.style.animationDelay = `${delay}ms`;

    if (node) {
      if (node.style) {
        node.style.position = "";
        node.style.left = "";
        node.style.top = "";
        node.style.zIndex = "";
      }
      mover.append(node);
    } else {
      const size = opts.fromOffscreen ? 34 : 28;
      mover.style.setProperty("--fly", opts.fill || "gold");
      mover.style.width = `${size}px`;
      mover.style.height = `${size}px`;
      if (fromEl) fromEl.style.visibility = "hidden";
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      mover.remove();
      if (!node) fromEl?.remove?.();
      sfxLand();
      resolve();
    };
    mover.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, delay + ms + 120);
    document.body.append(mover);
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

const onceEndOrTimeout = (el, ms, onDone, filter) => {
  let done = false;
  const finish = (e) => {
    if (done) return;
    if (filter && e && !filter(e)) return;
    done = true;
    el?.removeEventListener?.("transitionend", finish);
    el?.removeEventListener?.("animationend", finish);
    onDone();
  };
  el?.addEventListener?.("transitionend", finish);
  el?.addEventListener?.("animationend", finish);
  setTimeout(() => finish(), ms);
};

const flyThen = (fromEl, toEl, opts, onLand) =>
  flyOnPath(fromEl, toEl, opts).then(() => onLand?.());
