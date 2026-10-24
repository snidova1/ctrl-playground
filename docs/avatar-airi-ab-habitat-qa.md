# Complete A/B characters — real application follow-up

This supersedes the harness-only verification scope in avatar-airi-whole-character-qa.md. Local only; no push/deploy.

## Integration
- Complete AvatarSample_A (`airi`) and AvatarSample_B (`airi-b`), by VRoid Project, selectable in Studio/creator. Source hair/body/outfit remain coherent, not mixed with the old modular rig.
- Approved A is initial Studio/new female character choice. Existing saved identities and legacy seeded distribution are preserved.
- Unfitted accessory overlays are excluded for the complete characters; older modular wardrobe remains separate.
- Both prepared high/mobile variants and provenance/license notes are under public/plaza/characters/airi-reference/.

## Actual execution
- All avatar regression tests: **153 passed**, `/tmp/ctrl-airi-ab-tests-final.log`.
- Isolated full Next production build: **exit 0**, `/tmp/ctrl-airi-ab-build-serial.log`. First build hit SQLite lock with parallel workers; retry with `CIRCLE_NODE_TOTAL=1` completed. Dependency warning from ox/viem remains.
- Production QA server: 127.0.0.1:3199, `.next-airi-complete`, `/tmp/ctrl-airi-ab-qa.sqlite`; no production user data used.
- Playwright exercises real `/avatar-studio` and signed-wallet `/habitat`, not the component harness. Test wallet signing comes from the existing browser helper.
- A: `AIRI_HABITAT_PASS airi` in `/tmp/ctrl-airi-ab-browser.log`. A completed all assertions before the combined command hit its 240-second budget during B. No combined-run success is claimed.
- B rerun alone: **exit 0**, `AIRI_HABITAT_PASS airi-b`, `/tmp/ctrl-airi-ab-browser-b.log`, `test-results/airi-habitat/report.json`.
- Each scenario asserts actual model identity and a new gameplay instance after creator unmount; saves appearance through the real API, confirms exact appearance after reload, checks WASD Walk/Idle, wave cancellation on movement, and phone touch analog Walk.
- B report contains `savedAndReloaded`, `wasdAndGestureCancel`, `phoneAnalog`: true and `errors`: []. A reached the same PASS marker after the same assertions.
- Desktop and 390×844 touch screenshots are in test-results/airi-habitat/. `complete-options-ab.jpg` compares actual Studio A/B renders.

## Limits
Touch emulation, not physical phone/FPS validation. Hair/outfit remain complete authored packages, not a modular wardrobe conversion. No commit/push/deployment. Legacy modular asset licensing hold is independent and unchanged.
