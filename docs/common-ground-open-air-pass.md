# Common Ground — corrected open-air product entry (2026-10-20)

## Owner-approved scope

- CTRL is friend.tech with worlds. Member Keys are tradable identities/membership, not somebody else's Habitat/build rights.
- Common Ground is a **small OPEN-AIR playable landing** with a randomly assigned, noneditable guest avatar. Walk/look only; no guest builder/workshop.
- Verified wallet → customize/save avatar → Public World, including Willow Common. A Key purchase is **not** required to explore Public World.
- Owner Key / personal buildable, visitable Habitat is separate. Keep the approved home/garden and existing worlds intact.

## Implemented

- `/` and `/courtyard` mount the same `CommonGroundLobby`. `lobby-scene.tsx` is now a 28 × 24 open clearing, painted meadow/path, fountain, benches, signs, trees, clouds and open horizon, reusing Willow art components. No enclosed room.
- Real keyboard WASD/arrows, Shift run, follow/orbit camera, touch hold-to-walk pad, movement bounds and obstacle collision. Field/modal focus, blur, cancel and visibility changes clear movement. Failed optional VRM does not block walking or entry controls.
- `guest.ts` assigns cosmetic identity with `crypto.randomUUID()` and the existing seeded appearance catalog, persists it per tab in sessionStorage, validates restored data, and falls back when storage is denied. Guest identity is not a wallet/auth token or backend authorization.
- Guest UI has no avatar editor, mint/build controls, fake online counts or automatically created backend/plaza identity.
- The shared `WalletConnection` accepts optional `purpose='public-world'` text while preserving its Habitat defaults, real nonce/signature verification, desktop injected wallet and mobile wallet flows.
- `POST /api/habitat/public-profile` shares existing strict authenticated profile validation/persistence but deliberately omits Habitat creation. `GET /api/habitat/profile` restores it. No schema change.
- `/public-world` obtains the real signed-wallet profile before mounting Willow; unsigned users get a connect-wallet entry. Customization is wallet-only, saved to SQLite/D1 and provided to Willow actor zero, without recoloring it as an NPC.
- `features/habitat/`, its stage, objects, editor, private world data and ownership ACL implementation are not redesigned. Existing users keep their homes.

## Important limits — do not overclaim

- This implements the landing and signed-avatar bridge, **not** authoritative Common Ground/Willow multiplayer or shared Public World edits. Willow residents are NPCs, not online users.
- `/world-preview` remains a public, standalone developer preview; the product profile check is not a promise to conceal publicly shipped static world assets. Private data and mutations remain protected by backend wallet/owner/editor checks.
- No mainnet Key launch/purchase or new owner-Key Habitat provisioning is completed here. Legacy `POST /api/habitat/profile` onboarding still creates its draft home as before; do not claim Key-gated provisioning is enforced everywhere merely because the new public-avatar endpoint grants no Habitat.
- This is source/local production QA, not a live hosted rollout.

## Executed checks

- Targeted ESLint: Common Ground, new entry pages, shared wallet widget, Habitat service and changed tests passed.
- Project `tsc --noEmit` passed with `node --max-old-space-size=1280`; 768 MB was insufficient for the current project graph.
- Targeted Common Ground + real public-profile API tests: **13 passed**. Includes persistent random guest identity, denied storage, strict signed-wallet authorization, CSRF/body/schema rejection, no home/presence creation, durable appearance restore, existing-world preservation and unchanged legacy onboarding.
- Full-suite exploratory run hit its 240-second runner limit while all reported completed files were green; that interrupted run is NOT counted as a complete pass.
- Initial development-server browser attempt exposed a real local SQLite startup race and Fast Refresh/network interruptions; it is NOT counted as a clean run. Reproduced an exclusive-lock startup: default timeout failed `database is locked`, 5-second busy timeout succeeded and selected WAL. Node-only adapter now installs `busy_timeout=5000` before WAL. Hosted Cloudflare D1 is unchanged.
- Baseline production build completed successfully, followed by **225/225 unit tests** and **12/12 desktop/mobile browser tests**. These baseline checks preceded the decorative garden pass; fresh decorative-pass evidence is tracked in `common-ground-garden-pass.md`.

## Local QA commands

```sh
CTRL_LOCAL_DB=/tmp/ctrl-open-air-qa.sqlite node scripts/migrate-local.mjs
CTRL_LOCAL_DB=/tmp/ctrl-open-air-qa.sqlite node --import tsx --input-type=module -e "await import('./lib/platform-node.ts')"
CTRL_BUILD_TARGET=node CTRL_LOCAL_DB=/tmp/ctrl-open-air-qa.sqlite APP_ORIGIN=http://127.0.0.1:3168 CTRL_MODE=mock NODE_OPTIONS=--max-old-space-size=2048 node node_modules/next/dist/bin/next build --webpack
CTRL_BUILD_TARGET=node CTRL_LOCAL_DB=/tmp/ctrl-open-air-qa.sqlite APP_ORIGIN=http://127.0.0.1:3168 CTRL_MODE=mock node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3168
CTRL_TEST_REUSE_SERVER=1 CTRL_TEST_ORIGIN=http://127.0.0.1:3168 CTRL_TEST_CHROMIUM=/path/to/chromium node_modules/.bin/playwright test --config playwright.entry.config.ts
```

Screenshots belong under ignored `test-results/`. Desktop/mobile emulation is not physical-phone FPS verification. Keep authentication tests using isolated throwaway signers and real API endpoints; never mock successful auth/profile responses to manufacture a pass.
