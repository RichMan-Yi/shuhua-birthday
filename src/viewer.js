import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeBasket } from './models.js';
import { makeWolf, WOLF_PARAMS, WOLF_DEFAULTS, WOLF_REF } from './wolf.js';

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const TARGET = new THREE.Vector3(0, 0.95, 0);

const persp = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
persp.position.set(0, 1.1, 4);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 100);
let camera = persp;

const controls = new OrbitControls(persp, canvas);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.minDistance = 1.2;
controls.maxDistance = 9;
controls.autoRotateSpeed = 2.5;

// soft studio light, close to the reference renders
scene.add(new THREE.HemisphereLight('#FFFFFF', '#B9C0BC', 2.3));
const sun = new THREE.DirectionalLight('#FFF6EC', 1.5);
sun.position.set(1.5, 4, 5);
const rim = new THREE.DirectionalLight('#FFFFFF', 0.9);
rim.position.set(-2, 3, -4);
scene.add(rim);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
sun.shadow.normalBias = 0.02;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// reference image laid over the head at the scale the outline was traced from
const refPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthTest: false, depthWrite: false })
);
refPlane.renderOrder = 20;
refPlane.visible = false;
scene.add(refPlane);
new THREE.TextureLoader().load(WOLF_REF.src, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  refPlane.material.map = tex;
  refPlane.material.needsUpdate = true;
  const { width, height } = tex.image;
  const k = WOLF_REF.unitsPerPx;
  refPlane.scale.set(width * k, height * k, 1);
  refPlane.position.set((width / 2 - WOLF_REF.cx) * k, WOLF_REF.headY + (WOLF_REF.cy - height / 2) * k, 1.2);
});

// ---------- tuned parameters ----------
const TUNE_KEY = 'wolf-tune-v2';
function loadTune() {
  try {
    const saved = JSON.parse(localStorage.getItem(TUNE_KEY) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([k]) => k in WOLF_DEFAULTS));
  } catch (e) {
    return {};
  }
}
const tune = { ...WOLF_DEFAULTS, ...loadTune() };
const history = [];

function changed() {
  return Object.fromEntries(Object.entries(tune).filter(([k, v]) => v !== WOLF_DEFAULTS[k]));
}
function saveTune() {
  try {
    localStorage.setItem(TUNE_KEY, JSON.stringify(changed()));
  } catch (e) {}
}

// ---------- model ----------
let wolf = null;
let parts = null;
let outlines = [];
let surfaces = [];
const basket = makeBasket();
basket.position.set(0, 0.33, 0.33);
const original = makeWolf();
original.visible = false;
scene.add(original);

function collect() {
  outlines = [];
  surfaces = [];
  for (const m of [wolf, original]) {
    m.traverse((o) => {
      if (!o.isMesh || o.parent === basket) return;
      if (o.material.side === THREE.BackSide && o.material.isMeshBasicMaterial) outlines.push(o);
      else surfaces.push(o);
    });
  }
}

function rebuild() {
  const old = wolf;
  wolf = makeWolf(tune);
  if (old) {
    old.remove(basket);
    scene.remove(old);
  }
  wolf.add(basket);
  scene.add(wolf);
  parts = wolf.userData;
  collect();
  if (old) {
    // free geometry the new model no longer shares (cached parts are reused)
    const keep = new Set();
    for (const m of [wolf, original]) m.traverse((o) => o.isMesh && keep.add(o.geometry));
    old.traverse((o) => o.isMesh && !keep.has(o.geometry) && o.geometry.dispose());
  }
  applyLook();
}

// ---------- view state ----------
const state = {
  tab: 'view',
  view: 'front',
  pose: 'idle',
  animate: true,
  spin: false,
  outline: true,
  wire: false,
  bg: 'sky',
  compare: location.hash === '#compare',
  showOriginal: false,
};

const VIEWS = {
  front: { az: 0, polar: 1.45 },
  three: { az: 0.65, polar: 1.3 },
  side: { az: Math.PI / 2, polar: 1.45 },
  other: { az: -Math.PI / 2, polar: 1.45 },
  side3: { az: 1.2, polar: 1.4 },
  back: { az: Math.PI, polar: 1.4 },
  top: { az: 0.3, polar: 0.55 },
};
const BACKGROUNDS = {
  sky: { bg: '#CFE8EE', ground: '#E7F2F1' },
  paper: { bg: '#F5F2EC', ground: '#FFFFFF' },
  grass: { bg: '#BFE2EA', ground: '#8CC56F' },
  night: { bg: '#20262E', ground: '#343C46' },
};

let fly = null;
function setView(name) {
  state.view = name;
  const v = VIEWS[name];
  const dist = persp.position.distanceTo(controls.target);
  const end = new THREE.Vector3(Math.sin(v.polar) * Math.sin(v.az), Math.cos(v.polar), Math.sin(v.polar) * Math.cos(v.az))
    .multiplyScalar(dist)
    .add(TARGET);
  fly = { from: persp.position.clone(), fromTarget: controls.target.clone(), to: end, t: 0 };
}

function applyLook() {
  const b = BACKGROUNDS[state.bg];
  scene.background = new THREE.Color(b.bg);
  ground.material.color.set(b.ground);
  outlines.forEach((o) => (o.visible = state.outline));
  surfaces.forEach((o) => (o.material.wireframe = state.wire));
  refPlane.visible = state.compare;
  wolf.visible = !state.showOriginal;
  original.visible = state.showOriginal;
  camera = state.compare ? ortho : persp;
  controls.enabled = !state.compare;
  controls.autoRotate = state.spin && !state.compare;
  resize();
}

function resetPose(p) {
  p.body.position.set(0, 0, 0);
  p.body.rotation.set(0, 0, 0);
  p.head.rotation.set(0, 0, 0);
  p.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * p.rest.arm));
  p.tail.rotation.set(p.rest.tailX, 0, p.rest.tailZ);
}

function animatePose(p, t) {
  resetPose(p);
  if (state.pose === 'basket') p.arms.forEach((a) => (a.rotation.x = -1.0));
  // the overlay compares the still front pose
  if (!state.animate || state.compare) return;
  const fast = state.pose === 'walk' || state.pose === 'wave';
  p.tail.rotation.z = p.rest.tailZ + Math.sin(t * (fast ? 10 : 4)) * 0.3;
  if (state.pose === 'idle' || state.pose === 'basket') {
    p.head.rotation.z = Math.sin(t * 1.6) * 0.08;
    p.body.position.y = Math.abs(Math.sin(t * 2)) * 0.015;
  } else if (state.pose === 'walk') {
    p.body.position.y = Math.abs(Math.sin(t * 9)) * 0.06;
    p.body.rotation.z = Math.sin(t * 9) * 0.05;
    p.arms[0].rotation.x = Math.sin(t * 9) * 0.6;
    p.arms[1].rotation.x = -Math.sin(t * 9) * 0.6;
  } else if (state.pose === 'wave') {
    p.arms[1].rotation.z = p.rest.arm + 1.5 + Math.sin(t * 8) * 0.35;
    p.head.rotation.z = -0.1;
  }
}

// ---------- view tab ----------
function segmented(id, key, onPick) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    onPick ? onPick(b.dataset.v) : (state[key] = b.dataset.v);
    sync();
    applyLook();
  });
}
segmented('views', 'view', setView);
segmented('poses', 'pose');
segmented('bgs', 'bg');
segmented('tabs', 'tab');

for (const key of ['animate', 'spin', 'outline', 'wire', 'compare']) {
  for (const input of document.querySelectorAll(`[data-opt="${key}"]`)) {
    input.addEventListener('change', () => {
      state[key] = input.checked;
      sync();
      applyLook();
    });
  }
}
for (const range of document.querySelectorAll('[data-opacity]')) {
  range.addEventListener('input', () => {
    refPlane.material.opacity = Number(range.value) / 100;
    document.querySelectorAll('[data-opacity]').forEach((r) => (r.value = range.value));
    document.querySelectorAll('[data-opacity-val]').forEach((s) => (s.textContent = range.value + '%'));
  });
}
// reference gallery with a picture-in-picture view
const REFS = [
  { src: 'ref/3d/3d1.png', label: '正面', view: 'front' },
  { src: 'ref/3d/3d4.png', label: '斜側', view: 'three' },
  { src: 'ref/3d/3d2.png', label: '側面', view: 'side3' },
  { src: 'ref/3d/3d3.png', label: '四面圖', view: null },
  { src: 'ref/01_wolf.png', label: '2D 原圖', view: 'front' },
];
let pipIndex = -1;
function showRef(i) {
  pipIndex = i === pipIndex ? -1 : i;
  $('pip').hidden = pipIndex < 0;
  if (pipIndex >= 0) {
    const r = REFS[pipIndex];
    $('pipImg').src = r.src;
    $('pipLabel').textContent = r.label;
    if (r.view && !state.compare) setView(r.view);
  }
  $('refs').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === pipIndex)));
  sync();
}
$('refs').innerHTML = REFS.map((r) => `<button aria-pressed="false"><img src="${r.src}" alt="">${r.label}</button>`).join('');
$('refs').querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => showRef(i)));
$('pipClose').addEventListener('click', () => showRef(pipIndex));
$('panelToggle').addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('collapsed');
  $('panelToggle').textContent = collapsed ? '展開' : '收合';
  $('panelToggle').setAttribute('aria-expanded', String(!collapsed));
});
$('shot').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `wolf-${state.view}-${Date.now()}.png`;
  a.click();
});

// ---------- tune tab ----------
const fmt = (p, v) => (p.type === 'color' ? v : String(Math.round(v * 1000) / 1000) + (p.unit || ''));
const rows = {};

function buildTunePanel() {
  const root = $('tuneGroups');
  const groups = [...new Set(WOLF_PARAMS.map((p) => p.group))];
  groups.forEach((group, gi) => {
    const details = document.createElement('details');
    details.className = 'tgroup';
    details.open = gi < 2;
    details.innerHTML = `<summary><span>${group}</span><span class="count"></span></summary>`;
    const list = document.createElement('div');
    list.className = 'rows';
    for (const p of WOLF_PARAMS.filter((x) => x.group === group)) {
      const id = 'tune-' + p.key;
      const row = document.createElement('div');
      row.className = 'trow';
      row.innerHTML =
        `<label for="${id}" title="點兩下恢復預設">${p.label}</label>` +
        (p.type === 'color'
          ? `<input id="${id}" type="color">`
          : `<input id="${id}" type="range" min="${p.min}" max="${p.max}" step="${p.step}">`) +
        '<output></output>';
      const el = row.querySelector('input');
      el.value = tune[p.key];
      el.addEventListener('pointerdown', remember);
      el.addEventListener('keydown', remember);
      el.addEventListener('input', () => {
        tune[p.key] = p.type === 'color' ? el.value.toUpperCase() : Number(el.value);
        scheduleRebuild();
      });
      row.querySelector('label').addEventListener('dblclick', () => {
        remember();
        tune[p.key] = WOLF_DEFAULTS[p.key];
        scheduleRebuild();
      });
      rows[p.key] = { p, el, out: row.querySelector('output'), row };
      list.appendChild(row);
    }
    details.appendChild(list);
    root.appendChild(details);
  });
}

let lastRemembered = null;
function remember() {
  const snap = JSON.stringify(tune);
  if (snap === lastRemembered) return;
  history.push(snap);
  if (history.length > 60) history.shift();
  lastRemembered = snap;
}

let pending = false;
function scheduleRebuild() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    rebuild();
    saveTune();
    syncTune();
  });
}

function syncTune() {
  const diff = changed();
  for (const { p, el, out, row } of Object.values(rows)) {
    const v = tune[p.key];
    if (String(el.value).toUpperCase() !== String(v).toUpperCase()) el.value = v;
    out.textContent = fmt(p, v);
    row.classList.toggle('changed', p.key in diff);
  }
  for (const d of document.querySelectorAll('.tgroup')) {
    const n = d.querySelectorAll('.trow.changed').length;
    d.querySelector('.count').textContent = n ? `改了 ${n} 項` : '';
  }
  const n = Object.keys(diff).length;
  $('tuneSummary').textContent = n ? `已調整 ${n} 項，自動存在這個瀏覽器` : '目前都是預設值';
  $('undo').disabled = history.length === 0;
  $('copy').disabled = n === 0;
}

$('undo').addEventListener('click', () => {
  const snap = history.pop();
  if (!snap) return;
  Object.assign(tune, JSON.parse(snap));
  lastRemembered = null;
  scheduleRebuild();
});

const resetBtn = $('resetAll');
resetBtn.addEventListener('click', () => {
  if (!resetBtn.dataset.armed) {
    resetBtn.dataset.armed = '1';
    resetBtn.textContent = '再按一次確認';
    setTimeout(() => {
      delete resetBtn.dataset.armed;
      resetBtn.textContent = '全部重設';
    }, 2500);
    return;
  }
  delete resetBtn.dataset.armed;
  resetBtn.textContent = '全部重設';
  remember();
  Object.assign(tune, WOLF_DEFAULTS);
  scheduleRebuild();
});

$('copy').addEventListener('click', async () => {
  const text = '小狼調整設定 ' + JSON.stringify(changed());
  const box = $('copyText');
  box.value = text;
  try {
    await navigator.clipboard.writeText(text);
    box.hidden = true;
    $('copyNote').textContent = '已複製，直接貼給 Claude 就可以';
  } catch (e) {
    box.hidden = false;
    box.select();
    $('copyNote').textContent = '沒辦法自動複製，請手動複製下面的文字';
  }
});

const hold = $('holdOriginal');
const setOriginal = (on) => {
  if (state.showOriginal === on) return;
  state.showOriginal = on;
  hold.classList.toggle('active', on);
  applyLook();
};
hold.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  setOriginal(true);
});
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(ev, () => setOriginal(false));
hold.addEventListener('keydown', (e) => (e.key === ' ' || e.key === 'Enter') && setOriginal(true));
hold.addEventListener('keyup', () => setOriginal(false));

function sync() {
  for (const [id, key] of [['views', 'view'], ['poses', 'pose'], ['bgs', 'bg'], ['tabs', 'tab']]) {
    $(id).querySelectorAll('button[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state[key])));
  }
  for (const key of ['animate', 'spin', 'outline', 'wire', 'compare']) {
    document.querySelectorAll(`[data-opt="${key}"]`).forEach((i) => (i.checked = state[key]));
  }
  $('compareBox').classList.toggle('on', state.compare);
  $('views').classList.toggle('muted', state.compare);
  $('viewTab').hidden = state.tab !== 'view';
  $('tuneTab').hidden = state.tab !== 'tune';
  document.querySelector('[data-tune-only]').hidden = state.tab !== 'tune';
}

// ---------- loop ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  persp.aspect = w / h;
  persp.updateProjectionMatrix();
  // front orthographic framing around the head for the overlay check
  const halfH = 1.05;
  const halfW = halfH * (w / h);
  Object.assign(ortho, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
  ortho.position.set(0, WOLF_REF.headY - 0.05, 6);
  ortho.lookAt(0, WOLF_REF.headY - 0.05, 0);
  ortho.zoom = w / h < 1 ? Math.max(0.55, (w / h) * 1.05) : 1;
  ortho.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (fly) {
    fly.t = Math.min(1, fly.t + dt * 2.2);
    const e = 1 - Math.pow(1 - fly.t, 3);
    persp.position.lerpVectors(fly.from, fly.to, e);
    controls.target.lerpVectors(fly.fromTarget, TARGET, e);
    if (fly.t >= 1) fly = null;
  }
  controls.update();
  basket.visible = state.pose === 'basket' && !state.showOriginal;
  animatePose(parts, clock.elapsedTime);
  animatePose(original.userData, clock.elapsedTime);
  renderer.render(scene, camera);
  $('tris').textContent = renderer.info.render.triangles.toLocaleString();
});

buildTunePanel();
rebuild();

// a view or tab name in the link (e.g. viewer.html#side, #tune) opens there
const linked = location.hash.slice(1);
if (VIEWS[linked]) {
  setView(linked);
  persp.position.copy(fly.to);
  fly = null;
}
if (linked === 'tune') state.tab = 'tune';
sync();
syncTune();
applyLook();
