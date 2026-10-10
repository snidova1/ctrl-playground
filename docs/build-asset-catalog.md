# CTRL build asset catalogue

Retrieved directly from Kenney's official free downloads on 2026-10-10. All six archives include a Creative Commons Zero (CC0) license. Original license files are preserved beside each pack in `public/plaza/build-kit/<pack>/License.txt`. Attribution: **Kenney — https://kenney.nl**. No purchase, paid bundle, user credentials, or third-party mirror was required.

## Included content

| Pack | Local GLB models | Official source |
| --- | ---: | --- |
| Building Kit | 79 | https://kenney.nl/assets/building-kit |
| Furniture Kit | 140 | https://kenney.nl/assets/furniture-kit |
| Nature Kit | 329 | https://kenney.nl/assets/nature-kit |
| Food Kit | 200 | https://kenney.nl/assets/food-kit |
| City Kit — Roads | 95 | https://kenney.nl/assets/city-kit-roads |
| Platformer Kit | 148 | https://kenney.nl/assets/platformer-kit |
| **Total** | **991** | |

Counts reflect actual GLB files shipped, not marketing counts on download pages. The five Platformer Kit character models were excluded because CTRL uses its own VRM character system. Models include architecture, furniture, plants, terrain, food, road components, and gameplay props. The assets themselves do not implement doors, moving platforms, chairs, swimming, collisions, or other gameplay behaviors.

## Integration

`features/plaza/build-assets.ts` exports `BUILD_ASSETS`, `BUILD_ASSET_CATEGORIES`, `BuildAsset`, `BuildAssetCategory`, `getBuildAsset(id)`, and `getBuildAssets(category?)`.

Every catalogue entry includes a namespaced stable ID, category, model URL, 160-pixel maximum WebP thumbnail URL, measured rest-pose bounds, model center, grounding offset, a conservative collision hint, byte count, pack name, and authored animation clip names. All files are served locally; no runtime Kenney connection is required.

To place a model centered at its base, offset its cloned scene by `[-asset.center[0], asset.groundOffset, -asset.center[2]]`, then apply object scale and rotation to the enclosing group. Metadata bounds include node hierarchy transforms. Units remain those authored in the original pack; semantic scaling is a renderer decision.

`collision` is an editor hint, **not** verified triangle collision. Doors and arches need appropriate colliders rather than a bounding box that blocks their openings. Do not infer functional behavior merely from a model filename. Seat anchor positions and interactive hinges need explicit calibration before claiming interaction support.

## Performance and provenance

Models retain the original lightweight GLB geometry and materials. Original PNG palettes are shared per pack where referenced; duplicate preview orientations and interchange formats are excluded. Catalogue previews are resized to a maximum of 160×160 and encoded as WebP. Load only selected/placed models and lazy-load visible thumbnails. Never preload all 991 models or create 991 WebGL preview canvases.

Clone scene instances while sharing immutable geometry/material resources; dispose shared resources only after their last consumer releases them. For per-instance recoloring, clone materials separately. Use a bounded object count and world-level resource budget on phones.

`public/plaza/build-kit/provenance.json` records archive SHA-256 digests, official source pages, retrieval date, and actual counts. Archives themselves are intentionally not committed. CC0's complete text is available at https://creativecommons.org/publicdomain/zero/1.0/ .

## Validation performed

- Parsed all **991** GLBs with the project's actual Three.js `GLTFLoader`; 1,791 meshes and 48 authored animation clips were read successfully.
- Compared manifest bounds to Three.js `Box3.setFromObject`: maximum difference below 0.000005 authored units.
- Decoded source palette PNGs with Pillow and generated all 991 WebP thumbnails successfully.
- Binary asset payload: **13,708,572 bytes** total (12,924,656 GLB; 740,582 previews; 43,334 palettes). Largest single GLB: **115,324 bytes**. This is lazy-loadable storage, not an initial page download.
- The loader check substituted texture objects and did not verify GPU rendering or gameplay behavior. Those require the integrated scene checks.

Furniture Kit uses smaller authored units than the architecture pack: the basic chair is 0.20 × 0.47 × 0.20 units. A furniture group scale around 2.5 is a useful initial human-scale placement setting; verify seat height per model. Building Kit's ordinary wall is already 2.4 units tall. Do not normalize every object to the same bounding size: an apple should remain much smaller than a house.
