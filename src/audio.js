// Tiny synth for game feedback; audio starts only after the player has tapped something.
let ctx = null;
let muted = false;

export const isMuted = () => muted;
export function setMuted(on) {
  muted = on;
}

export function tone(freq, dur = 0.12, { type = 'sine', vol = 0.12, slide = 0, delay = 0 } = {}) {
  if (muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (e) {}
}

export const sfx = {
  good: () => {
    tone(880, 0.09);
    tone(1320, 0.12, { delay: 0.06 });
  },
  gold: () => [988, 1319, 1760].forEach((f, i) => tone(f, 0.12, { delay: i * 0.05 })),
  bad: () => tone(220, 0.25, { type: 'square', vol: 0.05, slide: 0.5 }),
  tick: () => tone(660, 0.07, { vol: 0.08 }),
  go: () => tone(990, 0.2),
  note: (i) => tone([523, 659, 784, 988][i % 4], 0.28, { type: 'triangle', vol: 0.14 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, { delay: i * 0.11 })),
  blow: () => [0, 0.09].forEach((d) => tone(420, 0.4, { type: 'triangle', vol: 0.05, slide: 0.35, delay: d })),
  pop: () => tone(520, 0.08, { type: 'triangle', vol: 0.1, slide: 1.6 }),
};
