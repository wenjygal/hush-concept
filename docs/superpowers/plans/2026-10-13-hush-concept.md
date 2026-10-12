# HUSH Concept Microsite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the HUSH single-page concept microsite — a mouse-reactive 3D hero, two supporting sections, and the reveal-to-BOOST-ME twist — as a static site in its own repo.

**Architecture:** Vanilla HTML/CSS/JS, no framework, no build step. One pure logic module (`rotation-controller.js`) owns the damped-rotation and idle-bob math and is unit-tested with Node's built-in test runner. A thin Three.js layer (`hero-scene.js`) consumes that module to drive the 3D headphone model. `main.js` wires DOM events to both. CSS carries all visual design via custom properties (design tokens) so the palette/type lock is enforced in one place.

**Tech Stack:** Three.js (ESM via CDN, e.g. `https://unpkg.com/three@<pinned-version>/build/three.module.js`), native CSS (custom properties, `@media` queries, `@starting-style` where supported), Node `--test` + `assert` for unit tests (dev-only, not shipped), `gh` CLI for repo creation, GitHub Pages for hosting.

**Spec:** Design Spec section of the `BOOST ME — HUSH SHOWCASE` project note in the GEMS vault (`004 projects/BOOST ME/BOOST ME — HUSH SHOWCASE.md`), plus the Direction Contract recorded in this repo's `.impeccable/surfaces/index-html.md`.

**Working directory:** `C:\Users\Gal Efrati\hush-concept` (this repo). Task 1 (repo scaffold, `impeccable init`, GitHub repo creation) is already complete as of 2026-10-13 — this file documents it for the record; execution resumes at Task 2.

## Global Constraints

- No React/Next, no build step. Vanilla HTML/CSS/JS. Three.js via ESM CDN import only.
- Repo `hush-concept`, private, under the `wenjygal` GitHub account, deployed via GitHub Pages.
- Palette locked: background `zinc-950`-range off-black, text off-white, cool metal/silver material cues, exactly one accent (saturated red/coral), used only for CTA/interactive highlight, identical across all three sections.
- Typography: display font Cabinet Grotesk, mono font JetBrains Mono, both self-hosted via `@font-face` (no Google Fonts `<link>` tag). No Inter, no default serif.
- Zero "concept" / "קונספט" / "demo" / "showcase" language anywhere in the Hero or Section 2. The reveal lives exclusively in Section 3.
- Zero em-dash (`—`) characters anywhere in visible copy.
- One CTA intent only, identical label everywhere it appears. Section 3's CTA points to `boost-me.digital`.
- `prefers-reduced-motion: reduce` collapses hero rotation, idle bob, and any scroll-reveal motion to fully static.
- WCAG AA contrast minimum for the accent color against `zinc-950` and for all body text.
- Hero section uses `min-height: 100dvh`, never a fixed `100vh`/`height: 100vh` lock.
- Rotation formula: `targetYDeg = normX * 35`, `targetXDeg = normY * 8`, where `normX`/`normY` are mouse position normalized to `[-1, 1]` relative to the viewport center.
- Craft floor (impeccable): no same-size card grids as page structure, no kicker/eyebrow above any heading, no section numbers, no gradient text, no decorative glass/blur, no hard offset "neobrutalist" shadows, no geometric masks standing in for organic contours, theme browser surfaces (selection, focus rings, scrollbar, caret) from the palette rather than leaving browser defaults.

## Review Focus

- Touch devices have no mouse: the hero must not look dead/static on mobile. The idle bob must still play, and rotation degrades gracefully to idle-only. Covered in Task 4's manual device-check step.
- `prefers-reduced-motion: reduce`: the hero must fully stop moving (no bob, no damped-rotation loop), not just slow down. Covered in Task 4.
- Copy leak: any "concept"/"קונספט"/"demo"/"showcase" string in Hero or Section 2 HTML breaks the entire premise. Covered by an automated grep check in Task 6.
- Em-dash leak: any `—` character in visible copy. Covered by an automated grep check in Task 6.
- Accent-on-background contrast: the chosen red/coral hex must pass WCAG AA against `zinc-950` for both directions it's used in (label-on-accent-fill and accent-as-text). Covered by a computed-contrast-ratio check in Task 3.

---

### Task 1: Repo scaffold, impeccable init, GitHub repo — COMPLETE (2026-10-13)

Done directly by the controller session, not dispatched: pure infra bootstrap with no reviewable logic (`mkdir`, `git init`, placeholder `index.html`/`.gitignore`/`README.md`, `impeccable init` → `PRODUCT.md`, a surface brief recording the brief-pinned Direction Contract at `.impeccable/surfaces/index-html.md`, `gh repo create wenjygal/hush-concept --private --source=. --remote=origin --push`). Commit `c9234fb`. Repo live at `https://github.com/wenjygal/hush-concept`, branch `main`.

---

### Task 2: Rotation controller (pure logic, TDD)

**Files:**
- Create: `scripts/rotation-controller.js`
- Test: `tests/rotation-controller.test.js`

**Interfaces:**
- Produces: `targetRotation(normX: number, normY: number, opts?: { maxYDeg?: number, maxXDeg?: number }) -> { targetYDeg: number, targetXDeg: number }`; `dampStep(current: number, target: number, dampingFactor: number, dt: number) -> number`; `createRotationState(opts?: { maxYDeg?: number, maxXDeg?: number, dampingFactor?: number }) -> { update(normX: number, normY: number, dt: number) -> { y: number, x: number }, idleOffset(timeSec: number, amplitudeDeg?: number, periodSec?: number) -> number }`. Task 4 imports all three from this module; no DOM or Three.js references in this file.

- [ ] **Step 1: Write the failing tests**

```js
// tests/rotation-controller.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { targetRotation, dampStep, createRotationState } from "../scripts/rotation-controller.js";

test("targetRotation maps full-right mouse to +35deg Y, no X tilt", () => {
  const { targetYDeg, targetXDeg } = targetRotation(1, 0);
  assert.equal(targetYDeg, 35);
  assert.equal(targetXDeg, 0);
});

test("targetRotation maps full-down mouse to +8deg X, no Y turn", () => {
  const { targetYDeg, targetXDeg } = targetRotation(0, 1);
  assert.equal(targetYDeg, 0);
  assert.equal(targetXDeg, 8);
});

test("dampStep with dt=0 returns current unchanged", () => {
  assert.equal(dampStep(10, 50, 5, 0), 10);
});

test("dampStep converges toward target as dt grows", () => {
  const result = dampStep(0, 100, 5, 10);
  assert.ok(result > 95, `expected convergence near 100, got ${result}`);
});

test("createRotationState.update moves current rotation toward target over repeated calls", () => {
  const state = createRotationState({ dampingFactor: 5 });
  let last = state.update(1, 0, 0.1);
  for (let i = 0; i < 50; i++) last = state.update(1, 0, 0.1);
  assert.ok(last.y > 30, `expected y near 35 after settling, got ${last.y}`);
});

test("idleOffset is sinusoidal: zero at t=0, positive at quarter period", () => {
  const state = createRotationState({});
  assert.equal(state.idleOffset(0, 2, 4), 0);
  assert.ok(Math.abs(state.idleOffset(1, 2, 4) - 2) < 1e-9);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/rotation-controller.test.js`
Expected: FAIL, `rotation-controller.js` not found.

- [ ] **Step 3: Implement `rotation-controller.js`**

`targetRotation(normX, normY, { maxYDeg = 35, maxXDeg = 8 } = {})` returns `{ targetYDeg: normX * maxYDeg, targetXDeg: normY * maxXDeg }`.
`dampStep(current, target, dampingFactor, dt)` returns `current + (target - current) * (1 - Math.exp(-dampingFactor * dt))`.
`createRotationState({ maxYDeg = 35, maxXDeg = 8, dampingFactor = 5 } = {})` closes over `currentY = 0, currentX = 0`; `update(normX, normY, dt)` computes the target via `targetRotation`, advances `currentY`/`currentX` one `dampStep` each, returns `{ y: currentY, x: currentX }`; `idleOffset(timeSec, amplitudeDeg = 2, periodSec = 4)` returns `amplitudeDeg * Math.sin((2 * Math.PI * timeSec) / periodSec)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/rotation-controller.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/rotation-controller.js tests/rotation-controller.test.js
git commit -m "feat: add damped rotation controller"
```

---

### Task 3: Design tokens and page shell (CSS + static HTML for all 3 sections)

**Files:**
- Create: `styles/main.css`
- Create: `styles/fonts.css` (self-hosted `@font-face` for Cabinet Grotesk + JetBrains Mono)
- Modify: `index.html` (full markup for Hero, Section 2, Section 3 — copy is placeholder, finalized in Tasks 5-6)

**Interfaces:**
- Produces: CSS custom properties `--color-bg`, `--color-text`, `--color-metal`, `--color-accent`, `--font-display`, `--font-mono`, `--radius` defined on `:root` in `styles/main.css`. Produces DOM hooks Task 4 and Task 5/6 depend on: `#hero-canvas` (the `<canvas>` Three.js mounts to), `.hero__stage` (its container), `.hero`, `.section-material`, `.section-reveal` (section wrappers), `.cta` (the single CTA button class, reused verbatim in every section that has a CTA).

- [ ] **Step 1: Download the font files and write `styles/fonts.css`**

Download Cabinet Grotesk's free webfont kit from fontshare.com/fonts/cabinet-grotesk and JetBrains Mono's open-source files (e.g. via Fontsource or the official JetBrains Mono GitHub release) as `.woff2` files into `assets/fonts/`. Write `@font-face` rules in `styles/fonts.css` with `src: url("../assets/fonts/<file>.woff2") format("woff2")` and `font-display: swap` for each weight actually used (one weight for Cabinet Grotesk display, one for JetBrains Mono if used). This is true self-hosting (local files in the repo), not a remote CDN dependency at runtime.

- [ ] **Step 2: Write `styles/main.css` design tokens**

```css
:root {
  --color-bg: #09090b;      /* zinc-950 range */
  --color-text: #f4f4f5;
  --color-metal: #a1a1aa;
  --color-accent: #___;     /* saturated red/coral — pick exact hex here */
  --font-display: "Cabinet Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --radius: 12px;
}
```
Pick the `--color-accent` hex value, then compute its contrast ratio against `#09090b` (and against `--color-text` if used as a text color). Record the chosen hex and both ratios in a one-line CSS comment above the token.

- [ ] **Step 3: Verify accent contrast**

Run a contrast-ratio check (any WCAG contrast calculator/script) for `--color-accent` against `--color-bg`.
Expected: ratio >= 4.5:1 (body-text-equivalent threshold; the CTA label uses `--color-bg`-on-`--color-accent` or `--color-text`-on-`--color-accent`, whichever direction is used, and must also clear 4.5:1). If it fails, darken/lighten the hex and re-check before moving on — do not proceed with a failing ratio.

- [ ] **Step 4: Write the full `index.html` markup**

Hero (`.hero` containing the left copy block and `.hero__stage > canvas#hero-canvas`), Section 2 (`.section-material` with the asymmetric bento: one large tile + two smaller), Section 3 (`.section-reveal` with the reveal copy and one `.cta` link to `boost-me.digital`). Hero uses `min-height: 100dvh`. All copy is placeholder at this stage (filled for real in Tasks 5-6) but the DOM structure and classes are final. No eyebrow above any heading anywhere on the page (craft-floor ban — not a style preference, a hard ban), no same-size card grid as the page's structural device.

- [ ] **Step 5: Manual check in browser**

Open `index.html` directly (file://) in a browser. Expected: three sections render in source order, dark background, no console errors, hero fills the viewport without forcing a scroll to see the CTA, resizing the window to 375px width collapses every section to single-column.

- [ ] **Step 6: Commit**

```bash
git add index.html styles/main.css styles/fonts.css
git commit -m "feat: design tokens and page shell"
```

---

### Task 4: Three.js hero scene (3D model, lighting, mouse rotation, idle bob)

**Files:**
- Create: `scripts/hero-scene.js`
- Create: `scripts/main.js`
- Modify: `index.html` (add `<script type="module" src="scripts/main.js"></script>` before `</body>`)

**Interfaces:**
- Consumes: `createRotationState` from `scripts/rotation-controller.js` (Task 2); `#hero-canvas` element from `index.html` (Task 3).
- Produces: `initHeroScene(canvas: HTMLCanvasElement) -> { destroy(): void }` exported from `hero-scene.js`, called by `main.js` on `DOMContentLoaded`.

- [ ] **Step 1: Implement `initHeroScene` in `hero-scene.js`**

Set up a Three.js `WebGLRenderer` on the given canvas, a `PerspectiveCamera`, and a group representing the headphones: a `TorusGeometry` headband plus two ear-cup groups (a `CapsuleGeometry` or `CylinderGeometry` pair each). Metal parts use `MeshPhysicalMaterial` (high `metalness`, low `roughness`); cushions use a matte dark `MeshStandardMaterial`. Add a three-point light rig (key/fill/rim `DirectionalLight` or `SpotLight`) plus a simple `PMREMGenerator`-based environment map for reflections. On each animation frame: read normalized mouse position (`normX`, `normY` in `[-1, 1]`, computed from a `mousemove` listener on `window`), call `rotationState.update(normX, normY, dt)` which returns degrees, convert both `y` and `x` to radians (`degrees * Math.PI / 180`) before assigning to the model group's `rotation.y`/`rotation.x` (Three.js rotations are radians, the controller's output is degrees — do not assign degrees directly), and add `rotationState.idleOffset(elapsedSec)` (also converted to radians) on top of `rotation.y` for the idle bob. Gate the entire animation loop behind `window.matchMedia("(prefers-reduced-motion: reduce)")`: when reduced motion is requested, render one static frame with the model at its rest rotation and do not start the loop. Return `{ destroy() }` that cancels the animation frame and removes the `mousemove` listener.

- [ ] **Step 2: Implement `main.js`**

On `DOMContentLoaded`, query `#hero-canvas`, call `initHeroScene(canvas)`. No other logic in this file for this task (it grows in Tasks 5-6 if needed).

- [ ] **Step 3: Wire the script tag into `index.html`**

Add the module script tag before `</body>`.

- [ ] **Step 4: Visual verification against the craft bar**

Open `index.html` in a browser. Move the mouse left/right and up/down across the hero. Expected: the headphones turn smoothly with a perceptible settle (not an instant snap), stay within roughly the ±35°/±8° range, and keep bobbing gently when the mouse is still. Per impeccable's bounded-verification approach: take one set of screenshots (desktop width and a ~390px mobile width), judge against the spec's bar ("does this read as a real product photo, not a toy demo"), fix everything found in one batch, confirm with at most one more screenshot round, then stop.

- [ ] **Step 5: Reduced-motion and touch check**

In browser devtools, emulate `prefers-reduced-motion: reduce`. Expected: model renders once, completely static, no bob. Then emulate a touch device (no mouse events firing). Expected: the idle bob still plays; the hero does not look dead or broken without mouse input.

- [ ] **Step 6: Commit**

```bash
git add scripts/hero-scene.js scripts/main.js index.html
git commit -m "feat: 3D hero scene with mouse-driven rotation"
```

---

### Task 5: Section 2 content ("Material & Craft")

**Files:**
- Modify: `index.html` (`.section-material` final copy and bento tile markup)
- Modify: `styles/main.css` (bento grid rules for `.section-material`)

**Interfaces:**
- Consumes: `--color-accent`, `--radius` tokens from Task 3.

- [ ] **Step 1: Write final copy for the 3 tiles** (one large + two small; aluminum finish, cushion material, sound character — concrete, no invented fake-precise numbers)
- [ ] **Step 2: Implement the asymmetric bento CSS grid** (one large tile + two smaller, not three equal columns)
- [ ] **Step 3: Manual check**: resize to 375px, confirm the bento collapses to single column, confirm no "concept"/"demo"/"קונספט" word appears anywhere in this section's text
- [ ] **Step 4: Commit**

```bash
git add index.html styles/main.css
git commit -m "feat: section 2 material and craft content"
```

---

### Task 6: Section 3 content (reveal + CTA) and copy self-audit

**Files:**
- Modify: `index.html` (`.section-reveal` final copy, the single `.cta` element pointing to `https://boost-me.digital`)
- Create: `scripts/copy-audit.sh` (or `.js`, whichever is simpler to run standalone) — a throwaway grep script, not shipped behavior, used only in Step 3 below

**Interfaces:**
- Consumes: `.cta` class from Task 3.

- [ ] **Step 1: Write the reveal copy** (plain statement that HUSH does not exist, immediate pivot to the BOOST ME CTA, discreet "a concept built by BOOST ME" attribution line)
- [ ] **Step 2: Add the CTA**: `<a class="cta" href="https://boost-me.digital">...</a>`, label matches the single CTA intent established for the page (no second phrasing for the same intent anywhere else on the page)
- [ ] **Step 3: Run the copy-audit checks**

Run: `grep -n "—" index.html` (em-dash check) and `grep -niE "concept|קונספט|demo|showcase" index.html` restricted to everything before the `.section-reveal` opening tag.
Expected: zero matches for the em-dash check across the whole file; zero matches for the concept/demo check in the Hero and Section 2 markup (matches inside `.section-reveal` itself are expected and correct).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: section 3 reveal and CTA, copy audit clean"
```

---

### Task 7: Cross-cutting polish, audit, and deploy

**Files:**
- Modify: any file flagged by the audit below
- Create: `DESIGN.md` (via `impeccable document`, generated from the finished code)

**Interfaces:**
- Consumes: the finished `index.html`, `styles/`, `scripts/` from Tasks 3-6.

- [ ] **Step 1: Run `impeccable audit`** (a11y, performance, responsive) against the finished page. Also check it against craft-floor's Verify list (contrast, depth, spacing, type, motion, states, browser surfaces, copy, coverage) and Refuse list (no eyebrow, no same-size cards, no gradient text, no decorative glass, no hard-offset shadows, no geometric masks, browser surfaces themed from the palette).
- [ ] **Step 2: Fix everything the audit flags in one batch.** Per impeccable's bounded-verification principle: no open-ended iteration — fix the full batch, then confirm with at most one more audit pass.
- [ ] **Step 3: Run `impeccable document`** to generate `DESIGN.md` from the shipped code.
- [ ] **Step 4: Enable GitHub Pages** on the `hush-concept` repo (Settings → Pages → deploy from `main`).
- [ ] **Step 5: Verify the live URL** loads correctly, hero renders, CTA link reaches `boost-me.digital`.
- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "chore: audit fixes and DESIGN.md"
git push origin main
```

- [ ] **Step 7: Report back** — the live GitHub Pages URL and the repo URL, so Gal can update the `url` frontmatter field on the `BOOST ME — HUSH SHOWCASE` vault project note and decide whether/how to link it from the BOOST ME Linktree showcase (same pattern as the מאמא מיה tour link).
