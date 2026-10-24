import * as THREE from 'three';

// Materials and geometries are cached so spawning many items stays cheap.
const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, ...opts });
    mats.set(key, m);
  }
  return m;
}
export const flat = (color) => mat(color, { flatShading: true });

const geos = new Map();
export function geo(key, make) {
  let g = geos.get(key);
  if (!g) {
    g = make();
    geos.set(key, g);
  }
  return g;
}

export function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeBasket() {
  const g = new THREE.Group();
  const wicker = mat('#B9834F', { side: THREE.DoubleSide });
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.3, 14, 1, true), wicker));
  g.add(mesh(new THREE.CircleGeometry(0.26, 14).rotateX(-Math.PI / 2), wicker, 0, -0.15, 0));
  const rim = mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 20), mat('#9A6A3C'), 0, 0.15, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  return g;
}

// Peach body: a sphere drawn out into the classic pointed top, with a seam (cleft) running
// down the front, so it reads as a peach rather than an orange. Colors are baked per vertex.
const PEACH_TIP = new THREE.Vector3(0.12, 1, 0.3).normalize();
function peachGeometry(gold) {
  return geo(gold ? 'peach-gold' : 'peach', () => {
    const R = 0.26;
    const g = new THREE.SphereGeometry(R, 32, 24);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    const seams = [];
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).divideScalar(R);
      const seam = Math.exp(-((v.x / 0.11) ** 2)) * THREE.MathUtils.smoothstep(v.z, -0.35, 0.45);
      const tip = Math.exp(-(((1 - v.dot(PEACH_TIP)) / 0.16) ** 2));
      v.multiplyScalar(1 - seam * 0.13);
      v.x *= 1.05;
      v.addScaledVector(PEACH_TIP, tip * 0.24);
      pos.setXYZ(i, v.x * R, v.y * R, v.z * R);
      seams.push(seam);
    }
    g.computeVertexNormals();
    const [base, blush, crease] = gold ? ['#FFF1B8', '#F6BE3A', '#C98A12'] : ['#FCD3AA', '#F0697A', '#C9405A'];
    const a = new THREE.Color(base), b = new THREE.Color(blush), d = new THREE.Color(crease), rosy = new THREE.Color('#F59A7A');
    const c = new THREE.Color();
    const cols = [];
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp(0.35 + 0.55 * (pos.getY(i) / R) + 0.35 * (pos.getX(i) / R), 0, 1);
      c.copy(a).lerp(b, t);
      if (gold) c.lerp(rosy, 0.25 * THREE.MathUtils.clamp(pos.getX(i) / R, 0, 1));
      c.lerp(d, seams[i] * 0.55);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    return g;
  });
}

// soft round glow for the golden peach
function glowTexture() {
  return geo('glow-tex', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 226, 110, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 206, 70, 0.4)');
    grad.addColorStop(1, 'rgba(255, 196, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

function sparkleGeometry() {
  return geo('sparkle', () => {
    const s = new THREE.Shape();
    const r = 0.09, k = 0.02;
    s.moveTo(0, r);
    s.quadraticCurveTo(k, k, r, 0);
    s.quadraticCurveTo(k, -k, 0, -r);
    s.quadraticCurveTo(-k, -k, -r, 0);
    s.quadraticCurveTo(-k, k, 0, r);
    return new THREE.ShapeGeometry(s, 4);
  });
}

export function makePeach(gold = false) {
  const g = new THREE.Group();
  const material = gold
    ? geo('peach-gold-mat', () => new THREE.MeshPhongMaterial({ vertexColors: true, emissive: '#6A4A08', emissiveIntensity: 0.65, specular: '#FFFFFF', shininess: 70 }))
    : mat('#FFFFFF', { vertexColors: true });
  const body = mesh(peachGeometry(gold), material);
  body.scale.set(1, 0.95, 1);
  g.add(body);
  for (const [x, rz, s] of [[0.1, -0.5, 1], [-0.07, 0.6, 0.75]]) {
    const leaf = mesh(geo('leaf', () => new THREE.SphereGeometry(0.1, 8, 6)), flat('#5FA453'), x, 0.25, -0.1);
    leaf.scale.set(1.6 * s, 0.35, 0.8 * s);
    leaf.rotation.z = rz;
    g.add(leaf);
  }
  g.add(mesh(geo('stem', () => new THREE.CylinderGeometry(0.015, 0.02, 0.08, 5)), mat('#7A5A3E'), 0, 0.26, -0.1));

  if (gold) {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), depthWrite: false, transparent: true }));
    halo.scale.setScalar(1.15);
    halo.renderOrder = -1;
    g.add(halo);
    const sparkMat = geo('spark-mat', () => new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide }));
    const sparks = [0, 1, 2].map((i) => {
      const m = new THREE.Mesh(sparkleGeometry(), sparkMat);
      g.add(m);
      return m;
    });
    g.userData.tick = (t) => {
      halo.material.opacity = 0.75 + Math.sin(t * 6) * 0.25;
      sparks.forEach((m, i) => {
        const a = t * 2.4 + (i * Math.PI * 2) / 3;
        m.position.set(Math.cos(a) * 0.36, 0.1 + Math.sin(a * 1.3) * 0.14, Math.sin(a) * 0.36);
        m.scale.setScalar(0.6 + Math.abs(Math.sin(t * 5 + i * 2)) * 0.7);
        m.lookAt(m.position.clone().multiplyScalar(2));
      });
    };
  }
  return g;
}

export function makeBee() {
  const g = new THREE.Group();
  const body = mesh(geo('beeBody', () => new THREE.SphereGeometry(0.22, 14, 10)), mat('#F4C430'));
  body.scale.set(1.3, 1, 1);
  g.add(body);
  for (const x of [-0.07, 0.09]) {
    const stripe = mesh(geo('beeStripe', () => new THREE.TorusGeometry(0.205, 0.035, 6, 18)), mat('#2A2020'), x, 0, 0);
    stripe.rotation.y = Math.PI / 2;
    g.add(stripe);
  }
  const sting = mesh(geo('beeSting', () => new THREE.ConeGeometry(0.05, 0.12, 6)), mat('#2A2020'), -0.31, 0, 0);
  sting.rotation.z = Math.PI / 2;
  g.add(sting);
  for (const s of [-1, 1]) {
    g.add(mesh(geo('beeEye', () => new THREE.SphereGeometry(0.035, 8, 6)), mat('#2A2020'), 0.22, 0.06, s * 0.1));
  }
  const wingMat = mat('#FFFFFF', { transparent: true, opacity: 0.8 });
  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.18, s * 0.05);
    const w = mesh(geo('beeWing', () => new THREE.SphereGeometry(0.14, 10, 8)), wingMat, 0, 0.02, s * 0.12);
    w.scale.set(0.8, 0.15, 1);
    pivot.add(w);
    g.add(pivot);
    wings.push(pivot);
  }
  g.userData.wings = wings;
  return g;
}

export function makeTree(color = '#6FAE5B', size = 0.38) {
  const g = new THREE.Group();
  g.add(mesh(geo('trunk', () => new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6)), flat('#8B6A4E'), 0, 0.2, 0));
  const top = mesh(geo('crown', () => new THREE.IcosahedronGeometry(1, 0)), flat(color), 0, 0.4 + size * 0.8, 0);
  top.scale.setScalar(size);
  g.add(top);
  return g;
}

export function makePeachTree() {
  const g = new THREE.Group();
  g.add(mesh(geo('ptrunk', () => new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6)), flat('#8B6A4E'), 0, 0.35, 0));
  const crown = mesh(geo('pcrown', () => new THREE.IcosahedronGeometry(0.62, 0)), flat('#6FAE5B'), 0, 1.0, 0);
  g.add(crown);
  const fruit = geo('pfruit', () => new THREE.SphereGeometry(0.08, 8, 6));
  const spots = [[0.45, 0.95, 0.3], [-0.4, 1.1, 0.35], [0.1, 0.75, 0.55], [-0.2, 1.4, 0.3], [0.4, 1.3, -0.2]];
  for (const [x, y, z] of spots) g.add(mesh(fruit, mat('#F59482'), x, y, z));
  return g;
}

export function makeCloud() {
  const g = new THREE.Group();
  const puff = geo('puff', () => new THREE.IcosahedronGeometry(1, 1));
  const white = flat('#FFFFFF');
  for (const [x, y, s] of [[0, 0, 0.7], [0.7, -0.1, 0.5], [-0.7, -0.15, 0.55], [0.25, 0.3, 0.45]]) {
    const p = new THREE.Mesh(puff, white);
    p.position.set(x, y, 0);
    p.scale.setScalar(s);
    g.add(p);
  }
  return g;
}

// A pill-shaped name tag that always draws on top of the scene.
export function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.renderOrder = 10;
  sprite.scale.set(512 / 144, 1, 1);

  function pill(x, y, w, h) {
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
  }

  function draw(got) {
    ctx.clearRect(0, 0, 512, 144);
    ctx.font = '400 58px Huninn, "PingFang TC", "Noto Sans TC", sans-serif';
    const label = got ? text + ' ✓' : text;
    const w = Math.min(500, ctx.measureText(label).width + 70);
    const x = (512 - w) / 2;
    ctx.fillStyle = 'rgba(34, 52, 58, 0.2)';
    pill(x, 22, w, 108);
    ctx.fillStyle = got ? '#E8685C' : '#FFFBF3';
    pill(x, 12, w, 108);
    ctx.fillStyle = got ? '#FFFFFF' : '#22343A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 256, 68);
    tex.needsUpdate = true;
  }

  draw(false);
  return { sprite, draw };
}
