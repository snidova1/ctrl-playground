# Seated body / seat contact correction

## Reproduced defect
The previous calibration put the raw hips **joint center** directly on the seat surface. It did not put the visible bottom of the pelvis/thighs on the cushion. The bench fixture rendered hipY=0.528 and seatY=0.528, while sampled posed support was at Y=0.3654581035880072: actual body/seat intersection despite the old hip-only tests passing.

Before screenshot: `test-results/seating-contact/before/seated.png`.
Diagnostic red report: `test-results/seating-contact/measured-before/report.json`.
Regression red output: `/tmp/ctrl-seat-red.log` (four geometry probes pass; visible-support placement fails).

## Fix
`seat-contact.ts` samples actual posed skinned vertices weighted to hips/upper legs inside a thigh-length-relative proximal joint region. This excludes hair, props, knees/lower legs and distant garment hems. Measurement includes model scale, floor transform and animated raw bones. It explicitly refreshes SkinnedMesh's attached bind inverse before CPU skinning; Object3D.updateWorldMatrix alone does not invoke that override.

`seatedRootTargetY` now takes the measured hip-to-support clearance. Legacy callers retain a zero default. VrmAvatar samples at Seated entry and once after blend settling, caches the result, and resets on standing. Even unsupported meshes stop retrying after these attempts; there is no permanent per-frame vertex scan. No avatar resize, furniture relocation, default-layout replacement, invented hardcoded body lift or chair enlargement.

## Verified final candidate
Preview: https://ctrl-entry-preview.suhiro211.workers.dev/habitat-test

- Project TypeScript PASS.
- Full suite: **113 files / 861 tests PASS** (`/tmp/ctrl-seat-tests.log`). TMPDIR must use `realpath /dev/shm` to avoid the known SQLite fixture symlink-path assertion.
- Public bench desktop: actual Sit / Stand / Sit / Stand inputs PASS.
- Public chair rotated 90 degrees: actual phone touch-emulation Sit / Stand / Sit / Stand PASS.
- All four measured settled contacts equal the fixture's seat Y=0.528; hips remain above, around Y=0.6905418994395. Zero page errors.
- Rendered public screenshots visually reviewed; before/after collage is only cropping and enlargement of actual screenshots, not a generated render.
- Published manifest, local bundle and fetched public JS SHA-256 match: `a4b263992e523bbffadea3069b25de55676829193f5ad766e7683df861b1168c`.

Proof: `test-results/seating-contact/{public-bench,public-chair-touch}/report.json` and `{seated,reseated}.png`; comparison `test-results/seating-contact/seating-before-after.png`.

## Reproduce
```sh
node scripts/qa/build-cozy-life-preview.mjs
CTRL_SEAT_LABEL=local node --import tsx scripts/qa/seating-contact.mts --assert-contact
CTRL_QA_ORIGIN=https://ctrl-entry-preview.suhiro211.workers.dev CTRL_SEAT_LABEL=public-bench node --import tsx scripts/qa/seating-contact.mts --assert-contact
CTRL_QA_ORIGIN=https://ctrl-entry-preview.suhiro211.workers.dev CTRL_SEAT_LABEL=public-chair-touch CTRL_SEAT_MOBILE=1 CTRL_SEAT_ASSET=furniture-kit/chair CTRL_SEAT_ROTATION=1.5707963267948966 node --import tsx scripts/qa/seating-contact.mts --assert-contact
```

Fixtures place an actual shipped chair/bench on the same-source sandbox's empty approach, in a fresh browser context, using the validated UUID snapshot format. This is controlled test setup, not a modification to the user's saved world. All seating is triggered through actual rendered action buttons.

## Limits
This fixes the reproduced hip-center sinking. It is not a universal seat ergonomics/foot IK system, nor certification of every imported catalog model, clothing variant, extreme furniture scale or physical phone. Imported seats outside the explicitly measured Kenney chair/bench still retain their existing surface-height metadata fallbacks. Legacy seatLift-only callers do not opt into measured world-space seat contact. Main staging was NOT deployed from the shared dirty tree; this correction is live on the isolated preview above. Refresh that page to load the new JS; do not clear saved layout/storage.
