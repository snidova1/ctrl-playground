# Willow Common: Ghibli-inspired WebGL visual pass

This is an adaptation of selected systems from **all five** shortlisted references, not installation of five separate engines or a claim that their entire demos/assets were imported.

## Upstream -> running implementation

- **cortiz2894/stylized-components** (MIT): WatercolorFilter luminance quantisation/shadow tint and paper modulation adapted into `paintSurface` in `ghibli-landscape.tsx`; procedural pigment/weathering and shared grass/dirt blending. Mesh-space implementation keeps Three's existing shadow pipeline and applies ACES only once. The subsequent anime pass adds a conservative full-screen Kuwahara minimum-variance filter and Sakura Crossing ink/grade/FXAA pipeline. No volumetric-light stack is enabled.
- **craftzdog/ghibli-style-shader** (README declares MIT): four brightness regions / four foliage tones adapted in `ghibli-shaders.ts` (`CANOPY_FRAGMENT`). Uses new canopy geometry, not the upstream tree GLB. Upstream README is included alongside its declaration.
- **leoawen/fluffytree-threejs** (MIT): alpha-tested leaf cards and spherical/volumetric canopy shading adapted to camera-facing instanced tufts. Trunks and leaf placement are original procedural geometry. No external tree model is required.
- **StarKnightt/summer-cycle** (MIT): `src/render/leafAtlas.ts` is adapted directly as `ghibli-leaf-atlas.ts` (half-resolution rasterisation with original botanical drawing coordinates); layered ridges, cumulus grouping and coordinated atmosphere/palette technique adapted in `ghibli-landscape.tsx` and isolated `ghibli-atmosphere.tsx`.
- **dedekpo/stylized-scene** (MIT): the travelling gust field and circular-arc cantilever blade bend from `src/materials/wind.ts` are translated from TSL to GLSL. Grass and canopy share one time/gust field. **No WebGPU requirement is introduced.**

Original detailing adds facade beams, shutters, foundation trim and climbing foliage. Existing six-house composition, public-world isolation, activity controls and local journal remain intact. NPCs remain explicitly labelled NPCs.

## Scope and budgets

- Existing WebGL / Three.js / R3F renderer retained; no new runtime package dependency.
- High quality: 11,000 four-triangle grass blades. Low quality: 5,000. Shared seeded grass/ground mask keeps main paths and activity obstacles clear.
- Instanced leaf cards with alpha cutout, shared wind and four-tone shading; three distant ridge layers; instanced cumulus lobes.
- Painterly material hooks only affect the curated neighborhood building group. GLTF materials are cloned before modification so cached source assets are not mutated. JSX-owned window materials are patched in-place so dusk emissive/color updates still work.
- Reduced-motion freezes grass/canopy wind as well as the existing ambient simulation.
- The atmosphere component is isolated from Habitat/courtyard to avoid changing their lighting.
- Optional `?visual-debug` exposes local render resources solely for the QA inspection script; not a server API, no accounts/world persistence are exposed.

## Verification commands

```sh
pnpm typecheck
pnpm exec vitest run tests/unit/ghibli-visuals.test.ts tests/unit/neighborhood.test.ts tests/unit/worldgacha.test.ts tests/unit/habit-polish.test.ts tests/unit/habit-landscape.test.ts tests/unit/vrm-character.test.ts
node scripts/qa/verify-neighborhood-schedules.mjs
node scripts/world/build-preview.mjs
node scripts/qa/inspect-ghibli.mjs
node scripts/qa/neighborhood-smoke.mjs
```

The last command checks real desktop and 390x844 touch-viewport movement/interactions, JS **and console shader errors**, visual-source metadata, reduced-motion wind freeze and atmosphere switching. It writes fresh screenshots, video and `test-results/neighborhood/smoke-report.json`. Read that report before claiming the run passed.

Regression coverage includes shader-preprocessor newline termination: app readiness and triangle counts alone cannot prove that foliage shaders compiled successfully. Early integration exposed this precise bug; a failing unit test reproduced it before the fix.

NPC schedule regression uses six real YUKA drivers over 14,400 simulated frames. Distinct porch approach slots and temporary occupancy-grid detours prevent residents blocking each other indefinitely; the test requires actual arrival near every porch, not just selection of a home destination.

## Attribution

Full upstream notices/declarations are in `public/worlds/neighborhood/credits/` and linked by the public credits page. Keep these with redistributed adaptations. Visual inspiration is not an endorsement or affiliation with Studio Ghibli. This pass does not replace hand-authored architectural assets or character art and is not a claim of matching film-production art quality.
