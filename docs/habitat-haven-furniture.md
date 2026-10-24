# Textured indoor / outdoor furniture

## Implemented
- 21 new Poly Haven CC0 textured models, not recolors of existing Kenney assets.
- Catalog collections: Willow interiors (13) and Garden & terrace (8).
- Local GLB and WebP thumbnails; exact sizes, original source metadata and attribution in `public/plaza/build-kit/haven-cozy/provenance.json`.
- Importer: `scripts/assets/import-haven-furniture.mjs`. Render verification: `scripts/qa/render-haven-furniture.mts`.
- Preserves starter plot/save format; users select and place objects, no compulsory new decoration.

## Verification
- Full unit suite: 101 files / 773 tests pass (`/tmp/ctrl-haven-tests.log`).
- Project TypeScript: exit 0 (`/tmp/ctrl-haven-types.log`).
- Cloudflare staging build and configuration validation passed (`/tmp/ctrl-haven-build.log`).
- All 21 models separately rendered; contact sheet `test-results/new-furniture/ctrl-new-furniture.jpg` visually inspected.
- Source browser QA passed on phone touch emulation and desktop: both catalogs, textured ghost meshes, cancel without save mutation, placement, save/reload, no horizontal overflow, no page errors. Report: `test-results/new-furniture/source/report.json`.
- Initial browser QA timeout was followed by a complete successful fresh run without relaxing any assertions. The software WebGL/screenshot path on this WSL host is slow; avoid simultaneous browsers and bound full runs, not only browser action timeouts.

## Deployment
- URL: https://ctrl-staging.suhiro211.workers.dev/habitat-test
- Version: `4dd9c951-6e74-47b9-ad83-823cd48abeff`.
- Deploy exited 0; D1 backup completed; no migrations needed (`/tmp/ctrl-haven-deploy.log`).
- Public QA command: `timeout --signal=TERM --kill-after=10s 720s env CTRL_QA_ORIGIN=https://ctrl-staging.suhiro211.workers.dev node --import tsx scripts/qa/haven-furniture.mts`.
- The public report must be checked independently of successful deployment: `test-results/new-furniture/live/report.json`. It verifies every public model's SHA256 against the locally rendered file plus thumbnail responses, then runs both viewports.
- Public QA completed successfully (exit 0): all 21 model binaries match local SHA256, all thumbnails load, both indoor/outdoor collections and ghost/cancel/place/save/reload pass on desktop and phone emulation. `errors: []`. Final public screenshots inspected, including textured bistro after reload.
- Mobile coverage is Chromium touch emulation (390x760), not a physical device.
