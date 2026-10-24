import * as THREE from 'three';
import { sfx } from './audio.js';

const COLORS = ['#F0697A', '#F2C14E', '#7FD0E6', '#9ED36A', '#C9A0F0', '#FF9B6A'];

// soft round dot, so sparks glow instead of looking like square pixels
let dotTexture = null;
function dot() {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  dotTexture = new THREE.CanvasTexture(c);
  return dotTexture;
}

// Fireworks: short-lived bursts of glowing sparks with gravity, two colors per burst and a
// brief white flash at the center. `scale` grows bursts for wide scenes.
export function makeFireworks(scene, { sound = false, scale = 1 } = {}) {
  const bursts = [];
  const N = 130;
  const LIFE = 2.0;
  return {
    launch(at) {
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const vel = [];
      const a = new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]);
      const b = new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]);
      for (let i = 0; i < N; i++) {
        pos.set([at.x, at.y, at.z], i * 3);
        (i % 3 ? a : b).toArray(col, i * 3);
        vel.push(new THREE.Vector3().randomDirection().multiplyScalar((2.2 + Math.random() * 1.4) * scale));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ size: 0.26 * scale, map: dot(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
      );
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: '#FFF6E0', blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      flash.position.copy(at);
      flash.scale.setScalar(2.2 * scale);
      scene.add(pts, flash);
      bursts.push({ pts, flash, vel, life: LIFE });
      if (sound) sfx.pop();
    },
    update(dt) {
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life -= dt;
        const p = b.pts.geometry.attributes.position;
        for (let j = 0; j < b.vel.length; j++) {
          const v = b.vel[j];
          v.y -= 2.2 * scale * dt;
          v.multiplyScalar(1 - dt * 0.9);
          p.setXYZ(j, p.getX(j) + v.x * dt, p.getY(j) + v.y * dt, p.getZ(j) + v.z * dt);
        }
        p.needsUpdate = true;
        // bright at first, then fade; a little flicker near the end
        const t = Math.max(0, b.life / LIFE);
        b.pts.material.opacity = t < 0.35 ? t / 0.35 * (0.7 + Math.random() * 0.3) : 1;
        b.flash.material.opacity = Math.max(0, (b.life - (LIFE - 0.25)) / 0.25);
        if (b.life <= 0) {
          scene.remove(b.pts, b.flash);
          b.pts.geometry.dispose();
          b.pts.material.dispose();
          b.flash.material.dispose();
          bursts.splice(i, 1);
        }
      }
    },
  };
}
