import * as THREE from 'three';
import { mat, mesh, geo } from './models.js';

// Every tunable number of the wolf, with the ranges the viewer's tuning panel offers.
// Pixel values refer to the front render ref/3d/3d1.png (1279 × 1230); the other
// renders in ref/3d only guide depth, ear placement and the tail.
export const WOLF_PARAMS = [
  { group: '頭型', key: 'headSize', label: '頭的大小', min: 0.8, max: 1.25, step: 0.01, value: 1 },
  { group: '頭型', key: 'headWidth', label: '頭寬', min: 0.8, max: 1.2, step: 0.01, value: 1 },
  { group: '頭型', key: 'headHeight', label: '頭高', min: 0.85, max: 1.2, step: 0.01, value: 1 },
  { group: '頭型', key: 'cheek', label: '兩頰鼓出', min: -60, max: 60, step: 1, value: 0, unit: 'px' },
  { group: '頭型', key: 'chin', label: '下巴往下', min: -50, max: 50, step: 1, value: 0, unit: 'px' },
  { group: '頭型', key: 'front', label: '臉的厚度', min: 0.25, max: 0.6, step: 0.01, value: 0.48},
  { group: '頭型', key: 'back', label: '後腦厚度', min: 0.2, max: 0.6, step: 0.01, value: 0.52},
  { group: '頭型', key: 'flat', label: '臉部平坦', min: 2, max: 4, step: 0.05, value: 2.3 },

  { group: '耳朵', key: 'earHeight', label: '耳朵高度', min: 0.6, max: 1.5, step: 0.01, value: 1.1},
  { group: '耳朵', key: 'earWidth', label: '耳朵寬度', min: 0.6, max: 1.4, step: 0.01, value: 1.06},
  { group: '耳朵', key: 'earGap', label: '耳朵間距', min: -80, max: 80, step: 1, value: 0, unit: 'px' },
  { group: '耳朵', key: 'earTilt', label: '往外傾斜', min: -20, max: 25, step: 0.5, value: 0, unit: '°' },
  { group: '耳朵', key: 'earBack', label: '往後傾', min: -15, max: 35, step: 0.5, value: 4, unit: '°' },
  { group: '耳朵', key: 'earTurn', label: '朝外轉', min: -20, max: 40, step: 0.5, value: 12, unit: '°' },
  { group: '耳朵', key: 'earZ', label: '前後位置', min: -0.3, max: 0.15, step: 0.005, value: -0.08 },
  { group: '耳朵', key: 'earThick', label: '耳朵厚度', min: 0.02, max: 0.16, step: 0.005, value: 0.06 },
  { group: '耳朵', key: 'earRound', label: '耳尖圓潤', min: 0, max: 1, step: 0.01, value: 0.35 },
  { group: '耳朵', key: 'earInner', label: '內耳白色', min: 0, max: 0.9, step: 0.01, value: 0.68 },

  { group: '五官', key: 'eyeSize', label: '眼睛大小', min: 0.6, max: 1.5, step: 0.01, value: 1 },
  { group: '五官', key: 'eyeGap', label: '眼距', min: -60, max: 60, step: 1, value: 0, unit: 'px' },
  { group: '五官', key: 'eyeY', label: '眼睛往下', min: -60, max: 60, step: 1, value: 0, unit: 'px' },
  { group: '五官', key: 'lashes', label: '睫毛長度', min: 0, max: 1.6, step: 0.01, value: 1 },
  { group: '五官', key: 'noseSize', label: '鼻子大小', min: 0.5, max: 1.8, step: 0.01, value: 1 },
  { group: '五官', key: 'nosePop', label: '鼻子凸出', min: 0, max: 3, step: 0.05, value: 1.5 },
  { group: '五官', key: 'mouthSize', label: '嘴巴大小', min: 0.6, max: 1.6, step: 0.01, value: 1 },
  { group: '五官', key: 'mouthY', label: '嘴巴往下', min: -40, max: 40, step: 1, value: 0, unit: 'px' },
  { group: '五官', key: 'blushSize', label: '腮紅大小', min: 0.5, max: 1.6, step: 0.01, value: 1 },
  { group: '五官', key: 'blushGap', label: '腮紅間距', min: -60, max: 60, step: 1, value: 0, unit: 'px' },
  { group: '五官', key: 'blushY', label: '腮紅往下', min: -50, max: 50, step: 1, value: 0, unit: 'px' },
  { group: '五官', key: 'markSize', label: '額頭紋路', min: 0, max: 1.5, step: 0.01, value: 1 },

  { group: '身體', key: 'headY', label: '頭的位置', min: 0.7, max: 1.1, step: 0.005, value: 0.866 },
  { group: '身體', key: 'bodyWidth', label: '身體粗細', min: 0.7, max: 1.4, step: 0.01, value: 1 },
  { group: '身體', key: 'bodyHeight', label: '身體長度', min: 0.7, max: 1.5, step: 0.01, value: 1 },
  { group: '身體', key: 'bodyDepth', label: '身體前後', min: 0.6, max: 1.2, step: 0.01, value: 0.85 },
  { group: '身體', key: 'heartSize', label: '愛心大小', min: 0, max: 1.6, step: 0.01, value: 1 },
  { group: '身體', key: 'armLength', label: '手臂長度', min: 0.02, max: 0.25, step: 0.005, value: 0.12},
  { group: '身體', key: 'armThick', label: '手臂粗細', min: 0.04, max: 0.1, step: 0.002, value: 0.066 },
  { group: '身體', key: 'armSpread', label: '手臂張開', min: 0.1, max: 1.4, step: 0.01, value: 0.92},
  { group: '身體', key: 'pawSize', label: '手掌大小', min: 0.05, max: 0.13, step: 0.002, value: 0.09},
  { group: '身體', key: 'legLength', label: '腿長', min: 0, max: 0.2, step: 0.005, value: 0.08},
  { group: '身體', key: 'legGap', label: '兩腿間距', min: 0.08, max: 0.22, step: 0.005, value: 0.15 },
  { group: '身體', key: 'footSize', label: '腳掌大小', min: 0.6, max: 1.5, step: 0.01, value: 1.15},
  { group: '身體', key: 'tailLength', label: '尾巴長度', min: 0.5, max: 1.6, step: 0.01, value: 1 },
  { group: '身體', key: 'tailThick', label: '尾巴粗細', min: 0.03, max: 0.08, step: 0.002, value: 0.05 },
  { group: '身體', key: 'tailAngle', label: '尾巴上揚', min: -0.8, max: 0.8, step: 0.01, value: 0 },

  { group: '顏色', key: 'outline', label: '描邊粗細', min: 0, max: 2, step: 0.05, value: 0 },
  { group: '顏色', key: 'fur', label: '毛色', type: 'color', value: '#CDCDD2'},
  { group: '顏色', key: 'pale', label: '白色部位', type: 'color', value: '#F4F4F6' },
  { group: '顏色', key: 'mark', label: '額頭紋路', type: 'color', value: '#A9A9AF'},
  { group: '顏色', key: 'iris', label: '眼睛', type: 'color', value: '#124A86' },
  { group: '顏色', key: 'blush', label: '腮紅', type: 'color', value: '#F7A3C2' },
  { group: '顏色', key: 'nose', label: '鼻子', type: 'color', value: '#F27E9B' },
];

export const WOLF_DEFAULTS = Object.fromEntries(WOLF_PARAMS.map((p) => [p.key, p.value]));

// Front render geometry: head centered at x 641, dome center at y 560, feet on y 1160.
const FACE_CX = 641;
const FACE_CY = 560;
const GROUND_PX = 1160;
const BASE_UNITS_PER_PX = 0.68 / (1112 - FACE_CX);

// How the front render maps onto the default model, for overlay checks in the viewer.
export const WOLF_REF = {
  src: 'ref/3d/3d1.png',
  cx: FACE_CX,
  cy: FACE_CY,
  unitsPerPx: BASE_UNITS_PER_PX,
  headY: (GROUND_PX - FACE_CY) * BASE_UNITS_PER_PX,
};

const INK = '#1E1E22';
const OUTLINE = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Body silhouette (radius, height) for the lathe; slightly pear shaped, top hidden in the head.
const BODY_PROFILE = [
  [0, 0.15], [0.17, 0.16], [0.24, 0.2], [0.26, 0.27], [0.255, 0.36],
  [0.235, 0.45], [0.2, 0.53], [0.14, 0.6], [0, 0.62],
];
const BODY_BASE = 0.15;

// Chibi wolf mascot, about 1.6 units tall with ears, facing +z, feet on y = 0.
export function makeWolf(overrides = {}) {
  const P = { ...WOLF_DEFAULTS, ...overrides };

  // Optional black back-face shell, for a sticker look like the 2D art.
  const outlined = (m, grow, always = false) => {
    const k = always ? 1 : P.outline;
    if (k > 0) {
      const o = new THREE.Mesh(m.geometry, OUTLINE);
      o.scale.setScalar(1 + (grow - 1) * k);
      m.add(o);
    }
    return m;
  };

  const root = new THREE.Group();
  const fur = mat(P.fur);
  const pale = mat(P.pale);
  const mark = mat(P.mark);
  const ink = mat(INK);
  const white = mat('#FFFFFF');
  const iris = mat(P.iris);
  const shine = mat('#4FA3E8');
  const nose = mat(P.nose);
  const blush = mat(P.blush);
  const freckle = mat('#8E2A4E');

  const body = new THREE.Group();
  root.add(body);

  // ---- legs and feet
  const legLift = P.legLength - 0.08;
  for (const s of [-1, 1]) {
    if (P.legLength > 0) {
      body.add(outlined(mesh(new THREE.CapsuleGeometry(0.085, P.legLength, 4, 12), fur, s * P.legGap, 0.1 + P.legLength / 2, 0), 1.12));
    }
    const foot = outlined(mesh(geo('foot', () => new THREE.SphereGeometry(0.1, 16, 10)), pale, s * (P.legGap + 0.005), 0.04, 0.035), 1.12);
    foot.scale.set(1.1 * P.footSize, 0.48 * P.footSize, 1.2 * P.footSize);
    body.add(foot);
  }

  // ---- torso
  const profile = BODY_PROFILE.map(([r, y]) => new THREE.Vector2(r * P.bodyWidth, BODY_BASE + legLift + (y - BODY_BASE) * P.bodyHeight));
  const torso = outlined(mesh(new THREE.LatheGeometry(profile, 48), fur), 1.05);
  torso.scale.z = P.bodyDepth;
  body.add(torso);
  const radiusAt = (y) => {
    for (let i = 1; i < profile.length; i++) {
      const a = profile[i - 1], b = profile[i];
      if (y <= b.y) return THREE.MathUtils.lerp(a.x, b.x, (y - a.y) / (b.y - a.y || 1));
    }
    return 0;
  };
  const torsoY = (y) => BODY_BASE + legLift + (y - BODY_BASE) * P.bodyHeight;

  if (P.heartSize > 0) {
    body.add(heartDecal(pale, P.heartSize, torsoY(0.29), radiusAt, P.bodyDepth));
  }

  // ---- arms: grey stub with a white paw
  const arms = [];
  const shoulderY = torsoY(0.5);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * radiusAt(shoulderY) * 0.82, shoulderY, 0.02);
    pivot.add(outlined(mesh(new THREE.CapsuleGeometry(P.armThick, P.armLength, 4, 12), fur, 0, -(P.armLength / 2 + 0.03), 0), 1.12));
    const paw = outlined(mesh(geo('paw' + P.pawSize, () => new THREE.SphereGeometry(P.pawSize, 16, 12)), pale, 0, -(P.armLength + 0.075), 0.012), 1.1);
    paw.scale.set(1, 0.95, 0.9);
    pivot.add(paw);
    pivot.rotation.z = s * P.armSpread;
    body.add(pivot);
    arms.push(pivot);
  }

  // ---- tail: curls out from the lower back, white tip
  const tail = new THREE.Group();
  tail.position.set(0.1 * P.bodyWidth, torsoY(0.2), -0.15 * P.bodyDepth);
  const path = [[0, 0, 0], [0.12, -0.04, -0.1], [0.26, -0.03, -0.16], [0.37, 0.03, -0.17], [0.42, 0.11, -0.13]]
    .map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(P.tailLength));
  const curve = new THREE.CatmullRomCurve3(path);
  const part = (t0, t1, r, material) => {
    const pts = [];
    for (let i = 0; i <= 12; i++) pts.push(curve.getPoint(t0 + ((t1 - t0) * i) / 12));
    const g = new THREE.Group();
    g.add(outlined(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 12), material), 1.1));
    for (const p of [pts[0], pts[pts.length - 1]]) g.add(mesh(new THREE.SphereGeometry(r, 12, 8), material, p.x, p.y, p.z));
    return g;
  };
  tail.add(part(0, 0.74, P.tailThick, fur));
  tail.add(part(0.7, 1, P.tailThick * 1.15, pale));
  tail.rotation.z = P.tailAngle;
  body.add(tail);

  // ---- head: front outline traced from the render, puffed into a dome
  const head = new THREE.Group();
  head.position.y = P.headY + legLift + (P.bodyHeight - 1) * 0.35;
  body.add(head);
  const face = wolfFace(P);
  const skull = outlined(new THREE.Mesh(face.geometry, fur), 1.03);
  skull.castShadow = true;
  head.add(skull);

  // ---- ears: separate rounded triangles rising from the back of the head
  for (const s of [-1, 1]) head.add(makeEar(P, face, s, fur, pale, outlined));

  // ---- face parts, placed by front-render pixel and projected onto the dome
  const decal = (piece, px, py, lift) => {
    const { p, n } = face.at(px, py);
    piece.position.copy(p).addScaledVector(n, lift);
    piece.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(Z_AXIS, n));
    head.add(piece);
    return piece;
  };
  // flat domed decal; depth is its thickness relative to its size, so pieces layered on
  // top of a disc (eye shines, freckles) need a lift above that thickness
  const disc = (rx, ry, material, depth = 0.3) => {
    const m = new THREE.Mesh(geo('disc', () => new THREE.SphereGeometry(1, 20, 12)), material);
    m.scale.set(rx * face.S, ry * face.S, Math.min(rx, ry) * face.S * depth);
    return m;
  };
  const stroke = (pts, radius, material, lift = 0.004) => {
    const pathPts = pts.map(([x, y]) => {
      const { p, n } = face.at(x, y);
      return p.addScaledVector(n, lift);
    });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pathPts), pts.length * 6, radius, 6), material));
    for (const end of [pathPts[0], pathPts[pathPts.length - 1]]) {
      const cap = new THREE.Mesh(geo('cap' + radius, () => new THREE.SphereGeometry(radius, 8, 6)), material);
      cap.position.copy(end);
      g.add(cap);
    }
    head.add(g);
    return g;
  };
  // scale a set of points about their own center, then shift
  const around = (pts, [cx, cy], k, dx = 0, dy = 0) => pts.map(([x, y]) => [cx + (x - cx) * k + dx, cy + (y - cy) * k + dy]);

  // eyes: center, white shine, blue shine, the curled lash at the outer corner
  const eyes = [
    { s: -1, c: [493, 600], w: [488, 583], b: [494, 632], lash: [[447, 582], [431, 580], [421, 571]] },
    { s: 1, c: [785, 600], w: [774, 584], b: [786, 633], lash: [[838, 582], [853, 579], [862, 570]] },
  ];
  for (const e of eyes) {
    const k = P.eyeSize;
    const dx = e.s * P.eyeGap;
    const [[cx, cy], [wx, wy], [bx, by]] = around([e.c, e.w, e.b], e.c, k, dx, P.eyeY);
    decal(disc(51 * k, 54 * k, iris, 0.1), cx, cy, 0.003);
    decal(disc(21 * k, 21 * k, white), wx, wy, 0.012);
    decal(disc(12 * k, 12 * k, shine), bx, by, 0.012);
    if (P.lashes > 0) {
      const [a, ...rest] = around(e.lash, e.c, k, dx, P.eyeY);
      stroke([a, ...rest.map(([x, y]) => [a[0] + (x - a[0]) * P.lashes, a[1] + (y - a[1]) * P.lashes])], 0.009, iris);
    }
  }

  const bk = P.blushSize;
  decal(disc(70 * bk, 47 * bk, blush, 0.1), 390 - P.blushGap, 712 + P.blushY, 0.003);
  decal(disc(68 * bk, 47 * bk, blush, 0.1), 882 + P.blushGap, 712 + P.blushY, 0.003);
  for (const [x, y] of around([[380, 703], [420, 703]], [390, 712], bk, -P.blushGap, P.blushY)) {
    decal(disc(7 * bk, 11 * bk, freckle), x, y, 0.012);
  }
  decal(disc(32 * P.noseSize, 18 * P.noseSize, nose, P.nosePop), 636, 664, 0);

  const mouthCenter = [636, 718];
  const mouth = around(
    [[565, 707], [579, 723], [597, 729], [614, 720], [625, 707], [637, 722], [656, 730], [678, 724], [696, 716], [708, 712]],
    mouthCenter, P.mouthSize, 0, P.mouthY
  );
  stroke(mouth, 0.0105 * Math.sqrt(P.mouthSize), ink);
  const fang = new THREE.Mesh(geo('fang', () => new THREE.ConeGeometry(0.017, 0.04, 8)), white);
  fang.rotation.x = Math.PI;
  fang.scale.setScalar(P.mouthSize);
  outlined(fang, 1.3, true);
  const [[fx, fy]] = around([[688, 736]], mouthCenter, P.mouthSize, 0, P.mouthY);
  decal(fang, fx, fy, 0.012);

  // pale "ω" fur mark on the forehead
  if (P.markSize > 0) {
    const pts = [[507, 372], [512, 410], [530, 440], [565, 458], [610, 460], [650, 447], [672, 425], [690, 440], [725, 455], [760, 445], [780, 420], [786, 395]];
    stroke(around(pts, [646, 420], P.markSize), 0.019 * Math.sqrt(P.markSize), mark);
  }

  root.userData = { body, head, arms, tail, rest: { arm: P.armSpread, tailX: 0, tailZ: P.tailAngle } };
  return root;
}

// Right ear in front-render pixels: tip, outer base, inner base (bases sit behind the head).
const EAR = { tip: [952, 40], outer: [1040, 440], inner: [680, 215] };

function roundedTriangle(pts, round) {
  const shape = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n], cur = pts[i], next = pts[(i + 1) % n];
    // only the tip (index 0) gets the full rounding; base corners stay soft but small
    const r = i === 0 ? round : 0.25;
    const a = cur.clone().lerp(prev, r * 0.45);
    const b = cur.clone().lerp(next, r * 0.45);
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  }
  shape.closePath();
  return shape;
}

function makeEar(P, face, s, fur, pale, outlined) {
  // ear-local 2D points, relative to the middle of its base
  const toUnit = ([x, y]) => new THREE.Vector2((x - FACE_CX) * face.sx, (FACE_CY - y) * face.sy);
  const tip = toUnit([EAR.tip[0] + P.earGap, EAR.tip[1]]);
  const outer = toUnit([EAR.outer[0] + P.earGap, EAR.outer[1]]);
  const inner = toUnit([EAR.inner[0] + P.earGap, EAR.inner[1]]);
  const base = outer.clone().add(inner).multiplyScalar(0.5);
  const local = [tip, outer, inner].map((v) => {
    const d = v.clone().sub(base);
    return new THREE.Vector2(d.x * P.earWidth, d.y * P.earHeight);
  });

  const g = new THREE.Group();
  g.position.set(s * base.x, base.y, P.earZ * P.headSize);
  g.rotation.order = 'YXZ';
  g.rotation.y = s * THREE.MathUtils.degToRad(P.earTurn);
  g.rotation.x = -THREE.MathUtils.degToRad(P.earBack);
  g.rotation.z = -s * THREE.MathUtils.degToRad(P.earTilt);
  if (s < 0) g.scale.x = -1;

  const bevel = Math.min(0.025, P.earThick * 0.45);
  const shellGeo = new THREE.ExtrudeGeometry(roundedTriangle(local, P.earRound), {
    depth: P.earThick,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  shellGeo.translate(0, 0, -P.earThick / 2);
  const shell = outlined(mesh(shellGeo, fur), 1.03);
  g.add(shell);

  if (P.earInner > 0) {
    // white inner ear: the outline shrunk toward a point a little below its center
    const c = local[0].clone().add(local[1]).add(local[2]).multiplyScalar(1 / 3);
    c.y -= 0.04;
    const innerPts = local.map((v) => c.clone().add(v.clone().sub(c).multiplyScalar(P.earInner)));
    innerPts[0].lerp(local[0], 0.25);
    const innerGeo = new THREE.ShapeGeometry(roundedTriangle(innerPts, Math.min(1, P.earRound + 0.15)), 10);
    const innerMesh = mesh(innerGeo, pale, 0, 0, P.earThick / 2 + bevel + 0.002);
    g.add(innerMesh);
  }
  return g;
}

// Heart patch that hugs the torso: a fine grid clipped to the heart outline, projected onto the lathe.
function heartDecal(material, size, centerY, radiusAt, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.1);
  shape.bezierCurveTo(-0.03, -0.06, -0.12, -0.04, -0.12, 0.03);
  shape.bezierCurveTo(-0.12, 0.09, -0.04, 0.11, 0, 0.05);
  shape.bezierCurveTo(0.04, 0.11, 0.12, 0.09, 0.12, 0.03);
  shape.bezierCurveTo(0.12, -0.04, 0.03, -0.06, 0, -0.1);
  const k = 1.17 * size;
  const outline = shape.getSpacedPoints(120).map((p) => new THREE.Vector2(p.x * k, p.y * k + centerY));

  const inside = (x, y) => {
    let hit = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i], b = outline[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  };
  const nearest = (x, y) => {
    let best = null, bestD = Infinity;
    for (let i = 0; i < outline.length - 1; i++) {
      const a = outline[i], b = outline[i + 1];
      const ab = b.clone().sub(a);
      const t = THREE.MathUtils.clamp(((x - a.x) * ab.x + (y - a.y) * ab.y) / (ab.lengthSq() || 1), 0, 1);
      const q = a.clone().addScaledVector(ab, t);
      const d = q.distanceToSquared(new THREE.Vector2(x, y));
      if (d < bestD) (bestD = d), (best = q);
    }
    return best;
  };

  const step = 0.006;
  const minX = -0.13 * k, maxX = 0.13 * k, minY = centerY - 0.11 * k, maxY = centerY + 0.12 * k;
  const cols = Math.ceil((maxX - minX) / step), rows = Math.ceil((maxY - minY) / step);
  const ids = new Map();
  const positions = [];
  const vertex = (i, j) => {
    const key = i * 10000 + j;
    if (ids.has(key)) return ids.get(key);
    let x = minX + i * step, y = minY + j * step;
    if (!inside(x, y)) ({ x, y } = nearest(x, y));
    const r = radiusAt(y);
    const z = depth * Math.sqrt(Math.max(0, r * r - x * x)) + 0.003;
    positions.push(x, y, z);
    ids.set(key, positions.length / 3 - 1);
    return ids.get(key);
  };
  const index = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const corners = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]];
      if (!corners.some(([a, b]) => inside(minX + a * step, minY + b * step))) continue;
      const [a, b, c, d] = corners.map(([x, y]) => vertex(x, y));
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return mesh(g, material);
}

// Right half of the head outline in front-render pixels, chin center → top center.
const FACE_RIGHT = [
  [641, 848], [800, 838], [950, 808], [1050, 760], [1100, 705], [1112, 660], [1100, 590],
  [1075, 500], [1030, 410], [960, 330], [870, 270], [760, 236], [641, 226],
];
const CHEEK = { 3: 0.4, 4: 0.8, 5: 1, 6: 0.7, 7: 0.3 };
const CHIN = { 0: 1, 1: 1, 2: 0.7, 3: 0.3 };

let faceCache = { key: '', value: null };
function wolfFace(P) {
  const keys = ['headSize', 'headWidth', 'headHeight', 'cheek', 'chin', 'front', 'back', 'flat'];
  const key = keys.map((k) => P[k]).join('|');
  if (faceCache.key === key) return faceCache.value;

  const S = BASE_UNITS_PER_PX * P.headSize;
  const sx = S * P.headWidth;
  const sy = S * P.headHeight;
  const toUnit = (x, y) => [(x - FACE_CX) * sx, (FACE_CY - y) * sy];

  const right = FACE_RIGHT.map((p) => [...p]);
  for (const [i, w] of Object.entries(CHEEK)) right[i][0] += P.cheek * w;
  for (const [i, w] of Object.entries(CHIN)) right[i][1] += P.chin * w;
  const left = right.slice(1, -1).reverse().map(([x, y]) => [2 * FACE_CX - x, y]);
  const outline = new THREE.CatmullRomCurve3(
    [...right, ...left].map(([x, y]) => new THREE.Vector3(...toUnit(x, y), 0)),
    true,
    'centripetal'
  );
  const N = 160;
  const rim = outline.getSpacedPoints(N).slice(0, N);

  // radius of the outline along any direction from the dome center
  const TABLE = 1440;
  const radius = new Float32Array(TABLE);
  for (let i = 0; i < TABLE; i++) {
    const ang = (i / TABLE) * Math.PI * 2;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let best = 0;
    for (let j = 0; j < N; j++) {
      const p = rim[j], q = rim[(j + 1) % N];
      const ex = q.x - p.x, ey = q.y - p.y;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = (p.x * ey - p.y * ex) / den;
      const u = (p.x * dy - p.y * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
    }
    radius[i] = best;
  }
  const radiusAt = (ang) => {
    const f = ((((ang / (Math.PI * 2)) % 1) + 1) % 1) * TABLE;
    const i = Math.floor(f);
    return THREE.MathUtils.lerp(radius[i % TABLE], radius[(i + 1) % TABLE], f - i);
  };

  // plush profile: superellipse from the front center to the rim, then round to the back
  const E = P.flat;
  const front = P.front * P.headSize;
  const back = P.back * P.headSize;
  const RINGS = 22;
  const positions = [];
  const rows = [];
  for (let r = 0; r <= RINGS * 2; r++) {
    const isFront = r <= RINGS;
    const phi = (isFront ? r / RINGS : (RINGS * 2 - r) / RINGS) * (Math.PI / 2);
    const e = isFront ? E : 2.2;
    const s = Math.pow(Math.sin(phi), 2 / e);
    const zf = Math.pow(Math.cos(phi), 2 / e);
    const row = [];
    for (let j = 0; j < N; j++) {
      row.push(positions.length / 3);
      positions.push(rim[j].x * s, rim[j].y * s, (isFront ? front : -back) * zf);
    }
    rows.push(row);
  }
  const index = [];
  for (let r = 0; r < rows.length - 1; r++) {
    for (let j = 0; j < N; j++) {
      const a = rows[r][j], b = rows[r][(j + 1) % N], c = rows[r + 1][j], d = rows[r + 1][(j + 1) % N];
      index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  const surface = (x, y) => {
    const s = Math.min(Math.hypot(x, y) / radiusAt(Math.atan2(y, x)), 1);
    return new THREE.Vector3(x, y, front * Math.pow(Math.max(0, 1 - Math.pow(s, E)), 1 / E));
  };
  const at = (px, py) => {
    const [x, y] = toUnit(px, py);
    const e = 0.003;
    const p = surface(x, y);
    const n = new THREE.Vector3()
      .subVectors(surface(x + e, y), surface(x - e, y))
      .cross(new THREE.Vector3().subVectors(surface(x, y + e), surface(x, y - e)))
      .normalize();
    return { p, n };
  };

  const value = { geometry, at, sx, sy, S: Math.sqrt(sx * sy) };
  faceCache = { key, value };
  return value;
}
