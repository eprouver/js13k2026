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
  --D: 40vmin;
  --F: calc(2 * var(--D) - 10vmin);
  --R: 100%;
  --Pr: 2rem;
  --P: 40vmin;
  --S: calc(2 * var(--D));
  --bg: #121621;
  --W1: #2c313d;
  --W2: #4f576d;
  --fg: #f8e8ff;
  --bow: repeating-linear-gradient(90deg,var(--c0),var(--c1),var(--c2),var(--c3),var(--c4),var(--c5),var(--c0) 50%);
  --E: cubic-bezier(0.4, 0.05, 0.2, 1);
  --O: max(7.25vmin, 3rem);
  --Of: calc(var(--O) * 0.36);
  --dim: grayscale(1) brightness(0.55);
  --line: 0.2rem;
  --Bl: 0.6rem;
  --Ts: drop-shadow(0 .2em .45em rgba(0,0,0,.55));
  font-size: 120%;
}

@supports not (corner-shape: squircle) {
  :root {
    --R: 32%;
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
  border-radius: var(--Pr);
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
  border-radius: var(--R);
}

#cam,
.cl,
.wl {
  position: absolute;
  inset: 0;
}

#vp,
#is {
  position: absolute;
  inset: 0;
}

body.rw::after,
.pmod {
  position: fixed;
  inset: 0;
}

.face {
  width: var(--F);
  height: var(--F);
  left: calc(var(--F) / -2);
  top: calc(var(--F) / -2);
  position: absolute;
  overflow: hidden;
  background: linear-gradient(var(--W1), var(--W2));
  backface-visibility: hidden;
}

@media (hover: fine) {
  .face {
    backface-visibility: visible;
  }
  #vp,
  #is {
    width: min(100vw, 48rem);
    height: min(100dvh, 48rem);
    inset: auto;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
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

#vp {
  container-type: size;
  --D: 40cqmin;
  --F: calc(2 * var(--D) - 10cqmin);
  --P: 40cqmin;
  --S: calc(2 * var(--D));
  perspective: var(--P);
  overflow: hidden;
  background: var(--bg);
  pointer-events: auto;
  cursor: pointer;
  touch-action: none;
  outline: none;
}

#vp.ins {
  cursor: default;
}

#cam {
  transform-style: preserve-3d;
  transform: translateZ(0);
  transition: transform 495ms var(--E);
}

#cam.na,
#w.na {
  transition: none;
}

#vp.ins #cam {
  transform: translateZ(16cqmin);
}

#pv,
#w,
.room,
.wall {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}

#pv {
  left: 50%;
  top: 50%;
  transform-origin: 0 0;
}

#w {
  transition: transform 700ms var(--E);
}

.wall {
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))
    translateZ(calc(-1 * var(--D) + 1px));
}
.wall.fn { --ry: 0deg; }
.wall.fs { --ry: 180deg; }
.wall.fe { --ry: -90deg; }
.wall.fw { --ry: 90deg; }
.wall.fu { --rx: 90deg; }
.wall.fd { --rx: -90deg; }

body.rw::after,
.ds::before,
.pmc::before,
.pmc::after,
.wall:has(.it)::before {
  content: "";
}

#vp.lx .face {
  opacity: 0;
  transition: opacity 0.55s var(--E);
}

#vp.le .face {
  opacity: 0;
  transition: none;
}

#vp.le.li .face {
  opacity: 1;
  transition: opacity .78s var(--E);
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
  transition: filter 0.45s var(--E);
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

#vp.ins .face.it .cl,
.face.it .cl.hd {
  opacity: 1;
}

.cl.rv,
.cl.rd,
.cl.hd {
  filter: var(--Ts);
}

.wl {
  z-index: 1;
  pointer-events: none;
}

#vp.ins .face.it .wl {
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

#is {
  z-index: 5;
  pointer-events: none;
}

#is .ihit {
  position: absolute;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
}

body.rw::after {
  z-index: 80;
}

#pr {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 60;
  width: max-content;
  max-width: 100%;
  pointer-events: none;
}

#tb {
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
  background: var(--tabd);
  box-shadow: var(--sh);
  transition: 0.8s var(--E);
}

.ct.ry {
  box-shadow: var(--sh), 0 0 0 var(--line) var(--tab);
}

.ct.sl {
  z-index: 121;
  min-width: 0;
  padding: 0;
  border-radius: 0.35rem;
  background: var(--tab);
  box-shadow: 0 0 1.2rem var(--tab);
  animation: tab-seal 0.8s var(--E) both;
}

.ct.sl .tps {
  opacity: 0;
  transform: scale(0.15);
}

.ct.sd {
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
  transition: opacity 0.4s ease, transform 0.7s var(--E);
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
  --u: 25vmin;
  position: absolute;
  right: calc(-3vmin - var(--u) / 16);
  bottom: -5vmin;
  width: var(--u);
  height: var(--u);
  z-index: 210;
  pointer-events: none;
  overflow: visible;
  filter: brightness(0.65);
  transition: 0.5s var(--E);
}
#uni svg {
  transform: scaleX(-1);
  transform-origin: 50% 80%;
}
#uni.go,
#uni.act,
body.hi #uni,
body.won #uni {
  filter: brightness(1);
}
#uni.act {
  --u: 28vmin;
  animation: none;
  transform: rotate(-12deg) translate(-14%, -7%) scale(1.18);
}
#uni.go {
  animation: uni-gallop 0.5s ease;
}
body.hi #uni,
body.won #uni {
  --u: 42vmin;
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
  width: var(--O);
  height: var(--O);
  font-size: var(--Of);
  display: grid;
  place-items: center;
  background: var(--Ob);
  box-shadow: inset 0 0 0 var(--line) var(--Or);
}
.ds {
  position: relative;
  overflow: visible;
  --Ob: var(--slotd);
  --Or: color-mix(in srgb, var(--slot) 50%, transparent);
}
.ds::before {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0;
  background: var(--slot);
  border-radius: 0;
  transition: width 0.8s var(--E) var(--d, 0s);
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
  font-size: calc(var(--O) * 0.2);
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
  width: calc(2em - 4px);
  height: calc(2em - 4px);
  margin: calc(2px - 1em) 0 0 calc(2px - 1em);
  opacity: 0.7;
  transition: background 0.45s ease, opacity 0.45s ease;
}

.cf.pd { opacity: 0.85; }
.cf.lit { opacity: 1; }
.cf.lit.ig { animation: cube-ig 0.6s ease; }

@keyframes cube-ig {
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
  white-space: nowrap;
  transform: translate(-50%, -50%) rotate(-16deg);
  pointer-events: none;
  text-align: center;
  font-weight: 700;
  font-size: 19vmin;
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
  --Ob: var(--powd);
  --Or: var(--pow);
}

.ps {
  transition: transform 0.4s ease, filter 0.3s ease, opacity 0.3s ease;
}

.ps.lk,
body.rw #prk .ps,
.ppk.lk,
.ppk:disabled {
  filter: var(--dim);
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

.ps.on,
.ps.co:not(.on) {
  transform: translateX(50%);
  cursor: default;
}

.ps.on {
  filter: none;
  opacity: 1;
}

.ps.co:not(.on) {
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
  inset: calc(-1 * var(--Bl));
}

.wall:has(.it)::before {
  --Bl: 1.5rem;
  width: calc(var(--F) + 2 * var(--Bl));
  height: calc(var(--F) + 2 * var(--Bl));
  left: calc(var(--F) / -2 - var(--Bl));
  top: calc(var(--F) / -2 - var(--Bl));
  border-radius: var(--R);
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

.ppk.pk {
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