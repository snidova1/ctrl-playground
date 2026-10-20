# Willow Common — startup recovery and storybook art pass

## Actual implementation

- World readiness is based on a presented scene frame, not on all seven VRMs completing. Character errors cannot hold the world behind the opening screen.
- Character parsing starts two actors at a time. A separate progress indicator reports successful/failed actors; **Retry characters** remounts those actors without reloading navigation or resetting player movement.
- Avatar loader error callbacks are optional; other consumers retain their previous error UI.
- The post-processing pipeline uses an unsigned-byte render target when floating-point color rendering is unsupported. Graphics-context loss and shader errors produce an actionable error instead of silently waiting forever.
- Preview publication uses content-hashed entrypoints and keeps older chunks. New files are ready before the HTML is atomically replaced. Bundler warnings fail publication; complete CSS is checked by HTTP.

## Art, not just a filter

`storybook-homes.tsx` replaces six simplistic GLB building bodies with original batched cottages: masonry bases, half-timber framing, projecting upper bays, recessed doors, shuttered windows, flower boxes, dormers, chimney stacks and two roofline turrets. Existing placements and ground-level collision footprints remain compatible with the navigation bake. The old building GLBs are no longer a startup dependency.

`storybook-meadow.tsx` replaces thin triangular grass with original gouache botanical cards, crossed and instanced. Counts are 4,800 clumps for high and 2,200 for low quality. Paths, garden targets and building obstacles remain masked. Decorative vegetation does not intercept movement clicks. Night shading is explicit.

`storybook-clouds.tsx` supplies original painted cumulus cards rather than stacked low-poly spheres. `storybook-clothes.ts` replaces modern printed male clothing textures with linen swatches while retaining original face/hair textures and VRM animation.

The procedural plaster/wood/roof techniques retain their existing upstream MIT notices. The existing VRoid models are **not claimed as CC0**: their embedded VRoid Hub license is `Other`, with modification, redistribution and commercial use explicitly allowed. Credits remain at `/worlds/neighborhood/credits/`.

## Exercised verification

```sh
pnpm typecheck
pnpm exec vitest run tests/unit/ghibli-visuals.test.ts tests/unit/neighborhood.test.ts tests/unit/worldgacha.test.ts tests/unit/habit-polish.test.ts tests/unit/habit-landscape.test.ts tests/unit/vrm-character.test.ts tests/unit/world-route-step.test.ts tests/unit/character-binary-cache.test.ts --maxWorkers=1 --no-file-parallelism
node scripts/world/build-preview.mjs
node scripts/qa/startup-resilience.mjs
CTRL_CAPTURE_PREFIX=storybook node scripts/qa/inspect-ghibli.mjs
node scripts/qa/neighborhood-smoke.mjs
node scripts/qa/verify-neighborhood-schedules.mjs
node scripts/qa/verify-preview-publication.mjs
CTRL_PREVIEW_URL='<live-preview-url>' node scripts/qa/verify-public-ghibli.mjs
```

The startup fixture aborts every VRM download, disables `EXT_color_buffer_float`, checks that an LDR framebuffer contains image detail, moves the real player, removes the fault and retries characters to seven successfully loaded actors. It does not merely read a fake success flag.

Gameplay coverage includes route movement, watering, coffee/cup, approaching and speaking to a resident, journal completion, reduced motion, dusk changes, 390×844 layout and pointer controls. The schedule test exercises 14,400 simulation frames and all six residents returning to their assigned homes.

## Artifacts and limits

Actual browser captures are under `test-results/neighborhood/`: `storybook-world.png`, `storybook-character.png`, `storybook-portrait.png`, `public-phone-ghibli.png`. Execution JSON is written by the scripts there as well.

These are actual Three.js browser captures, not concept images. Portrait/mobile testing is browser viewport emulation, not a physical-phone FPS measurement. Visual acceptance remains a human judgment; this pass does not claim feature-film-quality Ghibli animation.

The old `name-biology-massive-skilled.trycloudflare.com` domain returned authoritative DNS status 3 (NXDOMAIN). The replacement preview tunnel was created at `carl-bar-aside-grew.trycloudflare.com`; it is still a temporary preview tunnel, not permanent production hosting.
