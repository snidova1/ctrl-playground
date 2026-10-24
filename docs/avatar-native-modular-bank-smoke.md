# Native modular source-bank smoke test

## Scope
Owner redirected discovery to freely downloadable assets and away from paid-pack/permission research. This pass downloads the publicly accessible CharacterStudio sample bank and tests its authored common-base assembly locally. It makes no new licensing declaration, deploys nothing and leaves source VRM metadata intact.

Source: https://github.com/memelotsqui/character-assets

## Verified artifacts
- `/tmp/ctrl-modular-smoke/manifest.json`: pinned source tree, URLs, downloaded byte sizes and SHA-256 per file.
- `/tmp/ctrl-modular-smoke/assets/`: 96 downloaded VRM files, 162679676 bytes. `_textureCollections` skin-color copy excluded.
- Two native families: drophunter and neurohacker. Parts are mixed within their own family, not fitted onto existing unrelated CTRL bodies.
- 20 hair models, 20 tops, 18 bottoms, 20 footwear models, 5 outer layers, 9 accessories, 2 bodies and 2 eye models.
- GLB structure/humanoid extension/mesh/skin presence checked for all 96. Position/index geometry fingerprints found no same-family/same-slot duplicates. This is not a Khronos validator run or full visual acceptance of every part.

## Working preview
A manifest-driven browser preview exposes base-family selection and independent hair/top/bottom/shoes controls. Each active family offers 10 hair styles, 10 tops, 9 bottoms and 10 footwear choices. Outer/accessory assets are downloaded but not exposed in this smoke UI.

- Source-bank assembly runs at http://127.0.0.1:3182 while the local smoke server is active.
- Loader preserves the body scene instance during part swaps. No cross-rig transfer or per-item manual fitting.
- Canonical humanoid pose is applied consistently to the six active VRM layers. Walk is a source-preview walk-in-place, not CTRL locomotion.
- Base-vs-clothing polygon offset reduces coplanar depth artifacts. This is not a general clothing culling solution.
- Main creator/gameplay/persistence are NOT wired to this bank in this pass. Existing accepted avatars and controls are unchanged.

## Executed checks
`node scripts/qa/modular-pack-bank.mjs` returned:

`PASS 8 source combinations, preserved body per family, category option counts, arm pose, walk, zero browser errors`

Actual front/rear/raised-arm renders captured; eight-look contact sheet visually checked. All eight show distinct authored hairstyles/clothing and aligned faces/body/clothing, without gross exploded skinning. This does not certify every possible part combination or physical-phone performance.

- `test-results/modular-pack-smoke/bank-report.json`
- `test-results/modular-pack-smoke/native-bank-contact.jpg`
- `test-results/modular-pack-smoke/look-*.png`

## Reproduce
1. `python3 scripts/assets/fetch-modular-sample-bank.py`
2. Bundle `scripts/qa/modular-pack-preview.mjs` with the installed esbuild (available through Vite), output `/tmp/ctrl-modular-smoke/viewer.js`.
3. Serve `/tmp/ctrl-modular-smoke` on loopback port 3182 using Python's HTTP server. Existing `index.html` is the smoke harness, not a production route.
4. `node scripts/qa/modular-pack-bank.mjs`

Next application integration can use one per-family slot registry and pose bridge instead of adding a schema/loader branch per garment. It must retain legacy saves and provide explicit new-family selection rather than silently replacing accepted bodies. No production build was needed for this discovery/smoke-test pass.
