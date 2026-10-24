# Continuous house enter / sit / stand / exit

## Scope

Keep the existing house, roof, walls, furniture layout, avatar model and body scale. Exercise the real source scene using mouse/WASD/E and Chromium touch emulation (orbit, analog movement, action taps). This is not evidence from a physical phone or a main-site deployment.

## Fix

- `HumanoidAnimator` creates a private reversed SitDown clip for StandUp. Partial sit/stand reversals preserve progress, movement can cancel, and safety states reject stale gestures.
- `alignSitDownStandingPose` blends only the opening 0.24 seconds of a copied SitDown clip into the actual relaxed Idle stance. Reversing it now ends on the same hips, legs and feet as Idle. The original tracks, seated endpoint and duration are preserved.
- The old authored standing endpoint and the newer relaxed Idle stance differed. During their crossfade, visible soles briefly crossed the floor even though a settled Idle-only test passed. A frame-by-frame regression reproduced this at frame 188 with skin minimum Y `-0.012746084240342336` m. The browser baseline independently failed with minimum Y near `-0.01435` m. Tests were not relaxed to accept this.
- `authoredStandingFootY` measures the actual posed skin at load instead of deriving ground contact solely from the export bind box. It restores the normalized pose and mesh bounds and leaves body scale unchanged. There is no permanent arbitrary lift and no production per-frame vertex scan.
- `authoredSeatedSupportY` measures the settled pelvis/thigh skin for consistent SitDown root calibration. Settled seat contact still uses the existing actual-mesh support measurement.
- The visible avatar root returns from the seat on the animation timeline, with speed-limited position/rotation, and the camera follows the rendered pose. Interior camera depth uses the available room while retaining structural boundaries; walls and roof stay visible.
- Opt-in bounds diagnostics refresh the SkinnedMesh attached bind inverse before CPU skinning, as the seat probe already does.

## Regression checks

`tests/unit/avatar-home-loop.test.ts` covers initial Idle, every Idle frame during the standing crossfade, source-clip immutability, matching standing endpoints, unchanged seated endpoints, partial reversal/walk cancellation, seat skin support and camera clearance. The legacy state-ownership test now expects StandUp safety instead of an immediate gesture after leaving the seat.

Full suite command (passed: **115 files, 868 tests**):

```sh
TMPDIR="$(realpath /dev/shm)" NODE_OPTIONS=--max-old-space-size=512 \
  pnpm exec vitest run --maxWorkers=1
```

The realpath matters on this machine because `/dev/shm` resolves to `/run/shm`; the database test intentionally checks the resolved temporary path.

## Browser reproduction

```sh
node scripts/qa/build-entry-art-preview.mjs
python3 scripts/qa/serve-entry-preview.py --port 3251
# Separate terminal:
CTRL_QA_ORIGIN=http://127.0.0.1:3251 CTRL_LOOP_LABEL=verified-final \
  node --import tsx scripts/qa/habitat-home-loop.mts
```

The QA asserts unchanged layout storage, intact shell and roof, a real StandUp state, bounded root/pelvis jumps, whole-body framing and posed-skin floor clearance. It saves screenshots, frame logs and a report under `test-results/habitat-home-loop/<label>/` (ignored by Git). Run browser QA serially on constrained hosts; concurrent full suites/TypeScript checks caused wall-clock timeouts here and those runs are not accepted as passes.

## Verified browser evidence

- Desktop: `test-results/habitat-home-loop/verified-final/report.json`, 331 recorded frames; maximum horizontal root step 0.150 m; maximum per-frame pelvis Y change 0.031890 m; standing skin minimum Y +0.000001612 m.
- Touch emulation: `test-results/habitat-home-loop/verified-touch/report.json`, exit 0, 351 recorded frames; maximum horizontal root step 0.150 m; maximum per-frame pelvis Y change 0.031896 m; standing skin minimum Y +0.000001476 m; no page errors.
- Both completed approach/enter, door close, seat, StandUp, door reopen and exit with unchanged layout storage, visible walls/roof and whole-body framing. Standing screenshots were visually inspected on desktop and 390px touch viewport. HUD prompts overlap part of the lower torso/legs; no claim that the HUD is occlusion-free.
- The initial combined run completed desktop but the touch input overshot toward the bench, so the nearest interaction became Sit down rather than Close door. The harness now re-approaches the door using real movement/analog input when necessary instead of assuming which prompt is nearest. The standalone touch rerun passed without changing game layout, controls or assertion tolerances.
- Final focused tests and targeted TypeScript check passed before the final preview build (`57d66f1a6342f23a0cabb405e4a35d1c22f6d16d54024327d8dc877135bdbbbe`). This is not a full-project TypeScript or full production build claim.

## Source snapshot

The checkout contained many previously untracked source dependencies and runtime assets. A reproducible Git snapshot must include them rather than committing only loader/animation edits. Generated Next caches, Python caches, diagnostic scratch tests, local env files, QA outputs and the raw `scripts/assets/cc0-costumes/` donor downloads are excluded. Public runtime assets and their source/licensing metadata remain included.
