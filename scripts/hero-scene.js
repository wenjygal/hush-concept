// scripts/hero-scene.js
// Three.js hero: a procedurally built over-ear headphone, lit like a studio product shot,
// turning toward the cursor through the damped rotation controller.

import * as THREE from "https://unpkg.com/three@0.186.1/build/three.module.js";
import { createRotationState } from "./rotation-controller.js";

const DEG = Math.PI / 180;

// Rest pose: a three-quarter product angle rather than a flat front view.
const BASE_YAW = -32 * DEG;
const BASE_PITCH = 8 * DEG;

// ---------------------------------------------------------------------------
// Procedural textures (no external image assets)
// ---------------------------------------------------------------------------

// Very fine concentric machining rings for the ear-cup faces (roughness only,
// low contrast: it should read as a finish, not a pattern).
function createSpunMetalRoughness(size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const cx = size / 2;
  ctx.fillStyle = "rgb(110,110,110)";
  ctx.fillRect(0, 0, size, size);
  for (let r = 1; r < cx * 1.42; r += 1.5) {
    const v = 100 + Math.random() * 20;
    ctx.strokeStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Fine grain bump for the protein-leather cushions so they do not read as plastic.
function createLeatherGrain(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 110 + Math.random() * 40;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

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
// Headphone model, built from primitives
// ---------------------------------------------------------------------------

function buildHeadphones(disposables) {
  const track = (x) => {
    disposables.push(x);
    return x;
  };

  const spunRough = track(createSpunMetalRoughness());
  const grain = track(createLeatherGrain());

  // Bead-blasted, anodized aluminium (satin, not chrome): housing and headband.
  const anodized = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xbcbfc5,
      metalness: 1,
      roughness: 0.38,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3,
    }),
  );

  // Machined cup face: fine concentric rings carried in the roughness only.
  const faceMetal = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xd4d6db,
      metalness: 1,
      roughness: 0.4,
      roughnessMap: spunRough,
      clearcoat: 0.2,
      clearcoatRoughness: 0.25,
    }),
  );

  // Polished stainless: telescoping stems and the jewel ring on each face.
  const steel = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xc2c5ca,
      metalness: 1,
      roughness: 0.12,
      clearcoat: 0.5,
      clearcoatRoughness: 0.05,
    }),
  );

  // Graphite trim: a deliberate two-tone break between parts.
  const graphite = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x34353a,
      metalness: 0.8,
      roughness: 0.42,
    }),
  );

  // Matte protein-leather cushions.
  const cushion = track(
    new THREE.MeshStandardMaterial({
      color: 0x2e2e33,
      roughness: 0.7,
      metalness: 0,
      bumpMap: grain,
      bumpScale: 0.35,
    }),
  );

  // Acoustic fabric behind the cushion.
  const fabric = track(
    new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.95,
      metalness: 0,
    }),
  );

  const geo = (g) => track(g);
  const model = new THREE.Group();

  // --- Headband -------------------------------------------------------------
  const BAND_R = 1.1;

  // Outer aluminium band: a wide, flat half-ring with a softly rounded section.
  const band = new THREE.Mesh(geo(new THREE.TorusGeometry(BAND_R, 0.042, 32, 200, Math.PI)), anodized);
  band.scale.z = 2.1;
  model.add(band);

  // Padded leather crown, a shorter arc centered at the top.
  const padArc = Math.PI * 0.68;
  const pad = new THREE.Mesh(geo(new THREE.TorusGeometry(BAND_R - 0.085, 0.052, 32, 160, padArc)), cushion);
  pad.rotation.z = (Math.PI - padArc) / 2;
  pad.scale.z = 1.6;
  model.add(pad);

  // --- Sides: stem, pivot, ear cup -----------------------------------------
  const CUP_R = 0.44;
  const CUP_DEPTH = 0.24;
  const BEAD = 0.04; // edge rounding radius
  const CUP_Y = -0.7;
  const CUP_SCALE_Y = 1.16;

  for (const side of [-1, 1]) {
    const sideGroup = new THREE.Group();
    sideGroup.position.x = side * BAND_R;
    model.add(sideGroup);

    // Graphite end cap where the band turns into the stem.
    const endCap = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.046, 0.046, 0.06, 40)), graphite);
    endCap.scale.z = 1.9;
    endCap.position.y = -0.02;
    sideGroup.add(endCap);

    // Polished telescoping stem dropping into the crown of the cup.
    const stemTop = -0.05;
    const stemBottom = CUP_Y + CUP_R * CUP_SCALE_Y - 0.02;
    const stem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.024, 0.024, stemTop - stemBottom, 32)), steel);
    stem.position.y = (stemTop + stemBottom) / 2;
    sideGroup.add(stem);

    // Pivot collar on the crown of the cup.
    const collar = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.058, 0.05, 40)), graphite);
    collar.position.y = stemBottom + 0.01;
    sideGroup.add(collar);

    // Cup group: slightly oval (taller than wide).
    const cup = new THREE.Group();
    cup.position.y = CUP_Y;
    cup.scale.set(1, CUP_SCALE_Y, 1);
    sideGroup.add(cup);

    // Body local +Y is the outward axis; turn it to point away from the head.
    const body = new THREE.Group();
    body.rotation.z = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    cup.add(body);

    // Housing: the main cylinder. Side anodized, faces machined.
    const housing = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R, CUP_R, CUP_DEPTH, 160, 1)), [
      anodized,
      faceMetal,
      anodized,
    ]);
    body.add(housing);

    // Rounded edges on both faces: a torus bead whose outer edge matches the housing wall.
    for (const y of [CUP_DEPTH / 2, -CUP_DEPTH / 2]) {
      const bead = new THREE.Mesh(geo(new THREE.TorusGeometry(CUP_R - BEAD, BEAD, 24, 160)), anodized);
      bead.rotation.x = Math.PI / 2;
      bead.position.y = y;
      body.add(bead);
    }

    // Machined outer face, flush with the top of the bead.
    const face = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R - BEAD, CUP_R - BEAD, BEAD, 160)), [
      anodized,
      faceMetal,
      anodized,
    ]);
    face.position.y = CUP_DEPTH / 2 + BEAD / 2 - 0.002;
    body.add(face);

    // Polished jewel ring inset on the face.
    const jewel = new THREE.Mesh(geo(new THREE.TorusGeometry(CUP_R * 0.62, 0.006, 12, 160)), steel);
    jewel.rotation.x = Math.PI / 2;
    jewel.position.y = CUP_DEPTH / 2 + BEAD - 0.001;
    body.add(jewel);

    // Graphite mount between housing and cushion.
    const mount = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R - 0.02, CUP_R - 0.04, 0.05, 160)), graphite);
    mount.position.y = -CUP_DEPTH / 2 - BEAD - 0.015;
    body.add(mount);

    // Cushion: a deep leather donut on the inner face.
    const cushionMesh = new THREE.Mesh(geo(new THREE.TorusGeometry(CUP_R * 0.7, 0.115, 40, 160)), cushion);
    cushionMesh.rotation.x = Math.PI / 2;
    cushionMesh.scale.z = 0.85;
    cushionMesh.position.y = -CUP_DEPTH / 2 - BEAD - 0.1;
    body.add(cushionMesh);

    // Acoustic fabric disc recessed inside the cushion.
    const fabricDisc = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R * 0.6, CUP_R * 0.6, 0.01, 96)), fabric);
    fabricDisc.position.y = -CUP_DEPTH / 2 - BEAD - 0.05;
    body.add(fabricDisc);
  }

  // Center the model around its own bounding box so it turns about its middle.
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));

  return model;
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
  pose.add(buildHeadphones(disposables));
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
      envRT.dispose();
      renderer.dispose();
    },
  };
}
