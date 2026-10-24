import * as THREE from 'three';
import { SPOTS } from './spots.js';
import { createMap } from './map.js';
import { createShell, fmtScore } from './games/shell.js';
import { createPeachGame } from './games/peach.js';
import { createDaxiGame } from './games/daxi.js';
import { createShimenGame } from './games/shimen.js';
import { createXparkGame } from './games/xpark.js';
import { createNightGame } from './games/night.js';
import { createEnding } from './ending.js';
import { setMuted } from './audio.js';

// iOS Safari ignores user-scalable=no, so block its pinch and double-tap zoom gestures directly
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// The flow (see GAME_FLOW.md): a level can be replayed until it is passed; the passing run's
// score is locked in. With all five passed the player sends a birthday wish, and can then
// reset the whole run to play again.
const SAVE_KEY = 'shuhua-taoyuan-v2';
export const WALL_KEY = 'shuhua-wall-mine';

const fresh = () => ({ stamps: {}, scores: {}, partySeen: false, submitted: null });
function loadSave() {
  const base = { ...fresh(), muted: false };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch (e) {}
  return base;
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {}
}

const $ = (id) => document.getElementById(id);
const save = loadSave();
const canvas = $('stage');
setMuted(save.muted);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  $('loading').querySelector('p').textContent = '這個瀏覽器沒辦法顯示 3D 畫面，換成 Safari 或 Chrome 再試一次。';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Developer mode (#dev turns it on and remembers it, #nodev turns it off): passed levels stay
// playable, and a small toolbar can reset progress, clear everything, or preview the sky.
const DEV_KEY = 'shuhua-dev';
let dev = false;
try {
  if (location.hash === '#dev') localStorage.setItem(DEV_KEY, '1');
  if (location.hash === '#nodev') localStorage.removeItem(DEV_KEY);
  dev = localStorage.getItem(DEV_KEY) === '1';
} catch (e) {}

const allStamped = () => SPOTS.every((s) => save.stamps[s.id]);
const totalScore = () => SPOTS.reduce((sum, s) => sum + (save.scores[s.id] || 0), 0);

// ---------- map UI ----------
const sheet = {
  root: $('sheet'),
  area: $('sheetArea'),
  name: $('sheetName'),
  blurb: $('sheetBlurb'),
  game: $('sheetGame'),
  go: $('sheetGo'),
};
let current = null;

function renderStamps() {
  const got = SPOTS.filter((s) => save.stamps[s.id]).length;
  $('stampRow').innerHTML = SPOTS.map(
    (s) =>
      `<li class="stamp${save.stamps[s.id] ? ' got' : ''}${current?.id === s.id ? ' current' : ''}"><button type="button" data-spot="${s.id}" aria-label="${s.name}${save.stamps[s.id] ? '（已蓋章）' : ''}"><i>${s.stamp}</i></button></li>`
  ).join('');
  $('stampCount').textContent = `${got} / ${SPOTS.length}`;
  $('partyBtn').hidden = !allStamped();
  $('totalBtn').textContent = `總分 ${fmtScore(totalScore())}`;
}

// tell the map how much of the screen the cards cover, so it frames the open space between them
function syncInsets() {
  const top = document.querySelector('#mapUI .top').getBoundingClientRect().bottom;
  const low = sheet.root.hidden ? $('hint') : sheet.root;
  map.setInsets(top, low.hidden ? 0 : window.innerHeight - low.getBoundingClientRect().top);
}

function showSheet(spot) {
  current = spot;
  for (const b of $('stampRow').querySelectorAll('button')) b.parentElement.classList.toggle('current', b.dataset.spot === spot?.id);
  $('hint').hidden = !!spot;
  if (spot) $('soundTip').hidden = true; // the sound reminder is only for the first look at the map
  sheet.root.hidden = !spot;
  requestAnimationFrame(syncInsets);
  if (!spot) return;
  const got = !!save.stamps[spot.id];
  sheet.area.textContent = spot.area;
  sheet.name.textContent = spot.name;
  sheet.blurb.textContent = spot.blurb;
  sheet.game.textContent = got ? `${spot.game}・${fmtScore(save.scores[spot.id])} 分` : spot.game;
  sheet.root.classList.toggle('got', got);
  // a passed level is locked until the whole run is reset (developer mode can replay it)
  sheet.go.disabled = (got && !dev) || !spot.ready;
  sheet.go.textContent = got ? (dev ? '再玩一次（開發）' : '已通關') : '開始挑戰';
}

// the sky follows progress: noon at the start, one step toward night per cleared level
const cleared = () => SPOTS.filter((s) => save.stamps[s.id]).length;
const SKY_NOTES = ['', '太陽稍微偏西了', '陽光開始變得金黃', '黃金時刻，夜市的燈亮起來了', '夕陽染紅了天空', '天黑了，星星出來了'];
let skyStage = cleared();
const map = createMap({
  canvas,
  spots: SPOTS,
  isStamped: (id) => !!save.stamps[id],
  onSelect: showSheet,
  time: skyStage,
});
function syncSky() {
  const stage = cleared();
  if (stage === skyStage) return;
  map.setTime(stage, stage > skyStage ? 4 : 2.5);
  const note = stage > skyStage ? SKY_NOTES[stage] : '時間回到中午';
  skyStage = stage;
  const el = $('skyNote');
  el.textContent = note;
  el.hidden = !note;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(syncSky.timer);
  syncSky.timer = setTimeout(() => (el.hidden = true), 4200);
}

$('sheetClose').addEventListener('click', () => map.deselect());
// each stamp in the top card doubles as a shortcut to its landmark
$('stampRow').addEventListener('click', (e) => {
  const id = e.target.closest('button[data-spot]')?.dataset.spot;
  if (id) map.select(id);
});
sheet.root.addEventListener('animationend', syncInsets); // measure again once the card has risen into place

// ---------- settlement: total score, wish, reset ----------
function openSummary() {
  $('sumTotal').textContent = fmtScore(totalScore());
  $('sumRows').innerHTML = SPOTS.map((s) => {
    const done = save.stamps[s.id];
    const mark = done ? '<i class="mini-seal">印</i>' : '';
    return `<li><span>${mark}${s.name}・${s.game}</span><b>${done ? fmtScore(save.scores[s.id]) : '未通關'}</b></li>`;
  }).join('');
  const left = SPOTS.length - SPOTS.filter((s) => save.stamps[s.id]).length;
  $('sumNote').textContent = save.submitted
    ? `已經用「${save.submitted.name}」送出祝福了。想再挑戰的話，可以重置重新開始。`
    : left
      ? `還有 ${left} 關沒通關。五關都通關後，就能用總分送出生日祝福。`
      : '五關都通關了！送出生日祝福，你的名字和總分會出現在祝福島上。';
  $('sumWish').hidden = !allStamped() || !!save.submitted;
  $('sumWall').hidden = !save.submitted;
  $('sumReset').hidden = !save.submitted;
  disarm($('sumReset'), '重置，重新挑戰');
  $('summary').hidden = false;
}
$('totalBtn').addEventListener('click', openSummary);
$('sumClose').addEventListener('click', () => ($('summary').hidden = true));
$('sumWish').addEventListener('click', () => {
  $('summary').hidden = true;
  openWish();
});

// two-step buttons for anything that can't be undone
function disarm(btn, label) {
  delete btn.dataset.armed;
  btn.textContent = label;
}
function armed(btn, label, confirmLabel) {
  if (btn.dataset.armed) return true;
  btn.dataset.armed = '1';
  btn.textContent = confirmLabel;
  setTimeout(() => btn.dataset.armed && disarm(btn, label), 3000);
  return false;
}
$('sumReset').addEventListener('click', () => {
  if (!armed($('sumReset'), '重置，重新挑戰', '再按一次確認重置')) return;
  Object.assign(save, fresh());
  writeSave();
  $('summary').hidden = true;
  map.deselect();
  renderStamps();
  map.refreshLabels();
  syncSky();
});

const NAME_OK = /^[A-Za-z0-9 ]{1,10}$/;
const graphemes = (s) => [...s].length;
function openWish() {
  $('wishTotal').textContent = fmtScore(totalScore());
  $('wishForm').hidden = false;
  $('wishDone').hidden = true;
  $('wishError').textContent = '';
  $('wishUI').hidden = false;
  syncWishCounts();
}
// the on-screen keyboard covers the lower half of the screen (and iOS pans the page), so while it is
// up the wish dialog is fitted to the visible part above it, and the focused field kept in view
const wishOverlay = document.querySelector('#wishUI .overlay');
function fitWish() {
  const vv = window.visualViewport;
  if (!vv || $('wishUI').hidden) return;
  const keyboard = window.innerHeight - vv.height > 120;
  wishOverlay.classList.toggle('keyboard', keyboard);
  wishOverlay.style.height = keyboard ? vv.height + 'px' : '';
  wishOverlay.style.transform = keyboard ? `translateY(${vv.offsetTop}px)` : '';
  if (keyboard) document.activeElement?.closest('.field')?.scrollIntoView({ block: 'nearest' });
}
window.visualViewport?.addEventListener('resize', fitWish);
window.visualViewport?.addEventListener('scroll', fitWish);
for (const id of ['wishName', 'wishText']) {
  $(id).addEventListener('focus', () => setTimeout(fitWish, 300)); // after the keyboard has slid up
  $(id).addEventListener('blur', () => setTimeout(fitWish, 300));
}

function syncWishCounts() {
  $('wishNameCount').textContent = `${$('wishName').value.length}/10`;
  $('wishTextCount').textContent = `${graphemes($('wishText').value)}/30`;
}
$('wishName').addEventListener('input', (e) => {
  // keep only letters, digits and spaces, as the wall allows
  const clean = e.target.value.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 10);
  if (clean !== e.target.value) e.target.value = clean;
  syncWishCounts();
});
$('wishText').addEventListener('input', (e) => {
  const chars = [...e.target.value];
  if (chars.length > 30) e.target.value = chars.slice(0, 30).join('');
  syncWishCounts();
});
$('wishForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('wishName').value.trim().replace(/\s+/g, ' ');
  const wish = $('wishText').value.trim();
  if (!NAME_OK.test(name)) return ($('wishError').textContent = '名字請用 1–10 個英文字母、數字或空白。');
  if (!wish) return ($('wishError').textContent = '寫一句給舒華的生日祝福吧。');
  const entry = { name, wish, score: totalScore(), at: Date.now() };
  save.submitted = entry;
  writeSave();
  // the wall page reads this until there is a real shared leaderboard
  try {
    localStorage.setItem(WALL_KEY, JSON.stringify(entry));
  } catch (err) {}
  $('wishForm').hidden = true;
  $('wishDone').hidden = false;
  $('wishDoneText').textContent = `「${name}」的祝福和 ${fmtScore(entry.score)} 分已經送出。`;
  renderStamps();
  ending?.refresh();
});
$('wishClose').addEventListener('click', () => ($('wishUI').hidden = true));

// ---------- mini games ----------
let mode = 'map'; // map | game | ending
let active = null;

const shell = createShell({
  onResult(id, { score, progress, failed }, target) {
    const passed = !failed && progress >= target;
    // only a passing run counts; it is locked in with the stamp (developer replays overwrite it)
    if (passed && (!save.stamps[id] || dev)) {
      save.stamps[id] = true;
      save.scores[id] = score;
      writeSave();
    }
    return { passed, newStamp: passed, recorded: passed, total: totalScore(), allDone: allStamped(), replay: dev };
  },
  onExit() {
    active = null;
    backToMap();
    // the fifth stamp opens the party right away, once
    if (allStamped() && !save.partySeen) openParty();
  },
});

const ctx = { canvas, renderer };
const FACTORIES = {
  lalashan: createPeachGame,
  daxi: createDaxiGame,
  shimen: createShimenGame,
  xpark: createXparkGame,
  night: createNightGame,
};
const games = {};
function game(id) {
  if (!games[id]) {
    games[id] = FACTORIES[id](shell, ctx);
    games[id].resize(window.innerWidth, window.innerHeight);
  }
  return games[id];
}

function openGame(id) {
  if (save.stamps[id] && !dev) return;
  mode = 'game';
  active = game(id);
  map.setActive(false);
  $('mapUI').hidden = true;
  shell.enter(active);
}

function backToMap() {
  mode = 'map';
  $('mapUI').hidden = false;
  map.setActive(true);
  renderStamps();
  map.refreshLabels();
  showSheet(current);
  syncSky();
}

sheet.go.addEventListener('click', () => current?.ready && openGame(current.id));

function syncMute() {
  $('gMute').textContent = save.muted ? '靜音' : '音效';
  $('gMute').setAttribute('aria-pressed', String(!save.muted));
}
$('gMute').addEventListener('click', () => {
  save.muted = !save.muted;
  setMuted(save.muted);
  writeSave();
  syncMute();
});
syncMute();

// ---------- birthday party ----------
let ending = null;
function openParty() {
  ending ??= createEnding({
    canvas,
    onExit() {
      backToMap();
    },
    onWish: openWish,
    submitted: () => !!save.submitted,
  });
  ending.resize(window.innerWidth, window.innerHeight);
  save.partySeen = true;
  writeSave();
  $('endTotal').textContent = fmtScore(totalScore());
  mode = 'ending';
  map.setActive(false);
  $('mapUI').hidden = true;
  ending.open();
}
$('partyBtn').addEventListener('click', openParty);

// ---------- developer toolbar ----------
if (dev) {
  const bar = $('devBar');
  bar.hidden = false;
  let devSky = null;
  const refresh = () => {
    writeSave();
    map.deselect();
    renderStamps();
    map.refreshLabels();
    syncSky();
  };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-dev]');
    if (!b) return;
    if (b.dataset.dev === 'reset') {
      Object.assign(save, fresh());
      refresh();
    } else if (b.dataset.dev === 'clear') {
      // every stamp with a plausible score, so the party and the wish form can be tested
      SPOTS.forEach((s) => {
        save.stamps[s.id] = true;
        save.scores[s.id] ??= 850 + Math.round(Math.random() * 500); // about a just-passing run (1,000)
      });
      save.partySeen = false;
      save.submitted = null;
      refresh();
    } else {
      devSky = Math.max(0, Math.min(6, (devSky ?? skyStage) + (b.dataset.dev === 'later' ? 1 : -1)));
      map.setTime(devSky, 1.2);
      $('devSky').textContent = devSky;
    }
  });
}

// ---------- loop ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  map.resize(w, h);
  syncInsets();
  Object.values(games).forEach((g) => g.resize(w, h));
  ending?.resize(w, h);
}
window.addEventListener('resize', resize);
resize();
renderStamps();

// redraw the 3D name tags once the rounded font arrives
document.fonts?.load('58px Huninn', SPOTS.map((s) => s.name).join('') + '✓').then(() => map.refreshLabels(), () => {});

// dev shortcuts: #game-<spot id> opens a mini game, #party opens the ending
const hash = location.hash.slice(1);
if (hash.startsWith('game-') && FACTORIES[hash.slice(5)]) {
  showSheet(SPOTS.find((s) => s.id === hash.slice(5)));
  openGame(hash.slice(5));
} else if (hash === 'party') openParty();

const clock = new THREE.Clock();
let first = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'game' && active) {
    shell.update(dt);
    active.update(dt);
    renderer.render(active.scene, active.camera);
  } else if (mode === 'ending') {
    ending.update(dt);
    renderer.render(ending.scene, ending.camera);
  } else {
    map.update(dt);
    renderer.render(map.scene, map.camera);
  }
  if (first) {
    first = false;
    $('loading').classList.add('out');
    setTimeout(() => ($('loading').hidden = true), 500);
  }
});
