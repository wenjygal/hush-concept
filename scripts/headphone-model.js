// scripts/headphone-model.js
// The HUSH over-ear headphone, built procedurally from Three.js primitives and canvas
// textures (no external assets). Shared by every scene that shows the product.
//
// Public interface
// ----------------
//   createHeadphoneModel() -> THREE.Group
//
//   The returned group has an identity transform and is already centred on its own
//   bounding box (so it turns about its middle). Its DIRECT children are the physical
//   parts, each a named THREE.Group, so a scene can move any part on its own:
//
//     group.getObjectByName("cup-left")         // or group.userData.parts["cup-left"]
//
//   Each part carries:
//     part.userData.restPosition  THREE.Vector3  its assembled position (model space)
//     part.userData.explodeDir    THREE.Vector3  unit direction it should travel for an
//                                                exploded view (model space)
//   so "apart" is restPosition + explodeDir * distance and "together" is restPosition.
//
//   group.userData.parts      { [name]: THREE.Group }  same objects, by name
//   group.userData.partNames  string[]                 PART_NAMES
//   group.userData.dispose()  frees every geometry, material and texture the model owns
//
//   Left/right are the wearer's sides: "-left" parts sit at -X, "-right" at +X.
//   Ear-cup outer faces point away from the head (-X on the left, +X on the right).

import * as THREE from "https://unpkg.com/three@0.186.1/build/three.module.js";

export const PART_NAMES = [
  "headband", // brushed aluminium outer arc
  "headband-pad", // leather crown pad under the arc
  "yoke-left", // end cap, stem and pivot collar dropping to the cup
  "yoke-right",
  "cup-left", // ear-cup shell: housing, rounded beads, machined face, jewel ring
  "cup-right",
  "baffle-left", // graphite mount + acoustic fabric between shell and cushion
  "baffle-right",
  "cushion-left", // leather ear cushion
  "cushion-right",
];

// ---------------------------------------------------------------------------
// Procedural textures
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

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/**
 * Build the HUSH headphone.
 * @returns {THREE.Group} identity-transform group whose direct children are the named
 *   parts listed in PART_NAMES (see the header comment for the userData contract).
 */
export function createHeadphoneModel() {
  const disposables = [];
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
  model.name = "hush-headphones";
  const parts = {};

  const addPart = (name, explodeDir) => {
    const g = new THREE.Group();
    g.name = name;
    g.userData.explodeDir = explodeDir.clone().normalize();
    model.add(g);
    parts[name] = g;
    return g;
  };

  // --- Headband -------------------------------------------------------------
  const BAND_R = 1.1;

  // Outer aluminium band: a wide, flat half-ring with a softly rounded section.
  const headband = addPart("headband", new THREE.Vector3(0, 1, 0));
  const band = new THREE.Mesh(geo(new THREE.TorusGeometry(BAND_R, 0.042, 32, 200, Math.PI)), anodized);
  band.scale.z = 2.1;
  headband.add(band);

  // Padded leather crown, a shorter arc centered at the top.
  const headbandPad = addPart("headband-pad", new THREE.Vector3(0, -1, 0));
  const padArc = Math.PI * 0.68;
  const pad = new THREE.Mesh(geo(new THREE.TorusGeometry(BAND_R - 0.085, 0.052, 32, 160, padArc)), cushion);
  pad.rotation.z = (Math.PI - padArc) / 2;
  pad.scale.z = 1.6;
  headbandPad.add(pad);

  // --- Sides: yoke, ear cup, baffle, cushion -------------------------------
  const CUP_R = 0.44;
  const CUP_DEPTH = 0.24;
  const BEAD = 0.04; // edge rounding radius
  const CUP_Y = -0.7;
  const CUP_SCALE_Y = 1.16;

  for (const side of [-1, 1]) {
    const suffix = side === -1 ? "left" : "right";

    // Yoke: lives at the band end, carries the stem down to the cup crown.
    const yoke = addPart(`yoke-${suffix}`, new THREE.Vector3(side * 0.6, 1, 0));
    yoke.position.x = side * BAND_R;

    // Graphite end cap where the band turns into the stem.
    const endCap = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.046, 0.046, 0.06, 40)), graphite);
    endCap.scale.z = 1.9;
    endCap.position.y = -0.02;
    yoke.add(endCap);

    // Polished telescoping stem dropping into the crown of the cup.
    const stemTop = -0.05;
    const stemBottom = CUP_Y + CUP_R * CUP_SCALE_Y - 0.02;
    const stem = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.024, 0.024, stemTop - stemBottom, 32)), steel);
    stem.position.y = (stemTop + stemBottom) / 2;
    yoke.add(stem);

    // Pivot collar on the crown of the cup.
    const collar = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.058, 0.05, 40)), graphite);
    collar.position.y = stemBottom + 0.01;
    yoke.add(collar);

    // Cup-side parts share one frame: centred on the cup, slightly oval (taller than
    // wide), with an inner "body" frame whose local +Y is the outward axis. The scale
    // and the rotation live on separate groups so the oval stays vertical.
    const cupFrame = (name, explodeDir) => {
      const part = addPart(`${name}-${suffix}`, explodeDir);
      part.position.set(side * BAND_R, CUP_Y, 0);
      part.scale.set(1, CUP_SCALE_Y, 1);
      const body = new THREE.Group();
      body.rotation.z = side === 1 ? -Math.PI / 2 : Math.PI / 2;
      part.add(body);
      return body;
    };

    // Shell: housing, rounded beads, machined face, jewel ring. Explodes outward.
    const shell = cupFrame("cup", new THREE.Vector3(side, 0, 0));

    // Housing: the main cylinder. Side anodized, faces machined.
    const housing = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R, CUP_R, CUP_DEPTH, 160, 1)), [
      anodized,
      faceMetal,
      anodized,
    ]);
    shell.add(housing);

    // Rounded edges on both faces: a torus bead whose outer edge matches the housing wall.
    for (const y of [CUP_DEPTH / 2, -CUP_DEPTH / 2]) {
      const bead = new THREE.Mesh(geo(new THREE.TorusGeometry(CUP_R - BEAD, BEAD, 24, 160)), anodized);
      bead.rotation.x = Math.PI / 2;
      bead.position.y = y;
      shell.add(bead);
    }

    // Machined outer face, flush with the top of the bead.
    const face = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R - BEAD, CUP_R - BEAD, BEAD, 160)), [
      anodized,
      faceMetal,
      anodized,
    ]);
    face.position.y = CUP_DEPTH / 2 + BEAD / 2 - 0.002;
    shell.add(face);

    // Polished jewel ring inset on the face.
    const jewel = new THREE.Mesh(geo(new THREE.TorusGeometry(CUP_R * 0.62, 0.006, 12, 160)), steel);
    jewel.rotation.x = Math.PI / 2;
    jewel.position.y = CUP_DEPTH / 2 + BEAD - 0.001;
    shell.add(jewel);

    // Baffle: graphite mount and acoustic fabric, inward of the shell.
    const baffle = cupFrame("baffle", new THREE.Vector3(-side, 0, 0));

    // Graphite mount between housing and cushion.
    const mount = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R - 0.02, CUP_R - 0.04, 0.05, 160)), graphite);
    mount.position.y = -CUP_DEPTH / 2 - BEAD - 0.015;
    baffle.add(mount);

    // Cushion: a deep leather donut on the inner face. Explodes toward the head.
    const cushionBody = cupFrame("cushion", new THREE.Vector3(-side, 0, 0));
    const cushionMesh = new THREE.Mesh(geo(new THREE.TorusGeometry(CUP_R * 0.7, 0.115, 40, 160)), cushion);
    cushionMesh.rotation.x = Math.PI / 2;
    cushionMesh.scale.z = 0.85;
    cushionMesh.position.y = -CUP_DEPTH / 2 - BEAD - 0.1;
    cushionBody.add(cushionMesh);

    // Acoustic fabric disc recessed inside the cushion.
    const fabricDisc = new THREE.Mesh(geo(new THREE.CylinderGeometry(CUP_R * 0.6, CUP_R * 0.6, 0.01, 96)), fabric);
    fabricDisc.position.y = -CUP_DEPTH / 2 - BEAD - 0.05;
    baffle.add(fabricDisc);
  }

  // Centre on the bounding box so the model turns about its middle. The offset is baked
  // into each part, so the returned group keeps an identity transform.
  const offset = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()).negate();
  for (const part of model.children) {
    part.position.add(offset);
    part.userData.restPosition = part.position.clone();
  }

  model.userData.parts = parts;
  model.userData.partNames = PART_NAMES;
  model.userData.dispose = () => {
    for (const d of disposables) d.dispose();
    disposables.length = 0;
  };
  return model;
}
