# PR #31 — Public World foundation rebuild + visual polish (P0)

**Priority:** top priority. The user rejected repeated cosmetic passes because the *visual foundation* of CTRL Public World remains inadequate. This is not an NPC, weather, economy, new-avatar or UI feature PR.

**Stacking:** Branch `feat/pr31-public-world-foundation-rebuild` starts at PR #30 commit `76e8027`. Compare this PR against `feat/townies-gameplay-stylized-world` to isolate the rebuild; neither PR is merged or deployed by this document.

## Non-negotiable visual target

A cohesive, recognizable, lived-in cozy town at **gameplay camera height**, with Willow Square and all six outer districts retaining a shared Common Ground visual language. No sterile grids, cube-house repetition, giant backdrop spheres, garish new palette, or dense props masquerading as city design.

## Changes in this initial implementation

1. **Neighborhood master plan:** all forty non-harbor peripheral building placements change from identical two-row arrays to district-specific authored block compositions. Housing sizes/footprints vary; central through streets remain open. All clients and server use the exact same `TOWN_DISTRICT_BUILDINGS` data for rendering and collision. Stable IDs and activity coordinates are preserved.
2. **Town architecture:** distinct roof-breaking lofts, bay masses, arcaded fronts, balconies, timber-frame workshop facades, quay shopfronts and orchard porches. Geometry remains *material-batched*, rather than a mesh for every window detail.
3. **Civic spaces:** readable radial civic courts and secondary walk lanes. The Willow Square fountain gains a single-draw flush stone composition, avoiding fake collision obstacles.
4. **World backdrop:** distant ridges replace six oversized repeated spherical blobs. Broad green, dry-grass and coastal hues are painted into the existing terrain vertex colors, without a second terrain mesh or changing walk-surface heights.
5. **Regression tests:** varied district layout, nonoverlapping footprints, open district hubs, finite batched geometry, upward-facing flush paving and ridge geometry.

## Visual polish is IN scope

- Macro composition: readable silhouettes, town blocks, hierarchy between plazas and neighborhoods.
- Medium composition: distinctive building types, materials, planted edges, roofs and hardscape.
- Micro polish **only after** macro comparison: trims, windows, awnings, glass, lighting, signs, shadows, motion.
- Color, atmosphere, shadows and scene camera must be validated together from actual player viewpoint.
- Additional curated licensed/CC0 GLBs or reference repos are candidates for subsequent work **only with a license/source ledger**; this commit does not copy or silently download third-party art.

## Visual acceptance gates (still to verify)

- Native unretouched **same-camera before/after** captures from running production builds at desktop and 390 × 844 mobile viewport for Willow Square, Harbor, Residential, Garden, Workshop, Festival and Orchard; label baseline SHA/head SHA.
- Art review at normal gameplay distance: architecture must **not** read as repeated cuboid primitives, all town destinations visually different, coherent palette with Common Ground.
- Keep original signed multiplayer, server-authoritative world clock, navigation/collision, NPC ownership distinction, activity stations and saved-state IDs intact.
- Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, production build and native Playwright public-world visual/navigation suites. Explicitly log any failures or unavailable runners.
- Benchmark draw calls and triangles at the *same camera* before/after; check actual iPhone/mobile GPU FPS separately. PR30 center baseline was about 1,532 desktop draw calls / 694k triangles and 1,132 mobile-emulated calls / 602k triangles. These were not physical-phone FPS.
- No merge/deployment claim before real validation. **Current status: implemented initial changes, visual runtime evidence and full CI still pending.**

## Scope guard

Do not spend PR31 engineering cycles on NPC AI, economy, token purchases, new multiplayer features, or cosmetic micro-adjustments unrelated to town quality. Rebuild the physical/visual foundation, then polish the same surfaces. Preserve original game systems instead of reimplementing them.
