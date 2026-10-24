# CTRL house-entry art / game-feel reference

## Candidate, not a full-game visual approval
Public anonymous preview: https://ctrl-entry-preview.suhiro211.workers.dev/habitat-test

This is the real `features/habitat/habitat-test.tsx` route, bundled with its existing R3F/Three renderer. Only Next's dynamic-loading wrapper is replaced for the standalone source preview. It is not a generated concept image or a separate fake facade. The new renderer/interaction changes are in the actual project source.

The preview is isolated in the `ctrl-entry-preview` Worker with only static ASSETS. `/api/*` explicitly returns 401; no D1, wallet sessions, migrations, keys, production routes or main staging deployment were changed. Progress here is browser-local. Existing runtime models/material assets and their license notes are shipped with the candidate so it does not depend on older staging's missing paths.

## The visual contract implemented
- Existing saved house layout, wall/roof/floor color fields, opening IDs, collision, avatar model and follow camera remain authoritative.
- A small shared original material family: quiet plaster; cedar-clad gable tied to the roof color; modest limestone plinth; sage painted timber door with readable panel relief; restrained brass lever.
- Grain/courses are measured shared textures, not a large catalog of unrelated generated assets. No new runtime library or postprocessing stack.
- Contact shading only at wall feet; no automatic patio, plants, props, doors, windows or furniture placement.
- Own-avatar nametag is hidden in Habitat to prevent the existing distance-scaled "You" label filling the phone screen when the indoor camera moves closer. Other-player names and avatar geometry are unchanged.
- Existing nearby action prompt keeps its accessible labels and gains a 46px sound toggle and visible keyboard focus.

## Interaction implemented
- Lever lead-in, then smooth bounded 0.44s open / 0.38s close; reversible mid-motion and starts at the saved state.
- No camera shake, hit-stop, simulation pause or new input lock for a quiet household action.
- Low-volume original latch/wood Web Audio synthesis is triggered by accepted state changes, not button presses. No startup/polling replay, no external audio download. Unlock requires actual trusted input; mute is stored separately from world layout.
- Main Habitat ignores repeated KeyE keydown, matching the sandbox's existing hold protection.

## Actual final verification
- Project TypeScript: PASS (`/tmp/ctrl-entry-types.log`).
- Full suite: **112 files / 856 tests PASS** (`/tmp/ctrl-entry-tests.log`).
- Public Playwright: PASS, desktop 1000x760 and Chromium phone/touch 390x760; zero recorded JS/asset errors.
- Real E / touch open-close; actual Three mesh hinge angles; no mount feedback; one feedback per accepted change; actual AudioContext running; mute suppresses scheduled audio; held E does not toggle repeatedly.
- Actual keyboard / native CDP touch joystick walk through the open doorway, not a pose-ref assignment. Walls and roof remain visible while inside.
- Public JS bundle SHA-256 matches the local published artifact and manifest: `95890cf3d893538fdf0ce4e1a1db8bb391442e0ff24ee402725a4a187e74978a`.
- OfflineAudioContext rendered the actual served sound function into `door-close-rendered.wav`; nonzero waveform, no clipping. This is synthesis/render verification, not a physical speaker listening test.

Proof: `test-results/entry-art-target/public/{report.json,deploy-proof.json,desktop-closed.png,desktop-open.png,desktop-inside.png,phone-closed.png,phone-open.png,phone-inside.png,door-close-rendered.wav}`.
Before: `test-results/entry-art-target/before/` captured before source edits.
Comparison: `test-results/entry-art-target/entry-before-after.png`, assembled only from actual before and final-public screenshots. Same initial pose/viewport; footer cropped, no painted-over pixels or generative replacement.

## Reproduce
```sh
NODE_OPTIONS=--max-old-space-size=1536 node node_modules/typescript/bin/tsc --noEmit --pretty false
TMPDIR="$(realpath /dev/shm)" NODE_OPTIONS=--max-old-space-size=512 node node_modules/vitest/vitest.mjs run
node scripts/qa/build-entry-art-preview.mjs
# Use the authorized foreground environment; background shell did not inherit the CF token in this session.
WRANGLER_SEND_METRICS=false NODE_OPTIONS=--dns-result-order=ipv4first pnpm exec wrangler deploy --config /tmp/ctrl-entry-art-preview/wrangler.json
CTRL_QA_ORIGIN=https://ctrl-entry-preview.suhiro211.workers.dev CTRL_ART_LABEL=public node --import tsx scripts/qa/entry-art-target.mts --exercise
```

## Deliberate limits
This approves no wider asset family by itself. The large plain house silhouette, outdoor grass/path/sky and unrelated activity panels have not been redesigned. Indoor camera still moves closer to preserve intact walls/roof. Phone verification is emulation, not physical-device performance certification. No signed-account, multiplayer, cozy-life release or economic QA is implied. User should judge this candidate before any broader art rollout.

Guidance applied: https://github.com/gamedev-skills/awesome-gamedev-agent-skills (`create-game-assets` art-direction reference and `game-feel`). No mass skill installation or dependency migration.
