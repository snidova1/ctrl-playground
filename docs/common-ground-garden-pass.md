# Common Ground decorative garden pass

Owner request: make the existing open-air Common Ground more decorative, without changing Habitat, entry/auth rules or the guest's exploration-only role.

## Visual changes

- Six authored cottage-flower beds with larger coral, rose, lavender, cream and blue six-petal flowers, leafy stems and low rounded stone edging.
- Four terracotta flower pots framing the entrance and bench seating.
- An open climbing-rose/ivy arch beyond the fountain; no roof, walls or enclosed room.
- Pastel cloth pennants, four warm lantern posts, a tiny garden welcome sign, a hand-set fountain mosaic and low stepping stones.
- Warmer timber benches and soft accent cushions.
- Meadow cards are concentrated along the sides instead of blanketing the main approach in repetitive grass. Center path remains open.
- The previously pending lower camera is included in this fresh production build so more of the horizon is visible.

## Scope and performance

Changes are confined to `features/common-ground/garden-decor.tsx`, its integration in `open-air-environment.tsx` and garden colliders in `lobby-scene.tsx`, plus tests/docs. No auth, avatar persistence, wallet, ownership or Habitat editor changes.

Flower petals/centers/stems and rounded bed edging use instanced geometry. Curves and instance layouts are deterministic and memoized. Lantern warmth is emissive: no additional shadow maps or per-frame dynamic lights. Solid pots, posts and the garden board are included in movement collision; low stepping stones remain walkable.

## Checks

- Targeted ESLint: passed.
- Targeted unit tests: **7 passed** (existing guest identity/entry checks and three new garden/layout checks).
- Fresh production build (including camera adjustment): **passed**, `proc_bcc2ef190627`, exit code 0. Existing viem/ox dynamic-import warnings remain nonfatal.
- Production root HTTP probe: **200**.
- Fresh desktop/mobile exploration and model-failure smoke tests: **4/4 passed**, `proc_3688e27dba50`, exit code 0 (2.2 minutes).
- Actual desktop and mobile screenshots were inspected under ignored `test-results/common-ground-decorative-final/`; avatar, decorated garden and input controls render correctly.
- The initial smoke run hit a five-second post-reload layout-evaluation deadline under software WebGL. Trace showed the evaluation had not returned, not an actual overflow result. Two direct reproductions measured 1440/1440 with no overflowing elements. The test now allows 30 seconds for that same strict width assertion; the clean rerun passed all four checks. No app CSS or authorization assertion was weakened.

The previous full 225-test unit suite and 12-test desktop/mobile wallet/Habitat/public-avatar suite passed before this art-only pass. Do not present those as a new full-suite run of this revision. This pass is local production QA, not a hosted deployment or Git push.
