# Original avatar rebuild

> **Superseded / visually rejected.** The user rejected this procedural model after viewing the screenshots. Its technical test results do not constitute visual acceptance. The live paths now use authored anime VRM models; see `avatar-anime-pass.md`.

## Scope

The old VRoid-based look was explicitly rejected. This is a new, locally authored 3D character model, **not** a material/shader touch-up of Victoria or Fumiriya.

- `features/plaza/characters/storybook-model.tsx`: original smooth geometry for two bodies/outfits, contoured face, layered eyes, tapered curved hair locks, connected sleeves/trousers, boots and articulated joints.
- `storybook-palette.ts`: independent natural skin, hair, iris and wardrobe colors, using the persisted appearance schema.
- `storybook-avatar.tsx`: live pose/heading, jump/seat height, moving/running and wave integration; preserves existing player/visitor/name/ready interfaces.
- `vrm-avatar.tsx`: compatibility import entry point redirected to the new model. The legacy import/retarget utilities and licensed VRM files remain separate, but are not fetched by the live character or creator.
- `features/habitat/character-creator-preview.tsx`: same authored model in the real character creator. Full figure and portrait studio framing use an explicit camera effect.
- `/avatar-studio`: standalone noindex, non-saving character study with gender/color/animation controls. It does **not** write profile, wallet or world state.

## Mobile analog

`features/habitat/analog-stick.tsx` and `analog-input.ts` replace Habitat's four movement buttons with a captured analog pointer, remapped dead zone, continuous input magnitude, bounded diagonals and reset on release/cancel/capture loss/blur/hidden/unmount. Desktop keys and separate run/jump actions remain intact.

The browser regression checks both partial/full diagonal values and neutral reset paths. CDP must send a **changed coordinate** after `releasePointerCapture`: identical coordinates do not dispatch a pointer move, so pending capture loss remains unprocessed. Best-effort CDP cleanup cannot override an assertion with Chrome's 'must send TouchStart first' error after all contacts have ended.

## Preservation

No backend, persisted schema, world reset, furniture migration, ownership, Key/build-rights or wallet behavior is changed for this rebuild. Appearance IDs still normalize through the existing catalog. The separate studio never saves anything.

## Verification

- Targeted ESLint and `git diff --check`: passed.
- Six targeted unit files: **27 passed**, including appearance compatibility, full palette validity, analog mapping and public-avatar/profile/world isolation.
- Production Node build: **exit 0**, **19/19** pages. Final build `proc_d1b47c463829` includes the refined body, portrait camera and standalone shell exclusion.
- Studio desktop + phone first/final passes: both bodies, color controls, advancing rendered animation, no `.vrm`/`.glb` character requests, no private API writes, no runtime/shader errors. Artifacts: `test-results/avatar-rebuild/`.
- Final acceptance `proc_1d7d7e8b9104`: **exit 0**. Studio PC + phone passed; signed wallet setup/reentry **2 passed** (desktop/mobile); mobile analog partial/full diagonal, release, cancellation, real capture loss and blur reset all passed. Prototype PC + phone decoration/drag/rotate/color/reload/removal/wall paint smoke also passed.
- Real signed-in mobile gameplay: `test-results/avatar-rebuild-entry-final/habitat-entry-a-signed-wal-10a32-epeating-character-creation-entry-mobile/returning-wallet-habitat.png`. This shows the original model in Habitat and the analog control; it is separate from the studio screenshots.

## Deployment

Local production/mock verification at `http://127.0.0.1:3168`; **not a production deployment**. No push is implied.
