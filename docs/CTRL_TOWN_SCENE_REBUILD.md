# PR #30 — scene-level visual rebuild after the rejected small-detail pass

Baseline: `44332f05dff518ffe7cf828fc3a2f6fd7213bae9`.
The user rejected the earlier result as visually unchanged. This pass changes
the objects and lighting that dominate the actual game view, not just paving.

## Implemented

- Original branched broadleaf tree kit: smooth irregular crowns, varied vertex
  pigment, 180 alpha-tested leaf sprays per crown, shared native wind and three
  instanced variants. Center, garden trees and broadleaf placements in all six
  outer districts use it. Existing regional conifer silhouettes remain.
- Original bentwood/enamel bistro chairs, slatted park benches, pedestal café
  tables and crafted market tables replace their blocky render aliases.
  Actual generated geometry is fitted within each existing catalog X/Z bound;
  original root transforms, object IDs, seat state and native picking remain.
- Small stemmed meadow flower clusters replace the oversized blue playground
  flowers. Their X/Z footprint stays within the old decorative patch.
- Long connector roads now project UVs from actual world-space vertices. They
  previously stretched one texture over an entire district, producing the huge
  orange bands across the foreground and mismatched intersecting streets.
- Grass pigment is no longer multiplied by a second full-strength green map.
  Terrain heights, geographic colour variation and authoritative surface stay.
- Rebalanced directional/ambient light separates lit faces from shaded faces.
  Real sunlight shadows now work in default light mode too (512px, local 40m
  shadow tile); high retains its 1024px wider tile. Warm glazing and direct
  storefront lettering replace dark blank panes and floating pill labels.

All new meshes and the leaf/glass maps are original procedural code, not newly
downloaded GLBs or generated concept images. Existing licensed assets outside
these replacements remain. No source asset cache is mutated. No avatar change,
economy, collision change, clock manipulation, migration, merge or deployment.

## Evidence and verification

Before/after are two real production builds, separate freshly migrated local
databases and actual signed browser sessions. The camera and light quality are
the unchanged defaults. Both builds warm before paired screenshots under the
native wall clock; NPCs and wind keep moving. No generated/retouched pixels,
forced input, fake frames, clock changes or acceptance-threshold changes.

- Unit/API: **317/317**, 67 files, including finite foliage, actual furniture
  bounds, grounded flower geometry and world-space connector UV regressions.
- Strict TypeScript, changed-source ESLint and Next production build pass.
- The integrated pre-final leaf-spray build passed the original complete Public
  World desktop/touch suite: **12/12 (4.7m)**. That result is not mislabeled as
  the final source's complete browser run.
- Final leaf-spray / regional broadleaf production render, native input,
  graphics/navigation and all-district journey regressions: **6/6 passed
  (2.5m)**, with unchanged original input and pixel thresholds.
- Exact new-head GitHub CI and physical-device GPU acceptance remain separate.

The delivered `CTRL_PR30_SCENE_REBUILD.zip` contains four native desktop/mobile
PNG comparisons, observed draw accounting and a source ledger; no browser
traces, network logs, sessions, private keys or database files.

Real shadows and richer meshes add GPU work. A prettier screenshot is not a
performance certificate: mobile images are viewport/touch emulation, not phone
FPS. Keep physical-device verification and wider asset/art refinement open.
This is an implemented scene-level rebuild, not full-game art completion.

Observed default center view, ten nonempty actual WebGL frames per sample:

| Viewport | Before calls | After calls | Before triangles | After triangles |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 987 | 1,532 | 304,370 | 694,070 |
| Mobile emulation | 610 | 1,132 | 253,384 | 602,086 |

Unlike the rejected tiny-detail pass, this pass intentionally spends GPU work
on true default-mode shadows and foliage silhouettes. The native one-frame
GPU queue fence, light-mode 30 FPS cap, DPR, quality control and simulation/input
clocks are unchanged. These counts include the new shadow pass; they must not
be described as a performance improvement or physical-phone acceptance.
