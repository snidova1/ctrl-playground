# HISTORICAL / REJECTED — Common Ground enclosed waiting-room pass

**Superseded by owner correction.** The enclosed room/diorama below was rejected. Common Ground must be small, OPEN-AIR and playable, with random noneditable guest avatars. Wallet → saved custom avatar → Public World; owner Key → personal Habitat separately. See `common-ground-open-air-pass.md` for current implementation. These old test results prove only that historical room build, not approval of its product direction.

## Product role

Willow Common is one of the primary **Public World areas**. Common Ground is the separate, small waiting-room/landing for non-holders, not the old large plaza and not the definition of the product. This is owner-directed product hierarchy, not a claim that holder authorization and Public World routing are already integrated.

## Implemented

- `/courtyard` now mounts `features/common-ground/lobby.tsx`, not `PlazaApp`.
- An approximately 8×7-unit open-front waiting room replaces the legacy sprawling plaza: textured plaster/timber, window, bench, tea table, potted plants and one optional anime VRM.
- Orbit-look and atmosphere switching are available. No walkable village, builder, fake online-user counter or simulated multiplayer in this lobby.
- The unsigned `/`, `/habitat` and `/worlds/editor` entry backdrop uses the same compact scene. Existing signed-wallet Habitat/editor flow is preserved.
- `Enter Common Ground` navigates directly to the lobby, with no legacy guest-session creation API call required.
- The lobby CTA goes through the existing `/habitat` wallet entry. It does **not** automatically grant holder access or transport users to Willow Common.
- VRM loading/failure is independent of scene readiness and DOM navigation. No blocking “Opening” gate is added. The lobby has a renderer error boundary and caps pixel ratio at 1.25; no shadow-map or post-processing pipeline is needed.
- Legacy courtyard code/backend/storage remains in the repo, unmounted by this route. Existing objects, Habitat worlds and authorization handlers are not deleted or migrated.

## Verified execution

- `vitest run --maxWorkers=1 --no-file-parallelism`: **42 files, 214 tests passed**, including authorization, persistence and the two new lobby source-boundary checks.
- TypeScript: `node --max-old-space-size=768 node_modules/typescript/bin/tsc --noEmit` completed successfully. Targeted ESLint for all changed TypeScript/TSX files passed.
- Four lobby Playwright cases passed across desktop and emulated phone: rendered scene, bounded layout/no horizontal overflow, working light control, existing entry route, no guest-identity POST, no page errors; then failed-VRM resilience.
- Eight existing entry/auth cases passed across desktop and emulated phone: unsigned entry through `/`, `/habitat`, `/worlds/editor`, missing browser-wallet handling, settings access, and signed-wallet setup/sign-out/sign-back-in to the same saved Habitat.
- Actual desktop and mobile lobby captures were inspected. They show the room and usable layout, not concept art. Phone QA is browser emulation, **not** physical-phone FPS measurement.

## Reproduce browser QA

Use `playwright.entry.config.ts` with a Node/mock server and an isolated local test DB, never a live user's wallet or saved world. Default configuration creates its own temporary DB/server.

```sh
CTRL_TEST_CHROMIUM=/absolute/path/to/chromium ./node_modules/.bin/playwright test --config playwright.entry.config.ts --timeout=180000
```

For an already-running **isolated QA server** only, `CTRL_TEST_REUSE_SERVER=1 CTRL_TEST_ORIGIN=http://127.0.0.1:3168` allows reuse. The server must have `CTRL_MODE=mock`, a test DB and matching `APP_ORIGIN`; do not reuse a production instance for signed-wallet fixtures.

Low-memory WSL cold parallel compilation/test attempts initially timed out. The warmed reruns above passed; allow compilation headroom rather than interpreting development-build timings as gameplay performance.

Captures (ignored test artifacts):
- `test-results/habitat-entry/habitat-entry-Common-Groun-98970-t-creating-a-guest-identity-entry-desktop/common-ground-lobby.png`
- `test-results/habitat-entry/habitat-entry-Common-Groun-98970-t-creating-a-guest-identity-entry-mobile/common-ground-lobby.png`

## Still separate / not claimed

- Holder policy, balance threshold and authoritative routing into Public World need a deliberate integration pass. Existing signed-wallet Habitat authorization is unchanged; the lobby itself is public.
- Willow Common remains technically separate from Habitat shared state, saved profiles and authoritative multiplayer. NPCs are not other online users.
- This pass does not claim a production Next/Worker build, remote deployment, physical mobile benchmark or resolution of an unrelated Willow Common startup report. The previous tunnel URL should not be assumed current.
