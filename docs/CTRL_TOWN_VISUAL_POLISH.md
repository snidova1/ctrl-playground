# PR #30 — Willow Square visual-first pass

Requested 2026-10-16: polish the visuals first and show the difference.
Comparison baseline: `424c2c22b8e1461ae81c60aa5b165c605db91b98`.

## Visible changes

- Sewn, curved shop awnings with scalloped hems replace flat box strips. Each
  canopy is two batched colour meshes instead of twenty individual meshes.
- Batched panelled shop aprons, pilaster caps and layered cornices use the
  existing Common Ground cream/sage/wood palette. Neutral procedural plaster
  wash adds wall depth without another downloaded texture or material palette.
- Smaller staggered terracotta pavers retain the approved four tile colours
  and shared world-space UV origin across all existing intersections.
- Forty-eight flush limestone setts frame the original fountain in one mesh.
  They change neither its collision radius nor the ground height.
- Instanced soft contact shadows ground existing border trees in light mode.
  Garden tree shadows also share one submission rather than four.

No building/tree center, walk surface, solid footprint, interactable ID, saved
layout, character roster, gameplay clock, input behavior or authority changes.
No purchased/generated art, new GLB bytes, external runtime asset dependency,
economy, merge, production migration or deployment.

## Actual comparison protocol

Two isolated production Next builds, separate fresh local databases and genuinely
signed browser sessions. Default standing camera, original native controls and
default light settings. Both versions were warmed before paired screenshots;
captures are less than one second apart per viewport under the native browser
wall clock. No fixed clock, fake frame, asset replacement or pixel retouching.
NPCs and wind continue naturally, so their poses may differ.

Raw desktop 1440×900 and mobile 390×844 PNG pairs are in the delivered
`CTRL_PR30_VISUAL_POLISH.zip`; the latter is touch/viewport emulation, not a
physical-phone benchmark. An observation-only probe forwards original WebGL
commands unchanged and records ten nonempty frames per sample.

| Default center view | Before calls | After calls | Before triangles | After triangles |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 1,018 | 987 | 303,590 | 304,370 |
| Mobile emulation | 691 | 688 | 282,352 | 283,186 |

These are scene-specific medians, not FPS claims or a controlled GPU benchmark.
Frustum culling, native resident poses and viewport affect counts. Contact and
canopy geometry modestly increase triangles; batching reduces submissions.
All four captures reported zero page errors. The center remains expensive.

## Verification

- Full unit/API suite: **313/313**, 66 files.
- New geometry tests cover finite canopy meshes, original canopy bounds,
  pedestrian headroom, wall-local joinery and upward-facing flush inlay.
- Strict TypeScript, changed-file ESLint, `git diff --check`: passed.
- Next production build: passed.
- Native production desktop/touch entry and graphics/navigation regressions:
  **4/4 passed (1.6m)**, original inputs and thresholds unchanged. No full
  twelve-case or exact-head CI pass claimed here.

This is a focused center polish preview, not final acceptance of all seven
districts. Broader furniture/plant silhouettes, lighting/art direction, the
independent sixteen-character lane, load scaling, physical devices and separately
authorized staging remain open as recorded in `CTRL_REBUILD_CONTINUATION.md`.
