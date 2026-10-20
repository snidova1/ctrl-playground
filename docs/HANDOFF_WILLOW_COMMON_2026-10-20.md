# Handoff — Willow Common / public anime village (2026-10-20)

## Start here

- **Repository:** `snidova1/ctrl-playground`
- **Branch:** `deploy/staging`
- **Route:** `/world-preview` (the public preview used `?build=storybook-r3`)
- **Primary implementation:** `features/worldgacha/`
- **Route entry:** `app/world-preview/`
- **Published static content:** `public/worlds/neighborhood/` and `public/worlds/worldgacha/`
- **Latest scope:** a WebGL, playable anime/painterly village called **Willow Common**. It is deliberately not the older Habitat/Plaza experience.

Read `docs/willow-storybook-startup-pass.md`, `docs/anime-world-pass.md`, `docs/ghibli-visual-pass.md`, and `docs/worldgacha-public-world.md` before altering assets or the render pipeline.

## What is working

- The route renders a playable Three.js/R3F scene using real VRM player/NPC avatars, six resident YUKA steering drivers, navigation constraints, interaction targets, touch controls, and an atmospheric time cycle.
- The visible village has authored storybook cottages, painted cloud cards, gouache crossed-card meadow, lighting/ink/paper post-processing and character clothing adjustments.
- The opening screen **must not wait for all VRM downloads**. World readiness follows a presented scene frame. Characters load with bounded concurrency and may be retried independently via UI if an asset fails.
- The post-process path falls back when `EXT_color_buffer_float` is unavailable. Context/shader errors should surface an actionable error rather than an endless opening screen.
- Preview publication is content-hashed/atomic: upload ready files before replacing HTML; do not delete old chunks first.

## Current human feedback / next work

The owner said the visual result is better but wants further polish. Do **not** respond with another filter-only pass. Highest-impact next direction, based on the actual browser capture:

1. ✅ The first path/depth pass is now present: `storybook-ground-detail.tsx` adds 130 low, flush path-wear stones without touching nav; `distant-grove.tsx` adds three rounded, fogged horizon layers outside the navigation basin; `ghibli-shaders.ts` moves the ground from bright yellow toward compacted olive earth.
2. Individualize buildings with gameplay-readable identities (cafe/shop/home gardens) instead of repeating a cottage kit.
3. Continue lighting cautiously: warm highlights with cool green-blue shade and gentler contact shadows, without losing input/character readability.
4. Bring character shading and HUD closer to the scene without reducing input visibility, mobile legibility or accessibility.

Before visual changes, take/inspect an **actual browser capture** and protect the working degraded-startup and mobile inputs with the existing QA scripts.

## Safe validation sequence

```sh
pnpm typecheck
pnpm exec vitest run \
  tests/unit/ghibli-visuals.test.ts \
  tests/unit/neighborhood.test.ts \
  tests/unit/worldgacha.test.ts \
  tests/unit/habit-polish.test.ts \
  tests/unit/habit-landscape.test.ts \
  tests/unit/vrm-character.test.ts \
  tests/unit/world-route-step.test.ts \
  tests/unit/character-binary-cache.test.ts \
  --maxWorkers=1 --no-file-parallelism
node scripts/world/build-preview.mjs
node scripts/qa/startup-resilience.mjs
CTRL_CAPTURE_PREFIX=storybook node scripts/qa/inspect-ghibli.mjs
node scripts/qa/neighborhood-smoke.mjs
node scripts/qa/verify-neighborhood-schedules.mjs
node scripts/qa/verify-preview-publication.mjs
```

For a public tunnel, start the local preview server and then:

```sh
CTRL_PREVIEW_URL='https://<current-tunnel>.trycloudflare.com/world-preview?build=storybook-r3' \
  node scripts/qa/verify-public-ghibli.mjs
```

`trycloudflare.com` quick-tunnel names are temporary. The prior tunnel may be dead after the current shell/process stops; create a new one rather than debugging a stale DNS name.

## Important non-goals / guardrails

- Do not claim this is a physical mobile-FPS test: the 390×844 run is browser viewport emulation.
- Keep `test-results/` untracked; it contains evidence captures and is intentionally ignored.
- Preserve licensing/provenance details and credits at `public/worlds/neighborhood/credits/index.html`. VRoid assets are not claimed as CC0.
- Avoid swapping real VRM models for placeholders just to make startup look reliable. Fix readiness/retry behavior instead.
- Do not remove navigation/path masks when adding vegetation or path dressing.

## Test artifacts

Actual captures and JSON reports appear in `test-results/neighborhood/` after QA. Useful files include `storybook-world.png`, `storybook-character.png`, `storybook-portrait.png`, and `public-phone-ghibli.png`.
