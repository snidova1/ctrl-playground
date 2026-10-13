# CTRL rebuild functional checkpoint — PR #30

This is an implementation checkpoint, **not full-game completion**. Continue `feat/townies-gameplay-stylized-world` / PR #30; do not merge or deploy production. Baseline remote commit: `13022af187642fdbaca8876306c4c94ec958fa8e`. The canonical reference contract remains `docs/CTRL_REBUILD_REFERENCE_STACK.md`.

## Binding user correction

Persist activities, contributions, shared world changes, houses and social interactions. **Do not add XP, player levels, currency, token rewards or a new economy without explicit approval.** This checkpoint stores completed contribution counts and activity records only. No payment, contract, token or wallet-balance operation was added.

## Implemented code

- `drizzle/0006_town_life.sql`: additive persistence for jobs, contribution records, garden revisions, friend requests, invitations, accepted social actions and world-scoped conversation history. Existing home layouts, memberships, profiles and presence are preserved by the real migration rehearsal.
- `domain/town.ts`, `server/habitat/town-life.ts`: seven station activities with server elapsed time, fresh signed presence and position checks; exactly-once completion in a single D1/SQLite batch; active jobs survive reload/rejoin. Three shared beds support plant → another player waters → timed growth → guarded harvest/replant. Concurrent/stale revisions cannot duplicate harvests.
- Friends require recipient acceptance, persist across sessions, and never grant private-home access. Invitations target allowlisted districts or an accessible owned Habitat. High-five/dance proposals require nearby independent players and explicit recipient consent; the server chooses a shared animation start timestamp. Conversation history is stored per world and concealed by current Habitat ACLs.
- The legacy `town-activity` endpoint also records guarded persistent contributions. `TownSharedLife` renders saved growth and shared contribution improvements; these are sourced from server state, not simulated NPC work.
- `use-presence.ts`: suppress heartbeat-triggered joins while an explicit join is pending. This fixes the observed `This join was superseded by a newer connection` failure during a Habitat visit.
- `app.tsx`, `town-life-panel.tsx`: working activity controls, history, garden controls, nearby friend/social requests, accepted invitations and persisted appearance. Chat and wave also synchronize inside Habitat. Chat starts collapsed so it cannot cover the mobile Build button.
- `town-region-architecture.tsx`: original closed gables, roof textures, plinths, shutter/window frames, side windows, doors, steps, chimneys and flower boxes. Geometry is normalized to non-indexed attributes before batching; a real browser failure exposed incompatible box/extrude attributes and is now covered by executable geometry tests. Each district uses fewer than 20 material batches.
- Distant region meshes now mount/unmount with a distance margin. Camera collision includes all 44 district buildings and snaps after long district travel. Day/night light minima and water output color conversion address dark renders.
- `modular-wardrobe.tsx`: original optional hair/garment/accessory/footwear geometry attached to the approved VRM skeleton, strict appearance allowlists, creator preview, persisted identity and remote replication. Existing Victoria/Fumiriya exports remain the base avatars. These additions are **not** a finished set of new original character models or fitted skinned garment exports.
- Mobile Habitat navigation preserves Worlds and Character as reachable touch controls in a scrolling header. Actual browser traces exposed a hidden Worlds button blocking the independent-player home visit. Public World retains its compact navigation and working Visit habitats entry.
- World Builder browser fixtures now follow the actual root Common Ground entry and `Enter Habitat` and the native advanced-builder labels while preserving signed-wallet, persistence, revision-conflict, ACL and pointer/touch assertions. Browser output folders are separate to preserve evidence.

## Upstream source inspection and architectural choices

All sources were cloned and implementation files inspected, not just README files. No upstream code or game asset was imported in this checkpoint; adaptations are original CTRL implementations and existing bundled licensed assets.

| Source / inspected commit | Implementation examined | Decision |
| --- | --- | --- |
| Brayden/townies `6338e1d0` | `app/game/townWork.ts`, `db/sharedLife.ts`, `db/contributions.ts`, `server/towns/realtime.ts` | Apache-2.0. Adapt guarded activity transactions, shared gardening, contribution records and separated public/private state. Retain third-person camera; do not reproduce its economy. Its Durable Object socket infrastructure is not ported yet. |
| cortiz2894/stylized-components `1cece0a2` | `grassField/materials/bladeMaterial.ts`, `waterFloor/index.tsx` | MIT. Study instanced root-anchored grass, consistent normals and water/color output; avoid expensive full post-processing stack on mobile. |
| StarKnightt/summer-cycle `8b977baa` | `world/timeofday.ts`, `world/chunks.ts` | MIT. Use coherent lighting minima, region visibility and merged scene geometry; no scene assets copied. |
| craftzdog/ghibli-style-shader `8f140c56` | `src/GhibliShader.js`, dependency manifest | No explicit reuse license located. Conceptual study of discrete light response only; do not copy shader source. React/R3F/Three versions differ from CTRL. |
| mochiya-labs/three-liltoon `9669b22a` | `vrm/enableLilToonVRM.ts` | MIT. Loader enhancement is useful for lilToon-authored material extensions; retain existing MToon VRMs instead of replacing them with an incompatible second material pipeline. |
| dedekpo/stylized-scene `ec8fd6b3` | `materials/wind.ts`, `utils/path-sdf.ts` | MIT. Study shared gust field and path-edge masking. Its WebGPU/TSL renderer is not dropped into CTRL's mobile WebGL renderer. |
| norio/vrm-game-starter `b14c236f` | `character/FootIK.ts` | MIT. Study post-animation two-bone IK and terrain sampling; full foot IK remains an open integration task. |
| pmndrs/BVHEcctrl `d164d42c` | `src/BVHEcctrl.tsx` | MIT. Study fixed-step movement/capsule/ground sensors; do not install another competing controller until benchmarked. |
| hh-hang/three-player-controller `b8495630` | `systems/CameraSystem.ts` | MIT. Study camera collision and follow damping; keep one existing controller and extend shared building collision. |
| VerseEngine/three-avatar `f33eedd7` | `src/avatar.ts` | MIT. Study VRM-first avatar data, render layers and animation cadence; preserve CTRL's wallet/profile/appearance contract. |
| yomotsu/meshwalk `6850c996` | `core/World.ts`, `TPS/ThirdPersonCameraControls.ts` | Package declares MIT; separate license text was not located. Source study only. New Three/camera-controls peer versions differ; no overlapping physics runtime installed. |
| morluto/rea `ebaaa79c` / npm 6.4.0 | CLI dispatcher and existing owned-loopback observation workflow | MIT. Optional passive CDP inspection only. `CTRL_REA_BIN` lets the existing observation script use a reviewed local CLI install. Never inspect unauthorized protected runtimes. |

## Verification ledger at the functional checkpoint

- Final full unit/API run for code checkpoint `76b647d0dba3442ebce94705805a97ce353f62e8`: 212/212, 38 files. Latest targeted API/avatar/migration suites: 35/35.
- TypeScript, global lint and Next production build passed for code checkpoint `76b647d0dba3442ebce94705805a97ce353f62e8`.
- Existing catalog integrity: 991 GLBs, 991 WebPs, 13.10 MiB. No asset binaries or dependency lockfiles changed.
- Actual production WebGL full Public World suite: **10/10 passed** for code checkpoint `76b647d0`, including desktop/mobile walking, all six remote districts, two signed players chatting/waving, private-home grant/visit/revoke/return, persisted jobs/friends and consented paired dance, and modular creator save/reload. Test runtime 11.7 minutes on software WebGL.
- Builder iteration proved desktop transforms/duplicate/delete/undo/redo/save/reload and two-wallet ACL journeys. Homepage advanced editor regression passed 2/2 desktop/mobile after fixture label correction. Full rerun then exposed the hidden mobile Worlds control; responsive navigation is now fixed. Final complete rerun is required; do not present the preceding partial run as green.
- Final vinext/Cloudflare Worker production build passed for checkpoint `c4daa0f8`. No production publication occurred.
- REA 6.4.0 legitimately attached to the owned local browser and captured real desktop, mobile and high-quality screenshots. Optional detail traversal originally ran directly into café collision; the observation script now uses the working server-validated destination UI and asserts the actual Harbor coordinates. Rerun is required before claiming the complete REA observation succeeds.
- All screenshots are real application WebGL pixels. No image generation, static mockup, force-click, assertion reduction or skipped test was used.

## Exact continuation commands

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build:next
node scripts/qa/check-build-assets.mjs
CTRL_QA_PRODUCTION=1 pnpm exec playwright test --config playwright.public-world.config.ts
CTRL_TEST_PRODUCTION=1 pnpm exec playwright test --config playwright.editor.config.ts
pnpm build
```

For a preinstalled Chromium, set `CTRL_CHROMIUM_PATH` for Public World and `CTRL_TEST_CHROMIUM` for Builder. Owned-loopback REA observation: `CTRL_REA_BIN=/absolute/path/to/rea.mjs CTRL_CHROMIUM_PATH=/absolute/path/to/chromium node --import tsx scripts/qa/rea-town-observe.ts outputs/rea-rebuild --details`. Apply migration 0006 before deploying this code to any existing database.

## Major remaining scope — do not declare the definition of done met

1. Full Townies breadth: route-based delivery/maintenance jobs, workshop production/civic improvements, social gatherings beyond invitations/pair actions, wider cooperative task interactions and complete daily/seasonal activity loops. Current seven timed station jobs are a functional foundation.
2. Ground-level district art is still too sparse, especially Fernwood Park. Dense authored dressing, varied terrain, proper harbor water/pier collision and richer interiors/navigation need implementation and visual review. Brightness and detailed facades alone are not full-world polish.
3. Newly authored high-quality VRM exports, properly weighted modular garments/footwear, completed hairstyle fittings, calibrated social gesture poses and foot IK. Existing original VRoid bodies plus procedural overlays are not the requested complete avatar rebuild.
4. Load/performance validation and authoritative real-time architecture at larger player counts; the current integration still uses CTRL's sequenced polling rather than Townies's socket protocol. Physical iPhone/Android GPU/thermal/control verification remains unperformed.
5. Final combined CI on the exact pushed SHA and an approved staging/production publication path. Keep PR draft and production protected until browser evidence, remaining acceptance scope and approval are satisfied.
