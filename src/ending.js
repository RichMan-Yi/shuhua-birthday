import * as THREE from 'three';
import { mat, flat, mesh, makeTree } from './models.js';
import { makeWolf } from './wolf.js';
import { sfx } from './audio.js';
import { tapper } from './games/common.js';
import { makeFireworks } from './fireworks.js';

// one candle per stamp, in the order of the stamp row
const CANDLES = ['#D9A86C', '#F0697A', '#4DB6D0', '#2F6BD8', '#F2B84B'];
const PLAQUE = '슈화야 생일 축하해~';
const PARTY = ['#F0697A', '#F2C14E', '#7FD0E6', '#9ED36A', '#C9A0F0', '#FFFFFF'];

function makeCake() {
  const g = new THREE.Group();
  const tiers = [
    { r: 0.9, h: 0.5, color: '#FFF4E6' },
    { r: 0.62, h: 0.42, color: '#F7B9C8' },
    { r: 0.38, h: 0.32, color: '#FFF4E6' },
  ];
  let y = 0;
  for (const t of tiers) {
    g.add(mesh(new THREE.CylinderGeometry(t.r, t.r, t.h, 32), mat(t.color), 0, y + t.h / 2, 0));
    const drip = mesh(new THREE.TorusGeometry(t.r, 0.05, 8, 32), mat('#FFFFFF'), 0, y + t.h - 0.02, 0);
    drip.rotation.x = Math.PI / 2;
    g.add(drip);
    y += t.h;
    if (t !== tiers[2]) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + y;
        const berry = mesh(new THREE.SphereGeometry(0.07, 10, 8), mat('#E8463A'), Math.cos(a) * (t.r - 0.12), y + 0.05, Math.sin(a) * (t.r - 0.12));
        berry.scale.y = 1.2;
        g.add(berry);
      }
    }
  }
  // chocolate plaque on the bottom tier
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshLambertMaterial({ map: tex, transparent: true }));
  plaque.position.set(0, 0.25, 0.905);
  g.add(plaque);
  const draw = () => {
    ctx.clearRect(0, 0, 512, 160);
    ctx.fillStyle = '#6B3E2A';
    ctx.beginPath();
    ctx.roundRect?.(8, 8, 496, 144, 40) ?? ctx.rect(8, 8, 496, 144);
    ctx.fill();
    ctx.fillStyle = '#FFF4E6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 64;
    do ctx.font = `400 ${size--}px Jua, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    while (ctx.measureText(PLAQUE).width > 440 && size > 30);
    ctx.fillText(PLAQUE, 256, 84);
    tex.needsUpdate = true;
  };
  draw();
  g.userData.redrawPlaque = () => document.fonts?.load('64px Jua', PLAQUE).then(draw, draw) ?? draw();

  const flames = [];
  CANDLES.forEach((c, i) => {
    const a = (i / CANDLES.length) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.22;
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 10), mat(c), x, y + 0.16, z));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 10), new THREE.MeshBasicMaterial({ color: '#FFC145' }));
    flame.position.set(x, y + 0.4, z);
    flame.geometry.translate(0, 0.065, 0); // pivot at the wick so the flame leans instead of sliding
    flame.position.y -= 0.065;
    g.add(flame);
    flames.push(flame);
  });
  const glow = new THREE.PointLight('#FFB04A', 6, 4, 1.5);
  glow.position.set(0, y + 0.6, 0);
  g.add(glow);
  g.userData = { ...g.userData, flames, glow, top: y };
  g.userData.cake = true;
  return g;
}


// The birthday party that opens once all five stamps are collected.
export function createEnding({ canvas, onExit, onWish, submitted }) {
  const $ = (id) => document.getElementById(id);
  const scene = new THREE.Scene();
  const DUSK = '#2B2F5A';
  scene.background = new THREE.Color(DUSK);
  scene.fog = new THREE.Fog(DUSK, 14, 40);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#B9C2FF', '#4A3A4A', 1.6));
  const key = new THREE.DirectionalLight('#FFE6C8', 1.2);
  key.position.set(3, 6, 5);
  scene.add(key);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const stars = [];
  for (let i = 0; i < 400; i++) {
    const v = new THREE.Vector3().randomDirection();
    v.y = Math.abs(v.y) * 0.9 + 0.1;
    stars.push(...v.multiplyScalar(30).toArray());
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#FFFFFF', size: 0.12, fog: false })));

  const island = new THREE.Group();
  island.add(mesh(new THREE.CylinderGeometry(4.2, 3.6, 0.8, 12), flat('#B8946A'), 0, -0.4, 0));
  island.add(mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.08, 12), flat('#7DB86A'), 0, 0.02, 0));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    if (Math.sin(a) > -0.2) continue; // trees only behind the cake, out of the camera's way
    const t = makeTree(['#6FAE5B', '#5E9C57', '#7DB86A'][i % 3], 0.35);
    t.position.set(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5 - 0.3);
    t.scale.setScalar(1.6);
    island.add(t);
  }
  scene.add(island);

  // string lights in a ring of arcs
  const bulbs = [];
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 1) / 6) * Math.PI * 2;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const a = a0 + (a1 - a0) * t;
      const b = mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: PARTY[(k + i) % 5] }), Math.cos(a) * 3.2, 2.6 - Math.sin(t * Math.PI) * 0.5, Math.sin(a) * 3.2);
      scene.add(b);
      bulbs.push(b);
    }
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    scene.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), flat('#7A5A3E'), Math.cos(a) * 3.2, 1.3, Math.sin(a) * 3.2));
  }

  const cake = makeCake();
  scene.add(cake);
  const wolf = makeWolf();
  const WOLF_AT = new THREE.Vector3(1.35, 0, 0.55);
  const WOLF_TURN = -0.35;
  const toCake = new THREE.Vector3(-WOLF_AT.x, 0, -WOLF_AT.z).normalize();
  const FACE_CAKE = Math.atan2(toCake.x, toCake.z);
  wolf.position.copy(WOLF_AT);
  wolf.rotation.y = WOLF_TURN;
  scene.add(wolf);

  // soft puffs: breath toward the candles, then smoke from each wick
  const puffTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const makePuff = (color) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, depthWrite: false, opacity: 0 }));
    sp.visible = false;
    scene.add(sp);
    return sp;
  };
  const breath = Array.from({ length: 7 }, () => makePuff('#EAF6FF'));
  const smoke = CANDLES.map(() => makePuff('#B8B4C4'));

  // confetti
  const CONFETTI = 160;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.08, 0.05), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONFETTI);
  const bits = [];
  const color = new THREE.Color();
  for (let i = 0; i < CONFETTI; i++) {
    bits.push({ p: new THREE.Vector3((Math.random() * 2 - 1) * 4, 4 + Math.random() * 5, (Math.random() * 2 - 1) * 4), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), s: 0.6 + Math.random() * 0.8 });
    confetti.setColorAt(i, color.set(PARTY[i % PARTY.length]));
  }
  confetti.visible = false;
  scene.add(confetti);
  const dummy = new THREE.Object3D();

  const fireworks = makeFireworks(scene, { sound: true });

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    radius = w / h < 1 ? 9.5 / Math.max(0.5, w / h) ** 0.45 : 7.5;
  }
  let radius = 7.5;
  // camera shots: x and y in world units, z as a share of the fit distance
  const SHOTS = {
    intro: { x: 0.2, y: 5.2, z: 1.45, look: new THREE.Vector3(0.3, 1.5, 0) },
    rest: { x: 0.3, y: 3.0, z: 1.0, look: new THREE.Vector3(0.55, 1.0, 0) },
    blow: { x: 0.3, y: 2.3, z: 0.62, look: new THREE.Vector3(0.65, 1.35, 0.15) },
    cheer: { x: 0.6, y: 3.5, z: 1.12, look: new THREE.Vector3(0.4, 1.3, 0) },
  };
  const shotPos = (s) => new THREE.Vector3(s.x, s.y, s.z * radius);
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  let active = false;
  let blown = false;
  let clock = 0;
  let fwTimer = 0;
  let fwLeft = 0;

  // tap → wolf turns to the cake, hops up, blows; the flames lean away and go out one by one
  const T = { turn: 0.4, crouch: 0.6, jump: 0.62, land: 1.24, blow: 0.86, out: 1.0, back: 1.75, cheer: 2.15 };
  let seq = -1;
  let cheering = false;
  const breathFrom = new THREE.Vector3();
  const smooth = (u) => u * u * (3 - 2 * u);
  const span = (t, a, b) => smooth(THREE.MathUtils.clamp((t - a) / (b - a), 0, 1));

  function blow() {
    if (blown) return;
    blown = true;
    seq = 0;
    $('endBlow').hidden = true;
  }

  function celebrate() {
    cheering = true;
    $('endTitle').textContent = 'Happy Birthday!';
    $('endText').textContent = '蠟燭吹熄了，許個願吧！';
    sfx.win();
    confetti.visible = true;
    fwLeft = 10;
    fwTimer = 0.5;
    setTimeout(() => active && ($('endCard').hidden = false), 1800);
  }

  $('endBlow').addEventListener('click', blow);
  $('endAgain').addEventListener('click', () => {
    fwLeft = 8;
    fwTimer = 0;
  });
  $('endWish').addEventListener('click', onWish);
  // after the wish is sent the card points to the wall instead
  const refresh = () => {
    $('endWish').hidden = submitted();
    $('endWall').hidden = !submitted();
  };
  $('endExit').addEventListener('click', () => {
    active = false;
    $('endingUI').hidden = true;
    onExit();
  });
  tapper(canvas, () => active && !blown, () => camera, () => [cake], 'cake', blow);

  function open() {
    active = true;
    blown = false;
    cheering = false;
    seq = -1;
    clock = 0;
    camPos.copy(shotPos(SHOTS.intro));
    camLook.copy(SHOTS.intro.look);
    wolf.position.copy(WOLF_AT);
    wolf.rotation.y = WOLF_TURN;
    wolf.scale.setScalar(1);
    [...breath, ...smoke].forEach((sp) => {
      sp.visible = false;
      sp.userData = {};
    });
    cake.userData.flames.forEach((f) => f.rotation.set(0, 0, 0));
    fwLeft = 0;
    cake.userData.redrawPlaque();
    cake.userData.flames.forEach((f) => f.scale.setScalar(1));
    cake.userData.glow.intensity = 6;
    confetti.visible = false;
    bits.forEach((b) => (b.p.y = 4 + Math.random() * 5));
    $('endingUI').hidden = false;
    $('endCard').hidden = true;
    $('endBlow').hidden = false;
    refresh();
    $('endTitle').textContent = '五枚印章都收集到了！';
    $('endText').textContent = '大家在桃園準備了生日派對。點一下蛋糕，幫舒華吹熄蠟燭。';
  }

  function update(dt) {
    clock += dt;
    // fixed framing that moves with the story: dolly in on arrival, push in for the blow, ease back for the fireworks
    const want = seq >= 0 ? SHOTS.blow : cheering ? SHOTS.cheer : SHOTS.rest;
    const ease = 1 - Math.exp(-dt * (seq >= 0 ? 3 : cheering ? 1.2 : 0.9));
    camPos.lerp(shotPos(want), ease);
    camLook.lerp(want.look, ease);
    camera.position.copy(camPos);
    camera.position.x += Math.sin(clock * 0.5) * 0.06;
    camera.position.y += Math.sin(clock * 0.7) * 0.03;
    camera.lookAt(camLook);

    const { flames, glow } = cake.userData;
    const p = wolf.userData;
    if (seq >= 0) {
      const prev = seq;
      seq += dt;
      // turn away from the camera toward the cake, then back once the candles are out
      wolf.rotation.y = THREE.MathUtils.lerp(WOLF_TURN, FACE_CAKE, span(seq, 0, T.turn) - span(seq, T.back, T.cheer));
      // crouch, hop up to candle height, squash on landing
      const u = THREE.MathUtils.clamp((seq - T.jump) / (T.land - T.jump), 0, 1);
      wolf.position.y = Math.sin(u * Math.PI) * 0.55;
      const squash = seq < T.jump ? span(seq, T.turn, T.crouch) * 0.12 : seq > T.land ? Math.max(0, 0.12 - (seq - T.land) * 0.5) : -0.06 * Math.sin(u * Math.PI);
      wolf.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
      // head tips forward with the puff
      p.head.rotation.x = 0.25 * (span(seq, T.blow - 0.12, T.blow) - span(seq, T.blow + 0.25, T.land + 0.2));
      if (prev < T.blow && seq >= T.blow) {
        sfx.blow();
        p.head.getWorldPosition(breathFrom).addScaledVector(toCake, 0.35);
        breathFrom.y -= 0.1;
        breath.forEach((sp, i) => {
          sp.visible = true;
          sp.userData = { t: -i * 0.04, side: (i % 3) - 1 };
        });
      }
      if (prev < T.cheer && seq >= T.cheer) {
        seq = -1;
        wolf.scale.setScalar(1);
        celebrate();
      }
    }
    breath.forEach((sp) => {
      if (!sp.visible) return;
      const d = sp.userData;
      d.t += dt;
      if (d.t < 0) return;
      const k = d.t / 0.45;
      if (k >= 1) return (sp.visible = false);
      sp.position.copy(breathFrom).addScaledVector(toCake, k * 1.2);
      sp.position.x += toCake.z * d.side * 0.12 * k;
      sp.position.z -= toCake.x * d.side * 0.12 * k;
      sp.position.y += k * 0.12;
      sp.scale.setScalar(0.12 + k * 0.3);
      sp.material.opacity = 0.75 * Math.sin(k * Math.PI);
    });

    const blowAt = blown ? T.out : Infinity;
    const since = seq >= 0 ? seq : cheering ? 99 : -1;
    flames.forEach((f, i) => {
      const offAt = blowAt + i * 0.09;
      const lean = since > T.blow ? Math.min(1, (since - T.blow) / 0.12) * 0.9 : 0;
      f.rotation.set(toCake.z * lean, 0, -toCake.x * lean);
      const out = since >= offAt;
      const target = out ? 0 : 1 + Math.sin(clock * 18 + i * 2) * 0.12;
      f.scale.setScalar(THREE.MathUtils.lerp(f.scale.x, target, Math.min(1, dt * (out ? 14 : 20))));
      const sm = smoke[i];
      if (out && !sm.visible && !sm.userData.done) {
        sm.visible = true;
        sm.userData = { t: 0 };
        f.getWorldPosition(sm.position);
      }
      if (sm.visible) {
        sm.userData.t += dt;
        const k = sm.userData.t / 1.6;
        if (k >= 1) {
          sm.visible = false;
          sm.userData.done = true;
        } else {
          f.getWorldPosition(sm.position);
          sm.position.y += k * 0.9;
          sm.position.x += Math.sin(k * 7 + i) * 0.05;
          sm.scale.setScalar(0.08 + k * 0.3);
          sm.material.opacity = 0.6 * (1 - k);
        }
      }
    });
    const lit = flames.filter((f) => f.scale.x > 0.05).length / flames.length;
    glow.intensity = THREE.MathUtils.lerp(glow.intensity, 6 * lit, Math.min(1, dt * 6));
    bulbs.forEach((b, i) => b.scale.setScalar(1 + Math.sin(clock * 4 + i) * 0.25));

    p.tail.rotation.z = p.rest.tailZ + Math.sin(clock * (cheering ? 12 : 5)) * 0.35;
    p.head.rotation.z = Math.sin(clock * 1.6) * 0.08;
    if (cheering) {
      p.arms[1].rotation.z = p.rest.arm + 1.5 + Math.sin(clock * 8) * 0.35;
      p.arms[0].rotation.z = -p.rest.arm - 1.5 - Math.sin(clock * 8 + 1) * 0.35;
      p.body.position.y = Math.abs(Math.sin(clock * 5)) * 0.15;
    }

    if (fwLeft > 0) {
      fwTimer -= dt;
      if (fwTimer <= 0) {
        fwLeft--;
        fwTimer = 0.35 + Math.random() * 0.4;
        fireworks.launch(new THREE.Vector3((Math.random() * 2 - 1) * 4, 5 + Math.random() * 2.5, -2 - Math.random() * 4));
      }
    }
    fireworks.update(dt);

    if (confetti.visible) {
      bits.forEach((b, i) => {
        b.p.y -= dt * 0.9 * b.s;
        b.p.x += Math.sin(clock * 2 + i) * dt * 0.3;
        b.r.x += dt * 3 * b.s;
        b.r.y += dt * 2;
        if (b.p.y < 0.05) b.p.y = 6 + Math.random() * 2;
        dummy.position.copy(b.p);
        dummy.rotation.copy(b.r);
        dummy.updateMatrix();
        confetti.setMatrixAt(i, dummy.matrix);
      });
      confetti.instanceMatrix.needsUpdate = true;
    }
  }

  return { scene, camera, resize, update, open, refresh };
}
