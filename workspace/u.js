
const { div, button } = v;
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...(r || document).querySelectorAll(s)];
const on = (el, ...c) => el && el.classList.add(...c);
const off = (el, ...c) => el && el.classList.remove(...c);
const tog = (el, c, v) => el && el.classList.toggle(c, v);
const bodyOn = (...c) => on(document.body, ...c);
const bodyOff = (...c) => off(document.body, ...c);
const bodyHas = (c) => document.body.classList.contains(c);
const showModal = (kids, ding) => {
  if (bodyHas("won")) return qs(".pmod");
  const card = div(
    { className: "pmc" },
    ...(typeof kids === "string" ? [div({ className: "ph" }, kids)] : [].concat(kids))
  );
  let modal = qs(".pmod");
  if (modal) {
    off(modal, "out");
    modal.replaceChildren(card);
  } else {
    modal = div({ className: "pmod" }, card);
    bodyOn("rewarding");
    document.body.append(modal);
    void modal.offsetWidth;
    on(modal, "show");
  }
  ding && sfxReward(ding);
  return modal;
};
const px = (n) => n + "px";
const easeOut3 = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const runTween = (ms, { onTick, onDone, setRaf, ease = easeOut3 }) => {
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    onTick(ease(t), t);
    if (t < 1) setRaf(requestAnimationFrame(tick));
    else {
      setRaf(null);
      onDone?.();
    }
  };
  setRaf(requestAnimationFrame(tick));
};
const box = (el, o) => {
  if (!el) return;
  if (o.w != null) el.style.width = px(o.w);
  if (o.h != null) el.style.height = px(o.h);
  if (o.x != null) el.style.left = px(o.x);
  if (o.y != null) el.style.top = px(o.y);
};
const SVG100 = {
  viewBox: "0 0 100 100",
  width: "100%",
  height: "100%",
};

const inspectFace = () => qs(".face.it");
const faceLayers = (face) =>
  face
    ? qsa(".cl", face).filter((l) => l.style.visibility !== "hidden")
    : [];
const layerById = (id) => qs(`.cl[data-id="${id}"]`);
