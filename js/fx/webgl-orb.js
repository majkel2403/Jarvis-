/* =========================================================
   JARVIS OS — renderer kuli: WebGL2 bez three.js

   Port `zrodla/effects/renderers/webgl/orb-scene.ts` z biblioteki
   `jarvis-efekty`. Trzy.js był tam wyłącznie nakładką: shadery GLSL są
   identyczne, geometria to zwykłe Float32Array, a rysowanie to jeden
   `drawArrays(POINTS)`. Wszystko, co robił three, mieści się w jednym
   shaderze (obrót + projekcja perspektywiczna) i w kilku wywołaniach GL.

   Powód pominięcia three.js: `docs/TS-MIGRATION.md` ustala zero zależności
   w runtime. Wprowadzenie jednej biblioteki 600 kB po to, żeby narysować
   punkty, łamałoby tę zasadę.

   Kontrakt zgodny z biblioteką (targets.ts → WebGLOrbTarget):
     setEnergy(level) · burst(color?) · inhale()
   Efekty sięgają renderera przez klucz targets „webgl-orb”.
   ========================================================= */
'use strict';
(() => {

const VERT = `#version 300 es
precision highp float;
in vec3 position;
in float aSeed;
uniform float uTime, uEnergy, uBurst, uInhale, uSize, uPixelRatio;
uniform float uAspect, uFocal, uNear, uFar, uCamZ;
uniform float uRotX, uRotY, uRotZ;
out float vSeed;
out float vFade;

void main() {
  vSeed = aSeed;
  float wobble = sin(uTime * (1.2 + aSeed) + aSeed * 6.2831) * 0.035 * (1.0 + uEnergy * 1.5);
  float push = uBurst * (0.35 + aSeed * 0.9);
  float wave = sin(position.y * 7.0 - uTime * 5.0 + aSeed) * 0.03 * uEnergy;
  float pull = uInhale * (0.35 + aSeed * 0.25);
  vec3 p = position * (1.0 + wobble + push + wave - pull);

  // three.js: points.rotation = Euler(x, y, z) w kolejności XYZ
  float cx = cos(uRotX), sx = sin(uRotX);
  float cy = cos(uRotY), sy = sin(uRotY);
  float cz = cos(uRotZ), sz = sin(uRotZ);
  p = vec3(cx * p.x - sx * p.z, p.y, sx * p.x + cx * p.z);
  p = vec3(p.x, cy * p.y - sy * p.z, sy * p.y + cy * p.z);
  p = vec3(cz * p.x - sz * p.y, sz * p.x + cz * p.y, p.z);

  // kamera stoi w (0, 0, uCamZ) i patrzy w -Z
  float vz = p.z - uCamZ;

  // projekcja perspektywiczna, ręcznie (three.js ProjectionMatrix)
  gl_Position = vec4(
    (uFocal / uAspect) * p.x,
    uFocal * p.y,
    ((uFar + uNear) / (uNear - uFar)) * vz + (2.0 * uFar * uNear) / (uNear - uFar),
    -vz
  );
  gl_PointSize = uSize * uPixelRatio * (0.55 + aSeed) * (1.0 + uEnergy * 0.25 + uBurst) / max(0.001, -vz);
  vFade = (1.0 - uBurst * 0.5) * (1.0 + uInhale * 0.8);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec3 uColorA, uColorB, uBurstColor;
uniform float uEnergy, uBurst;
in float vSeed;
in float vFade;
out vec4 outColor;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.0, d);
  vec3 base = mix(uColorA, uColorB, clamp(vSeed * 0.5 + uEnergy * 0.25, 0.0, 1.0));
  vec3 color = mix(base, uBurstColor, uBurst * 0.8);
  outColor = vec4(color, alpha * (0.5 + uEnergy * 0.15) * vFade);
}`;

const NEAR = 0.1, FAR = 20, CAM_Z = 4.2, FOV = 40;

/* Kolory z tokenów CSS aplikacji (index.html / jarvis.css:7-20). */
function cssColor(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return hexToRgb(v || fallback);
}
function hexToRgb(hex) {
  if (J.fxPal?.hexToRgb) return J.fxPal.hexToRgb(hex);
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Kompilacja shadera WebGL2: ' + log);
  }
  return sh;
}

/* ---------- geometria (identyczna z biblioteką) ---------- */
function buildGeometry(count) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const shell = i % 5 === 0;
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const phi = i * 2.399963;
    const radius = shell ? 1.28 + Math.random() * 0.12 : 0.92 + Math.random() * 0.22;
    positions[i * 3] = Math.cos(phi) * r * radius;
    positions[i * 3 + 1] = (shell ? y * 0.22 : y) * radius;
    positions[i * 3 + 2] = Math.sin(phi) * r * radius;
    seeds[i] = Math.random();
  }
  return { positions, seeds, count };
}

function buildRing(count) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = 1.42 + (Math.random() - 0.5) * 0.08;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
    positions[i * 3 + 2] = Math.sin(a) * r;
    seeds[i] = 0.2 + Math.random() * 0.5;
  }
  return { positions, seeds, count };
}

/* ---------- renderer ---------- */
class OrbScene {
  constructor(canvas, particleCount) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('Brak WebGL2');
    this.gl = gl;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.time = 0; this.energy = 0; this.energyTarget = 0;
    this.burstLevel = 0; this.inhaleLevel = 0; this.inhaleUntil = -1;
    this.lost = false;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('Link programu WebGL2: ' + gl.getProgramInfoLog(prog));
    this.prog = prog;
    gl.useProgram(prog);

    this.u = {};
    for (const n of ['uTime', 'uEnergy', 'uBurst', 'uInhale', 'uSize', 'uPixelRatio', 'uAspect', 'uFocal', 'uNear', 'uFar', 'uCamZ', 'uRotX', 'uRotY', 'uRotZ', 'uColorA', 'uColorB', 'uBurstColor']) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }

    /* trzy.js: AdditiveBlending + depthWrite:false + transparent */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    this.cloud = this._upload(buildGeometry(particleCount));
    this.ring = this._upload(buildRing(Math.max(120, Math.round(particleCount * 0.35))));

    gl.uniform1f(this.u.uSize, 26);
    gl.uniform1f(this.u.uPixelRatio, this.pixelRatio);
    gl.uniform1f(this.u.uFocal, 1 / Math.tan((FOV * Math.PI / 180) / 2));
    gl.uniform1f(this.u.uNear, NEAR);
    gl.uniform1f(this.u.uFar, FAR);
    gl.uniform1f(this.u.uCamZ, CAM_Z);
    gl.uniform3fv(this.u.uColorA, cssColor('--accent', '#33d6ff'));
    gl.uniform3fv(this.u.uColorB, cssColor('--accent2', '#a25cff'));
    gl.uniform3fv(this.u.uBurstColor, cssColor('--ok', '#3ef0a3'));

    /* Utrata kontekstu: wracamy do canvasu zamiast zostawić czarną plamę. */
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; J.fxOrb?.onContextLost?.(); });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; });
  }

  _upload(geo) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(this.prog, 'position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    const seed = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seed);
    gl.bufferData(gl.ARRAY_BUFFER, geo.seeds, gl.STATIC_DRAW);
    const aSeed = gl.getAttribLocation(this.prog, 'aSeed');
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return { vao, count: geo.count, pos, seed };
  }

  resize(width, height) {
    if (!width || !height || this.lost) return;
    const gl = this.gl;
    const w = Math.round(width * this.pixelRatio), h = Math.round(height * this.pixelRatio);
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w; this.canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  setEnergy(level) { this.energyTarget = Math.max(0, Math.min(1, level)); }
  burst(color) {
    if (color) { try { this.gl.uniform3fv(this.u.uBurstColor, hexToRgb(color)); } catch { /* zły format koloru — zostaje poprzedni */ } }
    this.burstLevel = 1;
    this.inhaleUntil = -1;
  }
  inhale() { this.inhaleUntil = this.time + 0.65; }

  render(deltaMs) {
    if (this.lost) return;
    const gl = this.gl;
    const dt = Math.min(0.1, (deltaMs ?? 16.667) / 1000);
    this.time += dt;
    this.energy += (this.energyTarget - this.energy) * Math.min(1, dt * 2.5);
    this.burstLevel = Math.max(0, this.burstLevel - dt * 1.4);
    const inhaling = this.time < this.inhaleUntil;
    this.inhaleLevel += ((inhaling ? 1 : 0) - this.inhaleLevel) * Math.min(1, dt * (inhaling ? 7 : 3));

    const aspect = (this.canvas.width || 1) / (this.canvas.height || 1);
    gl.useProgram(this.prog);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.u.uTime, this.time);
    gl.uniform1f(this.u.uEnergy, this.energy);
    gl.uniform1f(this.u.uBurst, this.burstLevel * this.burstLevel);
    gl.uniform1f(this.u.uInhale, this.inhaleLevel);
    gl.uniform1f(this.u.uAspect, aspect);

    const rot = [
      { g: this.cloud, x: Math.sin(this.time * 0.2) * 0.12, y: this.cloudRotY ?? 0, z: -0.28 },
      { g: this.ring, x: 1.22, y: 0.3, z: this.ringRotZ ?? 0 },
    ];
    this.cloudRotY = (this.cloudRotY || 0) + dt * (0.12 + this.energy * 0.55);
    this.ringRotZ = (this.ringRotZ || 0) + dt * (0.25 + this.energy * 1.4);

    for (const r of rot) {
      gl.uniform1f(this.u.uRotX, r.x);
      gl.uniform1f(this.u.uRotY, r.y);
      gl.uniform1f(this.u.uRotZ, r.z);
      gl.bindVertexArray(r.g.vao);
      gl.drawArrays(gl.POINTS, 0, r.g.count);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    for (const g of [this.cloud, this.ring]) { gl.deleteVertexArray(g.vao); gl.deleteBuffer(g.pos); gl.deleteBuffer(g.seed); }
    gl.deleteProgram(this.prog);
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
  }
}

J.fxOrbScene = OrbScene;
J.fxOrbSupports = () => J.fxQuality?.supportsWebGL2?.() ?? false;

/* =========================================================
   Przełącznik renderera: stary canvas ⇄ nowy WebGL2

   Stary renderer (orbDraw w js/main.js) zostaje bez zmian i jest domyślny.
   WebGL to opcjonalna nakładka z cząsteczkami stojąca ZA kulą SVG — dlatego
   żadna z dwóch ścieżek nie musi wiedzieć o drugiej.
   ========================================================= */
(() => {
let scene = null;
let canvas = null;
let mode = 'canvas';
let lastTs = 0;
let untarget = null;

const host = () => J.fxTargets?.get('orb') || document.getElementById('coreWrap');

/** WebGL tylko wtedy, gdy przeglądarka go ma i jakość jest co najmniej „high”. */
function allowed(m) {
  if (m !== 'webgl') return true;
  if (!J.fxOrbSupports()) { J.log('Efekty', 'Ta przeglądarka nie ma WebGL2 — zostaje renderer canvas.', 'warn'); return false; }
  if (J.fx?.rank?.() != null && J.fx.rank() < 2) { J.log('Efekty', 'Poziom efektów jest zbyt niski dla kuli WebGL2 — zostaje renderer canvas.', 'warn'); return false; }
  return true;
}

function build() {
  const h = host();
  if (!h) return false;
  // canvas rodzeństwem #orbCanvas wewnątrz .core-wrap — ten sam kontekst pozycjonowania
  const anchor = h.querySelector?.('#orbCanvas') || h.firstElementChild;
  canvas = document.createElement('canvas');
  canvas.id = 'orbCanvasGL';
  canvas.className = 'orb-canvas-gl';
  canvas.setAttribute('aria-hidden', 'true');
  (anchor?.parentElement || h).appendChild(canvas);
  const r = (anchor || h).getBoundingClientRect();
  const size = Math.max(64, Math.min(r.width || 320, r.height || 320));
  try { scene = new OrbScene(canvas, 1400); } catch (e) { J.log('Efekty', 'Kula WebGL2 nie wystartowała: ' + e.message, 'warn'); return false; }
  scene.resize(size, size);
  canvas.style.display = 'block';
  untarget = J.fxTargets?.set('webgl-orb', scene) || null;
  return true;
}

function teardown() {
  untarget?.(); untarget = null;
  try { scene?.dispose(); } catch { /* kontekst już utracony */ }
  scene = null;
  canvas?.remove();
  canvas = null;
  lastTs = 0;
}

/** Aplikacja J.fxOrb — zgodny z kontraktem WebGLOrbTarget z targets.ts. */
J.fxOrb = {
  /** Przełącza renderer. Zwraca faktycznie ustawiony tryb (może spaść na canvas). */
  apply(next) {
    const want = next === 'webgl' ? 'webgl' : 'canvas';
    if (want === mode) return mode;
    if (!allowed(want)) return mode;
    if (want === 'webgl') { if (!build()) return mode; }
    else teardown();
    mode = want;
    if (host()) host().dataset?.set?.('orbRenderer', mode);
    J.emit('settings');
    return mode;
  },
  current: () => mode,
  available() { return J.fxOrbSupports(); },
  setEnergy(level) { scene?.setEnergy(level); },
  burst(color) { scene?.burst(color); },
  inhale() { scene?.inhale(); },
  render(ts) { if (mode !== 'webgl' || !scene) return; const dt = lastTs ? ts - lastTs : 16.667; lastTs = ts; scene.render(dt); },
  dispose: teardown,
  /** Kontekst WebGL utracony (przełączenie GPU, sen laptopa) — wracamy na canvas. */
  onContextLost() { if (mode === 'webgl') { teardown(); mode = 'canvas'; J.log('Efekty', 'Utracono kontekst WebGL2 kuli — wracam na renderer canvas.', 'warn'); J.emit('settings'); } },
  /** Poziom energii z trybu pracy — odpowiednik stałej ENERGY z webgl-orb-layer.tsx. */
  syncFromEngine() {
    if (mode !== 'webgl' || !scene) return;
    const ENERGY = { IDLE: 0, LISTENING: 0.25, THINKING: 0.6, EXECUTING: 1, APPROVAL_REQUIRED: 0.75, PAUSED: 0.3, RECOVERING: 0.5, COMPLETED: 0.35, ERROR: 0.2 };
    scene.setEnergy(ENERGY[J.engine?.mode] ?? 0);
  },
};

})();

})();   // koniec zewnętrznej IIFE modułu
