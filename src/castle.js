import * as THREE from 'three';
import { mat, flat, mesh, makeTree } from './models.js';

// The Neverland castle from ref/castle.png, built from the front view's proportions.
// Front faces +z; the round base lets it turn to face the camera from any angle.
// Pixel values refer to the FRONT panel of ref/castle.png (castle centered at x 377,
// the base's top edge at y 485).
const CX = 377;
const BASE_TOP = 485;
export const CASTLE_RADIUS = 1.55;
const S = (CASTLE_RADIUS * 2) / 585; // units per pixel: the base spans 585 px
const ux = (x) => (x - CX) * S;
const uy = (y) => (BASE_TOP - y) * S;

// Stone, not plastic: a muted violet stone, slate roofs, a warm grey plinth.
const STONE = '#8A6BB0';
const TOWER = '#9273B8';
const ROOF = '#4E3A78';
const TRIM = '#3D2C60';
const PLINTH = '#D8D0C3';
const PLINTH_EDGE = '#B5AB9C';
const LOGO = '#EDE3D0';
const BASE_H = 0.42;
const FRONT = 0.36; // every front face sits on this plane, so the logo strokes lie flat on it
const TOP = BASE_H + uy(85); // roughly the top of the center roof

// faint stone courses, multiplied over the wall color
let stoneTex = null;
function stoneTexture() {
  if (stoneTex) return stoneTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(70, 50, 90, 0.22)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    const y = row * 32;
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(128, y + 1);
    ctx.stroke();
    for (let x = (row % 2) * 24; x < 128; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 32);
      ctx.stroke();
    }
  }
  // a little speckle so large faces don't read as flat plastic
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(60, 40, 80, ${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  stoneTex = new THREE.CanvasTexture(c);
  stoneTex.colorSpace = THREE.SRGBColorSpace;
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
  return stoneTex;
}

// stone material, darker toward the ground (baked into vertex colors) so it sits in the scene
function stone(color, geometry, repeat = [1, 1], y0 = 0) {
  geometry.computeBoundingBox();
  const pos = geometry.attributes.position;
  const cols = [];
  for (let i = 0; i < pos.count; i++) {
    const h = THREE.MathUtils.clamp((pos.getY(i) + y0) / TOP, 0, 1);
    const k = 0.62 + 0.38 * Math.sqrt(h);
    cols.push(k, k, k);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const tex = stoneTexture().clone();
  tex.repeat.set(...repeat);
  tex.needsUpdate = true;
  return new THREE.MeshLambertMaterial({ color, map: tex, vertexColors: true, flatShading: true });
}

function part(geometry, material, x, y, z) {
  return mesh(geometry, material, x, y, z);
}

function tower(g, x0, x1, top, roofTop, roofR, finial, windows) {
  const r = ((x1 - x0) * S) / (2 * Math.cos(Math.PI / 8));
  const x = ux((x0 + x1) / 2);
  const z = FRONT - r * Math.cos(Math.PI / 8);
  const h = uy(top);
  const geo = new THREE.CylinderGeometry(r, r * 1.04, h, 8);
  const body = part(geo, stone(TOWER, geo, [2, h * 2.2], BASE_H + h / 2), x, BASE_H + h / 2, z);
  body.rotation.y = Math.PI / 8;
  g.add(body);
  const roofH = uy(roofTop) - h;
  const roof = part(new THREE.ConeGeometry(roofR * S, roofH, 8), flat(ROOF), x, BASE_H + h + roofH / 2, z);
  roof.rotation.y = Math.PI / 8;
  g.add(roof);
  const collar = part(new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.07, 8), flat(TRIM), x, BASE_H + h, z);
  collar.rotation.y = Math.PI / 8;
  g.add(collar);
  const tip = BASE_H + uy(roofTop);
  if (finial === 'ball') {
    g.add(part(new THREE.CylinderGeometry(0.022, 0.028, 0.14, 6), flat(TRIM), x, tip + 0.05, z));
    g.add(part(new THREE.SphereGeometry(0.075, 12, 10), flat(TOWER), x, tip + 0.17, z));
  } else if (finial === 'flag') {
    g.add(part(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 6), flat('#D8C3B0'), x, tip + 0.17, z));
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.3, -0.02);
    shape.lineTo(0.21, -0.07);
    shape.lineTo(0.3, -0.13);
    shape.lineTo(0, -0.13);
    shape.closePath();
    const f = part(new THREE.ShapeGeometry(shape), mat('#7A4FB8', { side: THREE.DoubleSide }), x - 0.32, tip + 0.36, z);
    g.add(f);
    g.userData.flag = f;
  }
  // lit slit windows high on the tower front
  for (const [wy, ww, wh] of windows) {
    g.add(part(new THREE.BoxGeometry(ww * S, wh * S, 0.02), g.userData.window, x, BASE_H + uy(wy), FRONT + 0.012));
  }
}

function wall(g, x0, x1, top, depth = 0.7) {
  const w = (x1 - x0) * S;
  const h = uy(top);
  const geo = new THREE.BoxGeometry(w, h, depth);
  g.add(part(geo, stone(STONE, geo, [w * 2.4, h * 2.4], BASE_H + h / 2), ux((x0 + x1) / 2), BASE_H + h / 2, FRONT - depth / 2));
}

function crenels(g, x0, x1, top, count, depth = 0.7) {
  const w = ((x1 - x0) * S) / (count * 2 - 1);
  for (let i = 0; i < count; i++) {
    const x = ux(x0) + w * (i * 2 + 0.5);
    for (const z of [FRONT - 0.07, FRONT - depth + 0.07]) g.add(part(new THREE.BoxGeometry(w, 0.09, 0.14), flat(STONE), x, BASE_H + uy(top) + 0.045, z));
  }
}

function neverlandTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const ctx = c.getContext('2d');
  // letters only (transparent around them), so they sit on the stone like a carving
  ctx.font = '700 100px Huninn, "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '6px';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('NEVERLAND', 514, 74);
  ctx.fillStyle = '#5A4288';
  ctx.fillText('NEVERLAND', 512, 70);
  ctx.strokeStyle = '#5A4288';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(470, 130);
  ctx.quadraticCurveTo(512, 152, 548, 124);
  ctx.quadraticCurveTo(570, 110, 590, 128);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeCastle() {
  const g = new THREE.Group();
  // shared glowing bits: warm windows and the softly lit logo
  g.userData.window = new THREE.MeshLambertMaterial({ color: '#3A2A4A', emissive: '#FFB45C', emissiveIntensity: 0.9 });
  const logo = new THREE.MeshLambertMaterial({ color: LOGO, emissive: '#FFE9C4', emissiveIntensity: 0.22 });

  // stone plinth with a darker lip and NEVERLAND carved across the front
  const plinthGeo = new THREE.CylinderGeometry(CASTLE_RADIUS, CASTLE_RADIUS * 1.03, BASE_H, 40);
  g.add(part(plinthGeo, stone(PLINTH, plinthGeo, [10, 1], BASE_H / 2 + 0.6), 0, BASE_H / 2, 0));
  g.add(part(new THREE.CylinderGeometry(CASTLE_RADIUS * 1.035, CASTLE_RADIUS * 1.06, 0.06, 40), flat(PLINTH_EDGE), 0, 0.03, 0));
  g.add(part(new THREE.CylinderGeometry(CASTLE_RADIUS * 0.99, CASTLE_RADIUS, 0.04, 40), flat(PLINTH_EDGE), 0, BASE_H - 0.01, 0));
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(CASTLE_RADIUS + 0.008, CASTLE_RADIUS * 1.03 + 0.008, BASE_H * 0.7, 32, 1, true, -0.42, 0.84),
    new THREE.MeshLambertMaterial({ map: neverlandTexture(), transparent: true, depthWrite: false })
  );
  label.position.y = BASE_H * 0.47;
  g.add(label);

  // towers: left and right with ball finials, center with the flag
  tower(g, 105, 210, 290, 185, 64, 'ball', [[304, 13, 26]]);
  tower(g, 535, 650, 290, 185, 64, 'ball', [[304, 13, 26]]);
  tower(g, 320, 430, 190, 85, 68, 'flag', [[214, 14, 30]]);

  // walls between the towers, with a raised block on the left and battlements on the right
  wall(g, 205, 325, 300);
  wall(g, 262, 325, 245, 0.55);
  wall(g, 425, 540, 300);
  crenels(g, 430, 535, 300, 3);
  // massing behind, as in the side view (never seen head-on)
  for (const [w, h, d, x, z] of [[1.0, 1.1, 0.6, 0.45, -0.65], [0.7, 0.7, 0.45, 0.65, -1.1], [0.9, 0.9, 0.6, -0.5, -0.7]]) {
    const geo = new THREE.BoxGeometry(w, h, d);
    g.add(part(geo, stone(STONE, geo, [w * 2.4, h * 2.4], BASE_H + h / 2), x, BASE_H + h / 2, z));
  }

  // the i-dle strokes on the front, as rectangles [x0, x1, y0, y1] in pixels
  const strokes = [
    [148, 168, 370, 477], // i
    [222, 240, 300, 477], [222, 325, 459, 477], [307, 325, 285, 477], // U
    [365, 385, 250, 477], // l
    [430, 448, 365, 477], [430, 520, 365, 383], [502, 520, 365, 477], // n
    [502, 600, 459, 477], [582, 600, 300, 477], // U
  ];
  for (const [x0, x1, y0, y1] of strokes) {
    const w = (x1 - x0) * S, h = (y1 - y0) * S;
    g.add(part(new THREE.BoxGeometry(w, h, 0.02), logo, ux((x0 + x1) / 2), BASE_H + uy(y1) + h / 2, FRONT + 0.01));
  }
  g.add(part(new THREE.CircleGeometry(12 * S, 20), logo, ux(158), BASE_H + uy(333), FRONT + 0.021));

  g.userData.logo = logo;
  g.userData.tick = (t) => {
    if (g.userData.flag) g.userData.flag.rotation.y = Math.sin(t * 3) * 0.25;
  };
  return g;
}

// soft radial dot for glows and sparks
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

// a beam that fades out toward the sky
function beamTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

// The entrance: a beam of light shoots up, a shockwave rolls over the ground, sparks spiral up
// around the castle and a halo blooms behind it. play() starts it; update() runs it.
export function makeReveal(scene, at) {
  const add = (o) => (scene.add(o), o);
  const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false };

  const beam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.15, 30, 24, 1, true), new THREE.MeshBasicMaterial({ ...additive, map: beamTexture(), color: '#9468F0', side: THREE.DoubleSide, opacity: 0 })));
  beam.position.set(at.x, 15, at.z);

  const ring = add(new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ ...additive, color: '#E6D4FF', side: THREE.DoubleSide, opacity: 0 })));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(at.x, 0.06, at.z);

  const halo = add(new THREE.Sprite(new THREE.SpriteMaterial({ ...additive, map: glowTexture(), color: '#B48CFF', opacity: 0 })));
  halo.position.set(at.x, 1.8, at.z);
  halo.scale.setScalar(7);

  const N = 160;
  const sparkPos = new Float32Array(N * 3);
  const sparks = [];
  for (let i = 0; i < N; i++) sparks.push({ a: Math.random() * Math.PI * 2, r: 1 + Math.random() * 1.4, y: -Math.random() * 3, v: 1.2 + Math.random() * 2 });
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ ...additive, map: glowTexture(), color: '#FFE3A8', size: 0.35, opacity: 0 });
  const points = add(new THREE.Points(sparkGeo, sparkMat));
  points.visible = false;

  let t = -1;
  const DURATION = 6.5;
  return {
    play() {
      t = 0;
      points.visible = true;
    },
    update(dt) {
      if (t < 0) return;
      t += dt;
      const k = t / DURATION;
      // beam: snaps on, holds through the rise, then thins out
      beam.material.opacity = t < 0.3 ? (t / 0.3) * 0.45 : Math.max(0, 0.45 * (1 - (t - 2.8) / 2.5));
      beam.scale.set(1 + Math.sin(t * 12) * 0.03, 1, 1 + Math.sin(t * 12) * 0.03);
      // shockwave: two pulses rolling out from the base
      const pulse = (t % 1.6) / 1.6;
      ring.scale.setScalar(1.5 + pulse * 6);
      ring.material.opacity = t < 3.4 ? 0.8 * (1 - pulse) : 0;
      // halo: blooms, then settles to a faint aura that stays
      halo.material.opacity = t < 3.5 ? Math.min(0.9, t / 1.2 * 0.9) : 0.9 - Math.min(0.62, (t - 3.5) / 2 * 0.62);
      halo.scale.setScalar(6 + Math.sin(t * 2.4) * 0.4);
      // sparks spiral up around the castle while it rises
      sparkMat.opacity = Math.max(0, Math.min(1, t / 0.5) * (1 - Math.max(0, k - 0.65) / 0.35));
      sparks.forEach((s, i) => {
        s.y += s.v * dt;
        s.a += dt * 1.4;
        if (s.y > 5) s.y = 0;
        sparkPos.set([at.x + Math.cos(s.a) * s.r, s.y, at.z + Math.sin(s.a) * s.r], i * 3);
      });
      sparkGeo.attributes.position.needsUpdate = true;
      if (t >= DURATION) {
        t = -1;
        points.visible = false;
        beam.material.opacity = 0;
        ring.material.opacity = 0;
      }
    },
  };
}

// What players see until the wish wall: a grassy hill with a few trees, wide enough to hide
// where the castle will stand.
export function makeHill() {
  const g = new THREE.Group();
  const mound = mesh(new THREE.SphereGeometry(1, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat('#86BE6E'));
  mound.scale.set(CASTLE_RADIUS * 1.05, 0.85, CASTLE_RADIUS * 1.05);
  g.add(mound);
  const top = mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), flat('#94C77A'), 0.2, 0.5, -0.1);
  top.scale.set(0.8, 0.45, 0.7);
  g.add(top);
  for (const [x, z, y, s] of [[-0.6, 0.45, 0.5, 1], [0.5, -0.35, 0.62, 0.9], [0.1, 0.8, 0.36, 0.8], [-0.2, -0.7, 0.5, 0.85]]) {
    const t = makeTree(['#6FAE5B', '#5E9C57', '#7DB86A'][Math.abs(Math.round(x * 10)) % 3], 0.3);
    t.position.set(x, y, z);
    t.scale.setScalar(s);
    g.add(t);
  }
  return g;
}
