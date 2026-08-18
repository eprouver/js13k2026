document.head.appendChild(document.createElement("style")).append(`*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  corner-shape: squircle;
}

:root {
  --dist: 40vmin;
  --face: calc(2 * var(--dist) - 10vmin);
  --radius: 100%;
  --pill-radius: 2rem;
  --persp: 40vmin;
  --span: calc(2 * var(--dist));
  --bg: #121621;
  --wall-lo: #2c313d;
  --wall-hi: #4f576d;
  --fg: #f8e8ff;
  --bow: repeating-linear-gradient(90deg,var(--c0),var(--c1),var(--c2),var(--c3),var(--c4),var(--c5),var(--c0) 50%);
  --ease: cubic-bezier(0.4, 0.05, 0.2, 1);
  --side-orb: max(7.25vmin, 3rem);
  --orb-font: calc(var(--side-orb) * 0.3);
  --dim: grayscale(1) brightness(0.55);
  --line: 0.2rem;
  --bow-line: 0.6rem;
}

@supports not (corner-shape: squircle) {
  :root {
    --radius: 32%;
  }
}

html,
body {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  font-family: Arial;
  background: var(--bg);
  color: var(--fg);
}

.pmc {
  border-radius: var(--pill-radius);
  corner-shape: round;
  position: relative;
  z-index: 1;
  padding: 1.35rem 1.55rem;
  background: #222;
  animation: pmc-in 0.7s cubic-bezier(0.2, 1.4, 0.3, 1) both;
}

.ct,
.ds,
.ps,
.ppk,
.pl,
.gem,
.face {
  border-radius: var(--radius);
}

#viewport,
#camera,
#istage,
.cl,
.wl {
  position: absolute;
  inset: 0;
}

body.rewarding::after,
.pmod {
  position: fixed;
  inset: 0;
}

.face {
  width: var(--face);
  height: var(--face);
  left: calc(var(--face) / -2);
  top: calc(var(--face) / -2);
  position: absolute;
  overflow: hidden;
  background: linear-gradient(var(--wall-lo), var(--wall-hi));
  opacity: 1;
  backface-visibility: hidden;
}

@media (hover: fine) {
  .face {
    backface-visibility: visible;
  }
}

.room,
.wall,
.face .wm,
.face .cl,
.face .wl,
.face svg {
  backface-visibility: hidden;
}

#viewport {
  perspective: var(--persp);
  overflow: hidden;
  background: var(--bg);
  pointer-events: auto;
  cursor: pointer;
  touch-action: none;
  outline: none;
}

#viewport.inspecting {
  cursor: default;
}

#camera {
  transform-style: preserve-3d;
  transform: translateZ(0);
  transition: transform 550ms var(--ease);
}

#camera.na,
#world.na {
  transition: none;
}

#viewport.inspecting #camera {
  transform: translateZ(16vmin);
}

#pivot,
#world,
.room,
.wall {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}

#pivot {
  left: 50%;
  top: 50%;
  transform-origin: 0 0;
}

#world {
  transition: transform 700ms var(--ease);
}

.wall {
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))
    translateZ(calc(-1 * var(--dist) + 1px));
}
.wall.face-n { --ry: 0deg; }
.wall.face-s { --ry: 180deg; }
.wall.face-e { --ry: -90deg; }
.wall.face-w { --ry: 90deg; }
.wall.face-u { --rx: 90deg; }
.wall.face-d { --rx: -90deg; }

body.rewarding::after,
.ds::before,
.pmc::before,
.pmc::after,
.wall:has(.it)::before {
  content: "";
}

#viewport.lx .face {
  opacity: 0;
  transition: opacity 0.55s var(--ease);
}

#viewport.le .face {
  opacity: 0;
  transition: none;
}

#viewport.le.li .face {
  opacity: 1;
  transition: opacity 0.65s var(--ease);
}

.face .wm,
.cl svg,
.wl svg,
.tpw svg,
#uni svg {
  display: block;
  width: 100%;
  height: 100%;
}

.face .wm {
  pointer-events: none;
  transition: filter 0.45s var(--ease);
}
.face.it .wm {
  filter: grayscale(1);
}

@media (hover: none) {
  .face .wm {
    transition: none;
  }
  .face.it .wm {
    filter: none;
  }
  .wall:has(.it)::before {
    animation: none;
  }
}

.cl {
  z-index: 2;
  opacity: 0;
  pointer-events: none;
}

.cl svg,
.wl svg,
#uni svg {
  overflow: visible;
}

#viewport.inspecting .face.it .cl,
.face.it .cl.hiding {
  opacity: 1;
}

.wl {
  z-index: 1;
  pointer-events: none;
}

#viewport.inspecting .face.it .wl {
  visibility: hidden;
}

.wr {
  animation: wash-fade linear forwards;
}

@keyframes wash-fade {
  to {
    opacity: 0;
  }
}

#istage {
  z-index: 5;
  pointer-events: none;
}

#istage .ihit {
  position: absolute;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
}

body.rewarding::after {
  z-index: 80;
}

#proot {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 60;
  width: max-content;
  max-width: 100%;
  pointer-events: none;
}

#ctabs {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.5rem;
  pointer-events: none;
}

.cth {
  flex: 0 0 auto;
}

.ct {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--line) * 2 + 0.4rem);
  border: none;
  font-size: 1rem;
  cursor: default;
  overflow: hidden;
  --sh: inset 0 0 0 var(--line) color-mix(in srgb, var(--tab) 45%, transparent);
  background: var(--tab-dark);
  box-shadow: var(--sh);
  transition: 0.8s var(--ease);
}

.ct.ready {
  box-shadow: var(--sh), 0 0 0 var(--line) var(--tab);
}

.ct.sealing {
  z-index: 121;
  min-width: 0;
  padding: 0;
  border-radius: 0.35rem;
  background: var(--tab);
  box-shadow: 0 0 1.2rem var(--tab);
  animation: tab-seal 0.8s var(--ease) both;
}

.ct.sealing .tps {
  opacity: 0;
  transform: scale(0.15);
}

.ct.sealed {
  width: 0;
  min-width: 0;
  height: 0;
  padding: 0;
  opacity: 0;
  box-shadow: none;
}

@keyframes tab-seal {
  0% { filter: brightness(1); }
  28% { filter: brightness(1.7); }
  100% { filter: brightness(1.15); }
}

.tps {
  position: relative;
  width: 1.85rem;
  height: 1.85rem;
  transition: opacity 0.4s ease, transform 0.7s var(--ease);
}

.tpw {
  position: absolute;
  inset: 0;
}

.tpw:nth-child(1) {
  transform: translateY(-2px) rotate(180deg);
}
.tpw:nth-child(2) {
  transform: translateX(2px) rotate(-90deg);
}
.tpw:nth-child(3) {
  transform: translateY(2px);
}
.tpw:nth-child(4) {
  transform: translateX(-2px) rotate(90deg);
}

.fly {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 120;
  pointer-events: none;
  offset-anchor: center;
  offset-rotate: 0deg;
  offset-distance: 0%;
  --spin: 1turn;
  background: var(--fly);
  clip-path: polygon(50% 8%, 0% 100%, 100% 100%);
  animation: path-fly linear forwards;
}

.flyn {
  --spin: 0deg;
  background: none;
  clip-path: none;
}

.gem {
  position: relative;
  flex-shrink: 0;
  transition: width 0.55s ease, height 0.55s ease;
}

.flyn .gem {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

@keyframes path-fly {
  to { offset-distance: 100%; offset-rotate: var(--spin); }
}

#drk,
#prk {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  align-items: center;
  pointer-events: none;
}

#drk { left: 0.35rem; }
#prk { right: 0.35rem; }

body.won #drk { z-index: 85; }
body.won #prk { display: none; }

#uni {
  position: absolute;
  right: -3vmin;
  bottom: -5vmin;
  width: 25vmin;
  height: 25vmin;
  z-index: 210;
  pointer-events: none;
  overflow: visible;
  filter: brightness(0.65) drop-shadow(0 0 0 #fff);
  transition: filter 0.35s ease;
}
#uni svg {
  transform: scaleX(-1);
  transform-origin: 50% 80%;
}
#uni.go,
body.won #uni {
  filter: brightness(1) drop-shadow(0 0 0 #fff);
}
#uni.go {
  animation: uni-gallop 0.5s ease;
}
body.won #uni {
  animation: uni-gallop 0.74s ease infinite;
}
@keyframes uni-gallop {
  45% {
    transform: rotate(-14deg) translate(-16%, -8%) scale(1.25);
  }
}

.ds,
.ps,
.ppk {
  width: var(--side-orb);
  height: var(--side-orb);
  font-size: var(--orb-font);
  display: grid;
  place-items: center;
  background: var(--orb-base);
  box-shadow: inset 0 0 0 var(--line) var(--orb-ring);
}
.ds {
  position: relative;
  overflow: visible;
  --orb-base: var(--slot-dark);
  --orb-ring: color-mix(in srgb, var(--slot) 50%, transparent);
}
.ds::before {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0;
  background: var(--slot);
  border-radius: 0;
  transition: width 0.8s var(--ease) var(--d, 0s);
  pointer-events: none;
}
body.won .ds::before {
  left: -0.35rem;
  width: 100vw;
}

.ds:not(:has(.cube)) {
  opacity: 0.45;
}

.ds .cube {
  font-size: calc(var(--side-orb) * 0.17);
  z-index: 1;
}

.cube {
  position: relative;
  width: 1px;
  height: 1px;
  perspective: 8000px;
  transform-style: preserve-3d;
  animation: cube-spin 7.7s linear infinite;
}

.cf {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-style: preserve-3d;
  backface-visibility: visible;
  width: 2em;
  height: 2em;
  margin: -1em 0 0 -1em;
  opacity: 0.7;
  transition: background 0.45s ease, opacity 0.45s ease;
}

.cf.pending { opacity: 0.85; }
.cf.lit { opacity: 1; }
.cf.lit.ignite { animation: cube-ignite 0.6s ease; }

@keyframes cube-ignite {
  35% { filter: brightness(1.65); }
}

@keyframes cube-spin {
  to { transform: rotateX(360deg) rotateY(720deg); }
}

#win {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 100;
  width: min(92vw, 80vmin);
  transform: translate(-50%, -50%) rotate(-16deg);
  pointer-events: none;
  text-align: center;
  font-weight: 700;
  font-size: 16vmin;
  color: #fff;
  -webkit-text-stroke: .025em #000;
}

.ps,
.ppk {
  pointer-events: auto;
  position: relative;
  border: none;
  cursor: pointer;
  color: #fff;
  --orb-base: var(--pow-dark);
  --orb-ring: var(--pow);
}

.ps {
  transition: transform 0.4s ease, filter 0.3s ease, opacity 0.3s ease;
}

.ps.locked,
body.rewarding #prk .ps,
.ppk.locked,
.ppk:disabled {
  filter: var(--dim);
  opacity: 0.5;
  cursor: default;
}

.ps.locked,
body.rewarding #prk .ps {
  pointer-events: none;
}

.ps.active,
.ps.cooling:not(.active) {
  transform: translateX(50%);
  cursor: default;
}

.ps.active {
  filter: none;
  opacity: 1;
}

.ps.cooling:not(.active) {
  filter: grayscale(1) brightness(0.7);
  opacity: 0.55;
}

.pg {
  font-size: 0.75em;
  font-weight: 700;
  line-height: 1;
}

.pl {
  position: absolute;
  left: -0.15em;
  bottom: -0.1em;
  min-width: 1.2em;
  padding: 0.1em 0.25em;
  font-size: 0.95em;
  background: #111;
  box-shadow: 0 0 0 var(--line) var(--pow);
}

.pmod {
  z-index: 200;
  display: grid;
  place-items: center;
  pointer-events: auto;
  background: rgba(60, 60, 64, 0.82);
  opacity: 0;
  transition: opacity 0.45s ease;
}

.pmod.show {
  opacity: 1;
}

.pmod.out {
  opacity: 0;
}

.pmc::before,
.pmc::after {
  border-radius: inherit;
  corner-shape: round;
}

.pmc::after {
  position: absolute;
  inset: 0;
  background: #222;
  pointer-events: none;
}

.pmc::before,
.wall:has(.it)::before {
  position: absolute;
  background: var(--bow) 0 / 200%;
  animation: bow 8s linear infinite;
  pointer-events: none;
  z-index: -1;
}

.pmc::before {
  inset: calc(-1 * var(--bow-line));
}

.wall:has(.it)::before {
  --bow-line: 1.5rem;
  width: calc(var(--face) + 2 * var(--bow-line));
  height: calc(var(--face) + 2 * var(--bow-line));
  left: calc(var(--face) / -2 - var(--bow-line));
  top: calc(var(--face) / -2 - var(--bow-line));
  border-radius: var(--radius);
}

@keyframes bow {
  to { background-position: 100%; }
}

.pmod.out .pmc {
  animation: pmc-out 0.5s ease both;
}

@keyframes pmc-in {
  0% {
    transform: scale(0.45);
    filter: brightness(2.2);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes pmc-out {
  to {
    transform: scale(1.35);
    filter: brightness(2);
    opacity: 0;
  }
}

.pmc > * {
  position: relative;
  z-index: 1;
}

.pmc h2 {
  margin: 0 0 0.45em;
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.2;
}

.ph {
  text-align: center;
  font-size: 1.05rem;
  line-height: 1.45;
  white-space: pre-line;
}

.ppks {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
}

.ppk.picked {
  animation: ppk-pop 0.5s ease;
  filter: brightness(1.7);
}

@keyframes ppk-pop {
  35% {
    transform: scale(1.4);
    filter: brightness(2);
  }
}
`);