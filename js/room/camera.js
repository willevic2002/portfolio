import * as THREE from 'three';

// Camera poses, limits and manual damped tweens (OrbitControls has none). Values: design/spec-v2.md section 2.
const TWEEN_MS = 900;
const FOV_LANDSCAPE = 38;
const FOV_PORTRAIT = 46;
const BOUNDS = { maxX: 1.8, minZ: -1.6, minY: 0.45, maxY: 2.4 }; // focus camera never enters a wall

export const POSES = {
  overview: {
    target: [0.15, 0.85, -0.35], position: [-4.1, 3.55, 4.7], exposure: 1,
    polar: [0.7, 1.22], azimuth: [-1.3, -0.2], distance: [0.55, 1.15], relative: true,
  },
  desk: {
    target: [-0.55, 0.95, -1.55], position: [-0.55, 1.95, 0.3], exposure: 1.05,
    polar: [1.05, 1.55], azimuth: [-0.45, 0.35], distance: [0.7, 2.2], relative: false,
  },
};
const VIEW_ALIASES = { oversikt: 'overview', skrivbord: 'desk' };

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const v3 = (a) => new THREE.Vector3(...a);

/** A resolved camera state: where the camera is, what it looks at, and the OrbitControls limits around it. */
function withLimits(position, target, { polar, azimuth, distance, relative }) {
  const d = position.distanceTo(target);
  return { position, target, d, polar, azimuth, distance: relative ? [distance[0] * d, distance[1] * d] : distance };
}

export function createCameraRig(camera, controls, { reducedMotion = false } = {}) {
  let aspect = camera.aspect || 1;
  let view = 'overview';
  let focused = false;
  let tween = null;
  let exposureScale = 1;
  let touched = false; // user orbited since the last pose change: don't re-fit on resize
  controls.addEventListener('start', () => { touched = true; });
  const baseFocus = { center: null, size: 0, normal: null };

  const fovFor = (a) => (a < 1 ? FOV_PORTRAIT : FOV_LANDSCAPE);
  /** Pull the overview back on narrow screens so the room still fits (landscape keeps the authored pose). */
  function overviewState() {
    const p = POSES.overview;
    const target = v3(p.target);
    const dir = v3(p.position).sub(target);
    const fov = fovFor(aspect);
    const tanHalf = Math.min(Math.tan(THREE.MathUtils.degToRad(fov) / 2), Math.tan(THREE.MathUtils.degToRad(fov) / 2) * aspect);
    const ref = Math.tan(THREE.MathUtils.degToRad(FOV_LANDSCAPE) / 2);
    dir.multiplyScalar(Math.max(1, ref / tanHalf));
    return { ...withLimits(target.clone().add(dir), target, p), fov, exposure: p.exposure };
  }
  function deskState() {
    const p = POSES.desk;
    return { ...withLimits(v3(p.position), v3(p.target), p), fov: fovFor(aspect), exposure: p.exposure };
  }
  function focusState(center, size, normal) {
    const base = view === 'desk' ? deskState() : overviewState();
    const ov = overviewState();
    const overviewDir = ov.position.clone().sub(ov.target).normalize();
    const dir = overviewDir.clone().multiplyScalar(0.5);
    if (normal) dir.addScaledVector(normal.clone().normalize(), 0.5);
    dir.normalize();
    const fov = fovFor(aspect);
    const d = Math.max(0.55, (1.6 * size) / Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    const position = center.clone().addScaledVector(dir, d);
    position.set(
      Math.min(position.x, BOUNDS.maxX), THREE.MathUtils.clamp(position.y, BOUNDS.minY, BOUNDS.maxY), Math.max(position.z, BOUNDS.minZ),
    );
    const dist = position.distanceTo(center);
    const az = Math.atan2(position.x - center.x, position.z - center.z);
    return {
      position, target: center.clone(), d: dist, fov, exposure: base.exposure,
      polar: [0.8, 1.5], azimuth: [az - 0.6, az + 0.6], distance: [0.6 * dist, 1.6 * dist],
    };
  }
  const currentBase = () => (view === 'desk' ? deskState() : overviewState());

  function applyLimits(s) {
    // Orbit angles are measured around the target, so set limits only for this state's target/distance.
    Object.assign(controls, {
      minPolarAngle: s.polar[0], maxPolarAngle: s.polar[1],
      minAzimuthAngle: s.azimuth[0], maxAzimuthAngle: s.azimuth[1],
      minDistance: s.distance[0], maxDistance: s.distance[1],
    });
  }
  function snap(s) {
    touched = false;
    controls.enabled = true;
    camera.position.copy(s.position);
    controls.target.copy(s.target);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    exposureScale = s.exposure;
    applyLimits(s);
    controls.update();
  }
  function flushDamping() {
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
  }
  function go(state, instant) {
    if (reducedMotion || instant) { tween = null; snap(state); return; }
    flushDamping();
    tween = {
      t: 0, to: state,
      fromPos: camera.position.clone(), fromTarget: controls.target.clone(), fromFov: camera.fov, fromExp: exposureScale,
    };
    controls.enabled = false;
  }
  /** Hands control back at the current pose: destination limits widened to include where the camera is now. */
  function cancel() {
    if (!tween) return;
    const s = tween.to;
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    const widen = ([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)];
    applyLimits({
      ...s,
      polar: widen(s.polar, sph.phi), distance: widen(s.distance, sph.radius),
      azimuth: widen(s.azimuth, sph.theta),
    });
    tween = null;
    controls.enabled = true;
    controls.update();
  }

  return {
    get view() { return view; },
    get focused() { return focused; },
    get exposureScale() { return exposureScale; },
    get tweening() { return Boolean(tween); },
    cancel,
    /** Switch the base pose (clears any focus). `instant` skips the tween (initial mount). */
    setView(name, instant = false) {
      view = VIEW_ALIASES[name] ?? (name in POSES ? name : 'overview');
      focused = false;
      go(currentBase(), instant);
    },
    /** focus(center, radius, normal?) frames an object; focus(null) returns to the active view. */
    focus(center, size = 0.2, normal = null) {
      Object.assign(baseFocus, { center, size, normal });
      focused = Boolean(center);
      go(center ? focusState(center, size, normal) : currentBase());
    },
    /** Viewport aspect changed: re-fit the active pose (no tween). */
    setAspect(a) {
      aspect = a;
      if (tween) return;
      if (touched) { camera.fov = fovFor(a); camera.updateProjectionMatrix(); return; }
      snap(focused ? focusState(baseFocus.center, baseFocus.size, baseFocus.normal) : currentBase());
    },
    /** Advance by dt seconds; returns true while anything is still moving. */
    update(dt) {
      if (!tween) return controls.update();
      tween.t = Math.min(1, tween.t + (dt * 1000) / TWEEN_MS);
      const k = easeInOutCubic(tween.t);
      const { to } = tween;
      camera.position.lerpVectors(tween.fromPos, to.position, k);
      controls.target.lerpVectors(tween.fromTarget, to.target, k);
      camera.fov = THREE.MathUtils.lerp(tween.fromFov, to.fov, k);
      exposureScale = THREE.MathUtils.lerp(tween.fromExp, to.exposure, k);
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      if (tween.t >= 1) {
        tween = null;
        applyLimits(to);
        controls.enabled = true;
        controls.update();
      }
      return true;
    },
  };
}
