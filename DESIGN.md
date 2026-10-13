---
name: HUSH
description: A single-page concept microsite for a premium headphone that does not exist, built to prove BOOST ME's build quality.
colors:
  void-black: "#09090b"
  bone-white: "#f4f4f5"
  brushed-steel: "#a1a1aa"
  signal-coral: "#FF5A3C"
typography:
  display:
    fontFamily: "Cabinet Grotesk, sans-serif"
    fontSize: "clamp(2.5rem, 2rem + 2.5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Cabinet Grotesk, sans-serif"
    fontSize: "clamp(2rem, 1.6rem + 1.5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Cabinet Grotesk, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: "12px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "2rem"
  lg: "4rem"
  xl: "7rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-coral}"
    textColor: "{colors.void-black}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.9rem 1.75rem"
  bento-tile:
    backgroundColor: "color-mix(in srgb, #f4f4f5 4%, #09090b)"
    textColor: "{colors.bone-white}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

# Design System: HUSH

## Overview

**Creative North Star: "Cold Luxury"**

HUSH is built on a single thesis: a product that does not exist has to out-desire real audio hardware, so the page refuses both of the categories it could have fallen into, the generic AI-purple-gradient SaaS hero, and the flat product-shot-on-white convention. The proof offered is a real-time object the visitor turns with their own cursor, not a photograph standing in for one.

The register is Teenage Engineering / Nothing-phone precision, not generic Apple minimalism: off-black ground, off-white text, cool metal and silver material cues carried by the product render itself, and exactly one saturated accent (coral, never blue) that appears nowhere except the CTA and interactive highlights. Depth comes from tonal layering and a studio-style radial glow, never from drop shadows. Every surface the browser owns (selection, focus ring, scrollbar) is retuned to the same two base tokens, so even the parts no one explicitly drew still carry the system.

**Key Characteristics:**
- One accent, reserved for exactly one job (CTA + interactive highlight), never used decoratively.
- Zero box-shadow anywhere; depth is tonal (color-mix tints) and radial (a soft glow), not a drop shadow.
- One radius (12px) and one breakpoint (720px), a small, confidently-held system rather than a sprawling one.
- Asymmetric structure throughout: the hero's 40/60 split, the bento's one-large-two-small grid. No centered, symmetric, or same-size layout anywhere on the page.

## Colors

A two-neutral, one-accent palette: an off-black ground, an off-white ink, a mid-gray for secondary text, and one coral accent that never appears as a background or body-text color outside the CTA.

### Primary
- **Signal Coral** (`#FF5A3C`): the page's only saturated color. Used exclusively as the CTA fill and for interactive highlight states. Against Void Black it measures 6.42:1 (passes AA for body-size text); against Bone White it measures only 2.82:1 and fails, which is why the CTA label is always Void Black set on a Signal Coral fill, never Signal Coral text on the dark ground.

### Neutral
- **Void Black** (`#09090b`, zinc-950 range): the page background, used nowhere else as a foreground color except as the CTA's label color.
- **Bone White** (`#f4f4f5`): primary ink, used for all headings and default body text. The CTA label is the one exception, it sits in Void Black on the coral fill, not in Bone White.
- **Brushed Steel** (`#a1a1aa`): secondary ink for all body copy. Measures roughly 7.7:1 against Void Black, clearing AAA, not just AA. Body text is never literally gray-on-gray, it's a warm-neutral steel tone pulled from the same material language as the product render.

### Named Rules
**The One Voice Rule.** Signal Coral marks exactly one thing: do this now. It never becomes a section background, a card border, or a secondary heading color. If a second color feels needed, the answer is a stronger tonal shift of Void Black/Bone White, not a second hue.

**The Derived-Tint Rule.** Every background tint and border on the page (bento tile fill, bento tile border, the hero's radial glow) is generated from `color-mix()` between Bone White and Void Black at a stated percentage, never a new hardcoded gray. Adding a surface means picking a mix percentage, not inventing a hex. The scrollbar track is the one exception, it is plain `var(--color-bg)`, not a color-mix, since a track needs no tonal lift off the page background.

## Typography

**Display Font:** Cabinet Grotesk (with sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with monospace fallback)

**Character:** Cabinet Grotesk carries both the display voice and the body voice (at different weights), a single confident geometric face rather than a display/body pairing. JetBrains Mono appears in exactly one place: the Material & Craft tile copy, where its measured, spec-sheet rhythm suits descriptive material language without ever claiming to be real spec data.

### Hierarchy
- **Display** (700, `clamp(2.5rem, 2rem + 2.5vw, 4.5rem)`, line-height 1.1, tracking -0.01em): the hero `h1` only. Max two lines by brief, never larger than this clamp's ceiling.
- **Headline** (700, `clamp(2rem, 1.6rem + 1.5vw, 3rem)` down to `clamp(1.75rem, 1.5rem + 1vw, 2.5rem)` for the lighter third section, line-height 1.1, tracking -0.01em): every `h2`, one per section.
- **Title** (700, `clamp(1.1rem, 1rem + 0.3vw, 1.4rem)`, or `clamp(1.4rem, 1.1rem + 1vw, 2rem)` for the bento's dominant tile): the bento `h3`s. The large tile's title is deliberately larger than its two siblings', reinforcing which tile is dominant rather than leaving that to layout alone.
- **Body** (500, 1.125rem for the hero subtext; 1rem default elsewhere, line-height 1.5, max-width 34ch): Cabinet Grotesk at the lighter weight, always on Brushed Steel. 34ch keeps every paragraph on the page short enough to read in one pass rather than the 65-75ch measure a long-form article would use, this page is persuasion-paced, not reading-paced.
- **Label** (400, 0.95rem, JetBrains Mono, line-height 1.5): reserved for the Material & Craft tile bodies only. Not used anywhere else, it is a material/spec register, not a general secondary-text style.

### Named Rules
**The One Family Rule.** Cabinet Grotesk carries every weight the page needs (500 body, 700 display); JetBrains Mono is the single, deliberate exception for spec-register copy, not a second general-purpose voice.

## Layout

A 1400px max-width container (`--container-max`), centered, used identically by every section via `.section-inner`. Section vertical rhythm is generous and uniform: `7rem` (`--space-xl`) of padding above and below every section, `2rem` (`--space-md`) horizontal, collapsing to `4rem`/`1rem` under 720px. There is exactly one breakpoint in the whole stylesheet (`max-width: 720px`); the system does not need a tablet step because every grid in it only has two states, asymmetric and single-column.

**Hero:** a CSS grid, `2fr 3fr`, left copy / right 3D stage, deliberately asymmetric, never centered. `min-height: 100dvh`, never a fixed `100vh`, so mobile browser chrome never clips the CTA. Under 720px the grid becomes a single column (`auto 1fr` rows) with the stage reordered below the copy so it still fills the remaining viewport height rather than leaving a fixed-height gap.

**Material & Craft bento:** a `1.6fr 1fr` / two-row grid, one tile spanning both rows (the dominant tile) beside two stacked smaller tiles, never three equal columns. Collapses to a single column under 720px, dominant tile first.

## Elevation & Depth

This system uses **no `box-shadow` anywhere**, confirmed by grep against `styles/main.css`, zero matches. Depth is tonal and radial instead of dropped: surfaces that need to read as "above" the background get a `color-mix()` tint toward Bone White (4% for a tile fill, 10% for its border) rather than a shadow; the hero's product stage sits on a radial-gradient "sweep" (a 7% Bone White mix at center, fading to pure Void Black at the edges) that reads as studio light falloff rather than a lit object. All of the page's real, photographic-feeling depth (the headphone's own volume, its contact shadow, its material reflections) is produced inside the Three.js render itself (PBR materials plus a graded studio environment map), not simulated in 2D page chrome.

### Named Rules
**The Flat-By-Default Rule.** Nothing on the 2D page casts a shadow. If a surface needs to feel raised, tint it toward the ink color; if a product needs to feel physically present, that is the 3D layer's job, not CSS's.

## Shapes

One radius token, `12px` (`--radius`), applied identically everywhere a corner is rounded: the CTA pill, every bento tile, the scrollbar thumb. There is no second radius scale and no sharp-cornered exception anywhere on the page. The product itself echoes the same soft-but-not-rounded-off language: bead-radiused ear-cup edges rather than hard machine edges or fully rounded capsule forms.

### Named Rules
**The One Radius Rule.** Every rounded corner on the page uses `--radius` (12px), full stop. A new component does not get to pick its own corner value.

## Components

### Buttons
- **Shape:** 12px radius (`--radius`), matches every other rounded element on the page.
- **Primary (only variant, single CTA intent, site-wide):** Signal Coral fill, Void Black label text, 700-weight Cabinet Grotesk, `0.9rem 1.75rem` padding. Identical markup and class (`.cta`) in the hero and the reveal section; the page never introduces a second CTA phrasing or a secondary/ghost button style.
- **Hover / Focus:** opacity drops to 0.88, a 0.2s ease transition. The accent never shifts hue or lightens on interaction, see the Opacity-Only Interaction Rule below.

### Named Rules
**The Opacity-Only Interaction Rule.** Every hover/focus state on the page dims to 0.88 opacity over a 0.2s ease transition. The accent never shifts hue or lightens as an interaction cue, opacity is the only lever.

### Cards / Containers (Bento tiles)
- **Corner Style:** 12px (`--radius`).
- **Background:** `color-mix(in srgb, #f4f4f5 4%, #09090b)`, a near-imperceptible lift off the page background, not a distinct "card color."
- **Border:** 1px, `color-mix(in srgb, #f4f4f5 10%, #09090b)`, a hairline, not a stroke that competes with the content.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Internal Padding:** `--space-md` (2rem), content bottom-anchored (`justify-content: flex-end`) so the title sits directly above its body copy at the tile's base rather than floating at an arbitrary vertical position.
- **Asymmetry:** always one dominant tile (larger title size, spans two grid rows) plus two equal-weight supporting tiles. Never three same-size tiles.

### Hero Stage (signature)
The page's one distinctive custom component: a `<canvas>` mounted inside `.hero__stage`, rendering a mouse-reactive, procedurally-built Three.js headphone (no external 3D or image assets). The canvas is marked `aria-hidden="true"`, it is a decorative reinforcement of the headline/subtext already in the DOM, not an independent source of information, so it is deliberately invisible to assistive tech rather than announced as an empty graphic. The stage sits on a radial "sweep" gradient (see Elevation & Depth) rather than a flat tile background, and `prefers-reduced-motion` collapses it to a single static render frame with no loop and no listener attached at all, not merely a slowed one.

## Do's and Don'ts

### Do:
- **Do** keep Signal Coral to exactly one job per screen: the CTA fill and interactive highlights. Nothing else is ever coral.
- **Do** theme every browser-owned surface (text selection, focus ring, scrollbar thumb/track) from the two base neutrals rather than leaving a browser default; this is the cheapest signal the page was actually designed.
- **Do** derive every new tint or border from `color-mix()` between Bone White and Void Black at a stated percentage, not a new hardcoded hex.
- **Do** use `--radius` (12px) for every rounded corner; introduce a second radius value only with a stated, deliberate reason.
- **Do** keep body copy on Brushed Steel against the Void Black ground (≈7.7:1), never a flatter gray-on-gray pairing that would drop below that ratio.

### Don't:
- **Don't** add `box-shadow` anywhere on the 2D page. If something needs to feel elevated, tint it; if it needs to feel physically dimensional, that's the Three.js layer's job.
- **Don't** add an eyebrow or kicker label above any heading; a hard ban carried from the craft floor, not a style preference.
- **Don't** build a same-size card grid. Every grouped-content layout on this page is asymmetric (one dominant element, supporting smaller ones).
- **Don't** shift Signal Coral's hue or lightness for hover/focus states; dim it to 0.88 opacity instead (the Opacity-Only Interaction Rule).
- **Don't** introduce gradient text or decorative glass/blur; neither appears anywhere in the shipped system.
