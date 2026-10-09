# MIO avatar

MIO replaces the rejected Maker avatar in Common Ground. This is a real skinned GLB with an open terracotta jacket, cream shirt, cobalt trousers and satchel, black bob, ivory clip and sneakers. The selected concept is an art direction reference, not a photograph of the runtime asset: the current mesh is an adapted CC0 adult base with a softened face and enlarged eyes, not a pixel-identical reconstruction.

## Source and reproducibility

Uses Quaternius Universal Base Characters [Standard] and Universal Animation Library [Standard], under CC0. Existing licenses are retained in the repository. Source acquisition and installation are documented in `maker-avatar.md`; that file describes the superseded avatar. The sources are build-only and are not fetched at runtime.

Run `scripts/character/build-mio.py` using Blender Python 5.x and NumPy, passing `--assets` for the directory containing both extracted packs and `--output` for `public/plaza/models/mio.glb`. Blender is not required to run or deploy the website. The checked-in GLB includes the textures and six clips: Idle, Walk, SitDown, Seated, Interact, Victory. Current file size is approximately 5.4 MB, with 71,650 character triangles and eight material primitives; geometry and materials are shared between visitors while skeletons are independent.

## Jitter correction

The old retargeter read target parent matrices while writing the current frame. Those dependency-graph matrices could reflect previously evaluated poses. The replacement computes desired matrices parent-first in a separate map, converts each desired pose to its local bone basis, and maintains quaternion hemisphere continuity. Child transforms no longer depend on the mutable target pose evaluated by Blender.

The temporal regression samples global spine, neck and head transforms at 60 Hz for six seconds each, including loop boundaries. On the old GLB the maximum angular step was 107.7 degrees for idle, 130.9 for walk and 166.8 for victory. On MIO it is 0.49, 0.63 and 2.29 degrees respectively. The assertion rejects steps over 10 degrees or translations over 6 cm. Seated is also checked. These are animation continuity measurements, not hardware frame-rate benchmarks.

## Verification

`CTRL_TEST_CHROMIUM=/path/to/chromium node scripts/character/inspect-mio.mjs` renders the actual shipped model, tests temporal continuity and posed bounds, verifies seated pelvis lowering and walking deformation, and captures pose images plus a walk sequence. `CTRL_INSPECT_MODEL=public/plaza/models/maker.glb` runs the same regression against the previous model and fails, as expected.

`node scripts/test-plaza-render.mjs` exercises the actual app with the local SQLite service: desktop and mobile entry/movement, object building/testing/placement, persistence, independent visitor sharing, dispenser and bag interactions, and desktop bench seating. No page runtime errors or horizontal overflow were observed. The unauthenticated guest-session probe returns an expected 401 before joining.

Actual renders are in `docs/previews/mio-3d.png`, `mio-seated.png`, and `mio-walk.mp4`. Runtime switches to a new asset URL to avoid cached Maker models. Remote gesture and seated-state replication remain an existing alpha limitation; this change does not claim to complete them.
