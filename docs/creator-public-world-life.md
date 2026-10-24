# Character creation and local Public World life

## Intent
Character creation should show the actual player while editing. Public World should feel inhabited through local environmental motion, meaningful use of places, and optional contextual audio, not an inflated NPC count or fake online activity.

## Implementation
- `features/common-ground/creator-form.tsx` and `creator-preview.tsx` reuse the Habitat `CharacterCreatorPreview` and single shared VRM/expression/animation engine. Desktop uses two columns; phone pins the preview above an independently scrolling customization region and fixed save area. Full body/Face changes one canvas in place.
- The underlying Common Ground canvas stays mounted but pauses while avatar creation is open; guest identity/position and input cleanup remain intact. Appearance, presets, gender, tints, saving and Public World/Habitat access remain unchanged.
- `public-world-life.tsx` and its pure motion helpers add suspension-point cloth/lantern movement, tiny flower-side motes and local cup steam. Instanced effects and prop-distance culling limit cost. Reduced motion hides motes and stops breeze animation; no new NPCs or ground obstacles are introduced.
- `public-world-activities.ts` adds spatial herb tending, garden seating, warm tea and a market bell. `public-activity-feedback.tsx` makes tended herbs flower and the actual visible bell swing. Movement leaves the garden seat locally instead of teleporting to Willow. These are local ambient activities, not token rewards, trading, purchases or persistent server-world progression.
- `public-world-audio.ts` uses native Web Audio after an explicit toggle only: distance-weighted fountain/garden/market sounds, restrained location details, and movement-aware walking/running footsteps. Hidden tabs suspend audio; mute/unmount closes the context. No external music/assets or synthetic crowd voices.

## Verified before production artifact build
- TypeScript project check: exit 0.
- Regression suite: 37 files, 326 tests passed (`/tmp/ctrl-creator-life-regression.log`).
- Source-only actual creator desktop/390x844 rendering and viewport box PASS. See `test-results/creator-world-life/source-creator-*.png`. The source phone screenshot was taken during the expected quality-switch loading transition; final artifact QA waits for the preview's own `data-avatar-ready=true` before capture.
- Actual Public World source browser QA PASS: new spatial actions/pathing, garden sit/stand, visible herb response, physical bell rotation, six unchanged NPCs, native AudioContext start/close, and no uncaught page errors. Source-only harness is deliberately NOT evidence of signed saving or deployment.

## Final release evidence
- Production framework build: `CREATOR_LIFE_BUILD_EXIT 0`.
- Isolated local D1 migrations and signed final Worker QA: exit 0.
- Cloudflare deploy: `CREATOR_LIFE_DEPLOY_EXIT 0`, version `f70f7313-53f1-4ad6-87b6-13172cfa6009`.
- Hosted creator + world activities/audio and existing AppKit QR/signed-save/reload QA: `CREATOR_LIFE_LIVE_BROWSER_EXIT 0`. Final `test-results/creator-world-life/report.json` names the hosted URL and records all signed/creator checks true, six NPCs, and zero uncaught page errors.
- Hosted cold loads exposed a QA click-before-hydration race; both signed scripts now wait for the actual client-populated `.cg-lobby[data-guest-id]` before clicking connect, rather than adding a blind delay.
- Camera orbit is ordinary user input in the market screenshot. This is not an automatic camera-occlusion fix: stalls can still hide the character from some angles. The phone activity toast can overlap top navigation until dismissed; this remains a small-screen layout polish gap, not a no-overlap guarantee.

## Release QA
1. Build using the existing Cloudflare production/staging framework path, after focused tests finish. Keep build, TypeScript and Chromium runs serial on the memory-constrained WSL host.
2. Start the resulting Worker locally with isolated D1 migrations and the matching APP_ORIGIN. Use real `/api/network` and signed-wallet test helper; no mocked auth/API routes.
3. Run `CTRL_QA_ORIGIN=<worker-origin> node --import tsx scripts/qa/creator-world-life.mts`. This verifies actual modal canvas, A/B rendering, live appearance, pinned phone preview, signed save, and all world interactions/audio. `CTRL_WORLD_ONLY=1` is source-harness-only mode and intentionally records signed/creator checks as false.
4. The existing `common-ground-direct.mjs` and `reown-public-world.mts` cover entry/mobile movement, AppKit QR and saved avatar reload. Do not confuse an injected signed test wallet with external wallet-app approval.
5. Deploy only after final-artifact QA passes; rerun against the actual hosted URL. Record deployment and browser exit markers, not only source-unit results.

Physical-phone FPS/audio feel, real external wallet pairing, and a broadly populated shared online world are separate checks. Do not claim those from headless browser emulation or these local six NPCs.
