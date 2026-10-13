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
//     part.userData.restPosition     THREE.Vector3  assembled position (model space)
//     part.userData.explodeDir       THREE.Vector3  unit direction for an exploded view
//     part.userData.explodeDistance  number         suggested travel at "fully apart",
//                                                   in model units (model is ~2.6 wide);
//                                                   chosen so no two parts collide
//   so "apart" = restPosition + explodeDir * explodeDistance * t, "together" = t of 0.
//   Rotation and scale of each part must be left as built (scale carries the oval cup).
//
//   group.userData.parts      { [name]: THREE.Group }  same objects, by name
//   group.userData.partNames  string[]                 PART_NAMES
//   group.userData.dispose()  frees every geometry, material and texture the model owns
//
//   Left/right are the wearer's sides: "-left" parts sit at -X, "-right" at +X.
//   Ear-cup outer faces point away from the head (-X on the left, +X on the right).
//   "-front" hinge faces the viewer (+Z), "-back" faces away (-Z).

import * as THREE from "https://unpkg.com/three@0.186.1/build/three.module.js";

export const PART_NAMES = [
  "headband", // brushed aluminium outer arc with polished chamfer lines
  "headband-strap", // stitched leather suspension strap hung inside the arc
  "strap-anchor-left", // graphite strap pin + clevis plates tying the strap to the arc
  "strap-anchor-right",
  "slider-left", // graphite end cap + polished telescoping stem
  "slider-right",
  "yoke-left", // swivel block, steel collar, carbon-fibre fork around the cup
  "yoke-right",
  "hinge-left-front", // gimbal pivot: barrel, machined hub, steel collar, screw
  "hinge-left-back",
  "hinge-right-front",
  "hinge-right-back",
  "cup-left", // ear-cup shell: housing, rounded beads, machined face, jewel ring
  "cup-right",
  "badge-left", // machined centre medallion on the outer face
  "badge-right",
  "baffle-left", // graphite mount + acoustic fabric between shell and cushion
  "baffle-right",
  "cushion-left", // leather ear cushion with seam piping
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

// 2x2 twill carbon-fibre weave. Returns a colour map, a bump map and an anisotropy map
// (tow direction per cell), so the sheen flips between warp and weft tows as the part
// turns: the shimmer is what makes carbon read as carbon rather than a dark print.
function createCarbonWeave(size = 256, cells = 8) {
  const make = () => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return [c, c.getContext("2d")];
  };
  const [colC, col] = make();
  const [bumpC, bump] = make();
  const [anisoC, aniso] = make();
  const colImg = col.createImageData(size, size);
  const bumpImg = bump.createImageData(size, size);
  const anisoImg = aniso.createImageData(size, size);
  const cell = size / cells;

  // Per-tow fibre streaks: a little random brightness per fibre line, constant along it.
  const fibre = new Float32Array(size * cells);
  for (let i = 0; i < fibre.length; i++) fibre[i] = (Math.random() - 0.5) * 10;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = Math.floor(x / cell);
      const j = Math.floor(y / cell);
      const horizontal = (i + j) % 4 < 2;
      const lx = (x % cell) / cell;
      const ly = (y % cell) / cell;
      const across = horizontal ? ly : lx; // position across the tow width
      const along = horizontal ? lx : ly; // position along the tow
      const profile = Math.sin(Math.PI * across); // rounded tow cross-section
      // Tows dip where they pass under the crossing tow at each end of the float.
      const dip = 1 - 0.35 * Math.pow(Math.abs(along - 0.5) * 2, 6);
      const streak = fibre[(horizontal ? y : x) + (horizontal ? i : j) * size] || 0;
      const v = 16 + 44 * profile * dip + streak;
      const p = (y * size + x) * 4;
      colImg.data[p] = v;
      colImg.data[p + 1] = v;
      colImg.data[p + 2] = v + 3;
      colImg.data[p + 3] = 255;
      const b = 70 + 150 * profile * dip;
      bumpImg.data[p] = bumpImg.data[p + 1] = bumpImg.data[p + 2] = b;
      bumpImg.data[p + 3] = 255;
      anisoImg.data[p] = horizontal ? 255 : 128;
      anisoImg.data[p + 1] = horizontal ? 128 : 255;
      anisoImg.data[p + 2] = 255 * (0.35 + 0.5 * profile);
      anisoImg.data[p + 3] = 255;
    }
  }
  col.putImageData(colImg, 0, 0);
  bump.putImageData(bumpImg, 0, 0);
  aniso.putImageData(anisoImg, 0, 0);

  const tex = (canvas, colorSpace) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = colorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return {
    map: tex(colC, THREE.SRGBColorSpace),
    bumpMap: tex(bumpC, THREE.NoColorSpace),
    anisotropyMap: tex(anisoC, THREE.NoColorSpace),
  };
}

// Stitched leather for the headband strap. The texture's U runs along the strap (one
// tile = `stitches` stitches, repeating) and V runs once around its cross-section, so
// stitch rows are drawn at the exact V positions the strap geometry reports.
function createStitchedLeather(rowsV, { stitches = 6, w = 256, h = 1024, threadV = 0.009 } = {}) {
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")];
  };
  const [colC, col] = make();
  const [bumpC, bump] = make();

  // Base: near-black leather with a soft mottled grain in both maps.
  const colImg = col.createImageData(w, h);
  const bumpImg = bump.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = Math.random();
      const p = (y * w + x) * 4;
      const c = 33 + n * 7;
      colImg.data[p] = c;
      colImg.data[p + 1] = c;
      colImg.data[p + 2] = c + 3;
      colImg.data[p + 3] = 255;
      const b = 118 + n * 22;
      bumpImg.data[p] = bumpImg.data[p + 1] = bumpImg.data[p + 2] = b;
      bumpImg.data[p + 3] = 255;
    }
  }
  col.putImageData(colImg, 0, 0);
  bump.putImageData(bumpImg, 0, 0);

  const pitch = w / stitches;
  const thread = threadV * h;
  for (const v of rowsV) {
    const yc = (1 - v) * h; // CanvasTexture flips Y: v=0 is the bottom row

    // Pressed stitch channel: a soft groove the thread sits in.
    const groove = (ctx, style) => {
      ctx.fillStyle = style;
      ctx.fillRect(0, yc - thread * 1.1, w, thread * 2.2);
    };
    groove(col, "rgba(10,10,12,0.55)");
    groove(bump, "rgba(60,60,60,0.8)");

    for (let k = 0; k < stitches; k++) {
      const xc = (k + 0.5) * pitch;
      const len = pitch * 0.64;
      for (const [ctx, fill, hole] of [
        [col, "#8d887f", "rgba(0,0,0,0.9)"],
        [bump, "#f0f0f0", "rgba(20,20,20,1)"],
      ]) {
        // Needle holes at each end of the stitch.
        ctx.fillStyle = hole;
        for (const hx of [xc - pitch / 2, xc + pitch / 2]) {
          ctx.beginPath();
          ctx.ellipse(hx, yc, pitch * 0.07, thread * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // The thread itself: a slightly slanted, rounded dash.
        ctx.save();
        ctx.translate(xc, yc);
        ctx.rotate(-0.1);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(0, 0, len / 2, thread / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  const tex = (canvas, colorSpace) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = colorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { map: tex(colC, THREE.SRGBColorSpace), bumpMap: tex(bumpC, THREE.NoColorSpace) };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

// Closed rounded-rectangle loop in (n, z): n is thickness (outward from the arc centre),
// z is width. Starts at the underside centre and runs counter-clockwise in (z, n).
// `crown` puffs the top and underside out at the centre, like a padded strap.
function roundedRectLoop(hw, ht, rc, crown, step = 0.0025) {
  const pts = [];
  const push = (n, z) => {
    const last = pts[pts.length - 1];
    if (last && Math.hypot(last.n - n, last.z - z) < 1e-6) return;
    pts.push({ n, z });
  };
  const bulge = (z) => crown * (1 - Math.pow(z / (hw - rc), 2));
  const line = (n0, z0, n1, z1, puff) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(n1 - n0, z1 - z0) / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const z = z0 + (z1 - z0) * t;
      push(n0 + (n1 - n0) * t + puff * bulge(z), z);
    }
  };
  const arc = (cn, cz, dir) => {
    for (let i = 0; i <= 8; i++) {
      const [dn, dz] = dir((i / 8) * (Math.PI / 2));
      push(cn + rc * dn, cz + rc * dz);
    }
  };
  const a = hw - rc;
  const b = ht - rc;
  line(-ht, 0, -ht, a, -1);
  arc(-b, a, (t) => [-Math.cos(t), Math.sin(t)]);
  line(-b, hw, b, hw, 0);
  arc(b, a, (t) => [Math.sin(t), Math.cos(t)]);
  line(ht, a, ht, -a, 1);
  arc(b, -a, (t) => [Math.cos(t), -Math.sin(t)]);
  line(b, -hw, -b, -hw, 0);
  arc(-b, -a, (t) => [-Math.sin(t), -Math.cos(t)]);
  line(-ht, -a, -ht, 0, -1);
  pts.pop(); // last point repeats the first

  // Cumulative V and outward normals from neighbours.
  let len = 0;
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const p = pts[i % pts.length];
    const q = pts[i - 1];
    len += Math.hypot(p.n - q.n, p.z - q.z);
    cum.push(len);
  }
  pts.forEach((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const tz = next.z - prev.z;
    const tn = next.n - prev.n;
    const l = Math.hypot(tz, tn) || 1;
    p.nz = tn / l;
    p.nn = -tz / l;
    p.v = cum[i] / len;
  });
  return { pts, perimeter: len };
}

// A strap swept along a circular arc in the XY plane (centre (0, cy), radius R, angles
// a0..a1). Returns the geometry plus the V coordinate of four stitch rows (inset from
// each edge on the top and the underside).
function createStrapGeometry({ cy, R, a0, a1, width, thick, rc, crown, inset, tileLength, segs = 220 }) {
  const { pts, perimeter } = roundedRectLoop(width / 2, thick / 2, rc, crown);
  const ring = pts.length + 1; // seam duplicated so V can run 0..1
  const pos = [];
  const nor = [];
  const uv = [];
  for (let j = 0; j <= segs; j++) {
    const a = a0 + ((a1 - a0) * j) / segs;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const u = (R * (a - a0)) / tileLength;
    for (let i = 0; i < ring; i++) {
      const p = pts[i % pts.length];
      const r = R + p.n;
      pos.push(r * ca, cy + r * sa, p.z);
      nor.push(p.nn * ca, p.nn * sa, p.nz);
      uv.push(u, i === pts.length ? 1 : p.v);
    }
  }
  const idx = [];
  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < ring - 1; i++) {
      const A = j * ring + i;
      const B = (j + 1) * ring + i;
      const C = B + 1;
      const D = A + 1;
      idx.push(A, C, B, A, D, C);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);

  // Stitch rows: nearest loop sample on the top / underside at |z| = width/2 - inset.
  const zRow = width / 2 - inset;
  const rowV = (sign, z) => {
    let best = null;
    for (const p of pts) {
      if (Math.sign(p.n) !== sign || Math.abs(p.nn) < 0.9) continue;
      const d = Math.abs(p.z - z);
      if (!best || d < best.d) best = { d, v: p.v };
    }
    return best.v;
  };
  const rowsV = [rowV(-1, zRow), rowV(-1, -zRow), rowV(1, zRow), rowV(1, -zRow)];
  return { geometry: g, rowsV, perimeter };
}

// Yoke fork: a flat blade following the top half of the cup outline, in the YZ plane,
// thickness along X, with a small bevel on every edge. UVs are rebuilt in world units
// along the arc so the carbon weave runs with the blade instead of being smeared.
function createForkGeometry(r1, r2, thickness, bevel, weaveSize) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r2, 0, Math.PI, false);
  shape.absarc(0, 0, r1, Math.PI, 0, true);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 96,
  });
  g.translate(0, 0, -(thickness - 2 * bevel) / 2);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  const rMid = (r1 + r2) / 2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const r = Math.hypot(x, y);
    const theta = Math.atan2(Math.max(y, -0.05), x);
    uv.setXY(i, (theta * rMid) / weaveSize, (p.getZ(i) + (r - rMid)) / weaveSize);
  }
  uv.needsUpdate = true;
  // Shape plane XY -> YZ (blade spans the cup front-to-back), extrusion -> X.
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
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

  // --- Dimensions -------------------------------------------------------------
  const BAND_R = 1.1;
  const BAND_TUBE = 0.042;
  const BAND_DEPTH_SCALE = 2.1;
  const CUP_R = 0.44;
  const CUP_DEPTH = 0.24;
  const BEAD = 0.04; // edge rounding radius
  const CUP_Y = -0.85;
  const CUP_SCALE_Y = 1.16;
  const FORK_R1 = CUP_R + 0.032; // inner edge of the fork blade
  const FORK_R2 = CUP_R + 0.094; // outer edge
  const FORK_MID = (FORK_R1 + FORK_R2) / 2;
  const FORK_T = 0.086; // blade thickness along the cup axis
  const FORK_TOP_Y = CUP_Y + FORK_R2 * CUP_SCALE_Y;

  // Headband strap: a flatter arc than the band, meeting it near the ends and hanging
  // a clear gap below it at the crown (a suspension strap, not a glued-on pad).
  const STRAP_END = new THREE.Vector2(0.9, 0.5);
  const STRAP_APEX_Y = 0.9;
  const STRAP_CY =
    (STRAP_END.x * STRAP_END.x + STRAP_END.y * STRAP_END.y - STRAP_APEX_Y * STRAP_APEX_Y) /
    (2 * (STRAP_END.y - STRAP_APEX_Y));
  const STRAP_R = STRAP_APEX_Y - STRAP_CY;
  const STRAP_A0 = Math.atan2(STRAP_END.y - STRAP_CY, STRAP_END.x);
  const STRAP_W = 0.158;
  const STRAP_T = 0.038;

  // --- Textures ---------------------------------------------------------------
  const spunRough = track(createSpunMetalRoughness());
  const grain = track(createLeatherGrain());
  const carbon = createCarbonWeave();
  Object.values(carbon).forEach(track);
  const strapGeo = createStrapGeometry({
    cy: STRAP_CY,
    R: STRAP_R,
    a0: STRAP_A0,
    a1: Math.PI - STRAP_A0,
    width: STRAP_W,
    thick: STRAP_T,
    rc: 0.015,
    crown: 0.006,
    inset: 0.017,
    tileLength: 6 * 0.021,
  });
  track(strapGeo.geometry);
  const strapTex = createStitchedLeather(strapGeo.rowsV, { threadV: 0.0034 / strapGeo.perimeter });
  Object.values(strapTex).forEach(track);

  // --- Materials --------------------------------------------------------------

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

  // Machined cup face and hinge hubs: fine concentric rings carried in the roughness.
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

  // Polished stainless: stems, collars, chamfer lines, jewel ring, screws.
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

  // Lacquered 2x2 twill carbon fibre: the yoke forks.
  const carbonFibre = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: carbon.map,
      bumpMap: carbon.bumpMap,
      bumpScale: 0.6,
      metalness: 0.35,
      roughness: 0.32,
      anisotropy: 0.75,
      anisotropyMap: carbon.anisotropyMap,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
  );

  // Bead-blasted titanium for the badge disc: a soft, even matte that holds a mid tone
  // from any angle, so the mark reads even when the spun face around it goes dark.
  const badgeMetal = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xa4a7ae,
      metalness: 1,
      roughness: 0.5,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
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

  // Seam piping on the cushions: a shade darker and a touch glossier than the leather.
  const piping = track(
    new THREE.MeshStandardMaterial({
      color: 0x1f1f23,
      roughness: 0.5,
      metalness: 0,
    }),
  );

  // Stitched full-grain leather for the headband strap, with a soft sheen.
  const strapLeather = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: strapTex.map,
      bumpMap: strapTex.bumpMap,
      bumpScale: 1.2,
      roughness: 0.58,
      metalness: 0,
      sheen: 0.35,
      sheenColor: 0x8a8a92,
      sheenRoughness: 0.45,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
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

  const addPart = (name, explodeDir, explodeDistance) => {
    const g = new THREE.Group();
    g.name = name;
    g.userData.explodeDir = explodeDir.clone().normalize();
    g.userData.explodeDistance = explodeDistance;
    model.add(g);
    parts[name] = g;
    return g;
  };
  const mesh = (geometry, material, parent) => {
    const m = new THREE.Mesh(geo(geometry), material);
    parent.add(m);
    return m;
  };
  // Cylinder whose axis runs along Z, spanning z0..z1.
  const zCylinder = (rTop, rBottom, z0, z1, radial, material, parent) => {
    const g = new THREE.CylinderGeometry(rTop, rBottom, z1 - z0, radial);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, (z0 + z1) / 2);
    return mesh(g, material, parent);
  };

  // --- Headband -------------------------------------------------------------

  // Outer aluminium band: a wide, flat half-ring with a softly rounded section.
  const headband = addPart("headband", new THREE.Vector3(0, 1, 0), 0.5);
  const band = mesh(new THREE.TorusGeometry(BAND_R, BAND_TUBE, 32, 200, Math.PI), anodized, headband);
  band.scale.z = BAND_DEPTH_SCALE;

  // Diamond-cut chamfer lines: a polished bright edge along both faces of the band.
  for (const z of [-1, 1]) {
    const edge = mesh(new THREE.TorusGeometry(BAND_R, 0.0042, 8, 200, Math.PI), steel, headband);
    edge.position.z = z * (BAND_TUBE * BAND_DEPTH_SCALE - 0.006);
  }

  // Leather suspension strap, stitched along both edges of its top and underside.
  const strapPart = addPart("headband-strap", new THREE.Vector3(0, -1, 0), 0.18);
  mesh(strapGeo.geometry, strapLeather, strapPart);

  // --- Sides ----------------------------------------------------------------

  for (const side of [-1, 1]) {
    const suffix = side === -1 ? "left" : "right";

    // Strap anchor: a graphite pin the strap end wraps around, polished end caps, and a
    // pair of clevis plates reaching up to the band.
    const anchor = addPart(`strap-anchor-${suffix}`, new THREE.Vector3(side, -0.6, 0), 0.22);
    {
      const ex = side * STRAP_END.x;
      const ey = STRAP_END.y;
      anchor.position.set(ex, ey, 0);
      const half = STRAP_W / 2 + 0.012;
      zCylinder(0.02, 0.02, -half, half, 32, graphite, anchor);
      for (const z of [-1, 1]) {
        zCylinder(0.014, 0.014, Math.min(z * half, z * (half + 0.005)), Math.max(z * half, z * (half + 0.005)), 24, steel, anchor);
        // Clevis plate from the pin out to the band's inner surface.
        const out = new THREE.Vector2(ex, ey).normalize();
        const reach = BAND_R - BAND_TUBE + 0.01 - Math.hypot(ex, ey);
        const plate = mesh(new THREE.BoxGeometry(0.034, reach + 0.02, 0.006), graphite, anchor);
        plate.rotation.z = Math.atan2(out.y, out.x) - Math.PI / 2;
        plate.position.set((out.x * reach) / 2, (out.y * reach) / 2, z * (half + 0.0085));
      }
    }

    // Slider: graphite end cap where the band turns down, then the polished stem.
    const slider = addPart(`slider-${suffix}`, new THREE.Vector3(0, 1, 0), 0.3);
    slider.position.x = side * BAND_R;
    const endCap = mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.06, 40), graphite, slider);
    endCap.scale.z = 1.9;
    endCap.position.y = -0.02;
    const stemTop = -0.05;
    const swivelTop = FORK_TOP_Y + 0.052;
    const stem = mesh(new THREE.CylinderGeometry(0.024, 0.024, stemTop - swivelTop + 0.01, 32), steel, slider);
    stem.position.y = (stemTop + swivelTop - 0.01) / 2;
    // Steel ring where the stem telescopes out of the band.
    const sliderRing = mesh(new THREE.TorusGeometry(0.029, 0.0045, 12, 48), steel, slider);
    sliderRing.rotation.x = Math.PI / 2;
    sliderRing.position.y = stemTop - 0.003;

    // Yoke: swivel block on the stem, a polished collar, and a carbon fork that wraps
    // the top half of the cup down to the two gimbal pivots.
    const yoke = addPart(`yoke-${suffix}`, new THREE.Vector3(0, 1, 0), 0.12);
    yoke.position.x = side * BAND_R;
    {
      const blockH = 0.05;
      const blockY = swivelTop - blockH / 2;
      const block = mesh(new THREE.CylinderGeometry(0.044, 0.05, blockH, 48), anodized, yoke);
      block.position.y = blockY;
      block.scale.z = 1.25;
      // Graphite seat between block and fork, then the steel swivel collar on top.
      const seat = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.012, 48), graphite, yoke);
      seat.position.y = swivelTop - blockH - 0.002;
      seat.scale.z = 1.25;
      const collar = mesh(new THREE.TorusGeometry(0.034, 0.0065, 16, 64), steel, yoke);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = swivelTop + 0.002;
      const cap = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.008, 48), graphite, yoke);
      cap.position.y = swivelTop + 0.002;

      const fork = mesh(createForkGeometry(FORK_R1, FORK_R2, FORK_T, 0.007, 0.022), carbonFibre, yoke);
      fork.position.y = CUP_Y;
      fork.scale.y = CUP_SCALE_Y;
    }

    // Gimbal hinges at the two fork tips, axis along Z into the cup wall.
    for (const end of [1, -1]) {
      const hinge = addPart(`hinge-${suffix}-${end === 1 ? "front" : "back"}`, new THREE.Vector3(0, 0, end), 0.2);
      hinge.position.set(side * BAND_R, CUP_Y, end * FORK_MID);
      hinge.rotation.y = end === 1 ? 0 : Math.PI; // local +Z always points out of the cup
      const wall = CUP_R - FORK_MID; // cup wall, in hinge-local z
      // Graphite barrel: the actual pivot pin, disappearing into the cup wall.
      zCylinder(0.024, 0.024, wall - 0.01, -0.02, 32, graphite, hinge);
      // Machined hub around the fork tip, standing proud of the blade's outer face.
      const bladeOut = (FORK_R2 - FORK_R1) / 2 + 0.007;
      const hubFace = bladeOut + 0.018;
      zCylinder(0.054, 0.054, -bladeOut - 0.004, bladeOut, 64, anodized, hinge);
      // Polished collar where the hub leaves the carbon, then the stepped barrel head
      // with a chamfered spun face and a small flush screw.
      const collar = mesh(new THREE.TorusGeometry(0.05, 0.0055, 16, 72), steel, hinge);
      collar.position.z = bladeOut + 0.002;
      zCylinder(0.042, 0.046, bladeOut, hubFace - 0.004, 64, anodized, hinge);
      zCylinder(0.038, 0.042, hubFace - 0.004, hubFace, 64, [steel, faceMetal, steel], hinge);
      // Hex-head pivot screw, polished, sitting proud (a dark socket here reads as a jack).
      zCylinder(0.011, 0.012, hubFace - 0.001, hubFace + 0.004, 6, steel, hinge);
    }

    // Cup-side parts share one frame: centred on the cup, slightly oval (taller than
    // wide), with an inner "body" frame whose local +Y is the outward axis. The scale
    // and the rotation live on separate groups so the oval stays vertical.
    const cupFrame = (name, explodeDir, explodeDistance) => {
      const part = addPart(`${name}-${suffix}`, explodeDir, explodeDistance);
      part.position.set(side * BAND_R, CUP_Y, 0);
      part.scale.set(1, CUP_SCALE_Y, 1);
      const body = new THREE.Group();
      body.rotation.z = side === 1 ? -Math.PI / 2 : Math.PI / 2;
      part.add(body);
      return body;
    };

    // Shell: housing, rounded beads, machined face, jewel ring. Explodes outward.
    const shell = cupFrame("cup", new THREE.Vector3(side, 0, 0), 0.55);

    // Housing: the main cylinder. Side anodized, faces machined.
    mesh(new THREE.CylinderGeometry(CUP_R, CUP_R, CUP_DEPTH, 160, 1), [anodized, faceMetal, anodized], shell);

    // Rounded edges on both faces: a torus bead whose outer edge matches the housing wall.
    for (const y of [CUP_DEPTH / 2, -CUP_DEPTH / 2]) {
      const bead = mesh(new THREE.TorusGeometry(CUP_R - BEAD, BEAD, 24, 160), anodized, shell);
      bead.rotation.x = Math.PI / 2;
      bead.position.y = y;
    }

    // Machined outer face, flush with the top of the bead.
    const face = mesh(
      new THREE.CylinderGeometry(CUP_R - BEAD, CUP_R - BEAD, BEAD, 160),
      [anodized, faceMetal, anodized],
      shell,
    );
    face.position.y = CUP_DEPTH / 2 + BEAD / 2 - 0.002;
    const FACE_TOP = CUP_DEPTH / 2 + BEAD - 0.002;

    // Polished jewel ring inset on the face.
    const jewel = mesh(new THREE.TorusGeometry(CUP_R * 0.62, 0.006, 12, 160), steel, shell);
    jewel.rotation.x = Math.PI / 2;
    jewel.position.y = FACE_TOP + 0.001;

    // Badge: a raised bead-blasted titanium medallion with a diamond-cut chamfer, carrying an
    // embossed ring-and-dot mark. Counter-scaled so it stays round on the oval cup.
    const badgeBody = cupFrame("badge", new THREE.Vector3(side, 0, 0), 0.85);
    {
      const badge = new THREE.Group();
      badge.scale.x = 1 / CUP_SCALE_Y; // body X maps to world Y
      badgeBody.add(badge);
      const RB = 0.105;
      const H = 0.016; // height above the face
      const CH = 0.007; // chamfer
      // Recessed shadow gap: a thin graphite step the medallion sits in.
      const gap = mesh(new THREE.CylinderGeometry(RB + 0.008, RB + 0.008, 0.004, 96), graphite, badge);
      gap.position.y = FACE_TOP + 0.0005;
      // Polished chamfer rim, turned on a lathe profile.
      const rim = mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(RB, FACE_TOP - 0.003),
            new THREE.Vector2(RB, FACE_TOP + H - CH),
            new THREE.Vector2(RB - CH, FACE_TOP + H),
          ],
          96,
        ),
        steel,
        badge,
      );
      rim.userData.part = "badge-rim";
      // Disc top.
      const disc = mesh(new THREE.CylinderGeometry(RB - CH, RB - CH, 0.004, 96), badgeMetal, badge);
      disc.position.y = FACE_TOP + H - 0.002;
      // Embossed mark: a raised polished ring and centre dot, echoing the HUSH ring.
      const mark = mesh(new THREE.TorusGeometry(0.046, 0.0055, 16, 96), steel, badge);
      mark.rotation.x = Math.PI / 2;
      mark.position.y = FACE_TOP + H;
      const dot = mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.006, 40), steel, badge);
      dot.position.y = FACE_TOP + H + 0.001;
    }

    // Baffle: graphite mount and acoustic fabric, inward of the shell.
    const baffle = cupFrame("baffle", new THREE.Vector3(-side, 0, 0), 0.15);
    const mount = mesh(new THREE.CylinderGeometry(CUP_R - 0.02, CUP_R - 0.04, 0.05, 160), graphite, baffle);
    mount.position.y = -CUP_DEPTH / 2 - BEAD - 0.015;

    // Cushion: a deep leather donut on the inner face. Explodes toward the head.
    const cushionBody = cupFrame("cushion", new THREE.Vector3(-side, 0, 0), 0.4);
    const CUSHION_Y = -CUP_DEPTH / 2 - BEAD - 0.1;
    const cushionMesh = mesh(new THREE.TorusGeometry(CUP_R * 0.7, 0.115, 40, 160), cushion, cushionBody);
    cushionMesh.rotation.x = Math.PI / 2;
    cushionMesh.scale.z = 0.85;
    cushionMesh.position.y = CUSHION_Y;
    // Seam piping round the outer equator, where the two leather panels are joined.
    const seam = mesh(new THREE.TorusGeometry(CUP_R * 0.7 + 0.113, 0.0045, 10, 160), piping, cushionBody);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = CUSHION_Y;

    // Acoustic fabric disc recessed inside the cushion.
    const fabricDisc = mesh(new THREE.CylinderGeometry(CUP_R * 0.6, CUP_R * 0.6, 0.01, 96), fabric, baffle);
    fabricDisc.position.y = -CUP_DEPTH / 2 - BEAD - 0.05;
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
