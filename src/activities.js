import * as THREE from 'three';
import { mat, flat, mesh } from './models.js';

// What the wolf does once it reaches a landmark on the map. Each activity says where to walk
// (`at`), sets up on arrival (`enter`), animates every frame (`update(dt, t, camera)`) and cleans up when the
// wolf leaves (`exit`, which may return a ground point to step back to first).
//
// wolf: the wolf group on the map; groups: landmark id → its group (see map.js BUILDERS).
export function createActivities({ wolf, spots, groups }) {
  const parts = wolf.userData;
  const world = (id, x, y, z) => groups[id].localToWorld(new THREE.Vector3(x, y, z));
  const spot = (id) => spots.find((s) => s.id === id);
  const stand = (id) => new THREE.Vector3(spot(id).stand[0], 0, spot(id).stand[1]);
  const faceTo = (p, k = 1) => {
    const yaw = Math.atan2(p.x - wolf.position.x, p.z - wolf.position.z);
    wolf.rotation.y += Math.atan2(Math.sin(yaw - wolf.rotation.y), Math.cos(yaw - wolf.rotation.y)) * k;
  };
  const faceCamera = (camera, dt) => faceTo(camera.position, Math.min(1, dt * 5));
  const restArms = () => parts.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * parts.rest.arm));
  const wag = (t, speed = 8) => (parts.tail.rotation.z = parts.rest.tailZ + Math.sin(t * speed) * 0.3);

  // a prop held in the wolf's right paw
  function hold(object) {
    const paw = parts.arms[1];
    object.position.set(0, -0.2, 0.07);
    paw.add(object);
    return () => paw.remove(object);
  }

  return {
    // 拉拉山: climb the mountain and cheer at the top
    lalashan: (() => {
      const s = spot('lalashan');
      const peak = new THREE.Vector3(s.pos[0], 0, s.pos[1]);
      const R = 1.9, H = 2.8; // the big cone in BUILDERS.lalashan
      let t0 = 0, from = null, top = null;
      const height = (p) => Math.max(0, H * (1 - Math.hypot(p.x - peak.x, p.z - peak.z) / R));
      return {
        at: stand('lalashan'),
        focusY: 1.5, // the show climbs to the peak
        enter(t) {
          t0 = t;
          from = wolf.position.clone().setY(0);
          top = peak.clone().add(from.clone().sub(peak).setY(0).setLength(0.42));
        },
        update(dt, t, camera) {
          const k = Math.min(1, (t - t0) / 3.6);
          if (k < 1) {
            // climbing: lean in, paws reaching up the slope one after the other
            const p = from.clone().lerp(top, k);
            wolf.position.set(p.x, height(p) + Math.abs(Math.sin(t * 7)) * 0.05, p.z);
            faceTo(top);
            parts.body.rotation.x = 0.35;
            parts.arms[0].rotation.set(-1.6 + Math.sin(t * 7) * 0.6, 0, -parts.rest.arm);
            parts.arms[1].rotation.set(-1.6 - Math.sin(t * 7) * 0.6, 0, parts.rest.arm);
          } else {
            // on top: turn to the viewer, both arms up, cheering
            parts.body.rotation.x = 0;
            faceCamera(camera, dt);
            wolf.position.y = height(top) + Math.abs(Math.sin(t * 5)) * 0.1;
            parts.arms[0].rotation.set(0, 0, -parts.rest.arm - 1.9 - Math.sin(t * 8) * 0.25);
            parts.arms[1].rotation.set(0, 0, parts.rest.arm + 1.9 + Math.sin(t * 8) * 0.25);
          }
          wag(t, 10);
        },
        exit() {
          parts.body.rotation.x = 0;
          restArms();
          return stand('lalashan'); // walk back down first
        },
      };
    })(),

    // Xpark: hop around with the penguin
    xpark: (() => {
      const g = groups.xpark;
      const penguin = g.userData.penguin;
      const baseY = penguin.position.y;
      let pal = null;
      return {
        // west of the penguin, on the far side from the usual (south-east) view, so the wolf faces the player
        at: world('xpark', -0.25, 0, 0.95).setY(0),
        enter() {
          g.userData.playing = true;
          pal = penguin.getWorldPosition(new THREE.Vector3());
        },
        update(dt, t, camera) {
          // they take turns jumping; the penguin faces the wolf, the wolf turns halfway between its pal and the player
          wolf.position.y = Math.max(0, Math.sin(t * 6)) * 0.28;
          penguin.position.y = baseY + Math.max(0, Math.sin(t * 6 + Math.PI)) * 0.22;
          penguin.rotation.z = 0;
          penguin.rotation.y = Math.atan2(wolf.position.x - pal.x, wolf.position.z - pal.z) - g.rotation.y;
          const toPal = pal.clone().sub(wolf.position).setY(0).normalize();
          const toCam = camera.position.clone().sub(wolf.position).setY(0).normalize();
          faceTo(wolf.position.clone().add(toPal.add(toCam.multiplyScalar(1.3))), Math.min(1, dt * 5));
          parts.arms[0].rotation.set(0, 0, -parts.rest.arm - 0.9 - Math.max(0, Math.sin(t * 6)) * 0.6);
          parts.arms[1].rotation.set(0, 0, parts.rest.arm + 0.9 + Math.max(0, Math.sin(t * 6)) * 0.6);
          wag(t, 12);
        },
        exit() {
          g.userData.playing = false;
          penguin.position.y = baseY;
          penguin.rotation.y = 0;
          wolf.position.y = 0;
          restArms();
          return null;
        },
      };
    })(),

    // 石門水庫: hop in the boat and row around the lake
    shimen: (() => {
      const g = groups.shimen;
      const boat = g.userData.boat;
      let t0 = 0;
      return {
        at: stand('shimen'),
        enter(t) {
          t0 = t;
          g.userData.rowing = true;
        },
        update(dt, t) {
          const a = (t - t0) * 0.45 + Math.PI / 2;
          // a lap of the lake (it is an ellipse, 1.6 × 1.2)
          boat.position.set(Math.cos(a) * 0.85, 0.06 + Math.sin(t * 2) * 0.015, Math.sin(a) * 0.55);
          boat.rotation.y = -(a + Math.PI / 2); // bow along the lap
          const seat = boat.getWorldPosition(new THREE.Vector3());
          wolf.position.set(seat.x, seat.y + 0.08, seat.z);
          wolf.rotation.y = -a; // facing where the boat is going
          parts.arms[0].rotation.set(-0.9 + Math.sin(t * 5) * 0.5, 0, -parts.rest.arm);
          parts.arms[1].rotation.set(-0.9 + Math.sin(t * 5) * 0.5, 0, parts.rest.arm);
          wag(t, 5);
        },
        exit() {
          g.userData.rowing = false;
          restArms();
          return stand('shimen'); // back to the shore first
        },
      };
    })(),

    // 大溪老街: selfies in front of the Baroque shopfronts, one house after another, with a flash
    daxi: (() => {
      const g = groups.daxi;
      // in front of each of the three houses (their facades face +z in BUILDERS.daxi)
      const stops = [-0.78, 0, 0.78].map((x) => world('daxi', x, 0, 1.3).setY(0));
      const SHOT = 2.8; // seconds per photo, including the walk to the next house
      // the flash: a glow sprite plus a light that is always in the scene (at zero), so the
      // light count never changes
      const glow = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.35, 'rgba(255, 255, 240, 0.7)');
        grad.addColorStop(1, 'rgba(255, 255, 240, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      flash.scale.setScalar(0.9);
      g.parent?.add(flash);
      const flashLight = new THREE.PointLight('#FFFFFF', 0, 3, 1.5);
      g.parent?.add(flashLight);
      let t0 = 0, drop = null, phone = null, from = null;
      return {
        at: stops[0].clone(),
        enter(t) {
          t0 = t;
          if (!flash.parent) wolf.parent.add(flash, flashLight);
          // a selfie stick, so the phone is held high and reads from the map camera
          const stick = new THREE.Group();
          stick.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 6), mat('#3A3A44'), 0, -0.3, 0));
          phone = new THREE.Group();
          phone.add(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.03), mat('#F59AB4'))); // pink case, facing out
          phone.add(mesh(new THREE.BoxGeometry(0.19, 0.32, 0.005), mat('#BFE6F5', { emissive: '#7FC4E6', emissiveIntensity: 0.7 }), 0, 0, 0.018));
          phone.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), mat('#2A2F36'), 0.06, 0.12, -0.02)); // lens
          phone.position.set(0, -0.66, 0);
          phone.rotation.x = Math.PI / 2;
          stick.add(phone);
          drop = hold(stick);
          from = wolf.position.clone();
        },
        update(dt, t, camera) {
          const n = Math.floor((t - t0) / SHOT);
          const k = ((t - t0) % SHOT) / SHOT;
          const here = stops[n % stops.length];
          const prev = n === 0 ? from : stops[(n - 1) % stops.length];
          // 0–0.25: hop over to the next house · 0.25–0.75: phone up, pose · ~0.62: flash · rest: check the photo
          if (k < 0.25) {
            const w = k / 0.25;
            wolf.position.lerpVectors(prev, here, w);
            wolf.position.y = Math.abs(Math.sin(w * Math.PI * 2)) * 0.1;
            faceTo(here, Math.min(1, dt * 8));
            parts.arms[1].rotation.set(-0.8, 0, parts.rest.arm * 0.5);
            parts.arms[0].rotation.set(Math.sin(t * 14) * 0.5, 0, -parts.rest.arm);
            parts.head.rotation.z = 0;
          } else {
            wolf.position.copy(here);
            faceCamera(camera, dt);
            const pose = Math.min(1, (k - 0.25) / 0.15);
            // phone raised up and out in front, the other paw up by the face (a peace sign)
            parts.arms[1].rotation.set(-2.3 * pose, 0, parts.rest.arm * 0.35);
            parts.arms[0].rotation.set(-0.4 * pose, 0, -parts.rest.arm - 1.9 * pose);
            parts.head.rotation.z = 0.22 * pose;
            wolf.position.y = k > 0.62 && k < 0.7 ? 0.06 : 0;
          }
          // the flash, right at the shutter moment
          const f = k < 0.6 ? 0 : k < 0.62 ? (k - 0.6) / 0.02 : Math.max(0, 1 - (k - 0.62) / 0.07);
          const lens = phone.getWorldPosition(new THREE.Vector3());
          flash.position.copy(lens);
          flash.material.opacity = f * 0.45;
          flash.scale.setScalar(0.3 + f * 0.35);
          flashLight.position.copy(lens);
          flashLight.intensity = f * 1.2;
          wag(t, 9);
        },
        exit() {
          drop?.();
          flash.material.opacity = 0;
          flashLight.intensity = 0;
          parts.head.rotation.z = 0;
          wolf.position.y = 0;
          restArms();
          return null;
        },
      };
    })(),

    // 桃園觀光夜市: throw darts at the balloon board; hit balloons pop and come back later
    night: (() => {
      // everything here lives in the booth's own (scaled) space, darts included
      const g = groups.night.userData.board.booth;
      const { balloons, throwAt } = groups.night.userData.board;
      const dartMat = mat('#3A3A44');
      const finMat = mat('#E8463A');
      let t0 = 0, thrown = -1, dart = null, target = null, flight = null;
      const popping = [];
      const makeDart = () => {
        const d = new THREE.Group();
        const shaft = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 5), dartMat);
        shaft.rotation.z = Math.PI / 2;
        d.add(shaft);
        const tip = mesh(new THREE.ConeGeometry(0.02, 0.06, 6), mat('#C8C8D0'), 0.13, 0, 0);
        tip.rotation.z = -Math.PI / 2;
        d.add(tip);
        for (const r of [0, Math.PI / 2]) {
          const fin = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.005), finMat, -0.1, 0, 0);
          fin.rotation.x = r;
          d.add(fin);
        }
        return d;
      };
      const local = (v) => g.worldToLocal(v.clone());
      g.updateWorldMatrix(true, false);
      return {
        at: groups.night.localToWorld(throwAt.clone()).setY(0), // the middle of the plaza, facing the board
        enter(t) {
          t0 = t;
          thrown = -1;
        },
        update(dt, t) {
          const boardWorld = g.localToWorld(new THREE.Vector3(0, 0.8, 0));
          faceTo(boardWorld, Math.min(1, dt * 6));
          // one throw every 1.3 s: wind up, then snap the arm forward
          const cycle = (t - t0) / 1.3;
          const n = Math.floor(cycle);
          const phase = cycle - n;
          const arm = phase < 0.55 ? 0.6 + phase * 3.2 : 2.36 - (phase - 0.55) * 7;
          parts.arms[1].rotation.set(-Math.max(-0.6, Math.min(2.4, arm)), 0, parts.rest.arm * 0.3);
          parts.arms[0].rotation.set(0, 0, -parts.rest.arm);
          parts.body.rotation.y = phase < 0.55 ? -0.25 : 0.15;
          wag(t, 8);
          if (phase > 0.62 && thrown !== n) {
            thrown = n;
            const left = balloons.filter((b) => b.visible && !b.userData.popAt);
            target = left[Math.floor(Math.random() * left.length)] ?? null;
            if (target) {
              dart = makeDart();
              g.add(dart);
              const from = local(parts.arms[1].localToWorld(new THREE.Vector3(0, -0.2, 0.07)));
              flight = { from, to: target.position.clone(), k: 0 };
              dart.position.copy(from);
            }
          }
          // the dart flies in a shallow arc and pops the balloon
          if (flight) {
            flight.k = Math.min(1, flight.k + dt / 0.32);
            const p = flight.from.clone().lerp(flight.to, flight.k);
            p.y += Math.sin(flight.k * Math.PI) * 0.18;
            dart.position.copy(p);
            dart.lookAt(g.localToWorld(flight.to.clone()));
            dart.rotateY(-Math.PI / 2);
            if (flight.k >= 1) {
              target.userData.popAt = t;
              popping.push(target);
              g.remove(dart);
              flight = null;
            }
          }
          // popped balloons burst outward and vanish; all of them grow back after a while
          for (const b of [...popping]) {
            const age = t - b.userData.popAt;
            if (age < 0.15) b.scale.setScalar(1 + age * 4);
            else if (b.visible) b.visible = false;
            if (age > 4) {
              b.visible = true;
              b.scale.set(0.9, 1.1, 0.9);
              b.userData.popAt = 0;
              popping.splice(popping.indexOf(b), 1);
            }
          }
        },
        exit() {
          if (dart) g.remove(dart);
          flight = null;
          for (const b of popping.splice(0)) {
            b.visible = true;
            b.scale.set(0.9, 1.1, 0.9);
            b.userData.popAt = 0;
          }
          parts.body.rotation.y = 0;
          restArms();
          return null;
        },
      };
    })(),
  };
}
