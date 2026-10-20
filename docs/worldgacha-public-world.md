# CTRL Public World — Willow Common and World Gacha implementation provenance

## Product hierarchy vs current implementation

**Willow Common is one of the primary Public World areas**, not a disposable district study. **Common Ground is a small non-holder waiting-room/landing**, not the core plaza or the product. This owner-directed hierarchy supersedes older framing that treated the courtyard as the core product or Willow Common as merely a study.

Current route: `/world-preview`, implemented in `features/worldgacha/`. It remains **technically isolated** from authenticated Habitat worlds and courtyard multiplayer. Correcting the product direction does **not** automatically complete signed-wallet authentication, holder gating, shared profiles, saved-world persistence or authoritative multiplayer for Willow Common. Integrate and verify those separately before claiming a connected Public World is shipped; do not replace or bypass existing backend authorization. No NPC is added to real-player counts. No PR workflows are part of this work.

The current storybook village, startup behavior and QA sequence are documented in `docs/HANDOFF_WILLOW_COMMON_2026-10-20.md`. The Riverside export/build notes below retain the earlier World Gacha source provenance and technical constraints; they are not a claim that the current village is just the original generated river district or that every earlier control applies to it.

## World Gacha source pipeline — actually used

- **World Gacha / MIYADAIKU**: the official browser tool generated and exported the actual town GLB, seed `361374981`, Riverside country town, region 2 km / resolution 256, near district 300 m. Source: https://tools.oyasumi-gamedev.com/worldgacha/ . Its About text permits generated exports in commercial/noncommercial projects without requiring credit; tool code is not copied. Preserve the GLB copyright field. `recipe.json` is a CTRL provenance/settings snapshot, **not** the tool's importable recipe format.
- **donmccurdy/glTF-Transform**, pinned 4.5.1 (MIT): prune/deduplicate/weld/join/quantize, including registered `KHR_mesh_quantization`. Original detailed tree meshes are replaced with a small deterministic instanced tree population; their original positions are preserved in the build report. The raw 56 MB source is outside public files, `/home/celeng/ctrl-world-source/world_river_361374981.glb`; it exceeds a normal Cloudflare static-file limit and must not be shipped as-is.
- **isaac-mason/recast-navigation-js**, pinned 0.43.1 (MIT): real offline Recast bake of the optimized model, excluding water. It emits `navigation.bin` and a connected walkable height grid. The browser uses the grid for movement and four-neighbour routes, avoiding runtime WASM and its CSP/CPU overhead. Spawn requires clearance, disconnected regions are excluded, and large movement steps are substepped to prevent tunnelling. Grid resolution is 1.5 m: this is intentionally conservative and can exclude narrow alleys.
- **Mugen87/yuka**, pinned 0.7.8 (MIT): real Vehicle / FollowPathBehavior / OnPathBehavior for NPC steering. Reproducible adapter in `scripts/world/yuka-driver.mjs`; locally bundled ES module and full license under `public/worlds/worldgacha/`. No CDN, eval, or runtime dependency installation. Final NPC positions are also constrained by the walkable grid. NPCs move between local destinations and pause; this is **not** a full quest/dialogue or daily-schedule system.
- Existing CTRL **Summer Cycle-inspired atmosphere** and **three-liltoon** character pipeline are reused, with source/license notes in `docs/visual-reference-licenses.md`. Optional atmosphere focus tracks the district avatar so shadow mapping is not centred at the old courtyard's origin. Optional ground height is backwards-compatible for old flat-ground avatars.

## Other references in the shared list

- `zinkkrysty/three-js-asset-studio`: potential authoring workflow, not a runtime dependency; no source/assets copied without an explicit license check.
- `matthew-kissinger/threejs-field-grass`: not dropped into this WebGL scene. Its TSL/WebGPU assumptions need a compatibility review first.
- `al-ro/stylized-components`: visual reference already tracked by the existing environment work; no claim that all upstream components are integrated here.
- `alyssaxuu/infinite-city`: relevant chunk/instancing reference, but its generator is not combined with World Gacha's generator. The shipped district uses instanced foliage and merged town geometry instead.
- `gkjohnson/three-mesh-bvh`: not added just for a checkbox; the baked walk grid avoids per-frame full-town mesh raycasting. Consider it for later dense picking/interaction.

## Rebuild

Build-only tools live in a separate small workspace, because the existing application lockfile currently fails its seven-day release-age policy for the **pre-existing** `@mochiya/three-liltoon@0.1.5`. Do not disable that application policy or silently edit its dependency graph. The build-tools workspace applies the same seven-day minimum age, strict build policy, and no lifecycle scripts.

```sh
pnpm --dir scripts/world install --ignore-scripts
CTRL_WORLD_TOOLS="$PWD/scripts/world" node scripts/qa/build-worldgacha.mjs /absolute/path/to/world_river_361374981.glb
CTRL_WORLD_TOOLS="$PWD/scripts/world" node scripts/qa/bake-worldgacha-nav.mjs
CTRL_WORLD_TOOLS="$PWD/scripts/world" node scripts/qa/build-worldgacha-steering.mjs
pnpm typecheck
./node_modules/.bin/vitest run tests/unit/worldgacha.test.ts
CTRL_WORLD_ORIGIN=http://localhost:3043 node scripts/qa/worldgacha-smoke.mjs
```

The export helper connects to an agent-owned already-open World Gacha browser. Discover its current CDP URL rather than assuming the old browser profile/port survives. Current runtime dependencies and the application lockfile are unchanged.

## Earlier Riverside controls and ongoing technical constraints

- PC: WASD/arrows, Shift run, drag orbit, wheel zoom, click a navigable street to route there, T atmosphere.
- Phone: touch direction buttons, drag/pinch, tap a navigable street.
- Desktop/mobile graphics budgets, reduced ambient motion, home reset and overview.
- The generated Riverside source district is a large geographic area, not an enterable-building simulation. Building interiors, full-world editor/persistence, authoritative multiplayer positions, and richer NPC schedules are not supplied merely by the generation pipeline. Willow Common's intended primary Public World role does not mean these capabilities, or its auth/holder integration, are finished.
- Preserve existing server-side signed-wallet/holder checks, private-world concealment, owner/editor/visitor ACLs, request/object budgets and asset allowlists. Keep credentials server-only and demo balances non-authorizing. Product direction is not permission to weaken those boundaries.
- Preserve all source/export copyright fields, local dependency licenses and `public/worlds/neighborhood/credits/index.html`; VRoid assets are not CC0. Courtyard CC0 asset claims must not be generalized to every Willow Common asset.
- Software-rendered WSL screenshots are functional evidence, **not** an FPS guarantee on real phones.
