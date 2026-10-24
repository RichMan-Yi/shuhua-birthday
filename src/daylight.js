import * as THREE from 'three';

// Time of day for the map, one keyframe per stage (sea is the sky's reflection, unlit): 0 = game start (noon), 1–5 = after each
// cleared level, 6 = the wish wall (night). Values in between blend smoothly.
export const TIMES = [
  { name: '中午', top: '#8FCBE8', horizon: '#D8EEF2', hemiSky: '#FFFFFF', hemiGround: '#9CC58A', hemi: 1.7, sunColor: '#FFF1DC', sun: 2.0, sunPos: [8, 14, 6], sea: '#56B2C9', cloud: '#FFFFFF', cloudOpacity: 1, stars: 0, moon: 0, lamps: 0 },
  { name: '午後', top: '#86C3E4', horizon: '#E4EEDD', hemiSky: '#FFFBF2', hemiGround: '#9CC58A', hemi: 1.65, sunColor: '#FFEACB', sun: 1.95, sunPos: [10, 12, 5], sea: '#58AEC6', cloud: '#FFFFFF', cloudOpacity: 1, stars: 0, moon: 0, lamps: 0 },
  { name: '傍晚前', top: '#7BB4DC', horizon: '#F2E3C4', hemiSky: '#FFF0DA', hemiGround: '#A3BE7E', hemi: 1.5, sunColor: '#FFD49A', sun: 2.05, sunPos: [12, 9, 4], sea: '#69AABB', cloud: '#FFF8EC', cloudOpacity: 1, stars: 0, moon: 0, lamps: 0 },
  { name: '黃金時刻', top: '#6C9CCF', horizon: '#F8C98E', hemiSky: '#FFD8AE', hemiGround: '#9A9468', hemi: 1.25, sunColor: '#FFB45E', sun: 2.3, sunPos: [13, 6, 3], sea: '#A3B3A6', cloud: '#FFE2BE', cloudOpacity: 0.95, stars: 0, moon: 0, lamps: 0.25 },
  { name: '夕陽', top: '#5A6FB0', horizon: '#F69873', hemiSky: '#F2A98F', hemiGround: '#7C6A6A', hemi: 1.05, sunColor: '#FF8A4C', sun: 2.1, sunPos: [14, 3.8, 2], sea: '#D38C80', cloud: '#F7B2A0', cloudOpacity: 0.9, stars: 0.05, moon: 0, lamps: 0.6 },
  { name: '黃昏', top: '#2C356E', horizon: '#AE6597', hemiSky: '#9C8FD6', hemiGround: '#3A3E5E', hemi: 1.05, sunColor: '#FF7F6A', sun: 0.85, sunPos: [14, 2.2, 0], sea: '#5E4F8A', cloud: '#B6A0C8', cloudOpacity: 0.75, stars: 0.5, moon: 0.35, lamps: 0.9 },
  { name: '夜晚', top: '#0B1233', horizon: '#3E3A78', hemiSky: '#8C9EE6', hemiGround: '#2A3552', hemi: 1.15, sunColor: '#CFDCFF', sun: 1.25, sunPos: [-6, 14, -8], sea: '#1B3554', cloud: '#8B97C8', cloudOpacity: 0.55, stars: 1, moon: 1, lamps: 1 },
];
export const NIGHT = TIMES.length - 1;

const COLOR_KEYS = ['top', 'horizon', 'hemiSky', 'hemiGround', 'sunColor', 'sea', 'cloud'];
const NUMBER_KEYS = ['hemi', 'sun', 'cloudOpacity', 'stars', 'moon', 'lamps'];

// blended keyframe at a fractional stage
export function timeAt(t) {
  const x = THREE.MathUtils.clamp(t, 0, NIGHT);
  const i = Math.min(Math.floor(x), NIGHT - 1);
  const f = x - i;
  const a = TIMES[i], b = TIMES[i + 1];
  const out = {};
  for (const k of COLOR_KEYS) out[k] = new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), f);
  for (const k of NUMBER_KEYS) out[k] = a[k] + (b[k] - a[k]) * f;
  out.sunPos = new THREE.Vector3(...a.sunPos).lerp(new THREE.Vector3(...b.sunPos), f);
  return out;
}

// Sky dome, stars, moon and warm lamps, plus control over the map's existing lights,
// sea and clouds. set() jumps to a stage; to() eases there over a few seconds.
export function createSky(scene, { center, lights: { hemi, sun }, sea, cloudMaterial, lampSpots }) {
  // gradient dome: horizon color low, top color overhead
  const domeGeo = new THREE.SphereGeometry(120, 32, 16);
  const heights = [];
  for (let i = 0; i < domeGeo.attributes.position.count; i++) heights.push(Math.sqrt(THREE.MathUtils.clamp(domeGeo.attributes.position.getY(i) / 60, 0, 1)));
  domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(heights.length * 3), 3));
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.position.copy(center);
  dome.renderOrder = -10;
  scene.add(dome);

  // stars in two layers that twinkle out of step
  const twinkles = [];
  for (let layer = 0; layer < 2; layer++) {
    const pts = [];
    for (let i = 0; i < 520; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) * 0.85 + 0.08;
      pts.push(...v.normalize().multiplyScalar(75).add(center).toArray());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.PointsMaterial({ color: layer ? '#FFF3C9' : '#FFFFFF', size: layer ? 0.9 : 0.55, transparent: true, fog: false, depthWrite: false });
    const points = new THREE.Points(g, m);
    scene.add(points);
    twinkles.push({ m, points });
  }

  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 16), new THREE.MeshBasicMaterial({ color: '#FFF6D8', fog: false, transparent: true }));
  moon.position.set(center.x - 30, 34, center.z - 48);
  scene.add(moon);

  const lamps = lampSpots.map(({ pos, color, power }) => {
    const l = new THREE.PointLight(color, 0, 6, 1.6);
    l.position.copy(pos);
    l.userData.power = power;
    scene.add(l);
    return l;
  });

  let level = { stars: 0 };
  function apply(t) {
    const k = timeAt(t);
    level = k;
    const col = domeGeo.attributes.color;
    const c = new THREE.Color();
    heights.forEach((h, i) => {
      c.copy(k.horizon).lerp(k.top, h);
      col.setXYZ(i, c.r, c.g, c.b);
    });
    col.needsUpdate = true;
    scene.background = k.horizon.clone();
    scene.fog.color.copy(k.horizon);
    hemi.color.copy(k.hemiSky);
    hemi.groundColor.copy(k.hemiGround);
    hemi.intensity = k.hemi;
    sun.color.copy(k.sunColor);
    sun.intensity = k.sun;
    sun.position.copy(center).add(k.sunPos);
    sea.material.color.copy(k.sea);
    cloudMaterial.color.copy(k.cloud);
    cloudMaterial.opacity = k.cloudOpacity;
    twinkles.forEach(({ points }) => (points.visible = k.stars > 0.01));
    moon.visible = k.moon > 0.01;
    moon.material.opacity = k.moon;
    lamps.forEach((l) => (l.intensity = l.userData.power * k.lamps));
  }

  let now = 0;
  let tween = null;
  return {
    get value() {
      return now;
    },
    set(t) {
      tween = null;
      now = t;
      apply(t);
    },
    to(t, seconds = 3.5) {
      tween = { from: now, to: t, t: 0, seconds };
    },
    update(dt, time) {
      if (tween) {
        tween.t = Math.min(1, tween.t + dt / tween.seconds);
        const e = tween.t * tween.t * (3 - 2 * tween.t);
        now = tween.from + (tween.to - tween.from) * e;
        apply(now);
        if (tween.t >= 1) tween = null;
      }
      twinkles.forEach(({ m }, i) => (m.opacity = level.stars * (0.65 + Math.sin(time * (1.3 + i * 0.9) + i * 2) * 0.35)));
    },
  };
}
