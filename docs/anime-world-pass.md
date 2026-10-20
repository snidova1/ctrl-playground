# Willow Common — anime rendering and character pass

## Implemented, not concept renders

- Seven rigged anime actors: player + six named NPC residents. `anime-people.tsx` reuses the existing reviewed VRoid Project Victoria and Fumiriya models, pixiv three-vrm humanoid retargeting and MToon. Seven actors share two base model designs with hair/eye/clothing color variations; they are not seven unique model assets.
- Anime models enabled by default, on desktop and touch. `avatarReady` now waits for every actor, not merely the background world. `?avatar-study` is an explicitly labelled one-character QA isolation mode; ordinary preview expects seven.
- New curved roof geometry and gabled lofts replace flat generator roof silhouettes; old upper roof vertices are capped under the authored roof. UVs, tile normals, plaster and timber pigment textures, round attic windows and colored cel-shadow bands are real scene geometry/materials.
- MIT Sakura Crossing's depth-curvature ink, color grade and FXAA adapted to R3F's render loop. A conservative nine-sample, four-quadrant Kuwahara pass runs before ink, with less filtering on near characters. ACES runs once in the final grading pass. Green vegetation receives reduced contour intensity so grass does not become black wire.
- Actual rolling 3D hills replace vertical ridge strips, with directional vertex pigment shading. Existing leaf cards, wind, ground mask, facade details and WebGL compatibility remain.
- MToon characters retain skinning and expression animation. NPC shadows use lightweight ground discs; actor meshes are frustum culled. Quality profiles still control grass, shadows and render density.
- Immutable character/motion bytes are fetched once per URL; each actor still parses its own independent skeleton/material instance. A caller abort does not abort other actors. Download failures are evicted and approved-source/file-size boundaries remain enforced.
- Route followers discard reached waypoints in the same frame instead of inserting one idle frame per grid cell. Regression tests first reproduced the old behavior and then passed with the new helper.
- Coffee cup follows the actual right-hand bone, rather than floating at an assumed capsule hand position.

## Sources and scope

New integrated references: https://github.com/Kenton-GMI/sakura-crossing and https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path . MIT notices are distributed in the public credits directory. Existing five environment references remain credited.

The bundled models' embedded VRoid Hub metadata permits everyone, commercial use, modification and redistribution. Their author is VRoid Project. This documentation does not relabel those metadata terms as CC0. Characters are anime VRoid designs, not custom film-character artwork. The visual direction is Ghibli-inspired, not a claim of matching a film production or user visual acceptance.

## Verification

`pnpm typecheck`; eight targeted unit files including character byte-cache and route-frame regression; `verify-neighborhood-schedules.mjs`; `build-preview.mjs`; `inspect-ghibli.mjs`; `neighborhood-smoke.mjs`; `verify-public-ghibli.mjs`.

Screenshots are real WebGL captures. Phone checks emulate a 390x844 touch viewport, not physical-device frame-rate testing. Cloudflare quick tunnel is temporary, not a permanent deployment. Final smoke/public reports under `test-results/neighborhood` are the source of truth for pass/fail; do not infer gameplay success from HTTP 200 or screenshot appearance alone.
