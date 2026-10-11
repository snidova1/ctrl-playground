# Habitat cozy visual comparison

Branch: `visual/habitat-cozy-comparison`

- `/`: Habitat, with the comparison environment and cozy HUD.
- `/courtyard`: existing Common Ground, unchanged.
- This is a visual study, not a new world-persistence implementation or a contract deployment.

## Scope

`features/habitat/cozy-environment.tsx` adds rounded cream cottages, clustered pastel trees, a curved stepping-stone path, pond and stone rim, workshop scenery and terrain mounds. Flowers and additional trees are limited to desktop graphics. Buildings are positioned outside the playable boundary so decorative scenery does not take over the owner-editable world.

`stage.tsx` adds the scenery and warm hemisphere/directional lighting, shadows and sky-colored fog. The existing VRM avatar, movement controller, object interactions and world-state wiring remain in place.

`cozy.css` is imported after the existing Habitat CSS and styles only Habitat. A comparison link points to the unmodified Common Ground route. Saved world objects and server-side collision are not changed.

## Local verification

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm exec eslint features/habitat/app.tsx features/habitat/stage.tsx features/habitat/cozy-environment.tsx
pnpm build:next
```

For isolated browser testing, migrate a new database and run Next on a spare port:

```sh
CTRL_LOCAL_DB=/absolute/path/to/habitat-qa.sqlite pnpm db:local
CTRL_LOCAL_DB=/absolute/path/to/habitat-qa.sqlite APP_ORIGIN=http://127.0.0.1:3106 pnpm dev:next --port 3106
APP_ORIGIN=http://127.0.0.1:3106 node scripts/test-habitat-cozy.mjs
```

The browser script uses actual APIs and a separate guest session per desktop/mobile viewport; it checks guest entry, profile creation, server-accepted movement, build/save/reload persistence, desktop graphics and the Common Ground route. Screenshots and the report go to `test-results/`. An installed Playwright Chromium or `CTRL_TEST_CHROMIUM` is required.

On WSL, a Linux-filesystem QA copy avoids expensive `node_modules` writes to `/mnt/d`; the primary git branch stays in its original directory. The QA copy must use the same source and lockfile. Do not use an unrelated existing server or a shared production database for the smoke test.
