// scripts/hero-scene.js
// Three.js hero: a procedurally built over-ear headphone, lit like a studio product shot,
// turning toward the cursor through the damped rotation controller.

import * as THREE from "https://unpkg.com/three@0.186.1/build/three.module.js";
import { createRotationState } from "./rotation-controller.js";
import { createHeadphoneModel } from "./headphone-model.js";

const DEG = Math.PI / 180;

// Rest pose: a three-quarter product angle rather than a flat front view.
// -18deg keeps both mouse-driven extremes off the grazing angle where
// metalness-1 faces lose environment reflection and read as a black disc.
const BASE_YAW = -18 * DEG;
const BASE_PITCH = 8 * DEG;

// ---------------------------------------------------------------------------
// Procedural textures (no external image assets; the model owns its own)
// ---------------------------------------------------------------------------

// Soft contact shadow under the product.
function createShadowTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(0.35, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------
// Studio environment: graded cyclorama with softboxes, prefiltered by PMREMGenerator
// ---------------------------------------------------------------------------

function createStudioEnvironment(renderer) {
  const env = new THREE.Scene();
  const disposables = [];

  // Graded dome: brighter ceiling, a soft horizon, a dark floor. The horizon line is
  // what gives satin metal the gradient reflections of a real studio shot.
  const R = 20;
  const domeGeo = new THREE.SphereGeometry(R, 64, 32);
  const pos = domeGeo.attributes.position;
  const top = new THREE.Color(0.24, 0.245, 0.26);
  const mid = new THREE.Color(0.05, 0.05, 0.055);
  const floor = new THREE.Color(0.015, 0.015, 0.017);
  const tmp = new THREE.Color();
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / R; // -1..1
    if (t >= 0) tmp.copy(mid).lerp(top, Math.pow(t, 0.7));
    else tmp.copy(mid).lerp(floor, Math.min(1, -t * 3));
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  domeGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  env.add(new THREE.Mesh(domeGeo, domeMat));
  disposables.push(domeGeo, domeMat);

  const softbox = (w, h, intensity, position, tint = 0xffffff) => {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(tint).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(position);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
    disposables.push(g, m);
  };

  softbox(5, 4, 4.0, new THREE.Vector3(-6, 5, 6)); // key, large, upper left front
  softbox(6, 2, 1.6, new THREE.Vector3(0, 10, 1)); // overhead scrim
  softbox(1.5, 10, 7.0, new THREE.Vector3(8, 1.5, -5), 0xeef2ff); // cool rim strip, right rear
  softbox(1.5, 9, 4.0, new THREE.Vector3(-8, 1, -5)); // kicker strip, left rear
  softbox(5, 3, 1.2, new THREE.Vector3(7, -1, 6)); // low fill card, right front
  // Wide dim card behind the camera: cup faces turned toward the viewer pick up a soft
  // gradient instead of mirroring the dark dome as a flat black disc.
  softbox(9, 5, 0.55, new THREE.Vector3(0, 1.5, 10));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  for (const d of disposables) d.dispose();
  return rt;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initHeroScene(canvas) {
  const stage = canvas.parentElement;
  const disposables = [];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const envRT = createStudioEnvironment(renderer);
  scene.environment = envRT.texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

  // Three-point rig on top of the environment reflections.
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-4, 5, 5);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.5);
  fill.position.set(5, 1, 4);
  const rim = new THREE.DirectionalLight(0xffffff, 2.4);
  rim.position.set(3, 3, -6);
  scene.add(key, fill, rim);

  // pivot: driven by the rotation controller. pose: fixed three-quarter rest angle.
  const pivot = new THREE.Group();
  scene.add(pivot);
  const pose = new THREE.Group();
  pose.rotation.set(BASE_PITCH, BASE_YAW, 0);
  const headphones = createHeadphoneModel();
  pose.add(headphones);
  pivot.add(pose);

  // Contact shadow, fixed in world space below the product.
  const shadowTex = createShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(3.4, 1.3);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.75 });
  disposables.push(shadowTex, shadowGeo, shadowMat);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.4;
  scene.add(shadow);

  // Frame the model to the stage's aspect so it fits at any width.
  const FIT_W = 3.3;
  const FIT_H = 3.2;
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan((camera.fov * DEG) / 2);
    const dist = Math.max(FIT_H / 2 / t, FIT_W / 2 / (t * camera.aspect));
    camera.position.set(0, dist * 0.12, dist);
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rotationState = createRotationState();

  let normX = 0;
  let normY = 0;
  function onMouseMove(e) {
    normX = (e.clientX / window.innerWidth) * 2 - 1;
    normY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  let rafId = 0;
  let lastTime = 0;
  let elapsed = 0;
  let visible = true;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;
    if (!visible) return;
    elapsed += dt;

    const rot = rotationState.update(normX, normY, dt);
    const idle = rotationState.idleOffset(elapsed);
    pivot.rotation.y = (rot.y + idle) * DEG;
    pivot.rotation.x = rot.x * DEG;
    // Gentle vertical float alongside the idle sway.
    pivot.position.y = Math.sin((2 * Math.PI * elapsed) / 6) * 0.03;

    renderer.render(scene, camera);
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (reducedMotion) renderer.render(scene, camera);
  });
  resizeObserver.observe(stage);
  resize();

  let intersectionObserver = null;
  if (reducedMotion) {
    // Fully static: one frame at the rest pose, no loop, no listener.
    renderer.render(scene, camera);
  } else {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    intersectionObserver.observe(stage);
    rafId = requestAnimationFrame(frame);
  }

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      for (const d of disposables) d.dispose();
      headphones.userData.dispose();
      envRT.dispose();
      renderer.dispose();
    },
  };
}
