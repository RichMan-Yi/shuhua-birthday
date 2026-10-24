import * as THREE from 'three';

export const clamp = THREE.MathUtils.clamp;

// Horizontal steering shared by the catch and boat games: finger or mouse x maps to
// [-1, 1]; arrow keys / A D nudge it. read() returns the current target.
// The middle 2/3 of the screen covers the whole range, so the edges are reachable without
// pushing a thumb against the bezel.
const REACH = 1.5;
export function steering(isActive) {
  let target = 0;
  const keys = { left: false, right: false };
  const fromScreen = (x) => (target = clamp(((x / innerWidth) * 2 - 1) * REACH, -1, 1));
  addEventListener('pointerdown', (e) => isActive() && e.target.tagName === 'CANVAS' && fromScreen(e.clientX));
  addEventListener('pointermove', (e) => isActive() && (e.pointerType === 'mouse' || e.buttons) && fromScreen(e.clientX));
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  });
  addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  });
  return {
    read(dt) {
      if (keys.left) target = clamp(target - 2.6 * dt, -1, 1);
      if (keys.right) target = clamp(target + 2.6 * dt, -1, 1);
      return target;
    },
    reset() {
      target = 0;
    },
  };
}

// Tap-to-pick on the game canvas. objects() lists candidates; the hit object is walked up
// to the first ancestor carrying userData[key].
export function tapper(canvas, isActive, camera, objects, key, onHit, onMiss) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => {
    if (!isActive()) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera());
    for (const hit of ray.intersectObjects(objects(), true)) {
      let o = hit.object;
      while (o && o.userData[key] === undefined) o = o.parent;
      if (o) return onHit(o, hit, e);
    }
    onMiss?.(e);
  });
}

// Invisible, generous touch target for small moving things.
export function hitSphere(radius) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
}

// Standard light rig for the mini-game scenes.
export function lightRig(scene, { sky = '#FFFFFF', ground = '#7FB26A', hemi = 1.9, sun = 1.6 } = {}) {
  scene.add(new THREE.HemisphereLight(sky, ground, hemi));
  const light = new THREE.DirectionalLight('#FFF3E0', sun);
  light.position.set(4, 10, 6);
  scene.add(light);
  return light;
}

// Wolf idle sway, so every scene's mascot feels alive.
export function idle(wolf, t, speed = 1) {
  const p = wolf.userData;
  p.head.rotation.z = Math.sin(t * 1.8 * speed) * 0.07;
  p.tail.rotation.z = p.rest.tailZ + Math.sin(t * 6 * speed) * 0.3;
  p.body.position.y = Math.abs(Math.sin(t * 2.4 * speed)) * 0.02;
}
