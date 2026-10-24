# Seated hand/thigh pose follow-up

User correctly identified that the previous public screenshot still had palms/fingers disappearing into the thighs. The seat-support correction only fixes body vs furniture, not arm self-intersection.

## Repro and cause
A headless run of the actual shipped AIRI VRM geometry/skin weights with the actual retargeted Seated clip reproduces penetration without any chair or seat-height correction. The original left hand's lowest vertical clearance above projected thigh triangles is -0.06588952568480555 at t=0.3. This isolates the defect to the retargeted arm reach on the target rig, not the furniture height or world root lift.

`seated-hand-contact.ts` performs a load/test-time skinned palm/finger vs actual thigh-triangle vertical clearance probe. It is not a per-frame collider, an AABB stand-in or synthetic API result.

## Correction
`fitSeatedHands` in `seated-arms.ts` samples source clip skin clearance for the target model, solves a proportion-aware upper/lower arm reach while retaining the authored elbow plane and hand world orientation, then bakes just the six arm/hand quaternion tracks into copied Seated/SitDown clips. SitDown correction blends in from zero; its end sample is clamped rather than accidentally looping to the initial standing pose. Source shared tracks, hips, legs and finger tracks are preserved; no new dependency, avatar resize, body lift or furniture move.

This is applied by the existing loader after the selected wardrobe is ready. Vertex scanning and fitting occur during load, not in the live animation frame loop. No universal finger-level contact/cloth physics or every-avatar performance certification is implied.

## Executed verification
- Red geometry regression: `/tmp/ctrl-hands-red.log`.
- Corrected actual-mesh test at three times, both hands: all sampled minimum clearances positive, approximately 0.0093–0.0136 source-model units. Original source tracks and non-arm tracks remain unchanged.
- Full Vitest: **114 files / 862 tests PASS**, `/tmp/ctrl-hands-tests.log`.
- Full-project TypeScript attempt hit memory limits (1536 MB timed out; 1024 MB OOM). Do not report that whole-project run as passed. Strict targeted TypeScript of loader + both new helpers + regression test passed using the same root compiler options with explicit typeRoots: `/tmp/ctrl-seated-hands-tsconfig.json`, `/tmp/ctrl-hands-targeted-types.log`.
- Public bench desktop and 90-degree rotated chair touch-emulation: actual sit/stand/re-sit/stand PASS, no page errors, original corrected seat support retained.
- Public closeups use actual camera wheel input, not a replaced scene or painted-over screenshot. Both front and side renders were visually reviewed.
- Public JS SHA-256 matches the built artifact: `92cc1bb1d71df123dd5ffda3028e3d0e04de6ecfb71a9a581a27ba83576e5738`.

Live isolated preview: https://ctrl-entry-preview.suhiro211.workers.dev/habitat-test

Proof:
- `test-results/seating-contact/hands-public/{report.json,seated.png,seated-closeup.png,reseated.png}`
- `test-results/seating-contact/hands-chair-touch/{report.json,seated.png,seated-closeup.png,reseated.png}`
- `test-results/seating-contact/hands-fix-comparison.png` combines only cropped/enlarged old and new real screenshots; third panel explicitly uses the side-view chair fixture.

Main staging was not deployed from the shared dirty workspace. Refresh preview to get the updated script; never clear the user's saved layout as a workaround.
