import * as THREE from 'three';
import { mat, flat, mesh, makePeach, makeBee, makePeachTree, makeCloud } from '../models.js';
import { makeWolf } from '../wolf.js';
import { sfx } from '../audio.js';
import { clamp, steering, lightRig } from './common.js';
import { tally } from './shell.js';

const DURATION = 30;
const SKY = '#BFE2EA';

// Oval wicker basket (rx wide, rz deep, h tall, centred on its middle) with a handle loop at each end.
function makeHandBasket({ rx, rz, h }) {
  const g = new THREE.Group();
  const wicker = mat('#B9834F', { side: THREE.DoubleSide });
  const dark = mat('#9A6A3C');
  const oval = (o) => o.scale.set(rx / 0.3, 1, rz / 0.3);
  const wall = mesh(new THREE.CylinderGeometry(0.3, 0.25, h, 20, 1, true), wicker);
  oval(wall);
  g.add(wall);
  const floor = mesh(new THREE.CircleGeometry(0.25, 20).rotateX(-Math.PI / 2), wicker, 0, -h / 2, 0);
  oval(floor);
  g.add(floor);
  // woven bands and a rolled rim
  for (const [y, r, t] of [[h / 2, 0.3, 0.03], [0, 0.275, 0.014], [-h / 4, 0.263, 0.012]]) {
    const band = mesh(new THREE.TorusGeometry(r, t, 6, 28), dark, 0, y, 0);
    band.rotation.x = Math.PI / 2;
    band.scale.set(rx / 0.3, rz / 0.3, 1);
    g.add(band);
  }
  for (const s of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 12, Math.PI), dark, s * (rx - 0.005), h / 2 - 0.005, 0);
    loop.rotation.set(0, Math.PI / 2, 0);
    g.add(loop);
  }
  return g;
}

// 拉拉山・接水蜜桃: steer the wolf and catch falling peaches in the basket.
export function createPeachGame(shell) {
  const config = {
    id: 'lalashan',
    stamp: '拉拉山',
    eyebrow: '拉拉山・桃園市復興區',
    title: '接水蜜桃',
    target: 30,
    progressLabel: '收成',
    progressUnit: '點',
    rules: [
      { dot: 'radial-gradient(circle at 35% 70%, #FBC59A, #F0697A)', text: '左右拖曳移動小狼，用籃子接住水蜜桃，接在籃子越中間分數越高' },
      { dot: 'radial-gradient(circle at 35% 30%, #FFF6D0, #FFD54A 45%, #E0A21E)', text: '會發光的金色水蜜桃收成 3 點、分數 3 倍；連續接到還會越加越多' },
      { dot: 'repeating-linear-gradient(90deg, #F4C430 0 6px, #2A2020 6px 9px)', text: '小心蜜蜂，碰到會扣分，連續紀錄也會中斷' },
      { dot: '#E8685C', text: '30 秒內收成 30 點，就能蓋拉拉山印章' },
    ],
    passText: '一整籃水蜜桃送給舒華。回到地圖，繼續下一站吧。',
    hint: '金色水蜜桃一顆抵 3 點。',
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 22, 60);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  lightRig(scene);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#8CC56F'));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(200, 2.4), mat('#E8D3A8'));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 0.6);
  scene.add(path);

  const hillColors = ['#6FA85E', '#5E9852', '#7DB46A', '#558B4B'];
  for (let i = 0; i < 10; i++) {
    const r = 5 + (i % 3) * 2;
    const h = 7 + (i % 4) * 2.5;
    scene.add(mesh(new THREE.ConeGeometry(r, h, 7), flat(hillColors[i % 4]), -30 + i * 6.5, h / 2 - 0.5, -22 - (i % 2) * 6));
  }
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 10; i++) {
      const t = makePeachTree();
      t.position.set(-14 + i * 3 + row * 1.5, 0, -4 - row * 3.5);
      t.scale.setScalar(1.6 + ((i * 7 + row * 3) % 5) * 0.08);
      t.rotation.y = i;
      scene.add(t);
    }
  }
  for (let i = 0; i < 4; i++) {
    const c = makeCloud();
    c.position.set(-12 + i * 8, 9 + (i % 2) * 2, -12);
    c.scale.setScalar(1.4);
    scene.add(c);
  }

  const player = makeWolf();
  // a wide, shallow oval basket held against the belly: its back clears the body's front
  // (z ≈ 0.22) and its two ends reach the paws, which grip the side handles; legs show below
  const BASKET = { y: 0.35, z: 0.335, rx: 0.27, rz: 0.105, h: 0.2 };
  const basket = makeHandBasket(BASKET);
  basket.position.set(0, BASKET.y, BASKET.z);
  player.add(basket);
  player.userData.arms.forEach((p, i) => p.rotation.set(-1.45, 0, (i ? 1 : -1) * 0.4));
  scene.add(player);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 20),
    new THREE.MeshBasicMaterial({ color: '#2D4A2A', transparent: true, opacity: 0.22, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  scene.add(shadow);

  // play field, recomputed on resize
  let k = 1; // object scale, grows on tall screens
  let W = 3; // half width the player can move
  let spawnY = 8;
  const basketY = () => (BASKET.y + BASKET.h / 2) * 1.35 * k; // the rim
  const itemZ = () => BASKET.z * 1.35 * k;

  function resize(w, h) {
    camera.aspect = w / h;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(10, 3.4 / (tanH * camera.aspect));
    const halfH = tanH * dist;
    k = clamp(dist / 10, 1, 1.3);
    W = Math.min(tanH * camera.aspect * dist * 0.85, 5);
    const lookY = halfH * 0.78;
    camera.position.set(0, lookY + 1.2, dist);
    camera.lookAt(0, lookY, 0);
    camera.updateProjectionMatrix();
    spawnY = lookY + halfH + 0.8;
    player.scale.setScalar(1.35 * k);
    shadow.scale.setScalar(k);
  }

  let playing = false;
  let time = DURATION;
  let harvest = 0; // stamp progress: peach 1, gold 3, bee −2
  let combo = 0;
  const points = tally();
  let spawnT = 0;
  let stun = 0;
  let vx = 0;
  let clock = 0;
  const items = [];
  const steer = steering(() => playing);
  const progress = () => 1 - time / DURATION;

  function spawn() {
    const r = Math.random();
    const bee = 0.12 + 0.12 * progress();
    const type = r < 0.09 ? 'gold' : r < 0.09 + bee ? 'bee' : 'peach';
    const obj = type === 'bee' ? makeBee() : makePeach(type === 'gold');
    obj.scale.setScalar(1.25 * k);
    const x = (Math.random() * 2 - 1) * W;
    obj.position.set(x, spawnY, itemZ());
    scene.add(obj);
    const fall = 2.3 - 0.9 * progress();
    items.push({ obj, type, x, phase: Math.random() * 6.28, speed: (spawnY / fall) * (type === 'gold' ? 1.5 : 1) });
  }

  function removeAt(i) {
    scene.remove(items[i].obj);
    items.splice(i, 1);
  }

  function collect(it) {
    if (it.type === 'bee') {
      harvest = Math.max(0, harvest - 2);
      combo = 0;
      stun = 0.6;
      shell.pop('−' + Math.abs(points.add('碰到蜜蜂', -200)), 'bad', it.obj.position, camera);
      sfx.bad();
      it.gone = true;
      return;
    }
    const gold = it.type === 'gold';
    harvest += gold ? 3 : 1;
    combo++;
    const base = points.add(gold ? '金色水蜜桃' : '水蜜桃', gold ? 300 : 100);
    // continuous: the closer to the middle of the basket, the more it's worth
    const off = Math.abs(it.obj.position.x - player.position.x) / (0.62 * k);
    const aim = points.add('接得準', (gold ? 120 : 60) * Math.max(0, 1 - off));
    const chain = points.add('連續接到', base * Math.min(0.6, 0.05 * (combo - 1)));
    shell.pop('+' + Math.round(base + aim + chain), gold ? 'gold' : 'good', it.obj.position, camera);
    it.type === 'gold' ? sfx.gold() : sfx.pop();
    it.caught = 0.18;
  }

  function reset() {
    for (let i = items.length - 1; i >= 0; i--) removeAt(i);
    playing = false;
    harvest = 0;
    combo = 0;
    points.reset();
    time = DURATION;
    stun = 0;
    vx = 0;
    steer.reset();
    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    shell.hud(0, 0, DURATION, 1);
  }

  function update(dt) {
    clock += dt;
    const parts = player.userData;

    if (playing) {
      time -= dt;
      spawnT -= dt;
      if (spawnT <= 0) {
        spawn();
        spawnT = 0.8 - 0.35 * progress();
      }
      if (time <= 0) {
        time = 0;
        playing = false;
        shell.finish({ score: points.total, progress: harvest, lines: points.lines() });
      }
      shell.hud(points.total, harvest, Math.ceil(time), time / DURATION);
    }

    // player movement and pose
    const x0 = player.position.x;
    if (stun > 0) {
      stun -= dt;
      player.rotation.z = Math.sin(clock * 40) * 0.12;
    } else {
      player.position.x += (steer.read(dt) * W - x0) * (1 - Math.exp(-dt * 14));
      vx = (player.position.x - x0) / Math.max(dt, 1e-4);
      player.rotation.z += (clamp(-vx * 0.03, -0.3, 0.3) - player.rotation.z) * Math.min(1, dt * 10);
    }
    parts.body.position.y = Math.abs(Math.sin(clock * (Math.abs(vx) > 0.5 ? 12 : 3))) * 0.04;
    parts.head.rotation.z = Math.sin(clock * 2) * 0.06;
    parts.tail.rotation.z = parts.rest.tailZ + Math.sin(clock * 9) * 0.3;
    shadow.position.x = player.position.x;

    const by = basketY();
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const o = it.obj;
      if (it.gone) {
        removeAt(i);
        continue;
      }
      if (it.caught !== undefined) {
        it.caught -= dt;
        o.position.x += (player.position.x - o.position.x) * 0.4;
        o.position.y += (by - 0.1 * k - o.position.y) * 0.4;
        o.scale.multiplyScalar(0.86);
        if (it.caught <= 0) removeAt(i);
        continue;
      }
      o.position.y -= it.speed * dt;
      if (it.type === 'bee') {
        const s = Math.sin(clock * 3 + it.phase);
        o.position.x = clamp(it.x + s * 0.8, -W, W);
        o.rotation.y = Math.cos(clock * 3 + it.phase) > 0 ? 0.5 : Math.PI - 0.5;
        o.userData.wings.forEach((w, j) => (w.rotation.x = Math.sin(clock * 50) * 0.6 * (j ? 1 : -1)));
      } else {
        o.rotation.y += dt * (it.type === 'gold' ? 2.5 : 1.5);
        o.userData.tick?.(clock);
      }
      if (playing) {
        const dy = o.position.y - by;
        if (dy < 0.35 * k && dy > -0.3 * k && Math.abs(o.position.x - player.position.x) < 0.62 * k) {
          collect(it);
          continue;
        }
      }
      if (o.position.y < -0.6) {
        if (it.type !== 'bee' && playing) combo = 0; // a dropped peach breaks the chain
        removeAt(i);
      }
    }
  }

  return {
    config,
    scene,
    camera,
    resize,
    update,
    reset,
    play() {
      playing = true;
      spawnT = 0.3;
    },
    stop() {
      playing = false;
    },
  };
}
