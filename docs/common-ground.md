# Common Ground — playable alpha

Common Ground is CTRL's current product entrance: one shared courtyard with playable movement and persistent interactive objects. It replaces the exhibition homepage. Older mission tools remain accessible by their existing URLs as a separate legacy workbench.

## Loop

A visitor enters a name and gets a 30-day HttpOnly guest session. They walk with WASD/arrows or the touch joystick, drag the camera, interact with E/the on-screen button, and open Build. The workshop makes a validated object recipe; the visitor changes color/size, tests the behavior, positions and rotates the object, and saves it. All visitors read the same durable object table. A second browser session sees the placed object.

Five authored mechanics are available: drink dispenser, bench, lamp, planter and kinetic sculpture. The free kit uses a deterministic English/Indonesian prompt matcher, explicitly labeled in the UI. The live Orbio option uses a model to interpret requests into this same safe recipe format. It does **not** generate arbitrary meshes, scripts, physics engines, websites or full worlds.

## Runtime

- `features/plaza`: React HUD, lazy R3F scene, avatar animation, camera/collision systems, object renderer, guest API client.
- `server/plaza/service.ts`: actual session, presence, placement, interaction, inventory and bounded model endpoints.
- `config/plaza.ts`: token holding threshold, object and visitor caps, session lifetime, daily model-call ceilings and output-token cap.
- `db/schema.ts` / migration `0002_legal_madame_masque.sql`: visitors, players, objects and interaction receipts.
- Hosted storage: D1. Development/test: the existing Node SQLite adapter. No production JSON-file state.

Presence uses serialized HTTP snapshots approximately every 900 ms, pauses when the document is hidden, and removes stale visitors from the visible set after 15 seconds. It is lightweight shared presence, not authoritative high-frequency multiplayer physics. Positions have speed checks and server collision validation. Movement is predicted locally and other avatars interpolate between snapshots. Up to 16 visitors are displayed; the scene never invents occupants.

Guest sessions are browser-specific. Six build areas are assigned cyclically; they are shared placement bounds, not owned land. The alpha limits each guest to six objects and the plaza to 48. Guest expiry does not silently erase placed objects. Operational cleanup can remove objects and expired records through a reviewed database operation.

## Behaviors

The cat dispenser animates a can and adds one virtual soda to the visitor's durable bag. Drinking decrements the bag. Placed lamps toggle light, plants toggle growth, and sculptures toggle rotation. Benches play a seated animation at the selected seat; seated animation is local to that visitor in this alpha. Other visitors see their last movement pose. Built-in dispenser animation is local; placed-object activation and use timestamps are shared.

## Holder access

Public play and the free kit require no wallet. Only the live model endpoint requires a verified non-demo EOA session and a real server-read token balance above the configured threshold. No burn, allocation, staking, or lock is required. Current chain configuration remains the existing Robinhood testnet integration. Mainnet access still requires the real launch token and chain configuration.

The endpoint requires server-only `ORBIO_API_KEY` and `ORBIO_MODEL`. It posts to the official configured project gateway format, uses a 25-second timeout, rejects redirects and non-2xx responses, and validates the result against the strict Zod blueprint schema. No caller can select arbitrary URLs, code, or tool permissions. Missing credentials produce an explicit unavailable state and the free kit stays functional. Daily call limits and a 240-token output cap bound requests; this new object endpoint does not yet produce a dollar-settled mission receipt. Historical mission jobs retain their existing detailed settlement/receipt pipeline.

## Boundaries

- Same-origin JSON writes, bounded payloads, rate limits, HttpOnly hashed session tokens.
- User text is escaped by React; recipes contain no executable code or external asset URL.
- Placement IDs and action IDs are idempotent; object deletion is owner-only.
- Server checks placement area, collisions, proximity, object budgets and drink balance.
- Paid generation rejects simulated credentials even in demo mode.
- Guest creation has per-IP limits; distributed abuse and content moderation still need operational monitoring before unrestricted promotion.

## Rendering and accessibility

All downloadable assets are served locally with provenance in `public/plaza/licenses`. The active player characters are the approved Victoria and Fumiriya VRoid exports; paving is instanced, and shadows/pixel ratio have device quality settings. Reduced ambient motion can follow system preferences or be set in Settings. Keyboard movement, named semantic buttons, editable object forms and bag entries supplement pointer interaction. Gameplay requires WebGL; failure displays a clear retry message. It is not represented as a fully equivalent screen-reader-only world.

## Verify

`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

For a normal running development app: `pnpm exec playwright test --config playwright.plaza.config.ts` (configure `CTRL_TEST_ORIGIN` if not localhost:3000). `CTRL_TEST_CHROMIUM` can provide an installed Chromium binary.

`node scripts/test-plaza-render.mjs` is a network-independent browser integration fixture. It compiles the actual plaza components and assets, routes requests to the actual server handler with an isolated SQLite database, and tests desktop/mobile WebGL, create/place/reload/share/remove. It does not replace verification of the hosted HTTP runtime or real-device GPU performance. Output is in ignored `test-results/`.

## Release status

This is a playable alpha, not a full life simulator, unrestricted 3D generation engine, audited token protocol or claim of PMF. The current deployment keeps Vercel/Railway migration paused. Existing Sites runtime and durable storage are reused.
