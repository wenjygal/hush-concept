# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no build step. Three.js imported via ESM CDN for the hero's 3D scene. Decided explicitly (not delegated) to match the existing no-build-step pattern already used on `boostme-landing` and the מאמא מיה tour.

## Users

Potential BOOST ME clients and prospects, typically arriving via a link shared from BOOST ME's showcase channel (Linktree), not organic search. They are evaluating whether BOOST ME can build work of this quality for them.

## Product Purpose

A single-page concept microsite for a premium headphone brand ("HUSH") that does not exist. It makes the visitor want the product, then reveals in its final section that HUSH is fictional and that BOOST ME built the site, pivoting to a BOOST ME CTA. Success: the visitor feels genuine desire before the reveal, and "I need BOOST ME" after it.

## Positioning

Not a real product site - a proof-of-craft demo. Its mechanism is the twist structure itself (two sections play the product fully straight, the third reveals the fiction) combined with a real-time, mouse-reactive 3D hero convincing enough to be mistaken for a real product render, not a static mockup image.

## Operating Context

Lives in its own standalone repo and deployment, separate from `boostme-landing`, linked from BOOST ME's Linktree/showcase (same pattern as the existing מאמא מיה scrolltelling tour). Visited after being shared or linked, not discovered via search.

## Capabilities and Constraints

- Single page, exactly 3 sections: Hero, "Material & Craft", Reveal + CTA.
- No external 3D or image assets. The headphone model is built procedurally in Three.js from primitives (no generated or sourced product imagery exists for this brand).
- Hero rotation is mouse-driven with damped/spring easing (not a direct 1:1 mapping) plus a constant idle bob at rest.
- `prefers-reduced-motion: reduce` must collapse all motion (rotation, bob, any scroll reveal) to fully static, not merely reduced.
- Zero "concept" / "קונספט" / "demo" / "showcase" language anywhere before Section 3; the reveal lives exclusively there.
- Zero em-dash characters anywhere in visible copy.
- One CTA intent only, identical label wherever it appears; the Section 3 CTA points to `boost-me.digital`.
- No fabricated precision: no invented specs/numbers (e.g. fake battery life, fake frequency response) presented as real data.

## Brand Commitments

Fictional brand name: HUSH. A placeholder chosen for this concept; it is not a real company and carries no external brand commitments. Open to change at no cost if a different name reads better once rendered.

## Evidence on Hand

None. This is a fully fabricated concept product - no real customer data, specs, testimonials, or imagery exists, and none should be invented beyond illustrative, clearly-non-numeric material/sensory descriptions.

## Product Principles

1. The twist (fictional product, real craft, BOOST ME reveal) is the entire value proposition - never undercut it with early "concept" language.
2. Visual and interaction craft must read as a real product photo/demo, not a toy or placeholder.
3. Scope stays at one page, three sections - no feature creep.
4. Never fabricate precision (fake specs, fake numbers) to simulate real product data.

## Accessibility & Inclusion

WCAG AA contrast minimum for the single accent color against the dark background and for all body text. `prefers-reduced-motion` must be fully respected, not just dampened.
