import * as THREE from 'three';
import { createMap } from './map.js';
import { SPOTS } from './spots.js';
import { createCrowd } from './wall-data.js';
import { makeFireworks } from './fireworks.js';

// iOS Safari ignores user-scalable=no, so block its pinch and double-tap zoom gestures directly
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
import { NIGHT } from './daylight.js';

// Wish island: the game's island at night, with handwritten notes rising from just above the bottom
// buttons, past the island and up through the night sky like let-go balloons. Higher scores make
// bigger notes that show up more often; the top three hover over landmarks.
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = THREE.MathUtils.clamp;

// the simulated crowd is for developer mode only (#dev, shared with the game); players see real wishes
const DEV_KEY = 'shuhua-dev';
try {
  if (location.hash === '#dev') localStorage.setItem(DEV_KEY, '1');
  if (location.hash === '#nodev') localStorage.removeItem(DEV_KEY);
} catch (e) {}
const dev = (() => {
  try {
    return localStorage.getItem(DEV_KEY) === '1';
  } catch (e) {
    return false;
  }
})();
const crowd = createCrowd({ simulate: dev });
const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const map = createMap({ canvas, spots: SPOTS, isStamped: () => false, onSelect: () => {}, tour: true, time: NIGHT });
const camera = map.camera;

// a few fireworks over the island now and then; a burst of three when someone takes the podium
const fireworks = makeFireworks(map.scene, { scale: 2.2 });
const sky = () => new THREE.Vector3(rnd(-6, 7), rnd(7.5, 10.5), rnd(-5, 6));
let fireIn = 1.2;
function celebrate() {
  [0, 350, 700].forEach((ms) => setTimeout(() => fireworks.launch(sky()), ms));
}

// the castle that was a hill all game long rises once the wall opens; the moment it is up,
// fireworks go off in a ring around it
setTimeout(() => {
  map.revealCastle(3.5, () => {
    // clear the stage: notes that were floating in front of the castle bow out quickly
    const box = castleRect();
    for (const n of live) if (!n.podium && box && overlaps(boxAt(n.sx, n.sy, n.w, n.h), box, 0)) n.out ??= 0.8;
    const c = map.castleAt;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      setTimeout(() => fireworks.launch(new THREE.Vector3(c.x + Math.cos(a) * 3.2, rnd(5, 6.5), c.z + Math.sin(a) * 3.2)), i * 90);
    }
    setTimeout(() => fireworks.launch(new THREE.Vector3(c.x, 8.5, c.z)), 650);
    setTimeout(celebrate, 1400);
  });
}, 1200);

// ---------- notes ----------
const PAPERS = ['#FFFDF5', '#FFF4D6', '#FDE7EA', '#E8F4EC', '#E6F0FA', '#FFF0E0'];
const INKS = ['#2B4C7E', '#B03A48', '#2F6B4F', '#6A3F8C', '#3A3A3A', '#C2562B'];
const TAPES = ['rgba(232, 104, 92, 0.35)', 'rgba(127, 208, 230, 0.5)', 'rgba(158, 211, 106, 0.45)', 'rgba(201, 160, 240, 0.4)'];
const PODIUM_SPOTS = ['lalashan', 'xpark', 'night'];
const CROWN = `<svg class="doodle" viewBox="0 0 60 44" aria-hidden="true"><path d="M8 38 C7 28 5 20 3 11 C10 17 15 21 19 24 C23 17 27 10 30 3 C33 10 37 17 41 24 C45 21 50 17 57 11 C55 20 53 28 52 38 C38 40 22 40 8 38 Z" fill="#FFE07A" stroke="#A8780E" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="30" cy="28" r="3.6" fill="#E8685C"/><circle cx="17" cy="31" r="2.4" fill="#7FD0E6"/><circle cx="43" cy="31" r="2.4" fill="#7FD0E6"/></svg>`;
const MEDAL = (n, fill, stroke) => `<svg class="doodle" viewBox="0 0 60 44" aria-hidden="true"><path d="M22 2 L27 18 M38 2 L33 18" stroke="#E8685C" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="27" r="14" fill="${fill}" stroke="${stroke}" stroke-width="2.6"/><text x="30" y="33" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="19" fill="${stroke}">${n}</text></svg>`;

const notesEl = $('notes');
const strings = $('strings');
const live = [];
const isPhone = () => innerWidth < 600;
const maxNotes = () => (isPhone() ? 14 : 18);
// every floating note rises at the same speed, so notes that start clear of each other stay clear
const RISE = () => (isPhone() ? 26 : 32); // px per second
const rnd = (a, b) => a + Math.random() * (b - a);
const any = (arr) => arr[Math.floor(Math.random() * arr.length)];
const latinOnly = (s) => /^[\x00-\x7F]*$/.test(s);

function makeNote(p, { podium = 0, fresh = false } = {}) {
  const el = document.createElement('div');
  const top = crowd.rankOf(p) <= 10;
  el.className = `note${top ? ' top10' : ''}${p.mine ? ' mine' : ''}${podium ? ' podium' : ''}`;
  const standing = crowd.standing(p);
  const base = isPhone() ? 10.5 : 13;
  const size = (base + (isPhone() ? 4 : 6) * standing ** 2.2) * (podium && !isPhone() ? 1.15 : 1) * (p.mine || fresh ? 1.1 : 1);
  el.style.setProperty('--size', `${size.toFixed(1)}px`);
  el.dataset.size = size;
  el.style.setProperty('--paper-c', podium === 1 ? '#FFF3C4' : any(PAPERS));
  el.style.setProperty('--ink-c', any(INKS));
  el.style.setProperty('--tape-c', top ? 'rgba(217, 160, 33, 0.55)' : any(TAPES));
  el.style.setProperty('--tape', `${rnd(-9, 9).toFixed(1)}deg`);
  const doodle = podium === 1 ? CROWN : podium === 2 ? MEDAL(2, '#EEF2F6', '#7A8794') : podium === 3 ? MEDAL(3, '#FBE7D8', '#A8693C') : '';
  const badge = fresh ? '<span class="badge">新</span>' : p.mine ? '<span class="badge">你</span>' : '';
  el.innerHTML = `${doodle}${badge}<i class="tape"></i><p class="wish" lang="${latinOnly(p.wish) ? 'en' : 'zh'}">${esc(p.wish)}</p>
    <span class="sign">— <b>${esc(p.name)}</b>　#${fmt(crowd.rankOf(p))}</span><span class="pts">${fmt(p.score)}</span>`;
  notesEl.appendChild(el);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'rgba(255, 255, 255, 0.9)');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-dasharray', '3 5');
  line.setAttribute('stroke-linecap', 'round');
  strings.appendChild(line);
  return { el, line };
}

const tmp = new THREE.Vector3();
function toScreen(v) {
  tmp.copy(v).project(camera);
  return { x: (tmp.x * 0.5 + 0.5) * innerWidth, y: (-tmp.y * 0.5 + 0.5) * innerHeight, behind: tmp.z > 1 };
}

// screen boxes notes must stay clear of: the title note and the bottom buttons
function blockers() {
  return [document.querySelector('.title'), document.querySelector('.dock .btn')].map((el) => el.getBoundingClientRect());
}
// the castle's screen box, so new notes don't pop up in front of it
const castleBox = new THREE.Box3();
function castleRect() {
  if (!map.castleUp) return null;
  castleBox.setFromObject(map.castle);
  const pts = [];
  for (const x of [castleBox.min.x, castleBox.max.x])
    for (const y of [castleBox.min.y, castleBox.max.y]) for (const z of [castleBox.min.z, castleBox.max.z]) pts.push(toScreen(new THREE.Vector3(x, y, z)));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}
const overlaps = (a, b, pad = 10) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
const boxAt = (x, y, w, h) => ({ left: x - w / 2, right: x + w / 2, top: y - h, bottom: y });

// the highest a floating note may rise: just under the title note
const ceiling = () => document.querySelector('.title').getBoundingClientRect().bottom + 8;

// where floating notes start: their bottom edge just above the buttons
const floor = () => document.querySelector('.dock .btn').getBoundingClientRect().top - 12;

// A spot along the bottom where a w × h note won't cover another note. Floating notes all rise
// together, so a note that starts clear stays clear all the way up.
function freeStart(w, h) {
  // the castle and the podium are not off limits: notes rising past them just step back (see updateNotes)
  const taken = live.filter((n) => !n.podium).map((n) => boxAt(n.sx, n.sy, n.w, n.h));
  const y = floor();
  for (let i = 0; i < 16; i++) {
    const x = rnd(w / 2 + 16, innerWidth - w / 2 - 16);
    if (!taken.some((t) => overlaps(boxAt(x, y, w, h), t, 8))) return { x, y };
  }
  return null;
}

function spawn(p, { fresh = false, hold = 0, force = false } = {}) {
  if (!p || crowd.rankOf(p) <= 3) return false; // the top three are always up over their landmarks
  if (live.some((n) => n.entry === p && !n.podium)) return false;
  const { el, line } = makeNote(p, { fresh });
  line.remove(); // floating notes aren't tied to the island
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let start = freeStart(w, h);
  if (!start) {
    if (!force) {
      el.remove();
      return false; // no room right now; try again shortly
    }
    start = { x: rnd(w / 2 + 16, innerWidth - w / 2 - 16), y: floor() };
  }
  live.push({
    entry: p,
    el,
    startX: start.x,
    startY: start.y,
    age: 0,
    hold, // seconds a looked-up note waits at the top before leaving
    rot: rnd(-7, 7),
    w,
    h,
    sx: -9999,
    sy: -9999,
  });
  el.addEventListener('click', () => toggleZoom(live.find((x) => x.el === el)));
  return true;
}

function retire(n) {
  n.el.remove();
  n.line?.remove();
  live.splice(live.indexOf(n), 1);
}

// bring a note up (spawning it if it isn't showing) and zoom it to the middle of the screen
function focusNote(p) {
  let n = live.find((x) => x.entry === p);
  if (!n) {
    spawn(p, { hold: 6, force: true });
    n = live.find((x) => x.entry === p && !x.podium);
  }
  if (!n) return;
  n.hold = Math.max(n.hold || 0, 6);
  n.out = undefined;
  if (zoomed !== n) toggleZoom(n);
}

// tap a note: it grows to the middle of the screen, in front of everything; tap again to put it back
let zoomed = null;
const scrim = document.createElement('div');
scrim.className = 'zoom-scrim';
notesEl.appendChild(scrim);
scrim.addEventListener('click', () => (zoomed = null));
function toggleZoom(n) {
  if (!n) return;
  zoomed = zoomed === n ? null : n;
  if (zoomed) notesEl.appendChild(n.el); // on top of the other notes
}
const smooth = (t) => t * t * (3 - 2 * t);

// the top three stay up, each over its own landmark
function renderPodium() {
  live.filter((n) => n.podium).forEach(retire);
  crowd.ranked.slice(0, 3).forEach((p, i) => {
    const { el, line } = makeNote(p, { podium: i + 1 });
    const id = PODIUM_SPOTS[i];
    const anchor = map.above(id, i === 0 ? 0.9 : 0.6);
    const s = SPOTS.find((x) => x.id === id);
    live.push({ entry: p, el, line, podium: i + 1, ground: new THREE.Vector3(s.pos[0], s.labelY, s.pos[1]), anchor, base: anchor.y, age: 0, rot: [-2, 3, -3][i], w: el.offsetWidth, h: el.offsetHeight, sx: -9999, sy: -9999 });
    el.addEventListener('click', () => toggleZoom(live.find((x) => x.el === el)));
  });
}

// weighted by standing: the top shows up most, but everyone gets a turn
const recent = [];
function nextEntry() {
  const list = crowd.ranked;
  if (list.length <= 3) return null; // everyone is already up on the podium
  for (let i = 0; i < 400; i++) {
    const p = list[3 + Math.floor(Math.random() * (list.length - 3))];
    if (recent.includes(p) || live.some((n) => n.entry === p)) continue;
    if (Math.random() < 0.15 + 0.85 * crowd.standing(p) ** 3) {
      recent.push(p);
      if (recent.length > 80) recent.shift();
      return p;
    }
  }
  return any(list);
}

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
function updateNotes(dt, time) {
  const camDist = camera.position.distanceTo(map.scene.position);
  const ui = blockers();
  const pinned = []; // podium boxes this frame, placed in rank order
  const keep = castleRect(); // the castle stays in view: podium notes go above it, others fade
  // podium first, so floating notes know where it sits
  let dim = 0;
  for (const n of [...live].sort((a, b) => (a.podium || 9) - (b.podium || 9))) {
    n.zk = clamp((n.zk || 0) + (zoomed === n ? dt : -dt) * 5, 0, 1);
    if (!n.zk) n.age += dt; // a zoomed note holds still (and keeps its place) until it is let go
    const g = n.podium ? toScreen(n.ground) : null;
    const pop = n.age < 0.4 ? easeOutBack(n.age / 0.4) : 1;
    n.focus = Math.max(0, (n.focus || 0) - dt * 0.3);
    let s, fade = 1, scale;
    if (n.podium) {
      n.anchor.y = n.base + Math.sin(time * 1.3 + n.podium) * 0.12;
      s = toScreen(n.anchor);
      const depth = clamp(camDist / n.anchor.distanceTo(camera.position), 0.8, 1.25);
      n.podiumScale = depth * (isPhone() ? 0.78 : 1); // smaller on phones, leaving room for the rising notes
      scale = pop * n.podiumScale * (1 + n.focus * 0.15);
    } else {
      // pop in just above the buttons, then rise past the island and up through the sky
      s = { x: n.startX + Math.sin(time * 0.8 + n.rot) * 5, y: n.startY - n.age * RISE(), behind: false };
      scale = pop * (1 + n.focus * 0.15);
      // a note that was looked up waits at the top for a while; others fade out over the last 50px
      const room = s.y - n.h * scale - ceiling();
      if (room <= 0) {
        s.y = ceiling() + n.h * scale;
        n.hold = Math.max(0, (n.hold || 0) - dt);
        if (!n.hold) n.out ??= 0.5;
      }
      fade = n.hold > 0 ? 1 : clamp(room / 50, 0, 1);
      if (n.out !== undefined) {
        n.out -= dt;
        fade *= clamp(n.out / 0.5, 0, 1);
        if (n.out <= 0) n.done = true;
      }
    }
    const w = n.w * scale, h = n.h * scale;
    // keep the whole note (and its score tag) on screen
    s.x = clamp(s.x, w / 2 + 22, innerWidth - w / 2 - 22);
    s.y = Math.max(s.y, h + 12);
    if (n.podium) {
      if (keep && overlaps(boxAt(s.x, s.y, w, h), keep, 6)) s.y = Math.max(h + 12, keep.top - 10);
      // lower ranks step down below anything already placed
      for (const b of [...ui, ...pinned]) if (overlaps(boxAt(s.x, s.y, w, h), b, 6)) s.y = b.bottom + h + 12;
      pinned.push(boxAt(s.x, s.y, w, h));
    } else if (!n.focus) {
      // rising past a podium note or the castle: step back so they stay readable
      if (pinned.some((b) => overlaps(boxAt(s.x, s.y, w, h), b, 0))) fade *= 0.3;
      else if (keep && overlaps(boxAt(s.x, s.y, w, h), keep, 0)) fade *= 0.6;
    }
    // glide toward where the rules above put the note, never jump: a podium note that steps
    // around the castle or another note slides there, and fading in or out is gradual too
    const glide = 1 - Math.exp(-dt * 3);
    if (n.px === undefined) [n.px, n.py, n.alpha] = [s.x, s.y, 0];
    if (n.podium) {
      // eased, and never faster than 160px a second
      const dx = (s.x - n.px) * glide, dy = (s.y - n.py) * glide;
      const cap = Math.min(1, (160 * dt) / (Math.hypot(dx, dy) || 1));
      n.px += dx * cap;
      n.py += dy * cap;
    } else [n.px, n.py] = [s.x, s.y]; // floating notes already move smoothly on their own
    n.alpha += ((s.behind ? 0 : Math.max(0, fade)) - n.alpha) * (1 - Math.exp(-dt * 8));
    n.sx = n.px;
    n.sy = n.py;
    let x = n.px, y = n.py, rot = n.rot, alpha = n.alpha;
    if (n.zk) {
      // blend toward the middle of the screen, big and straight
      const k = smooth(n.zk);
      const big = Math.min((innerWidth * 0.84) / n.w, (innerHeight * 0.42) / n.h, 3.2);
      x += (innerWidth / 2 - x) * k;
      y += (innerHeight / 2 + (n.h * big) / 2 - y) * k;
      scale += (big - scale) * k;
      rot *= 1 - k;
      alpha += (1 - alpha) * k;
      if (zoomed === n) n.out = undefined;
      dim = Math.max(dim, k);
    }
    // a zoomed note grows through its font size, not a scale transform: a transform only stretches the
    // already-drawn note like a picture (blurry), while a bigger font is drawn again, sharp
    if (n.zk) {
      n.el.style.fontSize = `${(n.el.dataset.size * scale).toFixed(2)}px`;
      scale = 1;
    } else if (n.el.style.fontSize) n.el.style.fontSize = '';
    n.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    n.el.style.opacity = alpha.toFixed(3);
    n.el.style.zIndex = n.zk ? 30 : n.podium ? 5 : n.focus > 0 ? 6 : 1;
    if (n.line) {
      // podium notes hang from a dotted string over their landmark
      const bend = Math.sin(time * 1.5 + n.rot) * 14;
      n.line.setAttribute('d', `M${g.x.toFixed(1)} ${g.y.toFixed(1)} Q${((g.x + s.x) / 2 + bend).toFixed(1)} ${((g.y + s.y) / 2).toFixed(1)} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`);
      n.line.style.opacity = s.behind || g.behind ? 0 : (Math.max(0, fade) * 0.9 * (1 - (n.zk || 0))).toFixed(3);
    }
    if (n.done) retire(n);
  }
  if (zoomed && !live.includes(zoomed)) zoomed = null;
  // while a note is zoomed the notes layer sits above the title and buttons, with a dim behind it
  scrim.style.opacity = (dim * 0.55).toFixed(3);
  scrim.style.pointerEvents = zoomed ? 'auto' : 'none';
  notesEl.style.zIndex = dim > 0 ? 10 : '';
}

// ---------- ranking notebook ----------
const PER_PAGE = 15;
let page = 0;
const row = (p) =>
  `<li class="${p.mine ? 'mine' : ''}${crowd.rankOf(p) <= 3 ? ' podium' : ''}" data-rank="${crowd.rankOf(p)}"><span class="r">#${fmt(crowd.rankOf(p))}</span><span class="n">${esc(p.name)}</span><span class="w">${esc(p.wish)}</span><span class="s">${fmt(p.score)}</span></li>`;
function renderList() {
  const q = $('q').value.trim().toLowerCase();
  const all = crowd.ranked;
  if (q) {
    const hits = all.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 30);
    $('list').innerHTML = hits.map(row).join('');
    $('hint').textContent = hits.length ? `找到 ${hits.length} 則，點一下就會在地圖上冒出來。` : '找不到這個名字。';
    $('hint').hidden = false;
    $('page').parentElement.hidden = true;
    return;
  }
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  page = clamp(page, 0, pages - 1);
  $('list').innerHTML = all.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map(row).join('');
  $('page').textContent = `${page + 1} / ${pages}`;
  $('prev').disabled = page === 0;
  $('next').disabled = page >= pages - 1;
  $('page').parentElement.hidden = false;
  $('hint').textContent = '點任何一則，它就會在地圖上冒出來。';
}
function openBook() {
  if (crowd.me) {
    $('meLine').hidden = false;
    $('meLine').textContent = `你的祝福「${crowd.me.wish}」目前排第 ${fmt(crowd.rankOf(crowd.me))} 名，${fmt(crowd.me.score)} 分。`;
    page = Math.floor((crowd.rankOf(crowd.me) - 1) / PER_PAGE);
  }
  renderList();
  $('drawer').hidden = false;
}
$('openBook').addEventListener('click', openBook);
$('closeBook').addEventListener('click', () => ($('drawer').hidden = true));
$('drawer').addEventListener('click', (e) => e.target === $('drawer') && ($('drawer').hidden = true));
$('q').addEventListener('input', () => ((page = 0), renderList()));
$('prev').addEventListener('click', () => (page--, renderList()));
$('next').addEventListener('click', () => (page++, renderList()));
$('list').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-rank]');
  if (!li) return;
  $('drawer').hidden = true;
  const p = crowd.ranked[li.dataset.rank - 1];
  focusNote(p); // pops it up on the island and zooms it in
});

// ---------- loop ----------
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  strings.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
  map.resize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();
function renderCount() {
  $('count').textContent = fmt(crowd.size);
  $('countLine').hidden = !crowd.size;
  $('empty').hidden = !!crowd.size;
}
renderCount();
$('sim').hidden = !crowd.simulated;
document.fonts?.load('58px Huninn', SPOTS.map((s) => s.name).join('')).then(() => map.refreshLabels(), () => {});

renderPodium();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let spawnIn = 0.4;
let arriveIn = 4;
let sinceMine = 0;
const waiting = []; // new arrivals waiting for a clear spot
if (crowd.me && location.hash === '#me') setTimeout(() => focusNote(crowd.me), 2200); // after the castle has started rising

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  map.update(dt);
  renderer.render(map.scene, camera);

  spawnIn -= dt;
  const floating = live.filter((n) => !n.podium).length;
  if (spawnIn <= 0 && floating < maxNotes()) {
    spawnIn = rnd(0.7, 1.4) * (reduced ? 2.5 : 1);
    // your own wish comes back around every so often
    let placed;
    if (waiting.length) {
      // new arrivals first, as soon as there is room for them
      placed = spawn(waiting[0], { fresh: true });
      if (placed) waiting.shift();
    } else if (crowd.me && ++sinceMine > 24) {
      placed = spawn(crowd.me);
      if (placed) sinceMine = 0;
    } else placed = spawn(nextEntry());
    if (!placed) spawnIn = 0.3;
  }
  arriveIn -= dt;
  if (crowd.simulated && arriveIn <= 0) {
    arriveIn = rnd(3, 7);
    const p = crowd.arrive();
    renderCount();
    if (crowd.rankOf(p) <= 3) {
      renderPodium();
      celebrate();
    }
    else waiting.push(p);
  }
  fireIn -= dt;
  if (fireIn <= 0) {
    fireIn = rnd(3.5, 8) * (reduced ? 2 : 1);
    fireworks.launch(sky());
  }
  fireworks.update(dt);
  updateNotes(dt, time);
});
