---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

## Scope and visitor mode

Mode: Persuade. Single page, three sections (Hero, Material & Craft, Reveal + CTA). Primary target: `index.html` (the whole page is one surface).

## Audience, job, action, proof, constraints

Audience: potential BOOST ME clients arriving via a shared link (BOOST ME's Linktree/showcase), evaluating whether BOOST ME can build work this polished for them.
Job: judge BOOST ME's build quality through the experience of being fooled, then impressed.
Action: by the end, visit `boost-me.digital`.
Proof: the craft itself (the 3D hero's realism, the copy discipline, the twist's timing) is the only proof offered - no fabricated specs, testimonials, or benchmarks.
Constraints: zero "concept"/"demo" language before Section 3; zero em-dash; one CTA intent only; `prefers-reduced-motion` fully respected.

## Chosen direction and memorable moment

User- and brief-pinned direction (approved by Gal in a prior brainstorming session, 2026-10-13) - this beats the roll; concept-seed exploration is skipped per new-work.md's own rule that a pinned direction always wins.

## Direction contract

THESIS: A product that does not exist must out-desire real audio hardware. Refuses the generic AI-purple-gradient hero and the flat product-shot-on-white convention; the proof is a real-time object you turn with your own hand, not a photo.

OWN-WORLD: Cold Luxury. Off-black (`zinc-950`-range) ground, off-white text, cool metal/silver material cues on the product itself, exactly one saturated accent (red/coral, not blue) reserved for the CTA and interactive highlights only. Display type: Cabinet Grotesk. Mono (if used): JetBrains Mono. One corner-radius system applied everywhere. Register: Teenage Engineering / Nothing-phone precision, not generic "Apple minimalism."

STORY: Through the Hero and Section 2, the visitor believes HUSH is a real, shipping premium headphone and wants to own it. Section 3 reveals HUSH is fictional and that BOOST ME built the site, pivoting immediately to one CTA toward `boost-me.digital`.

FIRST VIEWPORT: Asymmetric split hero (not centered). Left ~40%: headline (max 2 lines), subtext (max 20 words), one primary CTA - no eyebrow, no trust strip. Right ~60%: the 3D stage - a Three.js headphone model built from primitives (torus headband, capsule ear cups), brushed-metal `MeshPhysicalMaterial` on the metal parts, matte dark `MeshStandardMaterial` on the cushions, three-point studio lighting plus an environment map for reflections. The model turns toward the cursor with damped/spring easing (never a direct 1:1 mouse mapping) within roughly +/-35deg yaw / +/-8deg pitch, plus a constant idle bob at rest so it reads as alive even without input.

FORM: Code-led (no image generation available this session, stated once, not asked - per new-work.md, without image generation there is no toggle and code-led is the only path). No concept-seed key: the direction is brief-pinned, not rolled.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

Exact accent hex (red/coral family) - to be picked and contrast-checked against `zinc-950` during implementation (Task 3 of the implementation plan in `[[BOOST ME — HUSH SHOWCASE]]`).
