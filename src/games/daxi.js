import * as THREE from 'three';
import { mat, flat, mesh, makeLabel } from '../models.js';
import { makeWolf } from '../wolf.js';
import { sfx } from '../audio.js';
import { tapper, lightRig, idle } from './common.js';
import { tally } from './shell.js';

// raw points for a run that just meets the target: 5 perfect rounds (lengths 3–5) with half the input time left, partial taps on the rest
const PAR = 4200;

const FLAVORS = [
  { name: '原味', color: '#D9A86C' },
  { name: '滷味', color: '#8A5432' },
  { name: '辣味', color: '#D0503C' },
  { name: '黑胡椒', color: '#5A4A3E' },
];
// sequence length per round; the game always ends after the last one
const ROUND_LENGTHS = [3, 3, 4, 4, 5, 5, 6, 6];
const rand = () => Math.floor(Math.random() * FLAVORS.length);

// A fresh order every round that shares no position with the previous one, never repeats
// a flavor twice in a row, and doesn't lean on a single flavor.
export function freshSequence(len, prev = []) {
  let best = null;
  let bestScore = -Infinity;
  for (let t = 0; t < 400; t++) {
    const s = [];
    for (let i = 0; i < len; i++) {
      let v;
      do v = rand();
      while (i > 0 && v === s[i - 1]);
      s.push(v);
    }
    const same = s.filter((v, i) => v === prev[i]).length;
    const crowd = Math.max(...FLAVORS.map((_, f) => s.filter((v) => v === f).length)) - Math.ceil(len / FLAVORS.length);
    if (same === 0 && crowd <= 0) return s;
    const score = -same * 3 - crowd;
    if (score > bestScore) (bestScore = score), (best = s);
  }
  return best;
}

// 大溪老街・豆干記憶大考驗: watch the dried tofu light up in order, then tap the same order.
// Eight rounds, each with a brand-new order and a time limit for answering.
export function createDaxiGame(shell, { canvas }) {
  const config = {
    id: 'daxi',
    stamp: '大溪',
    eyebrow: '大溪老街・桃園市大溪區',
    title: '豆干記憶大考驗',
    target: 5,
    progressLabel: '完美',
    progressUnit: '回合',
    timeLabel: '回合',
    timeUnit: '',
    rules: [
      { dot: '#D9A86C', text: '豆干會照順序跳起來，每回合都是全新的順序' },
      { dot: '#8A5432', text: '輪到你時照同樣順序點，越快點完分數越高' },
      { dot: '#D0503C', text: '點錯或時間到，這回合就結束，直接進下一回合' },
      { dot: '#E8685C', text: '共 8 回合，完美 5 回合就能蓋大溪印章' },
    ],
    passText: '老闆說你的記性比大溪豆干還有嚼勁！下一站出發吧。',
    hint: '可以邊看邊小聲唸出口味。',
  };

  const scene = new THREE.Scene();
  const SKY = '#F6DDB8';
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 14, 34);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  lightRig(scene, { ground: '#B9976E', hemi: 2.0 });

  const street = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), mat('#CDB89A'));
  street.rotation.x = -Math.PI / 2;
  scene.add(street);

  // Baroque shopfronts of the old street
  const walls = ['#EADBC2', '#E4CFB0', '#EBD6BA', '#E2CCAE', '#EADBC2'];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 2.6;
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.5, 3.2, 1.5), flat(walls[i]), 0, 1.6, -0.75));
    g.add(mesh(new THREE.BoxGeometry(2.5, 3.8, 0.18), flat('#C9785B'), 0, 1.9, 0.05));
    const crest = new THREE.Shape();
    crest.moveTo(-1.0, 0);
    crest.quadraticCurveTo(-0.9, 0.7, 0, 0.75);
    crest.quadraticCurveTo(0.9, 0.7, 1.0, 0);
    g.add(mesh(new THREE.ExtrudeGeometry(crest, { depth: 0.18, bevelEnabled: false }), flat('#C9785B'), 0, 3.8, -0.04));
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.18, 0.2), flat('#EBCB9B'), 0, 3.3, 0.12));
    g.add(mesh(new THREE.BoxGeometry(1.0, 1.7, 0.08), flat('#5A3B2E'), 0, 0.85, 0.16));
    for (const wx of [-0.75, 0.75]) g.add(mesh(new THREE.BoxGeometry(0.4, 0.55, 0.06), flat('#F3E7C9'), wx, 2.3, 0.16));
    g.position.set(x, 0, -4.2);
    scene.add(g);
  }

  // stall table with four plates of tofu
  const table = new THREE.Group();
  table.add(mesh(new THREE.BoxGeometry(3.0, 0.12, 2.0), flat('#9A6A3C'), 0, 0.8, 0));
  for (const [x, z] of [[-1.35, -0.85], [1.35, -0.85], [-1.35, 0.85], [1.35, 0.85]]) {
    table.add(mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), flat('#7A5232'), x, 0.4, z));
  }
  table.add(mesh(new THREE.BoxGeometry(3.0, 0.5, 0.06), flat('#C8473A'), 0, 0.55, 1.0));
  scene.add(table);

  const blocks = [];
  const SLOTS = [[-0.62, -0.42], [0.62, -0.42], [-0.62, 0.5], [0.62, 0.5]];
  FLAVORS.forEach((f, i) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.44, 0.06, 24), flat('#FFFFFF'), 0, 0.03, 0));
    const material = new THREE.MeshLambertMaterial({ color: f.color, flatShading: true });
    const tofu = new THREE.Group();
    tofu.add(mesh(new THREE.BoxGeometry(0.62, 0.22, 0.62), material, 0, 0.17, 0));
    // the pressed grid on top of Daxi dried tofu
    const line = mat(new THREE.Color(f.color).multiplyScalar(0.7).getStyle());
    for (const d of [-0.1, 0.1]) {
      tofu.add(mesh(new THREE.BoxGeometry(0.6, 0.012, 0.02), line, 0, 0.285, d));
      tofu.add(mesh(new THREE.BoxGeometry(0.02, 0.012, 0.6), line, d, 0.285, 0));
    }
    g.add(tofu);
    // name tag beside the plate (outer side), so it never covers the tofu
    const label = makeLabel(f.name);
    label.sprite.scale.multiplyScalar(0.26);
    label.sprite.position.set(Math.sign(SLOTS[i][0]) * 0.92, 0.14, 0);
    g.add(label.sprite);
    g.position.set(SLOTS[i][0], 0.86, SLOTS[i][1]);
    g.userData.tofu = i;
    scene.add(g);
    blocks.push({ group: g, tofu, material, glow: 0 });
  });

  const wolf = makeWolf();
  wolf.position.set(0, 0.32, -1.5);
  scene.add(wolf);
  scene.add(mesh(new THREE.BoxGeometry(1.4, 0.32, 1.0), flat('#8A6A4A'), 0, 0.16, -1.5));

  function resize(w, h) {
    camera.aspect = w / h;
    const portrait = w / h < 1;
    const dist = portrait ? 6.6 / Math.max(0.5, w / h) ** 0.55 : 5.4;
    camera.position.set(0, 1.0 + dist * 0.62, dist * 0.78);
    camera.lookAt(0, 0.95, -0.3);
    camera.updateProjectionMatrix();
  }

  // ---- game flow
  let phase = 'idle'; // show → input → between, for each round
  let round = 0;
  let seq = [];
  let step = 0;
  let timer = 0;
  let lit = -1;
  let perfect = 0;
  let streak = 0;
  let allowed = 1;
  let answer = 0; // input time left this round
  let clock = 0;
  let status = null;
  const points = tally(PAR); // raw points scaled so a just-passing run is about 1,000

  const say = (text) => status && (status.textContent = text);
  const roundText = () => `${Math.min(round + 1, ROUND_LENGTHS.length)}/${ROUND_LENGTHS.length}`;
  const refresh = (frac = null) => shell.hud(points.total, perfect, roundText(), frac);

  function mountUI(root) {
    status = document.createElement('div');
    status.className = 'status-pill';
    root.appendChild(status);
  }

  function startRound() {
    seq = freshSequence(ROUND_LENGTHS[round], seq);
    phase = 'show';
    step = 0;
    timer = 0.7;
    lit = -1;
    refresh(1);
    say(`第 ${round + 1} 回合・看清楚順序`);
  }

  function endRound(ok, at) {
    phase = 'between';
    timer = 1.0;
    if (ok) {
      const len = seq.length;
      perfect++;
      streak++;
      const base = points.add('完成回合', 60 * len);
      // continuous: every bit of time left is worth points
      const speed = points.add('速度加成', 150 * len * (answer / allowed));
      const combo = points.addScaled('連續完美', (base + speed) * Math.min(0.5, 0.1 * (streak - 1)));
      shell.pop(`+${Math.round(base + speed + combo)}`, 'gold', at, camera);
      say(streak > 1 ? `完美！連續 ${streak} 回合` : '完美！');
      sfx.good();
    } else {
      streak = 0;
      sfx.bad();
      wolf.userData.shake = 0.5;
    }
    round++;
    refresh();
    if (round >= ROUND_LENGTHS.length) {
      phase = 'done';
      setTimeout(() => shell.finish({ score: points.total, progress: perfect, lines: points.lines() }), 500);
    }
  }

  function press(i) {
    blocks[i].glow = 1;
    sfx.note(i);
    const at = blocks[i].group.position.clone().setY(1.6);
    if (seq[step] === i) {
      step++;
      points.add('正確點擊', 40);
      refresh();
      if (step === seq.length) endRound(true, at);
    } else {
      shell.pop('順序錯了', 'bad', at, camera);
      say('這回合結束，下一回合加油');
      endRound(false, at);
    }
  }

  tapper(canvas, () => phase === 'input' && shell.playing, () => camera, () => blocks.map((b) => b.group), 'tofu', (o) => press(o.userData.tofu));

  function reset() {
    phase = 'idle';
    round = 0;
    seq = [];
    perfect = 0;
    streak = 0;
    lit = -1;
    points.reset();
    blocks.forEach((b) => (b.glow = 0));
    say('');
    refresh(1);
  }

  function update(dt) {
    clock += dt;
    const on = Math.max(0.32, 0.55 - round * 0.03);
    if (phase === 'show') {
      timer -= dt;
      if (timer <= 0) {
        if (lit >= 0) {
          lit = -1;
          timer = 0.16;
          step++;
          if (step >= seq.length) {
            phase = 'input';
            step = 0;
            allowed = 1.4 + seq.length * 0.75;
            answer = allowed;
            say('換你了！照順序點豆干');
          }
        } else {
          lit = seq[step];
          blocks[lit].glow = 1;
          sfx.note(lit);
          timer = on;
        }
      }
    } else if (phase === 'input') {
      answer -= dt;
      refresh(answer / allowed);
      if (answer <= 0) {
        answer = 0;
        shell.pop('時間到', 'bad', wolf.position.clone().setY(2.2), camera);
        say('時間到，下一回合加油');
        endRound(false);
      }
    } else if (phase === 'between') {
      timer -= dt;
      if (timer <= 0) startRound();
    }

    for (const [i, b] of blocks.entries()) {
      if (phase === 'show' && lit !== i) b.glow = Math.max(0, b.glow - dt * 6);
      else if (phase !== 'show') b.glow = Math.max(0, b.glow - dt * 4);
      b.tofu.position.y = b.glow * 0.28 + (phase === 'input' ? Math.abs(Math.sin(clock * 3 + i)) * 0.02 : 0);
      b.tofu.rotation.y = b.glow * 0.3;
      b.material.emissive.setRGB(b.glow * 0.45, b.glow * 0.36, b.glow * 0.12);
    }

    // the shopkeeper looks at whichever plate is lit
    idle(wolf, clock);
    const p = wolf.userData;
    const look = lit >= 0 ? blocks[lit].group.position : null;
    const targetYaw = look ? Math.atan2(look.x, look.z + 1.5) * 0.6 : 0;
    p.head.rotation.y += (targetYaw - p.head.rotation.y) * Math.min(1, dt * 8);
    p.arms[1].rotation.z = p.rest.arm + (lit >= 0 ? 1.2 : 0);
    if (p.shake > 0) {
      p.shake -= dt;
      wolf.rotation.z = Math.sin(clock * 40) * 0.08;
    } else wolf.rotation.z = 0;
  }

  return {
    config,
    scene,
    camera,
    resize,
    update,
    reset,
    mountUI,
    play: startRound,
    stop() {
      phase = 'done';
    },
  };
}
