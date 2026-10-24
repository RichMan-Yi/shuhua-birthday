import * as THREE from 'three';
import { mat, flat, mesh, makeLabel } from '../models.js';
import { makeWolf } from '../wolf.js';
import { sfx } from '../audio.js';
import { idle } from './common.js';
import { tally } from './shell.js';

const DURATION = 60;

const FOODS = [
  {
    id: 'chicken',
    name: '雞排',
    // the night-market XXL cutlet, standing up in its paper bag, crumbs all over the crust
    make() {
      const g = new THREE.Group();
      const outline = new THREE.Shape();
      const pts = [];
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const r = 0.2 * (1 + 0.1 * Math.sin(a * 3 + 0.6) + 0.06 * Math.sin(a * 5 + 1.3));
        pts.push(new THREE.Vector2(Math.cos(a) * r * 0.85, Math.sin(a) * r * 1.15));
      }
      outline.setFromPoints(pts);
      const geo = new THREE.ExtrudeGeometry(outline, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.02, bevelSegments: 2 });
      geo.translate(0, 0, -0.0175);
      const cutlet = mesh(geo, new THREE.MeshLambertMaterial({ color: '#D49536', flatShading: true }), 0, 0.3, 0);
      g.add(cutlet);
      // crispy batter bits on both faces
      const crumbGeo = new THREE.IcosahedronGeometry(0.02, 0);
      const crumbCols = ['#EBB95A', '#C07A2C', '#E3A64A'];
      for (let k = 0; k < 26; k++) {
        const a = k * 2.399, r = 0.05 + ((k * 37) % 13) / 13 * 0.12;
        const face = k % 2 ? 1 : -1;
        const c = mesh(crumbGeo, flat(crumbCols[k % 3]), Math.cos(a) * r * 0.85, 0.3 + Math.sin(a) * r * 1.15, face * 0.036);
        c.scale.setScalar(0.7 + (k % 4) * 0.25);
        g.add(c);
      }
      // the paper bag: white, a red band and a red seal
      g.add(mesh(new THREE.BoxGeometry(0.4, 0.24, 0.1), flat('#F6F1E7'), 0, 0.12, 0));
      g.add(mesh(new THREE.BoxGeometry(0.405, 0.045, 0.104), flat('#D9483C'), 0, 0.19, 0));
      const seal = mesh(new THREE.CircleGeometry(0.035, 16), mat('#D9483C'), 0, 0.09, 0.052);
      g.add(seal);
      return g;
    },
  },
  {
    id: 'tea',
    name: '珍奶',
    make() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.42, 16), mat('#E2C49C'), 0, 0.21, 0));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#2A1D18'), Math.cos(a) * 0.075, 0.05, Math.sin(a) * 0.075));
      }
      g.add(mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.02, 16), mat('#FFFFFF'), 0, 0.43, 0));
      const straw = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6), mat('#E8685C'), 0.03, 0.55, 0);
      straw.rotation.z = -0.2;
      g.add(straw);
      return g;
    },
  },
  {
    id: 'balls',
    name: '地瓜球',
    make() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.22, 12, 1, true), mat('#F6F1E7', { side: THREE.DoubleSide }), 0, 0.11, 0));
      for (const [x, y, z] of [[-0.06, 0.22, 0], [0.07, 0.22, 0.03], [0, 0.24, -0.07], [0.01, 0.31, 0.01], [-0.04, 0.27, 0.07]]) {
        g.add(mesh(new THREE.SphereGeometry(0.065, 10, 8), mat('#F2A43A'), x, y, z));
      }
      return g;
    },
  },
  {
    id: 'sausage',
    name: '烤香腸',
    make() {
      const g = new THREE.Group();
      const s = mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 10), mat('#B24A3A'), 0, 0.12, 0);
      s.rotation.z = Math.PI / 2 - 0.3;
      g.add(s);
      const stick = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), mat('#D9B98C'), 0.06, 0.12, 0);
      stick.rotation.z = Math.PI / 2 - 0.3;
      g.add(stick);
      for (const x of [-0.08, 0, 0.08]) g.add(mesh(new THREE.BoxGeometry(0.012, 0.1, 0.13), mat('#6E2A20'), x, 0.12 + x * 0.3, 0));
      return g;
    },
  },
  {
    id: 'tofu',
    name: '臭豆腐',
    make() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.04, 16), mat('#FFFFFF'), 0, 0.02, 0));
      for (const [x, z] of [[-0.07, -0.06], [0.07, -0.06], [-0.07, 0.07], [0.07, 0.07]]) {
        g.add(mesh(new THREE.BoxGeometry(0.11, 0.1, 0.11), flat('#C98A3E'), x, 0.09, z));
      }
      for (const [x, z] of [[0, 0], [0.04, 0.1], [-0.1, 0.02]]) g.add(mesh(new THREE.SphereGeometry(0.045, 6, 5), flat('#8CC56F'), x, 0.16, z));
      return g;
    },
  },
];

// Render a food model to an image once, for its order button and ticket.
function thumbnail(renderer, make) {
  const size = 128;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#B9976E', 2.4));
  const sun = new THREE.DirectionalLight('#FFF3E0', 1.6);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const obj = make();
  scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  cam.position.copy(center).add(new THREE.Vector3(0, 0.55, 1).setLength(radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.05));
  cam.lookAt(center);
  const target = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const prevClear = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const pixels = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
  renderer.setRenderTarget(null);
  renderer.setClearColor(prevClear, prevAlpha);
  target.dispose();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(pixels.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

const FRIENDS = [
  { color: '#C99A6B', ears: 'bear' },
  { color: '#F2EEE8', ears: 'bunny' },
  { color: '#F2B35E', ears: 'cat' },
  { color: '#9FB6CE', ears: 'bear' },
  { color: '#E9A7B4', ears: 'bunny' },
];

function makeCustomer(look) {
  const g = new THREE.Group();
  const fur = mat(look.color);
  g.add(mesh(new THREE.CapsuleGeometry(0.26, 0.25, 6, 14), fur, 0, 0.42, 0));
  const head = new THREE.Group();
  head.position.y = 1.0;
  head.add(mesh(new THREE.SphereGeometry(0.36, 18, 14), fur));
  for (const s of [-1, 1]) {
    if (look.ears === 'bunny') {
      const ear = mesh(new THREE.CapsuleGeometry(0.07, 0.36, 4, 8), fur, s * 0.15, 0.45, 0);
      ear.rotation.z = -s * 0.15;
      head.add(ear);
    } else if (look.ears === 'cat') {
      const ear = mesh(new THREE.ConeGeometry(0.12, 0.22, 4), fur, s * 0.22, 0.32, 0);
      ear.rotation.z = -s * 0.35;
      head.add(ear);
    } else head.add(mesh(new THREE.SphereGeometry(0.11, 10, 8), fur, s * 0.25, 0.27, 0));
    head.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat('#2A2020'), s * 0.13, 0.03, 0.32));
    const blush = mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#F39AB0'), s * 0.22, -0.07, 0.28);
    blush.scale.z = 0.4;
    head.add(blush);
  }
  head.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#FFFFFF'), 0, -0.07, 0.33));
  g.add(head);
  g.userData.head = head;
  return g;
}

// 桃園觀光夜市・限時點餐: put each customer's order on the tray before they lose patience.
export function createNightGame(shell, { renderer }) {
  const config = {
    id: 'night',
    stamp: '夜市',
    eyebrow: '桃園觀光夜市・桃園市桃園區',
    title: '夜市限時點餐',
    target: 8,
    progressLabel: '完成',
    progressUnit: '單',
    rules: [
      { dot: '#D9A441', text: '客人頭上的泡泡就是點單，點下面的餐點放上托盤' },
      { dot: '#E2C49C', text: '托盤剛好符合點單就會自動出餐，客人剩的耐心越多分數越高' },
      { dot: '#B24A3A', text: '整單沒放錯另外加分；放錯會扣分，客人的耐心也會少一點' },
      { dot: '#E8685C', text: '60 秒內完成 8 單，就能蓋夜市印章' },
    ],
    passText: '雞排、珍奶都賣光了，夜市老闆要請小狼吃宵夜！',
    hint: '先看清楚點單再動手，放錯會浪費客人的耐心。',
  };

  const scene = new THREE.Scene();
  const NIGHT = '#1E2546';
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 10, 26);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight('#8C9BE0', '#3A2E3A', 1.5));
  const warm = new THREE.PointLight('#FFB866', 14, 9, 1.6);
  warm.position.set(0, 2.6, 1.2);
  scene.add(warm);
  const front = new THREE.DirectionalLight('#FFE6C8', 0.9);
  front.position.set(0, 4, 6);
  scene.add(front);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mat('#3D3A52'));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // stall: a low counter so the shopkeeper wolf shows from the chest up; the awning's posts
  // stand at the back corners, out of the way
  scene.add(mesh(new THREE.BoxGeometry(3.2, 0.5, 0.8), flat('#B07A4A'), 0, 0.25, 0.2));
  scene.add(mesh(new THREE.BoxGeometry(3.3, 0.05, 0.9), flat('#E8D3A8'), 0, 0.525, 0.2));
  scene.add(mesh(new THREE.BoxGeometry(3.22, 0.3, 0.04), flat('#C8473A'), 0, 0.27, 0.61));
  scene.add(mesh(new THREE.BoxGeometry(3.22, 0.05, 0.045), flat('#F2B84B'), 0, 0.45, 0.615));
  for (const x of [-1.7, 1.7]) scene.add(mesh(new THREE.BoxGeometry(0.1, 2.7, 0.1), flat('#7A5A3E'), x, 1.35, -1.05));
  for (let i = 0; i < 8; i++) {
    const stripe = mesh(new THREE.BoxGeometry(0.46, 0.06, 1.6), flat(i % 2 ? '#FFFFFF' : '#E8463A'), -1.62 + i * 0.465, 2.6, -0.35);
    stripe.rotation.x = 0.22;
    scene.add(stripe);
  }
  const lanterns = [];
  for (let i = 0; i < 5; i++) {
    const l = mesh(new THREE.SphereGeometry(0.12, 10, 8), mat('#E8463A', { emissive: '#B0301E', emissiveIntensity: 1 }), -1.4 + i * 0.7, 2.28, 0.38);
    l.scale.y = 1.3;
    scene.add(l);
    lanterns.push(l);
  }
  const sign = makeLabel('桃園觀光夜市');
  sign.sprite.position.set(0, 3.15, -0.3);
  sign.sprite.scale.multiplyScalar(0.7);
  scene.add(sign.sprite);
  // the rest of the market behind: a row of small stalls, string lights, steam and passersby
  const backStalls = [
    { x: -5.0, color: '#F2B84B', turn: 0.25, steam: true },
    { x: -2.7, color: '#6DB37C', turn: 0.12, steam: false },
    { x: 2.7, color: '#7FA6E8', turn: -0.12, steam: true },
    { x: 5.0, color: '#E8685C', turn: -0.25, steam: false },
  ];
  const twinkle = [];
  const steam = [];
  const puffTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  for (const b of backStalls) {
    const g = new THREE.Group();
    g.position.set(b.x, 0, -3.3);
    g.rotation.y = b.turn;
    g.add(mesh(new THREE.BoxGeometry(1.8, 0.75, 0.7), flat('#9A6A3C'), 0, 0.375, 0));
    g.add(mesh(new THREE.BoxGeometry(1.85, 0.05, 0.78), flat('#E8D3A8'), 0, 0.77, 0));
    g.add(mesh(new THREE.BoxGeometry(1.8, 1.6, 0.08), flat('#4A3B52'), 0, 1.0, -0.4));
    for (const px of [-0.88, 0.88]) g.add(mesh(new THREE.BoxGeometry(0.07, 1.9, 0.07), flat('#7A5A3E'), px, 0.95, 0.3));
    for (let k = 0; k < 4; k++) {
      const stripe = mesh(new THREE.BoxGeometry(0.47, 0.05, 0.95), flat(k % 2 ? '#FFFFFF' : b.color), -0.7 + k * 0.47, 1.9, 0.05);
      stripe.rotation.x = 0.3;
      g.add(stripe);
    }
    // glowing sign plate on the roof line
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.28, 0.06), mat(b.color, { emissive: b.color, emissiveIntensity: 0.8 }), 0, 2.2, 0.0));
    for (let k = 0; k < 3; k++) {
      const l = mesh(new THREE.SphereGeometry(0.09, 8, 6), mat('#E8463A', { emissive: '#B0301E', emissiveIntensity: 1 }), -0.55 + k * 0.55, 1.62, 0.42);
      l.scale.y = 1.3;
      g.add(l);
      lanterns.push(l);
    }
    // a few dishes on the counter
    for (let k = 0; k < 3; k++) g.add(mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.08, 10), flat(['#F6F1E7', '#F2A43A', '#B24A3A'][k]), -0.5 + k * 0.5, 0.84, 0.15));
    if (b.steam) {
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.6 }));
        puff.userData = { base: new THREE.Vector3(-0.1 + (k % 2) * 0.2, 0.95, 0.15), phase: k / 4 };
        g.add(puff);
        steam.push(puff);
      }
    }
    scene.add(g);
  }
  // string lights zigzagging over the back row
  const bulbColors = ['#FFE08A', '#FFB45C', '#FFF3C4', '#FF9B6A'];
  for (const [x0, x1] of [[-6, -1.7], [-1.7, 1.7], [1.7, 6]]) {
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: bulbColors[k % 4] }));
      b.position.set(x0 + (x1 - x0) * t, 3.0 - Math.sin(t * Math.PI) * 0.45, -2.2);
      scene.add(b);
      twinkle.push(b);
    }
  }
  // passersby strolling behind the main stall
  const strollers = [0, 1, 2].map((i) => {
    const c = makeCustomer(FRIENDS[(i * 2 + 1) % FRIENDS.length]);
    c.scale.setScalar(0.85);
    c.userData.lane = { z: -2.05 - i * 0.25, speed: (i % 2 ? -1 : 1) * (0.45 + i * 0.12), x: -6 + i * 4 };
    c.position.set(c.userData.lane.x, 0, c.userData.lane.z);
    scene.add(c);
    return c;
  });

  const wolf = makeWolf();
  wolf.position.set(0, 0.36, -0.5);
  scene.add(wolf);
  scene.add(mesh(new THREE.BoxGeometry(1.2, 0.36, 0.7), flat('#5A4A3E'), 0, 0.18, -0.5)); // the step it stands on
  let reach = 0; // >0 while the wolf sets food down; <0 while it cheers a finished order

  const tray = new THREE.Group();
  tray.add(mesh(new THREE.BoxGeometry(1.5, 0.04, 0.5), flat('#8A5432'), 0, 0.02, 0));
  tray.position.set(0, 0.55, 0.35);
  scene.add(tray);

  const thumbs = Object.fromEntries(FOODS.map((f) => [f.id, thumbnail(renderer, f.make)]));

  let customerX = -2.35; // where customers stand, nearer the middle on tall screens
  function resize(w, h) {
    camera.aspect = w / h;
    const portrait = w / h < 1;
    customerX = portrait ? -1.45 : -2.35;
    const dist = portrait ? 7.8 / Math.max(0.45, w / h) ** 0.55 : 6;
    camera.position.set(0.3, 1.6 + dist * 0.28, dist);
    camera.lookAt(-0.3, 1.25, 0);
    camera.updateProjectionMatrix();
  }

  // ---- game state
  let playing = false;
  let time = DURATION;
  let served = 0;
  let slips = 0; // mistakes on the current order
  const points = tally();
  let clock = 0;
  let order = null; // { items: {id: count}, patience, max }
  let onTray = [];
  let customer = null;
  let walk = null; // { from, to, t, then }
  let ui = null;

  function mountUI(root) {
    ui = document.createElement('div');
    ui.className = 'night-ui';
    ui.innerHTML = `
      <div class="order-bubble" hidden>
        <ul></ul>
        <i class="patience"><b></b></i>
      </div>
      <div class="foods">${FOODS.map((f) => `<button class="food" data-food="${f.id}"><img src="${thumbs[f.id]}" alt=""><span>${f.name}</span></button>`).join('')}</div>`;
    root.appendChild(ui);
    ui.querySelectorAll('.food').forEach((b) => b.addEventListener('click', () => add(b.dataset.food, b)));
  }

  function renderTicket() {
    if (!ui) return;
    const bubble = ui.querySelector('.order-bubble');
    bubble.hidden = !order;
    if (!order) return;
    bubble.querySelector('ul').innerHTML = Object.entries(order.items)
      .map(([id, n]) => {
        const have = onTray.filter((x) => x === id).length;
        const name = FOODS.find((f) => f.id === id).name;
        return `<li class="${have >= n ? 'ok' : ''}"><img src="${thumbs[id]}" alt="${name}"><b>×${n - Math.min(have, n) || n}</b></li>`;
      })
      .join('');
  }

  function newOrder() {
    const size = Math.min(4, 1 + Math.floor(served / 2) + (Math.random() < 0.4 ? 1 : 0));
    const items = {};
    const kinds = Math.min(size, 1 + Math.floor(Math.random() * 3));
    const pool = [...FOODS].sort(() => Math.random() - 0.5).slice(0, kinds);
    for (let i = 0; i < size; i++) {
      const f = pool[i % pool.length];
      items[f.id] = (items[f.id] || 0) + 1;
    }
    const max = Math.max(7, 13 - served * 0.6) + size;
    order = { items, patience: max, max, size };
    slips = 0;
    onTray = [];
    clearTray();
    renderTicket();
    // pop the bubble in so a new order is impossible to miss
    const bubble = ui?.querySelector('.order-bubble');
    if (bubble) {
      bubble.classList.remove('fresh');
      void bubble.offsetWidth;
      bubble.classList.add('fresh');
    }
    sfx.tick();
  }

  function clearTray() {
    while (tray.children.length > 1) tray.remove(tray.children[1]);
  }

  function arrive() {
    if (customer) scene.remove(customer);
    // start the new customer at the entrance before it is ever drawn: a fresh model sits at the
    // origin, which is the middle of the stall, and would flash there for a frame
    const from = new THREE.Vector3(-6, 0, 1.4);
    customer = makeCustomer(FRIENDS[served % FRIENDS.length]);
    customer.position.copy(from);
    customer.rotation.y = Math.PI / 2 - 0.5;
    scene.add(customer);
    walk = { from, to: new THREE.Vector3(customerX, 0, 1.25), t: 0, then: newOrder };
  }

  function leave(happy) {
    order = null;
    renderTicket();
    const c = customer;
    if (happy && c) c.userData.jump = 0.5;
    walk = { from: c.position.clone(), to: new THREE.Vector3(-6.5, 0, 2.2), t: happy ? -0.5 : 0, leaving: true, then: () => playing && arrive() };
  }

  function add(id, button) {
    if (!playing || !order) return;
    const need = order.items[id] || 0;
    const have = onTray.filter((x) => x === id).length;
    if (have >= need) {
      order.patience -= 1.5;
      slips++;
      points.add('放錯餐點', -40);
      sfx.bad();
      button.classList.remove('nope');
      void button.offsetWidth;
      button.classList.add('nope');
      const r = button.getBoundingClientRect();
      shell.pop(need ? '已經夠了' : '客人沒點這個', 'bad', { x: r.left + r.width / 2, y: r.top - 10 });
      return;
    }
    onTray.push(id);
    reach = 0.35;
    sfx.pop();
    const item = FOODS.find((f) => f.id === id).make();
    const n = onTray.length - 1;
    // pops up right on the tray (no drop from above: that started in front of the wolf)
    item.position.set(-0.52 + n * 0.35, 0.04, 0);
    item.scale.setScalar(0.01);
    item.userData.grow = 0;
    tray.add(item);
    renderTicket();
    const done = Object.entries(order.items).every(([k, v]) => onTray.filter((x) => x === k).length === v);
    if (done) {
      served++;
      const base = points.add('出餐', 120 * order.size);
      // continuous: the more patience the customer has left, the more it's worth
      const fast = points.add('出餐速度', 250 * Math.sqrt(order.size) * Math.max(0, order.patience / order.max));
      const clean = slips ? 0 : points.add('整單零失誤', 80);
      reach = -0.7;
      // hand the food over: it slides toward the customer and shrinks away
      // (after a beat, so the last dish finishes popping up before it goes)
      tray.children.slice(1).forEach((it) => (it.userData.handOver = -0.3));
      sfx.good();
      shell.pop('出餐！+' + Math.round(base + fast + clean), 'good', tray.position.clone().setY(1.6), camera);
      shell.hud(points.total, served, Math.ceil(time), time / DURATION);
      leave(true);
    }
  }

  function reset() {
    playing = false;
    time = DURATION;
    served = 0;
    points.reset();
    order = null;
    onTray = [];
    clearTray();
    if (customer) scene.remove(customer);
    customer = null;
    walk = null;
    renderTicket();
    shell.hud(0, 0, DURATION, 1);
  }

  function update(dt) {
    clock += dt;
    if (playing) {
      time -= dt;
      if (time <= 0) {
        time = 0;
        playing = false;
        order = null;
        renderTicket();
        shell.finish({ score: points.total, progress: served, lines: points.lines() });
      }
      shell.hud(points.total, served, Math.ceil(time), time / DURATION);
      if (order && !walk) {
        order.patience -= dt;
        const bar = ui?.querySelector('.order-bubble .patience b');
        if (bar) {
          const f = Math.max(0, order.patience / order.max);
          bar.style.transform = `scaleX(${f})`;
          bar.parentElement.classList.toggle('low', f < 0.3);
        }
        if (order.patience <= 0) {
          sfx.bad();
          shell.pop('客人等不及了', 'bad', customer.position.clone().setY(1.8), camera);
          clearTray();
          leave(false);
        }
      }
    }

    if (walk && customer) {
      walk.t += dt / 1.1;
      const t = Math.max(0, Math.min(1, walk.t));
      customer.position.lerpVectors(walk.from, walk.to, t);
      customer.position.y = Math.abs(Math.sin(t * Math.PI * 5)) * 0.08;
      customer.rotation.y = walk.leaving ? -Math.PI / 2 - 0.4 : Math.PI / 2 - 0.5;
      if (walk.t >= 1) {
        const then = walk.then;
        walk = null;
        customer.position.y = 0;
        customer.rotation.y = Math.PI / 2 - 0.5;
        then();
      }
    }
    if (customer?.userData.jump > 0) {
      customer.userData.jump -= dt;
      customer.position.y = Math.sin((customer.userData.jump / 0.5) * Math.PI) * 0.35;
    }
    if (customer && !walk) customer.userData.head.rotation.z = Math.sin(clock * 2) * 0.08;

    for (const item of tray.children.slice(1)) {
      const u = item.userData;
      if (u.grow !== undefined && u.grow < 1) {
        u.grow = Math.min(1, u.grow + dt / 0.22);
        const t = u.grow;
        item.scale.setScalar(1.25 * (1 + 0.25 * Math.sin(t * Math.PI)) * t);
      }
      if (u.handOver !== undefined) {
        u.handOver += dt / 0.5;
        if (u.handOver < 0) continue; // still on the tray for a moment
        const toward = customer ? tray.worldToLocal(customer.position.clone().setY(1.0)) : item.position;
        item.position.lerp(toward, Math.min(1, dt * 6));
        item.scale.setScalar(Math.max(0.01, 1.25 * (1 - u.handOver)));
        if (u.handOver >= 1) tray.remove(item);
      }
    }
    lanterns.forEach((l, i) => (l.rotation.z = Math.sin(clock * 1.8 + i) * 0.15));
    twinkle.forEach((b, i) => b.scale.setScalar(1 + Math.sin(clock * 3 + i * 1.3) * 0.3));
    for (const p of steam) {
      const k = (clock * 0.35 + p.userData.phase) % 1;
      p.position.copy(p.userData.base).add(new THREE.Vector3(Math.sin(k * 6 + p.userData.phase * 9) * 0.08, k * 0.9, 0));
      p.scale.setScalar(0.25 + k * 0.45);
      p.material.opacity = 0.55 * (1 - k);
    }
    for (const c of strollers) {
      const lane = c.userData.lane;
      c.position.x += lane.speed * dt;
      if (c.position.x > 6.5) c.position.x = -6.5;
      if (c.position.x < -6.5) c.position.x = 6.5;
      c.position.y = Math.abs(Math.sin(clock * 6 + lane.z * 10)) * 0.05;
      c.rotation.y = lane.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    idle(wolf, clock, 1.3);
    // the shopkeeper reaches out to set food down, and cheers when an order goes out
    const p = wolf.userData;
    if (reach > 0) {
      reach -= dt;
      p.arms[1].rotation.set(-1.3 * Math.sin((reach / 0.35) * Math.PI), 0, p.rest.arm * 0.5);
    } else if (reach < 0) {
      reach = Math.min(0, reach + dt);
      // cheer: both paws pump in front of the chest with a little hop. (The head is big and the
      // arms short, so any pose that lifts the arms past ~45° hides them behind the head.)
      const pump = Math.sin(clock * 16);
      p.arms.forEach((a, i) => a.rotation.set(-1.25 - pump * 0.3, 0, (i ? 1 : -1) * p.rest.arm * 0.55));
      wolf.position.y = 0.36 + Math.abs(pump) * 0.06;
    } else {
      p.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * p.rest.arm));
      wolf.position.y = 0.36;
    }

    // keep the order bubble over the customer's head
    const bubble = ui?.querySelector('.order-bubble');
    if (bubble && order && customer) {
      const v = customer.position.clone().add(new THREE.Vector3(0.15, 1.75, 0)).project(camera);
      const half = bubble.offsetWidth / 2 + 10;
      const x = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * innerWidth, half, innerWidth - half);
      const y = Math.max(bubble.offsetHeight + 96, (-v.y * 0.5 + 0.5) * innerHeight);
      bubble.style.left = x.toFixed(0) + 'px';
      bubble.style.top = y.toFixed(0) + 'px';
    }
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
      arrive();
    },
    stop() {
      playing = false;
    },
  };
}
