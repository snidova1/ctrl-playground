# Habitat beauty / arrangement pass

## Scope
Preserves the existing dirty worktree, ownership boundaries, AIRI avatars and saved-world schema. No default plot stuffing; curated collections select one item at a time. No wallet/API calls in `/habitat-test`.

## Implemented
- Catalog: four real-asset inspiration shelves (reading, greenery, breakfast, soft details); searchable normalized terms and aliases; placed-only filter, quantity badges and functional accessible controls. Existing local WebP/GLB library reused rather than duplicated or fetched at runtime.
- Inspector: visual cardinal orientation presets, 45-degree nudges, four size presets, scaled authored dimensions and behavior explanations. Fine-grained ranges remain available in a disclosure; duplicate/delete retain existing undo workflow.
- Placement: compact object thumbnail, footprint dimensions, heading, restrained status/reticle transitions, focus treatment, motion-preference CSS and desktop R/Escape/Enter shortcuts. Keyboard input is not stolen from interactive controls, modifier bindings or repeated key events.
- Tabletop arrangement: books, small potted plants, supported tabletop lamps and food/decor can snap onto explicitly supported flat rectangular Kenney tables/desks. Full rotated footprint must fit. Existing wall/overlap/world-bound checks still run. Position includes the actual scaled top height and persists in the same existing world format. Round/corner tables intentionally excluded until surface geometry is handled accurately. Moving the support does not parent/move ornaments automatically.
- Cozy scene details: existing distant hills batched into one instanced mesh with atmosphere-matched color; existing room/cottage detail components gain deterministic botanical art/textile detail and subtle motion with reduced-motion/hidden-tab handling. No extra automatic trees/patios added to the user plot. These details appear where the existing components are used, not as newly auto-placed furniture.

## Sources / licensing
- https://github.com/pmndrs/drei — MIT; inspected upstream README/license listing; existing project dependency, no new external copied source or framework swap.
- https://kenney.nl/assets/furniture-kit — upstream confirms Creative Commons CC0, 140 assets. Existing project's local converted models/thumbnails used for curated shelves and surface bounds.
- Catalog still uses existing asset manifest and original per-pack attribution. No new third-party model pack claimed or purchased. Placement/tabletop and new UI logic authored in this pass.

## Tests
- Full Vitest: 100 files / 769 tests passed (log `/tmp/ctrl-beauty-tests.log`). Use TMPDIR=$(realpath /dev/shm), not the symlink spelling: SQLite resolves /dev/shm to /run/shm and the database path equality test otherwise fails.
- Project TypeScript passed before staging build (`/tmp/ctrl-beauty-types.log`). Per-file write tool tsc ignores tsconfig aliases/JSX and emits misleading errors; authoritative command is project `node node_modules/typescript/bin/tsc --noEmit --pretty false`.
- Existing furniture mobile touch regression: 7 checks passed on source preview, including ghost cancel, valid/invalid target, actual analog/camera touches, rotate/confirm, move/persist and scaled seat alignment.
- `scripts/qa/habitat-beauty.mts`: mobile/desktop collections+placed filter and size/turn persistence, screenshots, no page errors. Source passed.
- `scripts/qa/habitat-decor.mts`: actual mobile camera-targeted books on a 4x coffee table, confirmed, saved, reloaded; height .92m, no page errors. Source passed.
- Browser mobile means Chromium touch emulation at 390x760, NOT a physical phone.

## Release procedure
Build is sequential after successful tests/typecheck, bounded to 1500s; validation requires dist/server/wrangler.json. Do not use the old pidfd waiter or stale log to infer build success. Source staging env from /home/celeng/.config/ctrl/cloudflare-staging.env (never expose secret content). Deploy with `node scripts/cloudflare-staging.mjs deploy` (backup/migrations included), then run all three browser scripts with CTRL_QA_ORIGIN=https://ctrl-staging.suhiro211.workers.dev. Final deployment evidence:
- Cloudflare staging version `bd1ba7bd-8c05-405f-b7f6-29e093037379`, deployed successfully with D1 backup.
- Public URL: https://ctrl-staging.suhiro211.workers.dev/habitat-test
- All three browser suites passed against PUBLIC URL: habitat-beauty (desktop/mobile controls + save), furniture-aim (7 native-touch regression checks), habitat-decor (books saved at .92m actual table top).
- Reports: `test-results/habitat-beauty/live/report.json`, `test-results/furniture-aim/live/report.json`, `test-results/habitat-decor/live/report.json`. Public desktop/mobile screenshots inspected.
- The first public tabletop harness run timed out replaying camera aim; a fresh run passed with actual saved coordinates. This camera-replay fixture is timing-sensitive; no assertion was removed or relaxed. Failure screenshot/state capture is now included for future diagnosis.
- Final project TypeScript (including new QA scripts) passed, exit 0.
