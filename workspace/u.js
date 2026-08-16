
const { div, button } = v;
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...(r || document).querySelectorAll(s)];
const on = (el, ...c) => el && el.classList.add(...c);
const off = (el, ...c) => el && el.classList.remove(...c);
const tog = (el, c, v) => el && el.classList.toggle(c, v);
const bodyOn = (...c) => on(document.body, ...c);
const bodyOff = (...c) => off(document.body, ...c);
const has = (el, c) => !!el?.classList.contains(c);
const bodyHas = (c) => has(document.body, c);
const px = (n) => n + "px";
const box = (el, o) => {
  if (!el) return;
  if (o.w != null) el.style.width = px(o.w);
  if (o.h != null) el.style.height = px(o.h);
  if (o.x != null) el.style.left = px(o.x);
  if (o.y != null) el.style.top = px(o.y);
  if (o.z != null) el.style.zIndex = o.z;
};
const SVG100 = {
  viewBox: "0 0 100 100",
  width: "100%",
  height: "100%",
};

const inspectFace = () => qs(".face.it");
const faceLayers = (face) => (face ? qsa(".cl", face) : []);
const layerById = (id) => qs(`.cl[data-id="${id}"]`);
