import * as THREE from 'three';
import { mat, flat, mesh } from '../models.js';
import { makeWolf } from '../wolf.js';
import { sfx } from '../audio.js';
import { clamp, tapper, hitSphere, idle } from './common.js';
import { tally } from './shell.js';

const DURATION = 40;

// thin fins: a forked tail fanning out behind the body (narrow where it joins), and a dorsal fin
function fin(points, color, depth = 0.04) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, mat(color));
}
const tailFin = (color, x) => {
  const t = fin([[0.04, 0.05], [-0.26, 0.22], [-0.17, 0], [-0.26, -0.22], [0.04, -0.05]], color);
  t.position.x = x;
  return t;
};
const dorsalFin = (color, x, y) => {
  const d = fin([[-0.16, 0], [0.12, 0], [-0.1, 0.13]], color, 0.03);
  d.position.set(x, y - 0.03, 0);
  return d;
};

// Each creature faces +x; the tank flips it when it turns around.
const KINDS = {
  clown: {
    name: '小丑魚',
    swatch: 'linear-gradient(90deg, #F37A2A 0 30%, #FFFFFF 30% 42%, #F37A2A 42% 70%, #FFFFFF 70% 82%, #F37A2A 82%)',
    speed: 1.1,
    make() {
      const g = new THREE.Group();
      const body = mesh(new THREE.SphereGeometry(0.26, 16, 12), mat('#F37A2A'));
      body.scale.set(1.45, 1, 0.6);
      g.add(body);
      for (const x of [-0.08, 0.17]) {
        const band = mesh(new THREE.SphereGeometry(0.265, 16, 12), mat('#FFFFFF'));
        band.scale.set(0.16, 1.02, 0.62);
        band.position.x = x;
        g.add(band);
      }
      g.add(tailFin('#F37A2A', -0.33));
      g.add(dorsalFin('#F37A2A', 0.02, 0.26));
      return g;
    },
  },
  tang: {
    name: '藍倒吊',
    swatch: 'linear-gradient(90deg, #2F6BD8 0 75%, #F5C629 75%)',
    speed: 1.3,
    make() {
      const g = new THREE.Group();
      const body = mesh(new THREE.SphereGeometry(0.3, 16, 12), mat('#2F6BD8'));
      body.scale.set(1.3, 1.05, 0.42);
      g.add(body);
      const stripe = mesh(new THREE.SphereGeometry(0.31, 16, 12), mat('#1B2F6B'));
      stripe.scale.set(0.9, 0.45, 0.44);
      stripe.position.set(-0.02, 0.06, 0);
      g.add(stripe);
      g.add(tailFin('#F5C629', -0.35));
      g.add(dorsalFin('#2F6BD8', 0.0, 0.31));
      return g;
    },
  },
  jelly: {
    name: '水母',
    swatch: 'radial-gradient(circle at 50% 30%, #FFD3EC, #F08CC4)',
    speed: 0.35,
    make() {
      const g = new THREE.Group();
      const m = new THREE.MeshLambertMaterial({ color: '#F7A6D0', transparent: true, opacity: 0.8, emissive: '#6A2050', emissiveIntensity: 0.4 });
      g.add(mesh(new THREE.SphereGeometry(0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), m));
      const tentacles = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const t = mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.5, 4), m, Math.cos(a) * 0.18, -0.25, Math.sin(a) * 0.18);
        g.add(t);
        tentacles.push(t);
      }
      g.userData.tentacles = tentacles;
      return g;
    },
  },
  penguin: {
    name: '企鵝',
    swatch: 'linear-gradient(90deg, #2A2F36 0 55%, #FFFFFF 55%)',
    speed: 1.8,
    make() {
      const g = new THREE.Group();
      const swim = new THREE.Group();
      swim.rotation.z = -Math.PI / 2;
      swim.add(mesh(new THREE.CapsuleGeometry(0.2, 0.32, 6, 12), mat('#2A2F36')));
      const belly = mesh(new THREE.SphereGeometry(0.19, 12, 10), mat('#FFFFFF'), 0, 0.02, 0.1);
      belly.scale.set(0.9, 1.5, 0.6);
      swim.add(belly);
      const beak = mesh(new THREE.ConeGeometry(0.05, 0.14, 6), mat('#F2A33A'), 0, 0.42, 0.04);
      swim.add(beak);
      for (const s of [-1, 1]) {
        const wing = mesh(new THREE.SphereGeometry(0.1, 8, 6), mat('#2A2F36'), s * 0.2, 0, 0);
        wing.scale.set(0.3, 1.4, 0.6);
        swim.add(wing);
      }
      g.add(swim);
      return g;
    },
  },
  turtle: {
    name: '海龜',
    swatch: 'radial-gradient(circle, #7DB46A 0 45%, #4E8A4A 46%)',
    speed: 0.7,
    make() {
      const g = new THREE.Group();
      const shell = mesh(new THREE.SphereGeometry(0.36, 9, 6), flat('#4E8A4A'));
      shell.scale.set(1.25, 0.55, 1);
      g.add(shell);
      g.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), mat('#9ACB7E'), 0.5, 0.02, 0));
      const flippers = [];
      for (const [x, z] of [[0.25, 0.35], [0.25, -0.35], [-0.28, 0.28], [-0.28, -0.28]]) {
        const f = mesh(new THREE.SphereGeometry(0.12, 8, 6), mat('#9ACB7E'), x, -0.02, z);
        f.scale.set(1.5, 0.3, 0.8);
        g.add(f);
        flippers.push(f);
      }
      g.userData.flippers = flippers;
      return g;
    },
  },
};
const TYPES = Object.keys(KINDS);

// Xpark・海洋生物找找看: tap the creature the card asks for.
export function createXparkGame(shell, { canvas }) {
  const config = {
    id: 'xpark',
    stamp: 'Xpark',
    eyebrow: 'Xpark・桃園市中壢區青埔',
    title: '海洋生物找找看',
    target: 20,
    progressLabel: '找到',
    progressUnit: '隻',
    rules: [
      { dot: KINDS.clown.swatch, text: '上方卡片會告訴你要找哪一種海洋生物' },
      { dot: KINDS.penguin.swatch, text: '看到題目後越快點到牠，分數越高；連續答對還有加成' },
      { dot: KINDS.jelly.swatch, text: '點錯會扣分，也會扣 2 秒' },
      { dot: '#E8685C', text: '40 秒內找到 20 隻，就能蓋 Xpark 印章' },
    ],
    passText: '企鵝和水母都跟小狼打招呼了！下一站出發吧。',
    hint: '游得慢的水母和海龜最好點。',
  };

  const scene = new THREE.Scene();
  const DEEP = '#0D5A7A';
  scene.background = new THREE.Color(DEEP);
  scene.fog = new THREE.Fog(DEEP, 9, 22);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight('#BFF1FF', '#1D4E66', 2.2));
  const sun = new THREE.DirectionalLight('#E6FBFF', 1.4);
  sun.position.set(1, 8, 4);
  scene.add(sun);

  // tank: glowing back wall, sand, rocks, swaying seaweed, bubbles
  const wallGeo = new THREE.PlaneGeometry(30, 12, 1, 8);
  const cols = [];
  const top = new THREE.Color('#3FB7D8'), bottom = new THREE.Color('#0D5A7A'), c = new THREE.Color();
  for (let i = 0; i < wallGeo.attributes.position.count; i++) {
    c.copy(bottom).lerp(top, (wallGeo.attributes.position.getY(i) + 6) / 12);
    cols.push(c.r, c.g, c.b);
  }
  wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  wall.position.set(0, 5, -6);
  scene.add(wall);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), mat('#E9D6A6'));
  sand.rotation.x = -Math.PI / 2;
  scene.add(sand);
  for (const [x, z, s] of [[-3.5, -3, 1.2], [3.8, -3.5, 1.5], [-1.5, -4.5, 0.9], [2, -2.2, 0.7], [-4.6, -1.2, 0.8]]) {
    const r = mesh(new THREE.DodecahedronGeometry(0.7 * s, 0), flat('#7B8B8F'), x, 0.3 * s, z);
    r.scale.y = 0.7;
    scene.add(r);
  }
  const weeds = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const n = 4 + (i % 3);
    let parent = g;
    for (let j = 0; j < n; j++) {
      const seg = new THREE.Group();
      seg.position.y = j === 0 ? 0 : 0.32;
      seg.add(mesh(new THREE.CapsuleGeometry(0.06, 0.22, 3, 6), mat(i % 2 ? '#3E9E5A' : '#5CB86A'), 0, 0.16, 0));
      parent.add(seg);
      parent = seg;
    }
    g.position.set(-5 + (i / 11) * 10 + Math.sin(i * 7) * 0.4, 0, -2.5 - (i % 3) * 0.8);
    g.userData.phase = i;
    scene.add(g);
    weeds.push(g);
  }
  const bubbleMat = new THREE.MeshBasicMaterial({ color: '#DDF6FF', transparent: true, opacity: 0.55 });
  const bubbles = [];
  for (let i = 0; i < 26; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 8, 6), bubbleMat);
    b.position.set((Math.random() * 2 - 1) * 5, Math.random() * 6, -1 - Math.random() * 3);
    scene.add(b);
    bubbles.push(b);
  }

  // the wolf watches from in front of the glass
  const wolf = makeWolf();
  wolf.rotation.y = Math.PI;
  scene.add(wolf);

  let W = 3;
  function resize(w, h) {
    camera.aspect = w / h;
    const portrait = w / h < 1;
    const dist = portrait ? 8.5 / Math.max(0.45, w / h) ** 0.6 : 7.2;
    camera.position.set(0, 2.4, dist);
    camera.lookAt(0, 2.2, 0);
    camera.updateProjectionMatrix();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    W = clamp(tanH * camera.aspect * (dist + 1) * 0.85, 2, 5);
    // peeks in from the lower corner, below where the creatures swim
    wolf.position.set(W * 0.72, -0.55, 2.6);
    wolf.scale.setScalar(0.9);
  }

  // ---- creatures
  const creatures = [];
  function spawnCreature(type, fromSide = false) {
    const k = KINDS[type];
    const g = new THREE.Group();
    const body = k.make();
    g.add(body);
    g.add(hitSphere(0.55));
    const dir = Math.random() < 0.5 ? 1 : -1;
    const cr = { group: g, body, type, dir, speed: k.speed * (0.8 + Math.random() * 0.5), y: 0.8 + Math.random() * 3.2, phase: Math.random() * 6.28, spin: 0 };
    g.position.set(fromSide ? -dir * (W + 1) : (Math.random() * 2 - 1) * W, cr.y, -2.2 + Math.random() * 2.4);
    g.userData.creature = cr;
    scene.add(g);
    creatures.push(cr);
    return cr;
  }
  function populate() {
    for (const cr of creatures) scene.remove(cr.group);
    creatures.length = 0;
    TYPES.forEach((t) => {
      for (let i = 0; i < 3; i++) spawnCreature(t);
    });
  }

  let playing = false;
  let time = DURATION;
  let found = 0;
  let streak = 0;
  let askedAt = 0;
  const points = tally();
  let want = null;
  let clock = 0;
  let card = null;

  function mountUI(root) {
    card = document.createElement('div');
    card.className = 'target-card';
    card.innerHTML = '<span class="label">請找出</span><i class="dot"></i><strong></strong>';
    root.appendChild(card);
  }

  function pickTarget() {
    const present = [...new Set(creatures.filter((c) => !c.leaving).map((c) => c.type))];
    const options = present.filter((t) => t !== want);
    want = options[Math.floor(Math.random() * options.length)] ?? present[0];
    askedAt = clock;
    if (card) {
      card.querySelector('strong').textContent = KINDS[want].name;
      card.querySelector('.dot').style.background = KINDS[want].swatch;
      card.classList.remove('flip');
      void card.offsetWidth;
      card.classList.add('flip');
    }
  }

  tapper(
    canvas,
    () => playing,
    () => camera,
    () => creatures.filter((c) => !c.leaving).map((c) => c.group),
    'creature',
    (o) => {
      const cr = o.userData.creature;
      if (cr.type === want) {
        found++;
        streak++;
        const base = points.add('找到', 100);
        // continuous: every tenth of a second faster is worth more
        const quick = points.add('反應速度', 75 * Math.max(0, 4 - (clock - askedAt)));
        const chain = points.add('連續答對', (base + quick) * Math.min(0.5, 0.05 * (streak - 1)));
        sfx.good();
        shell.pop('+' + Math.round(base + quick + chain), 'good', cr.group.position, camera);
        cr.leaving = true;
        cr.spin = 1;
        shell.hud(points.total, found, Math.ceil(time), time / DURATION);
        // a new one swims in so every kind stays in the tank
        spawnCreature(TYPES[Math.floor(Math.random() * TYPES.length)], true);
        pickTarget();
      } else {
        time = Math.max(0, time - 2);
        streak = 0;
        points.add('點錯', -80);
        sfx.bad();
        shell.pop(`那是${KINDS[cr.type].name}・−80`, 'bad', cr.group.position, camera);
        cr.shake = 0.4;
      }
    }
  );

  function reset() {
    playing = false;
    time = DURATION;
    found = 0;
    streak = 0;
    points.reset();
    want = null;
    populate();
    if (card) card.hidden = true;
    shell.hud(0, 0, DURATION, 1);
  }

  function update(dt) {
    clock += dt;
    if (playing) {
      time -= dt;
      if (time <= 0) {
        time = 0;
        playing = false;
        shell.finish({ score: points.total, progress: found, lines: points.lines() });
      }
      shell.hud(points.total, found, Math.ceil(time), time / DURATION);
    }

    for (let i = creatures.length - 1; i >= 0; i--) {
      const cr = creatures[i];
      const g = cr.group;
      if (cr.leaving) {
        cr.spin -= dt;
        g.rotation.y += dt * 14;
        g.position.y += dt * 2.5;
        g.scale.setScalar(Math.max(0.01, cr.spin));
        if (cr.spin <= 0) {
          scene.remove(g);
          creatures.splice(i, 1);
        }
        continue;
      }
      g.position.x += cr.dir * cr.speed * dt;
      if (g.position.x > W + 0.5) cr.dir = -1;
      if (g.position.x < -W - 0.5) cr.dir = 1;
      const wob = Math.sin(clock * 2 + cr.phase);
      g.position.y = clamp(cr.y + wob * (cr.type === 'jelly' ? 0.5 : 0.15), 0.6, 4.2);
      g.rotation.y += ((cr.dir > 0 ? 0 : Math.PI) - g.rotation.y) * Math.min(1, dt * 5);
      if (cr.type === 'jelly') {
        cr.body.scale.set(1 + wob * 0.08, 1 - wob * 0.08, 1 + wob * 0.08);
        cr.body.userData.tentacles.forEach((t, j) => (t.rotation.z = Math.sin(clock * 3 + j) * 0.3));
      } else if (cr.type === 'turtle') {
        cr.body.userData.flippers.forEach((f, j) => (f.rotation.y = Math.sin(clock * 4 + j) * 0.5));
      } else {
        cr.body.rotation.y = Math.sin(clock * 10 + cr.phase) * 0.15;
      }
      if (cr.shake > 0) {
        cr.shake -= dt;
        cr.body.rotation.z = Math.sin(clock * 50) * 0.3;
      } else cr.body.rotation.z = 0;
    }

    for (const w of weeds) {
      let seg = w.children[0];
      let j = 0;
      while (seg) {
        seg.rotation.z = Math.sin(clock * 1.4 + w.userData.phase + j * 0.6) * 0.18;
        seg = seg.children.find((ch) => ch.isGroup);
        j++;
      }
    }
    for (const b of bubbles) {
      b.position.y += dt * 0.8;
      b.position.x += Math.sin(clock * 2 + b.position.z * 3) * dt * 0.1;
      if (b.position.y > 6.5) b.position.y = 0;
    }
    idle(wolf, clock);
  }

  return {
    config,
    scene,
    camera,
    resize,
    update,
    reset,
    mountUI,
    play() {
      playing = true;
      if (card) card.hidden = false;
      pickTarget();
    },
    stop() {
      playing = false;
    },
  };
}
