import * as THREE from 'three';
import { mat, flat, mesh, makeTree } from '../models.js';
import { makeWolf } from '../wolf.js';
import { sfx } from '../audio.js';
import { clamp, steering, lightRig } from './common.js';
import { tally } from './shell.js';

// raw points for a run that just meets the target: 35 fish, half-height catches, a few near misses, 40 s of rowing, one hit
const PAR = 6800;

const DURATION = 40;
const LIVES = 3;
const SPAWN_Z = -46;

function makeFish(gold) {
  const g = new THREE.Group();
  const color = gold ? '#F2C14E' : '#F28A3C';
  const m = gold ? mat(color, { emissive: '#8A5A00', emissiveIntensity: 0.5 }) : mat(color);
  const body = mesh(new THREE.SphereGeometry(0.26, 14, 10), m);
  body.scale.set(1.5, 0.9, 0.55);
  g.add(body);
  const tail = mesh(new THREE.ConeGeometry(0.2, 0.3, 4), m, -0.45, 0, 0);
  tail.rotation.z = Math.PI / 2;
  tail.scale.z = 0.4;
  g.add(tail);
  for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat('#1E1E22'), 0.24, 0.06, s * 0.12));
  return g;
}

function makeRock() {
  const g = new THREE.Group();
  const r = mesh(new THREE.DodecahedronGeometry(0.6, 0), flat('#8E979A'));
  r.scale.set(1.1, 0.75, 1);
  r.position.y = 0.15;
  g.add(r);
  g.add(mesh(new THREE.DodecahedronGeometry(0.35, 0), flat('#A4ACAE'), 0.45, 0.05, 0.2));
  return g;
}

function makeLog() {
  const g = new THREE.Group();
  const log = mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.7, 9), flat('#8A6040'));
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.1;
  g.add(log);
  for (const s of [-1, 1]) {
    const end = mesh(new THREE.CircleGeometry(0.19, 9), flat('#D9B98C'), s * 0.851, 0.1, 0);
    end.rotation.y = (s * Math.PI) / 2;
    g.add(end);
  }
  return g;
}

// A low wooden rowboat (bow toward -z, away from the camera). The gunwale sits at the wolf's
// waist so its whole upper body shows; two oars sweep in oarlocks on either side.
function makeBoat() {
  const g = new THREE.Group();
  const outline = (k) => {
    const s = new THREE.Shape();
    s.moveTo(0, -1.05 * k);
    s.quadraticCurveTo(0.5 * k, -0.6 * k, 0.56 * k, 0.1 * k);
    s.quadraticCurveTo(0.56 * k, 0.75 * k, 0.3 * k, 0.82 * k);
    s.lineTo(-0.3 * k, 0.82 * k);
    s.quadraticCurveTo(-0.56 * k, 0.75 * k, -0.56 * k, 0.1 * k);
    s.quadraticCurveTo(-0.5 * k, -0.6 * k, 0, -1.05 * k);
    return s;
  };
  // extrude a top-view outline into a slab from y0 up to y0 + h
  const slab = (shape, h, y0, color) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 12 });
    geo.rotateX(Math.PI / 2);
    return mesh(geo, flat(color), 0, y0 + h, 0);
  };
  const H = 0.22;
  g.add(slab(outline(1), H, 0, '#A86C3F')); // wooden hull
  g.add(slab(outline(1.025), 0.07, -0.01, '#C8473A')); // red waterline
  for (const y of [0.08, 0.15]) g.add(slab(outline(1.012), 0.012, y, '#8A5530')); // plank seams
  g.add(slab(outline(0.84), 0.01, H, '#5E3A22')); // the dark inside
  const rim = outline(1.0);
  rim.holes.push(outline(0.86));
  g.add(slab(rim, 0.035, H, '#F6F1E7')); // white gunwale
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.04, 0.2), flat('#C89A6A'), 0, H + 0.03, 0.18)); // seat
  // a little pennant on the bow
  g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 5), flat('#7A5A3E'), 0, H + 0.2, -0.86));
  const pennant = new THREE.Shape();
  pennant.moveTo(0, 0);
  pennant.lineTo(0.24, -0.06);
  pennant.lineTo(0, -0.12);
  g.add(mesh(new THREE.ShapeGeometry(pennant), mat('#E8685C', { side: THREE.DoubleSide }), 0, H + 0.39, -0.86));

  // oars: pivot at an oarlock, handle inboard toward the rower's paw, blade out in the water
  const oars = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.55, H + 0.06, 0.12);
    const oar = new THREE.Group();
    oar.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.2, 6).rotateZ(Math.PI / 2), flat('#D9B98C'), side * 0.25, 0, 0));
    oar.add(mesh(new THREE.BoxGeometry(0.28, 0.02, 0.12), flat('#F6F1E7'), side * 0.78, 0, 0));
    oar.add(mesh(new THREE.BoxGeometry(0.1, 0.022, 0.125), flat('#E8685C'), side * 0.86, 0, 0));
    oar.rotation.z = side * -0.32; // blade dips toward the water
    pivot.add(oar);
    g.add(pivot);
    return pivot;
  });
  g.userData.oars = oars;
  return g;
}

// 石門水庫・划船大冒險: steer the boat, catch jumping fish, dodge rocks and logs.
export function createShimenGame(shell) {
  const config = {
    id: 'shimen',
    stamp: '石門',
    eyebrow: '石門水庫・桃園市龍潭區',
    title: '划船大冒險',
    target: 35,
    progressLabel: '魚',
    progressUnit: '條',
    rules: [
      { dot: '#F28A3C', text: '左右拖曳划船接住跳出水面的魚，魚跳得越高時接到分數越高' },
      { dot: '#F2C14E', text: '金色的魚算 3 條；划越遠、擦身閃過障礙物也會加分' },
      { dot: '#8E979A', text: '閃開石頭和漂流木，撞到 3 次船就壞了，直接失敗' },
      { dot: '#E8685C', text: '40 秒內接到 35 條魚，就能蓋石門印章' },
    ],
    passText: '湖面好平靜，小狼划完一圈石門水庫了！下一站出發吧。',
    hint: '眼睛看遠一點，比較來得及閃。',
    failTitle: '船撞壞了！',
    failText: '撞到 3 次障礙物，這次沒辦法蓋章。眼睛看遠一點，提早閃開石頭和漂流木。',
  };

  const scene = new THREE.Scene();
  const SKY = '#BFE4EE';
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 18, 46);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  lightRig(scene, { ground: '#4DB6D0' });

  const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#4DB6D0'));
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  const ripples = [];
  for (let i = 0; i < 40; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.06), new THREE.MeshBasicMaterial({ color: '#E8F7FB', transparent: true, opacity: 0.7 }));
    r.rotation.x = -Math.PI / 2;
    r.position.set((Math.random() * 2 - 1) * 8, 0.02, SPAWN_Z + Math.random() * 54);
    scene.add(r);
    ripples.push(r);
  }

  // moving banks: grass strips stay put, trees scroll
  const banks = [];
  const trees = [];
  for (const s of [-1, 1]) {
    const bank = mesh(new THREE.BoxGeometry(12, 0.5, 120), flat('#7DB86A'), 0, 0.1, -30);
    scene.add(bank);
    banks.push({ s, bank });
    for (let i = 0; i < 18; i++) {
      const t = makeTree(['#6FAE5B', '#5E9C57', '#7DB86A'][i % 3], 0.55 + Math.random() * 0.25);
      t.scale.setScalar(1.6);
      t.userData.s = s;
      t.userData.off = 1 + Math.random() * 4;
      t.position.z = SPAWN_Z + (i / 18) * 56;
      scene.add(t);
      trees.push(t);
    }
  }
  for (let i = 0; i < 7; i++) {
    const h = 9 + (i % 3) * 3;
    scene.add(mesh(new THREE.ConeGeometry(8, h, 6), flat(['#6FA85E', '#5E9852', '#7DB46A'][i % 3]), -27 + i * 9, h / 2 - 1, -58));
  }

  const boat = makeBoat();
  const BOAT_HALF = 0.55 * 0.9; // half the boat's width for hits and near misses, shrunk with the boat
  const wolf = makeWolf();
  // seated on the bench, facing the camera (rowers face the stern); legs stay inside the hull
  // boat and wolf together at 90% (2026-10-24); the wolf stays the same size relative to the boat
  const BOAT_SCALE = 1.25 * 0.9;
  boat.scale.setScalar(BOAT_SCALE);
  wolf.scale.setScalar(0.8 / 1.25);
  wolf.position.set(0, 0.1, 0.2);
  boat.add(wolf);
  scene.add(boat);

  let W = 2.4;
  function resize(w, h) {
    camera.aspect = w / h;
    const portrait = w / h < 1;
    camera.position.set(0, portrait ? 4.6 : 3.4, portrait ? 7.4 : 6);
    camera.lookAt(0, 0.4, -6);
    camera.updateProjectionMatrix();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    W = clamp(tanH * camera.aspect * camera.position.z * 0.85, 1.7, 3.2);
    for (const { s, bank } of banks) bank.position.x = s * (W + 1.3 + 6);
    for (const t of trees) t.position.x = t.userData.s * (W + 1.3 + t.userData.off);
  }

  let playing = false;
  let time = DURATION;
  let catchPts = 0; // stamp progress: fish 1, gold 3
  const points = tally(PAR); // raw points scaled so a just-passing run is about 1,000
  let lives = LIVES;
  let spawnT = 0;
  let hurt = 0;
  let clock = 0;
  let speed = 8;
  let boosts = 0; // how many '加速！' cues have fired this run
  const items = [];
  const steer = steering(() => playing);
  let livesEl = null;

  function mountUI(root) {
    livesEl = document.createElement('div');
    livesEl.className = 'status-pill lives';
    root.appendChild(livesEl);
  }
  const showLives = () => livesEl && (livesEl.textContent = '船身 ' + '♥'.repeat(lives) + '♡'.repeat(LIVES - lives));

  // An obstacle may only go where the boat still has a way through: together with the obstacles
  // already close to the spawn line, it must leave an open stretch the boat fits into.
  const ROW = 4; // obstacles this close along the river count as the same row
  function leavesAWay(x, half) {
    const blocked = items
      .filter((it) => (it.type === 'rock' || it.type === 'log') && Math.abs(it.obj.position.z - SPAWN_Z) < ROW)
      .map((it) => [it.obj.position.x - it.half - BOAT_HALF, it.obj.position.x + it.half + BOAT_HALF]);
    blocked.push([x - half - BOAT_HALF, x + half + BOAT_HALF]);
    blocked.sort((a, b) => a[0] - b[0]);
    // boat centres run from -W to W; look for a free stretch at least 0.35 long
    let from = -W;
    for (const [lo, hi] of blocked) {
      if (lo - from >= 0.35) return true;
      from = Math.max(from, hi);
    }
    return W - from >= 0.35;
  }

  function spawn() {
    const r = Math.random();
    let type = r < 0.08 ? 'gold' : r < 0.52 ? 'fish' : r < 0.82 ? 'rock' : 'log';
    let half = type === 'log' ? 0.85 : type === 'rock' ? 0.6 : 0.4;
    let x = (Math.random() * 2 - 1) * W;
    if (type === 'rock' || type === 'log') {
      let tries = 12;
      while (tries-- && !leavesAWay(x, half)) x = (Math.random() * 2 - 1) * W;
      if (tries < 0) [type, half] = ['fish', 0.4]; // no fair place for it: a fish jumps there instead
    }
    const obj = type === 'rock' ? makeRock() : type === 'log' ? makeLog() : makeFish(type === 'gold');
    obj.position.set(x, 0, SPAWN_Z);
    scene.add(obj);
    items.push({ obj, type, half, phase: Math.random() * 6.28 });
  }

  function removeAt(i) {
    scene.remove(items[i].obj);
    items.splice(i, 1);
  }

  function reset() {
    for (let i = items.length - 1; i >= 0; i--) removeAt(i);
    playing = false;
    time = DURATION;
    catchPts = 0;
    points.reset();
    lives = LIVES;
    hurt = 0;
    speed = 8;
    boosts = 0;
    camera.fov = 50;
    camera.updateProjectionMatrix();
    steer.reset();
    boat.position.set(0, 0, 0);
    boat.visible = true;
    showLives();
    shell.hud(0, 0, DURATION, 1);
  }

  const end = () => {
    playing = false;
    if (lives > 0) points.add('剩餘船身', lives * 250);
    shell.hud(points.total, catchPts, Math.ceil(time), time / DURATION);
    // three crashes break the boat: that is a fail, however many fish are aboard
    shell.finish({ score: points.total, progress: catchPts, lines: points.lines(), failed: lives <= 0 });
  };

  function update(dt) {
    clock += dt;
    const progress = 1 - time / DURATION;
    // the boat keeps speeding up, gently at first and hard toward the end (8 → 20)
    speed = 8 + 12 * progress ** 1.5;
    if (playing && Math.floor(progress * 4) > boosts && progress < 1) {
      boosts = Math.floor(progress * 4);
      shell.pop('加速！', 'gold', boat.position.clone().setY(2.2), camera);
      sfx.go();
    }
    // a slightly wider view as it goes faster, for a sense of speed
    const fov = 50 + (speed - 8) * 0.55;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const travel = (playing ? speed : 3) * dt;
    if (playing) points.add('划行距離', travel * 2.5);

    if (playing) {
      time -= dt;
      spawnT -= dt;
      if (spawnT <= 0) {
        spawn();
        if (Math.random() < 0.25 + progress * 0.25) spawn();
        spawnT = 0.75 - progress * 0.3;
      }
      if (time <= 0) {
        time = 0;
        end();
      }
      shell.hud(points.total, catchPts, Math.ceil(time), time / DURATION);
    }

    // scenery flows toward the camera
    for (const r of ripples) {
      r.position.z += travel;
      if (r.position.z > 8) {
        r.position.z -= 54;
        r.position.x = (Math.random() * 2 - 1) * (W + 1);
      }
    }
    for (const t of trees) {
      t.position.z += travel;
      if (t.position.z > 8) t.position.z -= 56;
    }

    // boat steering and bobbing
    const x0 = boat.position.x;
    boat.position.x += (steer.read(dt) * W - x0) * (1 - Math.exp(-dt * 8));
    const vx = (boat.position.x - x0) / Math.max(dt, 1e-4);
    boat.rotation.z = clamp(-vx * 0.05, -0.25, 0.25);
    boat.rotation.y = clamp(-vx * 0.04, -0.3, 0.3);
    boat.position.y = Math.sin(clock * 3) * 0.04;
    const p = wolf.userData;
    // both oars sweep together; the paws follow the handles
    const stroke = Math.sin(clock * (playing ? 4 + speed * 0.4 : 3));
    boat.userData.oars.forEach((o, i) => (o.rotation.y = (i ? -1 : 1) * stroke * 0.45));
    p.arms.forEach((a, i) => a.rotation.set(-0.9 - stroke * 0.35, 0, (i ? 1 : -1) * 1.05));
    p.body.rotation.x = stroke * 0.08;
    p.tail.rotation.z = p.rest.tailZ + Math.sin(clock * 6) * 0.3;
    if (hurt > 0) {
      hurt -= dt;
      boat.visible = Math.floor(hurt * 12) % 2 === 0;
      if (hurt <= 0) boat.visible = true;
    }

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const o = it.obj;
      if (it.caught !== undefined) {
        it.caught -= dt;
        o.position.lerp(boat.position.clone().setY(1.2), 0.3);
        o.scale.multiplyScalar(0.85);
        if (it.caught <= 0) removeAt(i);
        continue;
      }
      o.position.z += travel;
      if (it.type === 'fish' || it.type === 'gold') {
        const jump = Math.abs(Math.sin(clock * 3 + it.phase));
        it.jump = jump;
        o.position.y = 0.15 + jump * 0.9;
        o.rotation.z = Math.cos(clock * 3 + it.phase) * 0.6;
        o.rotation.y = Math.PI / 2;
      } else {
        o.position.y = Math.sin(clock * 2 + it.phase) * 0.05;
      }
      if (playing && Math.abs(o.position.z) < 0.7 && Math.abs(o.position.x - boat.position.x) < it.half + BOAT_HALF) {
        if (it.type === 'fish' || it.type === 'gold') {
          const gold = it.type === 'gold';
          catchPts += gold ? 3 : 1;
          const base = points.add(gold ? '金色的魚' : '魚', gold ? 300 : 100);
          // continuous: catching a fish higher in its jump is worth more
          const air = points.add('跳躍時機', (gold ? 150 : 80) * it.jump);
          gold ? sfx.gold() : sfx.pop();
          shell.pop('+' + Math.round(base + air), gold ? 'gold' : 'good', o.position, camera);
          it.caught = 0.2;
          continue;
        }
        if (hurt <= 0) {
          lives--;
          hurt = 1.2;
          it.hit = true;
          const lost = points.add('撞到障礙', -150);
          sfx.bad();
          shell.pop(`撞到了！−${Math.round(-lost)}`, 'bad', o.position.clone().setY(1), camera);
          showLives();
          if (lives <= 0) end();
        }
      }
      // near miss: an obstacle that slips by close to the boat earns a bonus, closer is more
      if (playing && !it.passed && !it.hit && it.type !== 'fish' && it.type !== 'gold' && o.position.z > 0.7) {
        it.passed = true;
        const gap = Math.abs(o.position.x - boat.position.x) - (it.half + BOAT_HALF);
        if (gap > 0 && gap < 0.6) {
          const v = points.add('擦身而過', 90 * (1 - gap / 0.6));
          shell.pop('驚險！+' + Math.round(v), 'good', o.position.clone().setY(0.9), camera);
        }
      }
      if (o.position.z > 9) removeAt(i);
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
      spawnT = 0.2;
    },
    stop() {
      playing = false;
    },
  };
}
