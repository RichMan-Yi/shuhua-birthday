import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mat, flat, mesh, makeTree, makePeachTree, makeCloud, makeLabel } from './models.js';
import { makeWolf } from './wolf.js';
import { START } from './spots.js';
import { createSky, NIGHT } from './daylight.js';
import { makeCastle, makeHill, makeReveal, CASTLE_RADIUS } from './castle.js';
import { createActivities } from './activities.js';

// the Neverland castle stands in the middle of the island (hidden under a hill until the wish wall)
// (-0.5, -0.5) leaves at least 2.1 units to every landmark, so the 1.55-radius plinth never touches one
const CASTLE_AT = new THREE.Vector3(-0.5, 0, -0.5);
const nearCastle = (x, z, pad) => Math.hypot(x - CASTLE_AT.x, z - CASTLE_AT.z) < CASTLE_RADIUS + pad;

const SKY = '#CFE8EE';
const CENTER = new THREE.Vector3(0.5, 0, 1);

// Island outline as [x, z], clockwise from the northwest coast.
const OUTLINE = [
  [-7, -5], [-3, -6.5], [1, -6], [4, -4.5], [5.5, -2], [6, 1], [7.5, 3.5],
  [8.2, 6.5], [6.2, 8.8], [3, 8.3], [0.5, 6.6], [-2.5, 6.2], [-5, 4], [-6.5, 1], [-7.6, -2],
];

function inside(x, z) {
  let hit = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, zi] = OUTLINE[i];
    const [xj, zj] = OUTLINE[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function box(w, h, d, color, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), flat(color), x, y, z);
}

const BUILDERS = {
  daxi() {
    const g = new THREE.Group();
    const walls = ['#EADBC2', '#E2CBAA', '#EBD6BA'];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.78;
      g.add(box(0.72, 0.7, 0.9, walls[i], x, 0.35, 0));
      g.add(box(0.76, 1.0, 0.1, '#C9785B', x, 0.5, 0.48));
      g.add(box(0.5, 0.12, 0.12, '#E9C9A0', x, 0.92, 0.5));
      g.add(box(0.22, 0.38, 0.04, '#5A3B2E', x, 0.19, 0.54));
      g.add(box(0.14, 0.14, 0.04, '#F3E7C9', x - 0.2, 0.62, 0.54));
      g.add(box(0.14, 0.14, 0.04, '#F3E7C9', x + 0.2, 0.62, 0.54));
      const roof = mesh(new THREE.ConeGeometry(0.6, 0.35, 4), flat('#8A5A44'), x, 0.87, -0.05);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
    }
    // a little stack of dried tofu by the door
    g.add(box(0.2, 0.08, 0.2, '#7B5232', 1.35, 0.04, 0.7));
    g.add(box(0.2, 0.08, 0.2, '#8C6040', 1.35, 0.12, 0.7));
    return g;
  },

  lalashan() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(1.9, 2.8, 7), flat('#5E9C57'), 0, 1.4, 0));
    g.add(mesh(new THREE.ConeGeometry(1.2, 1.8, 6), flat('#6DAA5F'), 1.4, 0.9, 0.6));
    g.add(mesh(new THREE.ConeGeometry(0.5, 0.5, 7), flat('#7FB86E'), 0, 2.55, 0));
    for (const [x, z] of [[-1.4, 1.3], [-0.5, 1.9], [0.6, 1.8], [-1.9, 0.4]]) {
      const t = makePeachTree();
      t.position.set(x, 0, z);
      t.scale.setScalar(0.55);
      g.add(t);
    }
    return g;
  },

  shimen() {
    const g = new THREE.Group();
    const lake = mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 9), flat('#4DB6D0'), 0, 0.03, 0);
    lake.scale.z = 0.75;
    g.add(lake);
    const dam = box(0.28, 0.5, 1.6, '#C3C8C5', 1.65, 0.25, 0);
    dam.rotation.y = 0.15;
    g.add(dam);
    g.add(box(0.06, 0.4, 0.4, '#FFFFFF', 1.82, 0.2, 0.05));
    g.add(mesh(new THREE.ConeGeometry(0.9, 1.1, 6), flat('#5E9C57'), -1.2, 0.55, -1.1));
    g.add(mesh(new THREE.ConeGeometry(0.7, 0.8, 6), flat('#6DAA5F'), -0.2, 0.4, -1.4));
    const boat = new THREE.Group();
    boat.add(box(0.5, 0.12, 0.22, '#F6F1E7', 0, 0.06, 0));
    boat.add(box(0.2, 0.14, 0.16, '#E8685C', -0.05, 0.18, 0));
    boat.position.set(-0.3, 0.06, 0.3);
    boat.scale.setScalar(1.8); // big enough for the wolf to row it
    g.add(boat);
    g.userData.boat = boat;
    g.userData.tick = (t) => {
      if (g.userData.rowing) return; // the wolf is steering
      boat.position.x = -0.3 + Math.sin(t * 0.4) * 0.5;
      boat.position.y = 0.06 + Math.sin(t * 2) * 0.015;
      boat.rotation.y = Math.cos(t * 0.4) > 0 ? 0 : Math.PI;
    };
    return g;
  },

  xpark() {
    const g = new THREE.Group();
    g.add(box(1.9, 0.6, 1.2, '#F4F6F7', 0, 0.3, 0));
    g.add(box(1.95, 0.08, 1.25, '#3E8FB0', 0, 0.62, 0));
    g.add(mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat('#7FD0E6'), 0.3, 0.64, 0));
    g.add(box(0.5, 0.36, 0.04, '#2F6E8C', -0.5, 0.2, 0.62));
    const fish = new THREE.Group();
    const fb = mesh(new THREE.SphereGeometry(0.2, 10, 8), flat('#F59A4A'));
    fb.scale.set(1.4, 0.9, 0.6);
    fish.add(fb);
    const tail = mesh(new THREE.ConeGeometry(0.14, 0.2, 4), flat('#F59A4A'), -0.33, 0, 0);
    tail.rotation.z = Math.PI / 2;
    fish.add(tail);
    fish.position.set(-0.5, 1.05, 0);
    g.add(fish);
    g.add(box(0.04, 0.4, 0.04, '#9AA6AA', -0.5, 0.82, 0));
    const penguin = new THREE.Group();
    const pb = mesh(new THREE.CapsuleGeometry(0.1, 0.12, 4, 8), mat('#2A2F36'));
    penguin.add(pb);
    penguin.add(mesh(new THREE.SphereGeometry(0.075, 8, 6), mat('#FFFFFF'), 0, -0.01, 0.06));
    penguin.add(mesh(new THREE.ConeGeometry(0.03, 0.06, 5).rotateX(Math.PI / 2), mat('#F2A33A'), 0, 0.09, 0.1));
    penguin.position.set(0.55, 0.17, 0.85);
    g.add(penguin);
    g.userData.penguin = penguin;
    g.userData.tick = (t) => {
      fish.rotation.y = t * 0.8;
      if (!g.userData.playing) penguin.rotation.z = Math.sin(t * 6) * 0.12;
    };
    return g;
  },

  // A small plaza open toward the map camera (south): the gate and its lanterns at the back,
  // food stalls down the west side, and a balloon-dart booth in the back-right corner turned to
  // face the middle of the plaza, where the wolf throws (see activities.js).
  night() {
    const g = new THREE.Group();
    g.add(box(3.7, 0.03, 2.6, '#B9A78E', 0, 0.015, -0.1));
    // paving seams so it reads as a plaza
    for (const x of [-1.2, -0.4, 0.4, 1.2]) g.add(box(0.015, 0.032, 2.6, '#A39279', x, 0.016, -0.1));

    // the gate at the back, with its red sign and lanterns
    for (const px of [-1.4, 1.4]) g.add(box(0.1, 1.35, 0.1, '#7A5A3E', px, 0.675, -1.25));
    g.add(box(3.0, 0.26, 0.1, '#D9483C', 0, 1.3, -1.25));
    g.add(box(3.1, 0.05, 0.14, '#F2B84B', 0, 1.46, -1.25));
    const lanterns = [];
    for (let i = 0; i < 7; i++) {
      const l = mesh(new THREE.SphereGeometry(0.075, 8, 6), mat('#E8463A', { emissive: '#B0301E', emissiveIntensity: 0.9 }), -1.2 + i * 0.4, 1.05, -1.2);
      l.scale.y = 1.3;
      g.add(l);
      lanterns.push(l);
    }

    // food stalls down the west side, facing the plaza
    const awnings = ['#E8685C', '#F2B84B', '#6DB37C'];
    for (let i = 0; i < 3; i++) {
      const z = -0.75 + i * 0.68;
      g.add(box(0.42, 0.34, 0.56, '#F6F1E7', -1.5, 0.17, z));
      g.add(box(0.04, 0.32, 0.56, awnings[i], -1.28, 0.2, z));
      for (const dz of [-0.26, 0.26]) g.add(box(0.03, 0.72, 0.03, '#7A5A3E', -1.3, 0.36, z + dz));
      const aw = box(0.5, 0.05, 0.62, awnings[i], -1.38, 0.74, z);
      aw.rotation.z = -0.3;
      g.add(aw);
    }

    // string lights over the plaza
    const bulbs = [];
    const bulbColors = ['#FFE08A', '#FFB45C', '#FFF3C4'];
    for (const [ax, az, bx, bz] of [[-1.4, -1.25, -1.3, 0.6], [1.4, -1.25, -1.3, 0.6], [-1.4, -1.25, 1.5, 0.2]]) {
      for (let k = 1; k < 10; k++) {
        const t = k / 10;
        const b = mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: bulbColors[k % 3] }), ax + (bx - ax) * t, 1.25 - Math.sin(t * Math.PI) * 0.32, az + (bz - az) * t);
        b.castShadow = false;
        g.add(b);
        bulbs.push(b);
      }
    }
    g.add(box(0.05, 1.3, 0.05, '#7A5A3E', 1.5, 0.65, 0.2));

    // the balloon-dart booth, turned to face the throwing spot in the middle of the plaza
    const THROW_AT = new THREE.Vector3(0.1, 0, 0.55);
    const booth = new THREE.Group();
    booth.position.set(1.05, 0, -0.55);
    booth.rotation.y = Math.atan2(THROW_AT.x - booth.position.x, THROW_AT.z - booth.position.z);
    booth.scale.setScalar(1.3);
    for (const dx of [-0.45, 0.45]) booth.add(box(0.06, 1.25, 0.06, '#7A5A3E', dx, 0.62, 0));
    booth.add(box(0.9, 0.8, 0.06, '#FFF1D6', 0, 0.8, 0));
    booth.add(box(0.98, 0.1, 0.1, '#D9483C', 0, 1.25, 0.01));
    booth.add(box(0.98, 0.05, 0.14, '#F2B84B', 0, 1.33, 0.01));
    // a low counter with a cup of darts
    booth.add(box(0.8, 0.3, 0.26, '#B07A4A', 0, 0.15, 0.42));
    booth.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), mat('#E8685C'), 0.25, 0.34, 0.42));
    const colors = ['#E8463A', '#F2B84B', '#7FD0E6', '#9ED36A', '#C9A0F0', '#FF9B6A'];
    const balloons = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const b = mesh(new THREE.SphereGeometry(0.085, 12, 10), mat(colors[(r * 3 + c) % colors.length], { emissive: '#3A1A10', emissiveIntensity: 0.3 }), -0.26 + c * 0.26, 0.55 + r * 0.24, 0.08);
        b.scale.set(0.9, 1.1, 0.9);
        booth.add(b);
        balloons.push(b);
      }
    }
    g.add(booth);
    g.userData.board = { booth, balloons, throwAt: THROW_AT };
    g.userData.tick = (t) => {
      lanterns.forEach((l, i) => (l.rotation.z = Math.sin(t * 2 + i) * 0.2));
      bulbs.forEach((b, i) => b.scale.setScalar(1 + Math.sin(t * 3 + i * 1.7) * 0.25));
    };
    return g;
  },
};

function makeAirport() {
  const g = new THREE.Group();
  const runway = box(3.2, 0.03, 0.5, '#5D676B', 0, 0.015, 0);
  g.add(runway);
  for (let i = 0; i < 6; i++) g.add(box(0.25, 0.035, 0.05, '#FFFFFF', -1.25 + i * 0.5, 0.02, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.9, 8), flat('#F2F2EE'), 0.6, 0.45, -0.6));
  g.add(mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.2, 8), flat('#7FD0E6'), 0.6, 0.95, -0.6));
  g.rotation.y = 0.45;
  return g;
}

function makePlane() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(0.11, 0.7, 4, 8).rotateX(Math.PI / 2), flat('#FFFFFF')));
  g.add(box(1.1, 0.03, 0.22, '#F0F0EC', 0, 0, 0.02));
  g.add(box(0.36, 0.03, 0.12, '#F0F0EC', 0, 0.02, -0.4));
  g.add(box(0.03, 0.22, 0.16, '#E8685C', 0, 0.12, -0.42));
  return g;
}

// tour: no picking or name tags; the camera circles slowly and the wolf wanders between landmarks
// (used as the backdrop of the wish wall).
// time: time of day as a stage 0–6 (noon → night, see daylight.js); the game sets it from the
// number of cleared levels, the wish wall uses night.
export function createMap({ canvas, spots, isStamped, onSelect, tour = false, time: startTime = 0 }) {
  const night = startTime >= NIGHT - 0.5; // the night tour looks up at the stars
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 40, 90);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = tour && night ? 1.3 : 1.15;
  controls.minDistance = 7;
  controls.maxDistance = 46;
  controls.rotateSpeed = 0.6;
  controls.target.copy(CENTER);
  controls.autoRotate = tour;
  controls.autoRotateSpeed = 0.45;

  const hemi = new THREE.HemisphereLight('#FFFFFF', '#9CC58A', 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF1DC', 2.0);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  sun.shadow.normalBias = 0.03;
  sun.target.position.copy(CENTER);
  scene.add(sun, sun.target);

  // sea, beach, island
  const sea = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshBasicMaterial({ color: '#56B2C9' }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.55;
  sea.receiveShadow = true;
  scene.add(sea);

  const shape = new THREE.Shape(OUTLINE.map(([x, z]) => new THREE.Vector2(x, -z)));
  const beachGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.5, bevelSegments: 2 });
  beachGeo.rotateX(-Math.PI / 2);
  const beach = new THREE.Mesh(beachGeo, flat('#EBD7A8'));
  beach.position.y = -0.75;
  beach.receiveShadow = true;
  scene.add(beach);

  const landGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
  landGeo.rotateX(-Math.PI / 2);
  const land = new THREE.Mesh(landGeo, [flat('#9BCB78'), flat('#B8946A')]);
  land.position.y = -0.6;
  land.receiveShadow = true;
  scene.add(land);

  const rand = seeded(1060);
  const nearSpot = (x, z, r) => nearCastle(x, z, r * 0.5) || spots.some((s) => Math.hypot(s.pos[0] - x, s.pos[1] - z) < r + s.ring * 0.6);

  // Taoyuan's farm ponds (埤塘), scattered over the northwestern plain
  const ponds = [];
  for (let i = 0; ponds.length < 9 && i < 200; i++) {
    const x = -7 + rand() * 9;
    const z = -6 + rand() * 9;
    if (x + z > 0 || !inside(x * 1.12, z * 1.12) || nearSpot(x, z, 1.4)) continue;
    if (ponds.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.3)) continue;
    const r = 0.3 + rand() * 0.25;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 7), flat('#6EC3D6'));
    p.position.set(x, 0.02, z);
    p.rotation.y = rand() * 3;
    p.receiveShadow = true;
    scene.add(p);
    ponds.push([x, z]);
  }

  // southeastern mountains around Lalashan
  for (const [x, z, r, h, c] of [[3.4, 6.8, 1.1, 1.4, '#5A9452'], [7.0, 3.3, 0.9, 1.2, '#679F5A'], [7.2, 7.0, 1.0, 1.6, '#5A9452'], [3.8, 3.6, 0.8, 0.9, '#74AE63'], [6.0, 1.2, 0.7, 0.8, '#74AE63']]) {
    scene.add(mesh(new THREE.ConeGeometry(r, h, 6), flat(c), x, h / 2, z));
  }

  const greens = ['#6FAE5B', '#5E9C57', '#7DB86A'];
  for (let i = 0, placed = 0; placed < 55 && i < 600; i++) {
    const x = -7.5 + rand() * 16;
    const z = -6.5 + rand() * 15.5;
    const cx = CENTER.x + (x - CENTER.x) * 1.1;
    const cz = CENTER.z + (z - CENTER.z) * 1.1;
    if (!inside(cx, cz) || nearSpot(x, z, 1.0)) continue;
    if (ponds.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.7)) continue;
    if (Math.hypot(x + 5.2, z + 4.0) < 2) continue;
    const t = makeTree(greens[placed % 3], 0.25 + rand() * 0.15);
    t.position.set(x, 0, z);
    t.rotation.y = rand() * 6;
    scene.add(t);
    placed++;
  }

  const airport = makeAirport();
  airport.position.set(-5.2, 0, -4.0);
  scene.add(airport);

  const plane = makePlane();
  plane.visible = !tour; // in the slow tour it would sweep right past the camera
  scene.add(plane);

  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const c = makeCloud();
    const a = (i / 5) * Math.PI * 2;
    c.position.set(CENTER.x + Math.cos(a) * 15, (tour ? 13 : 7) + (i % 2) * 1.5, CENTER.z + Math.sin(a) * 15);
    c.scale.setScalar(0.9 + (i % 3) * 0.3);
    scene.add(c);
    clouds.push(c);
  }
  const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true, transparent: true, depthWrite: false });
  clouds.forEach((c) => c.traverse((o) => o.isMesh && (o.material = cloudMaterial)));

  // sky, stars, moon, and warm lamps at the night market and the old street
  const lampSpots = [['night', '#FFB45C', 26], ['daxi', '#FFC98A', 14]]
    .map(([id, color, power]) => ({ s: spots.find((x) => x.id === id), color, power }))
    .filter((l) => l.s)
    .map(({ s, color, power }) => ({ pos: new THREE.Vector3(s.pos[0], 1.6, s.pos[1] + 0.6), color, power }));
  const sky = createSky(scene, { center: CENTER, lights: { hemi, sun }, sea, cloudMaterial, lampSpots });
  sky.set(startTime);

  // the hill everyone walks past, and the castle that rises out of it at the wish wall
  const hill = makeHill();
  hill.position.copy(CASTLE_AT);
  scene.add(hill);
  const castle = makeCastle();
  castle.position.copy(CASTLE_AT);
  castle.visible = false;
  scene.add(castle);
  // soft light on the castle's front once it is up; always in the scene (at zero) so the
  // light count never changes and nothing has to recompile mid-reveal
  const castleGlow = new THREE.PointLight('#EADCFF', 0, 7, 1.4);
  scene.add(castleGlow);
  const reveal = makeReveal(scene, CASTLE_AT);
  const { window: castleWindows, logo: castleLogo } = castle.userData;
  let rise = null; // { t, seconds } while the castle is coming up

  // landmarks
  const pickables = [];
  const labels = new Map();
  const ticks = [];
  const groups = {};
  for (const s of spots) {
    const g = BUILDERS[s.id]();
    g.position.set(s.pos[0], 0, s.pos[1]);
    g.userData.spotId = s.id;
    if (g.userData.tick) ticks.push(g.userData.tick);
    scene.add(g);
    pickables.push(g);
    groups[s.id] = g;

    const label = makeLabel(s.name);
    label.sprite.position.set(s.pos[0], s.labelY, s.pos[1]);
    label.sprite.userData.spotId = s.id;
    label.draw(isStamped(s.id));
    label.sprite.visible = !tour; // the wish wall shows the island without landmark names
    scene.add(label.sprite);
    pickables.push(label.sprite);
    labels.set(s.id, label);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1, 40),
    new THREE.MeshBasicMaterial({ color: '#E8685C', transparent: true, opacity: 0.8, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  scene.add(ring);

  const shuhua = makeWolf();
  shuhua.scale.setScalar(0.55);
  shuhua.position.set(START[0], 0, START[1]);
  scene.add(shuhua);
  const walk = { from: new THREE.Vector3(), to: null, t: 0, dur: 0 };
  function leg(to, speed) {
    walk.from.copy(shuhua.position);
    walk.to = to;
    walk.t = 0;
    walk.speed = speed;
    walk.dur = Math.max(0.4, walk.from.distanceTo(to) / speed);
  }
  // walk to a point, stepping around the castle hill instead of through it
  // walk somewhere, leaving the current activity first (and stepping back to where it says)
  function walkTo(to, speed, spotId = null) {
    walk.spot = spotId;
    if (activity) {
      const back = activity.exit();
      activity = null;
      if (back) {
        walk.after = { to, speed };
        walk.next = null;
        return leg(back, speed * 0.8);
      }
    }
    walk.after = null;
    route(to, speed);
  }
  function route(to, speed) {
    const from = shuhua.position.clone().setY(0);
    const d = to.clone().sub(from);
    const t = THREE.MathUtils.clamp(CASTLE_AT.clone().sub(from).dot(d) / Math.max(d.lengthSq(), 1e-6), 0, 1);
    const closest = from.clone().addScaledVector(d, t);
    const away = closest.clone().sub(CASTLE_AT).setY(0);
    walk.next = null;
    if (away.length() < CASTLE_RADIUS + 0.35 && t > 0 && t < 1) {
      if (away.lengthSq() < 1e-4) away.set(-d.z, 0, d.x);
      const detour = CASTLE_AT.clone().add(away.setLength(CASTLE_RADIUS + 0.5)).setY(0);
      walk.next = to;
      leg(detour, speed);
    } else leg(to, speed);
  }
  let activity = null;
  const activities = createActivities({ wolf: shuhua, spots, groups });

  // camera framing
  let active = true;
  let selected = null;
  // follow: track the walking wolf; polar: also tilt toward this angle (null keeps the player's tilt)
  const fly = { on: false, target: new THREE.Vector3(), dist: 0, polar: null, follow: false };
  const sph = new THREE.Spherical();
  // screen space taken by the cards above and below, so framed shots land in the open middle
  const view = { w: 1, h: 1, shift: 0, want: 0 };
  controls.addEventListener('start', () => (fly.on = false));

  function viewFor(aspect) {
    // Portrait screens look along the island's long NW–SE axis.
    const portrait = aspect < 1;
    const azimuth = portrait ? 0.6 : 0.15;
    const half = portrait ? 8.4 : 9.5;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = THREE.MathUtils.clamp(half / (tanH * Math.min(aspect, 1.4)), 18, 42);
    const near = tour && !night ? 0.92 : 1;
    // a night tour looks up a little, so the upper part of the screen is starry sky
    const polar = tour && night ? (portrait ? 1.02 : 1.17) : portrait ? 0.72 : tour ? 0.95 : 0.85;
    return { azimuth, dist: dist * near, polar };
  }

  function resetView() {
    const v = viewFor(camera.aspect);
    controls.target.copy(CENTER);
    if (tour && night) controls.target.y = camera.aspect < 1 ? 2.6 : 3.4;
    camera.position.set(
      CENTER.x + v.dist * Math.sin(v.polar) * Math.sin(v.azimuth),
      v.dist * Math.cos(v.polar),
      CENTER.z + v.dist * Math.sin(v.polar) * Math.cos(v.azimuth)
    );
    controls.update();
  }

  function flyTo(point, dist, polar = null, follow = false) {
    fly.target.copy(point);
    fly.dist = dist;
    fly.polar = polar;
    fly.follow = follow;
    fly.on = true;
  }

  // once the wolf arrives: come in low and close on the landmark and the wolf's show
  function frameShow(s) {
    const act = activities[s.id];
    const show = act?.at ?? new THREE.Vector3(s.pos[0], 0, s.pos[1]);
    const portrait = camera.aspect < 1;
    flyTo(new THREE.Vector3((s.pos[0] + show.x) / 2, act?.focusY ?? 0.6, (s.pos[1] + show.z) / 2), portrait ? 10.5 : 8, portrait ? 0.98 : 1.02);
  }

  function select(id) {
    const s = spots.find((x) => x.id === id);
    if (!s) return;
    selected = s;
    ring.visible = true;
    ring.position.set(s.pos[0], 0.05, s.pos[1]);
    ring.scale.setScalar(s.ring);
    // follow the wolf on its way there, then frame the show (frameShow, on arrival)
    flyTo(shuhua.position.clone().setY(0.6), camera.aspect < 1 ? 13 : 10, 0.85, true);
    walkTo(activities[s.id]?.at.clone() ?? new THREE.Vector3(s.stand[0], 0, s.stand[1]), 3.2, s.id);
    onSelect(s);
  }

  function deselect() {
    selected = null;
    ring.visible = false;
    flyTo(CENTER, viewFor(camera.aspect).dist, viewFor(camera.aspect).polar);
    onSelect(null);
  }

  // taps (not drags) pick a landmark
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (active && e.isPrimary) down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!active || !down || !e.isPrimary) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved > 8 || !quick || tour) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, true)[0];
    let o = hit?.object;
    while (o && !o.userData.spotId) o = o.parent;
    if (o) select(o.userData.spotId);
    else if (selected) deselect();
  });

  let time = 0;
  let wander = 3;
  function update(dt) {
    time += dt;
    if (tour && !walk.to && (wander -= dt) <= 0) {
      wander = 8 + Math.random() * 5;
      const others = spots.filter((x) => x.id !== walk.spot);
      const s = others[Math.floor(Math.random() * others.length)];
      walkTo(activities[s.id]?.at.clone() ?? new THREE.Vector3(s.stand[0], 0, s.stand[1]), 2.4, s.id);
    }
    if (fly.on) {
      if (fly.follow) fly.target.copy(shuhua.position).setY(0.6);
      const k = 1 - Math.exp(-dt * (fly.follow ? 3 : 2.2));
      controls.target.lerp(fly.target, k);
      sph.setFromVector3(camera.position.clone().sub(controls.target));
      sph.radius = THREE.MathUtils.lerp(sph.radius, fly.dist, k);
      if (fly.polar !== null) sph.phi = THREE.MathUtils.lerp(sph.phi, fly.polar, k);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
      const settled = controls.target.distanceTo(fly.target) < 0.02 && Math.abs(sph.radius - fly.dist) < 0.05 && (fly.polar === null || Math.abs(sph.phi - fly.polar) < 0.005);
      if (settled && !fly.follow) fly.on = false;
    }
    if (Math.abs(view.want - view.shift) > 0.5) {
      view.shift += (view.want - view.shift) * Math.min(1, dt * 5);
      camera.setViewOffset(view.w, view.h, 0, view.shift, view.w, view.h);
    }
    controls.update();

    ticks.forEach((f) => f(time));

    // the castle always turns its front (and the NEVERLAND lettering) to the viewer
    castle.rotation.y = Math.atan2(camera.position.x - CASTLE_AT.x, camera.position.z - CASTLE_AT.z);
    castleGlow.position.set(CASTLE_AT.x + Math.sin(castle.rotation.y) * 2.6, 2.2, CASTLE_AT.z + Math.cos(castle.rotation.y) * 2.6);
    castle.userData.tick(time);
    if (rise) {
      rise.t = Math.min(1, rise.t + dt / rise.seconds);
      const e = 1 - (1 - rise.t) ** 3;
      hill.position.y = CASTLE_AT.y - e * 1.2;
      hill.scale.y = Math.max(0.01, 1 - e);
      castle.position.y = CASTLE_AT.y - 3.6 * (1 - e);
      castleGlow.intensity = 14 * e;
      // windows and the logo light up as it comes out of the ground
      castleWindows.emissiveIntensity = 0.9 * e;
      castleLogo.emissiveIntensity = 0.22 + 0.9 * (1 - e) * e * 4;
      castle.position.x = CASTLE_AT.x + (rise.t < 1 ? Math.sin(time * 40) * 0.03 * (1 - e) : 0);
      if (rise.t >= 1) {
        hill.visible = false;
        castleLogo.emissiveIntensity = 0.22;
        const done = rise.onUp;
        rise = null;
        done?.();
      }
    }
    reveal.update(dt);

    const a = time * 0.18;
    plane.position.set(CENTER.x + Math.cos(a) * 10, 5 + Math.sin(time * 0.7) * 0.2, CENTER.z + Math.sin(a) * 10);
    plane.lookAt(CENTER.x + Math.cos(a + 0.1) * 10, plane.position.y, CENTER.z + Math.sin(a + 0.1) * 10);
    plane.rotateZ(-0.25);

    clouds.forEach((c, i) => {
      const a = (i / clouds.length) * Math.PI * 2 + time * 0.02;
      // the tour's camera sits farther out, so its clouds ring the island wider and higher
      const r = tour ? 40 : 15;
      c.position.x = CENTER.x + Math.cos(a) * r;
      c.position.z = CENTER.z + Math.sin(a) * r;
    });

    // keep name tags readable when zoomed out
    const ls = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) / 22, 0.75, 1.7);
    for (const [id, l] of labels) {
      l.sprite.scale.set((512 / 144) * ls, ls, 1);
      // the selected landmark's name is on its card, so its tag steps aside for the wolf's show
      const want = selected?.id === id ? 0.15 : 1;
      l.sprite.material.opacity += (want - l.sprite.material.opacity) * Math.min(1, dt * 6);
    }

    ring.material.opacity = 0.55 + Math.sin(time * 4) * 0.25;
    sky.update(dt, time);

    const parts = shuhua.userData;
    parts.tail.rotation.z = parts.rest.tailZ + Math.sin(time * (walk.to || selected ? 10 : 4)) * 0.3;
    if (walk.to) {
      walk.t = Math.min(1, walk.t + dt / walk.dur);
      shuhua.position.lerpVectors(walk.from, walk.to, walk.t);
      shuhua.position.y += Math.abs(Math.sin(walk.t * walk.dur * 9)) * 0.12;
      shuhua.rotation.y = Math.atan2(walk.to.x - walk.from.x, walk.to.z - walk.from.z);
      parts.arms[0].rotation.x = Math.sin(time * 14) * 0.6;
      parts.arms[1].rotation.x = -Math.sin(time * 14) * 0.6;
      if (walk.t >= 1) {
        walk.to = null;
        shuhua.position.y = 0;
        if (walk.next) {
          const next = walk.next;
          walk.next = null;
          leg(next, walk.speed);
        } else if (walk.after) {
          const { to, speed } = walk.after;
          walk.after = null;
          route(to, speed);
        } else {
          parts.arms.forEach((p) => (p.rotation.x = 0));
          // arrived: start this landmark's activity
          if (walk.spot && activities[walk.spot]) {
            activity = activities[walk.spot];
            activity.enter(time);
            if (selected?.id === walk.spot && fly.follow) frameShow(selected);
          }
        }
      }
    } else if (activity) {
      activity.update(dt, time, camera);
    } else {
      // turn to face the camera and sway a little
      const face = Math.atan2(camera.position.x - shuhua.position.x, camera.position.z - shuhua.position.z);
      shuhua.rotation.y += Math.atan2(Math.sin(face - shuhua.rotation.y), Math.cos(face - shuhua.rotation.y)) * Math.min(1, dt * 5);
      parts.head.rotation.z = Math.sin(time * 1.6) * 0.08;
      parts.arms[1].rotation.z = parts.rest.arm + (selected || tour ? Math.max(0, Math.sin(time * 5)) * 1.5 : 0);
    }
  }

  return {
    scene,
    camera,
    update,
    select,
    deselect,
    resize(w, h) {
      camera.aspect = w / h;
      view.w = w;
      view.h = h;
      camera.setViewOffset(w, h, 0, view.shift, w, h);
      if (!selected) resetView();
    },
    // pixels covered by UI at the top and bottom; the view slides so its centre sits between them
    setInsets(top, bottom) {
      view.want = (bottom - top) / 2;
    },
    setActive(on) {
      active = on;
      controls.enabled = on;
    },
    refreshLabels() {
      for (const s of spots) labels.get(s.id).draw(isStamped(s.id));
    },
    // a random spot on dry land, away from the shore
    landPoint() {
      for (;;) {
        const x = -7 + Math.random() * 15;
        const z = -6 + Math.random() * 14.5;
        if (nearCastle(x, z, 0.3)) continue;
        if (inside(CENTER.x + (x - CENTER.x) * 1.15, CENTER.z + (z - CENTER.z) * 1.15)) return new THREE.Vector3(x, 0.15, z);
      }
    },
    // a point floating above a landmark's name tag
    above(id, lift = 1.2) {
      const s = spots.find((x) => x.id === id);
      return new THREE.Vector3(s.pos[0], s.labelY + lift, s.pos[1]);
    },
    get wolf() {
      return shuhua.position;
    },
    // hill sinks, castle rises (0 seconds: just show it)
    revealCastle(seconds = 3.5, onUp) {
      castle.visible = true;
      if (seconds) {
        rise = { t: 0, seconds, onUp };
        castleWindows.emissiveIntensity = 0;
        reveal.play();
      } else {
        hill.visible = false;
        castleGlow.intensity = 14;
        onUp?.();
      }
    },
    castleAt: CASTLE_AT,
    castle,
    // true once the castle has fully risen
    get castleUp() {
      return castle.visible && !rise;
    },
    // move the sky to a time-of-day stage, easing over `seconds` (0 jumps)
    setTime(t, seconds = 3.5) {
      seconds ? sky.to(t, seconds) : sky.set(t);
    },
  };
}
