import * as THREE from 'three';
import { sfx } from '../audio.js';

export const fmtScore = (n) => Math.round(n).toLocaleString('en-US');

// Running score with a per-source breakdown for the result card.
export function tally() {
  const parts = new Map();
  return {
    total: 0,
    add(label, value) {
      parts.set(label, (parts.get(label) || 0) + value);
      this.total += value;
      return value;
    },
    lines: () => [...parts].filter(([, v]) => Math.round(v) !== 0),
    reset() {
      parts.clear();
      this.total = 0;
    },
  };
}

// The frame every mini game runs in: rules card, countdown, HUD, score pops and result.
// A game supplies { config, scene, camera, resize, update, reset, play, stop, mountUI? }
// and reports back through shell.hud(), shell.pop() and shell.finish({ score, progress, lines }).
//
// Two numbers per game: `progress` decides the stamp (config.target), `score` is the
// fine-grained points total that goes to the leaderboard.
export function createShell({ onResult, onExit }) {
  const $ = (id) => document.getElementById(id);
  const ui = {
    layer: $('gameUI'),
    extra: $('gExtra'),
    score: $('gScore'),
    goal: $('gGoal'),
    goalCard: $('gGoal').parentElement,
    time: $('gTime'),
    timeLabel: $('gTimeLabel'),
    timeUnit: $('gTimeUnit'),
    bar: $('gBar'),
    count: $('gCount'),
    pops: $('gPops'),
    howto: $('gHowto'),
    howEyebrow: $('gHowEyebrow'),
    howTitle: $('gHowTitle'),
    rules: $('gRules'),
    result: $('gResult'),
    seal: $('gSeal'),
    sealName: $('gSealName'),
    resTitle: $('gResTitle'),
    resScore: $('gResScore'),
    resText: $('gResText'),
    resLines: $('gResLines'),
    resBest: $('gResBest'),
    resTotal: $('gResTotal'),
    again: $('gAgain'),
  };
  $('gStart').addEventListener('click', start);
  $('gAgain').addEventListener('click', start);
  $('gExit').addEventListener('click', exit);
  $('gBack').addEventListener('click', exit);

  let game = null;
  let cd = 0;
  let counting = false;
  let goTimer = 0;
  let finishing = false;
  let reached = false; // the stamp target has been met this run (its fanfare plays once)

  function enter(g) {
    game = g;
    const c = g.config;
    ui.layer.hidden = false;
    ui.howEyebrow.textContent = c.eyebrow;
    ui.howTitle.textContent = c.title;
    ui.rules.innerHTML = c.rules.map((r) => `<li><i class="dot" style="background:${r.dot}"></i><span>${r.text}</span></li>`).join('');
    ui.timeLabel.textContent = c.timeLabel ?? '剩餘';
    ui.timeUnit.textContent = c.timeUnit ?? '秒';
    ui.sealName.textContent = c.stamp;
    ui.extra.innerHTML = '';
    g.mountUI?.(ui.extra);
    ui.howto.hidden = false;
    ui.result.hidden = true;
    ui.count.hidden = true;
    ui.pops.textContent = '';
    counting = false;
    finishing = false;
    g.reset();
  }

  function start() {
    ui.howto.hidden = true;
    ui.result.hidden = true;
    ui.pops.textContent = '';
    finishing = false;
    reached = false;
    game.reset();
    counting = true;
    cd = 3;
    showCount('3');
    sfx.tick();
  }

  function showCount(label) {
    ui.count.hidden = false;
    ui.count.textContent = label;
    ui.count.classList.remove('tick');
    void ui.count.offsetWidth;
    ui.count.classList.add('tick');
  }

  function update(dt) {
    if (counting) {
      const before = Math.ceil(cd);
      cd -= dt;
      if (cd <= 0) {
        counting = false;
        showCount('開始！');
        sfx.go();
        goTimer = 0.6;
        game.play();
      } else if (Math.ceil(cd) !== before) {
        showCount(String(Math.ceil(cd)));
        sfx.tick();
      }
    } else if (goTimer > 0) {
      goTimer -= dt;
      if (goTimer <= 0) ui.count.hidden = true;
    }
  }

  // points, stamp progress, time readout (number or text) and bar fraction (0–1, or null to leave it)
  function hud(points, progress, time, frac = null) {
    const c = game.config;
    ui.score.textContent = fmtScore(Math.max(0, points)); // same floor as the final score
    ui.goal.textContent = `${c.progressLabel} ${Math.max(0, progress)}/${c.target}`;
    ui.goalCard.classList.toggle('done', progress >= c.target);
    if (!reached && progress >= c.target && !counting && !finishing) {
      reached = true;
      sfx.clear();
      ui.goalCard.classList.remove('reached');
      void ui.goalCard.offsetWidth;
      ui.goalCard.classList.add('reached');
      const r = ui.goalCard.getBoundingClientRect();
      pop('達成過關條件！', 'goal', { x: innerWidth / 2, y: Math.max(r.bottom + 60, innerHeight * 0.28) }); // below the HUD and any status pills
    }
    if (time !== undefined) ui.time.textContent = time;
    if (frac !== null) ui.bar.style.transform = `scaleX(${Math.max(0, frac)})`;
  }

  const tmp = new THREE.Vector3();
  // at: a world position (with camera) or a { x, y } screen point
  function pop(text, cls, at, camera) {
    let x, y;
    if (at.isVector3) {
      tmp.copy(at).project(camera);
      x = (tmp.x * 0.5 + 0.5) * innerWidth;
      y = (-tmp.y * 0.5 + 0.5) * innerHeight;
    } else ({ x, y } = at);
    const el = document.createElement('span');
    el.className = 'pop ' + cls;
    el.textContent = text;
    el.style.left = x.toFixed(0) + 'px';
    el.style.top = y.toFixed(0) + 'px';
    el.addEventListener('animationend', () => el.remove());
    ui.pops.appendChild(el);
  }

  // failed: the run ended badly (e.g. the boat broke), so no stamp whatever the progress
  function finish({ score, progress, lines, failed = false }) {
    if (finishing) return;
    finishing = true;
    game.stop?.();
    setTimeout(() => {
      if (!finishing) return;
      const c = game.config;
      const final = Math.max(0, Math.round(score));
      const r = onResult(c.id, { score: final, progress, failed }, c.target);
      ui.resScore.textContent = fmtScore(final);
      ui.resLines.innerHTML = lines.map(([label, v]) => `<li><span>${label}</span><b>${v >= 0 ? '+' : '−'}${fmtScore(Math.abs(v))}</b></li>`).join('');
      ui.resBest.textContent = r.recorded ? `${fmtScore(final)}（已記錄）` : '過關才會記錄';
      ui.resTotal.textContent = fmtScore(r.total);
      ui.seal.hidden = !r.passed;
      ui.seal.classList.toggle('fresh', r.newStamp);
      // a passed level is locked; only a failed one can be tried again
      ui.again.hidden = r.passed && !r.replay;
      if (r.passed) {
        ui.resTitle.textContent = `${c.stamp}印章到手！`;
        ui.resText.textContent = r.allDone ? '五枚印章都到齊了！回到地圖，生日派對要開始了。' : c.passText;
        sfx.win();
      } else if (failed) {
        ui.resTitle.textContent = c.failTitle ?? '挑戰失敗';
        ui.resText.textContent = c.failText ?? '';
      } else {
        ui.resTitle.textContent = '這次沒拿到印章';
        ui.resText.textContent = `${c.progressLabel} ${Math.max(0, progress)}/${c.target}，再 ${c.target - progress} ${c.progressUnit}就能拿到。${c.hint ?? ''}`;
      }
      ui.result.hidden = false;
    }, 800);
  }

  function exit() {
    counting = false;
    finishing = false;
    ui.count.hidden = true;
    game?.stop?.();
    ui.layer.hidden = true;
    ui.extra.innerHTML = '';
    onExit(game?.config.id);
  }

  return {
    enter,
    update,
    hud,
    pop,
    finish,
    get playing() {
      return !counting && !finishing && ui.howto.hidden && ui.result.hidden;
    },
  };
}
