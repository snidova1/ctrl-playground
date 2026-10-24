# Habitat — artisan cottage visual pass

Owner request: “good sekarang giliran percantik habitat somehow terserah bebas”.

## Scope

A warm, lived-in cottage treatment, preserving the current home rather than replacing it.

- Shared exterior: flower-filled timber window boxes, climbing flowering vines, a door wreath and small welcome plaque, paired porch lanterns, and terracotta flower pots.
- Stone-edged cottage planting strips use instanced flowers/leaves/stems; the existing meadow mask keeps grass out of those beds. The center approach stays open.
- The fixed street lantern is scaled down and moved away from the front door/window; its existing light follows the new position.
- Signed Habitat HUD: matte parchment, readable forest-green navigation, warm borders and a quieter place title. The neighborhood link no longer says “comparison” or “study”.
- Existing enterable `/preview` interior: botanical artwork, a keepsake shelf with books/ceramic vase, timber wall clock, window-sill plants and woven curtain details. This remains the local preview, not a replacement for signed wallet Habitat.
- Interior decoration is attached to walls/windows; no fixed new floor furniture blocks the owner's editable room.

## Preserved boundaries

No changes to saved furniture arrays, starter template, world IDs/revisions, backend/auth, ownership/build rights or wallet/public-world separation. Existing house colors, timber/roof settings, room dimensions, camera/input and furniture placement remain supported. Common Ground art is not changed in this pass.

## Verification

- Full unit suite: **231 passed / 45 files**, `proc_4c7055e7fb3b`, exit 0.
- Targeted ESLint: 0 errors; existing `cozy-village.tsx` memo dependency warning remains. `git diff --check` clean.
- Fresh production Node builds: **exit 0**, `proc_5189eee625ac` and final mobile HUD correction rebuild `proc_f43ef92056fd`; 18/18 static pages.
- Signed wallet Habitat desktop/mobile setup + reentry: **2/2 passed (3.3m)**, `proc_b627d7f7da10`. Captures wait for the actual cottage and player model. Home ID, world ID, complete saved object array and profile match after signing back in.
- Existing PC/mobile direct-decoration acceptance (`scripts/qa/preview-smoke.mjs`): **passed**, same process exit 0. Desktop mouse and phone CDP touch both pass enter/exit, all four atmosphere presets, placement, drag, rotate, color, saved layout after reload, removal and wall painting; zero page errors and no detected shader errors. Report: `test-results/preview-smoke.json`.
- Visual review identified the old mobile neighborhood banner covering the forward D-pad. It is now a compact link beside the music-control row, above movement/build controls. **Final mobile hit-test + reentry passed**, `proc_a998494774dc`, 1/1 (1.6m), exit 0, on the rebuilt source; the forward button is verified with `document.elementFromPoint` and the final screenshot was inspected.

## Actual browser captures

- Signed Habitat desktop: `test-results/habitat-artisan-entry/habitat-entry-a-signed-wal-10a32-epeating-character-creation-entry-desktop/returning-wallet-habitat.png`.
- Signed Habitat final mobile: `test-results/habitat-artisan-final-mobile/habitat-entry-a-signed-wal-10a32-epeating-character-creation-entry-mobile/returning-wallet-habitat.png`.
- Shared cottage exterior, full view in preview: `test-results/habit-desktop-yard.png`.
- Decorated interior in preview: `test-results/habit-desktop-room-before.png`, `test-results/habit-desktop-room.png`; phone counterpart `test-results/habit-phone-room.png`.

The authenticated Habitat exterior and preview interior are explicitly different consumers; screenshots are not interchangeable as evidence of a new authenticated indoor feature.

Browser device emulation is functional/visual coverage, not physical phone FPS evidence. Artifacts are local under ignored `test-results/`; no production deployment is implied.
