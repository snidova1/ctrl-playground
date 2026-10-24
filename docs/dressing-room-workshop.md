# Dressing room and Habitat workshop UI

## Changes
- Common Ground creator: editorial warm-paper/moss/terracotta shell, actual shared 3D preview, Look/Hair/Outfit/Details tabs, visual choices, real tint swatches and fixed save area. PC uses two columns; phone pins the avatar above independently scrolling choices.
- Habitat wardrobe uses the same appearance picker and real renderer, with its own coherent dressing-room shell and existing signed-profile persistence.
- Habitat workshop replaces the old catalog/inspector overlays with a categorized thumbnail shelf, search, pagination, selected-object tools, and phone catalog/selected-piece views. Existing draft/history/duplicate/delete/save/cancel/ACL behavior remains in the app; no changes to purchases, key rights, backend schemas or native animation ownership.
- `appearance-thumbnails.ts` references 19 local WebP captures (127154 bytes at generation) of the already-hosted complete A/B avatars, native hairstyles, garments and six coordinated presets. These are actual shared-renderer captures, not generated/illustrative character screenshots. Existing model licenses/attributions continue to apply; no new third-party models were introduced.

## Bugs caught in visual review
1. Legacy `.hb-panel.hb-character-creator` phone rules replaced the new three-row wardrobe with a two-row grid. The heading consumed the first row and the avatar collapsed to zero height. The new shell selector includes its own `hd-room` class so its layout wins regardless of CSS import order.
2. Implicit CSS grid rows let thumbnail images grow to intrinsic height (267px inside a 110px art box), clipping portraits to their crowns. Photo art containers now use block layout, and the source/live browser scripts assert image height does not exceed the art box.

3. The enabled advanced-gizmo flag still routed the actual app to the legacy admin panel. Both modes now mount `BuildCatalog`; Move/Rotate/Scale and Snap remain in a compact toolbar.
4. The floating background-music widget intercepted the phone Undo button. Its UI is hidden during build/customization, without stopping playback; it returns when those panels close.

## Verified local checks
- Project TypeScript: exit 0.
- 15 relevant unit/integration files, 122 tests PASS. Includes actual SQLite/auth/ACL/revision/key boundaries and creator/shared-picker/build/wardrobe event wiring.
- Actual source-render desktop and 390x844 touch-context phone checks PASS: creator pinned preview and footer, nonzero Habitat wardrobe canvas, real thumbnails, catalog add/select/rename/duplicate/delete and no horizontal document overflow.
- Source rendering is a visual fixture, **not** proof of signed server saving or deployment.

## Reproduction
Keep full tests, builds and Chromium serial on the memory-constrained WSL host.
- The release build **must** export `CTRL_HOSTING_TARGET=cloudflare-staging` with the existing staging environment before `node scripts/run-framework.mjs build`. The default target is a Sites/mock artifact and must not be used as the standalone Worker. `node scripts/cloudflare-staging.mjs validate` rejects that mismatch; inspect the generated Worker name, real D1 UUID and bindings before local/hosted QA.
- `node scripts/qa/build-face-redesign-preview.mjs` builds source-only `creator.html` and `workshop.html`; `workshop.html?view=character` opens the wardrobe. Mount `public/worlds`, `public/plaza` and `public/assets` (builder creates symlinks).
- `node scripts/qa/ui-redesign-source.mjs` writes `test-results/ui-redesign/source/`.
- `node --import tsx scripts/qa/render-look-thumbnails.mts` captures approved native styles in `test-results/ui-redesign/preset-renders/`; the public assets are WebP conversions of those captures.
- `CTRL_QA_ORIGIN=<actual-worker-origin> CTRL_UI_QA_DIR=<output-dir> node --import tsx scripts/qa/ui-redesign-live.mts` checks real signed APIs and persistence, actual modal render/model changes, build history/save/reload and both responsive layouts. It uses the existing injected signed throwaway-wallet helper, not external wallet-app pairing.
- `CTRL_QA_CHROME` optionally overrides the QA browser executable; default is the already-installed/proven headless-shell binary rather than assuming the latest npm Playwright revision has its matching download.

Physical-phone FPS and real external-wallet approval are not covered by viewport/headless checks.

## Released and independently checked
- Standalone Worker: https://ctrl-staging.suhiro211.workers.dev
- Worker version: `833860c5-5b49-4c8f-b8f0-23c53e30b13d`.
- Final staging build/validation and deploy exited 0; production-mode config has demo auth disabled. Existing runtime variables were preserved.
- Final built Worker passed all five signed-browser checks with `styleProbe:false`, no injected stylesheet and no page errors: `test-results/ui-redesign/artifact/report.json`.
- The deployed URL independently passed the same five checks with `styleProbe:false` and no page errors: `test-results/ui-redesign/hosted/report.json`.
- Covered real A/B/native hair/wardrobe changes, pinned phone creator, signed avatar save/reload, live enabled-gizmo mode with the new catalog, transform/snap controls, add/rename/duplicate/delete/undo/redo, world save/reload and phone wardrobe canvas/footer. API reads after reload verified persisted appearance and object data.
- Hosted screenshots: `test-results/ui-redesign/hosted/`; `phone-layouts.jpg` juxtaposes the two unmodified 390x844 captures with labels outside their frames.
- `CTRL_UI_STYLE_PROBE=1` is an explicitly labelled CSS-debugging probe and is not release evidence. Final artifact and hosted runs both used `CTRL_UI_STYLE_PROBE=0`.
