# CTRL integration handoff — 2026-10-11

Runtime checkpoint: `27b6daf6c0ca139640d7d8ddffc3ab540662a67e` on `work/visual-integration`, based on PR #13 (`work/master-integration`). `main` remains unchanged at `cbe941bd369424f00c70fdd9c8d1a85f1e76a717`. Reviewed PRs #15–#19 are integrated without rewriting worker or GPT-6 history.

## Implemented and exercised

- Verified wallet onboarding now randomizes a rotatable Victoria/Fumiriya VRoid appearance; guests remain restricted to Common Ground.
- `CharacterAppearance` v1 persists allowlisted outfit, hair, eye, and skin palettes through `POST /api/habitat/profile`, reloads between sessions, and is replicated to world visitors. The Character panel edits the same server-backed profile.
- Migration `drizzle/0005_character_appearance.sql` adds nullable-safe appearance JSON while preserving existing profiles, worlds, objects, missions, and presence data.
- Legacy non-VRoid MIO/Maker/Worker assets, renderers, preview pages, and build scripts were removed. Release tests reject their reintroduction.
- The furnished starter garden, legacy empty-home recovery, desktop/mobile builder, pointer/touch transforms, Duplicate/Delete, Undo/Redo, Save & Play, reload, ACL changes, and multiplayer leave/reconnect paths are exercised end to end.
- Existing signed-wallet boundary, private-world concealment, owner/editor/visitor permissions, asset allowlist, 80 KB request budget, 120-object limit, optimistic revisions, sequenced presence, missions, Orbio, archive, receipts, and disabled/undeployed key service remain intact.
- PR #14 was reviewed but not integrated: its ETH product list is empty, it has no approved entitlement/payment contract, and its server patch targets an obsolete backend. Holder-tier presentation can be reconsidered after the economy interface is real.

## Actual verification

- `pnpm install --frozen-lockfile`: PASS.
- `pnpm test`: **177/177 tests, 33 files PASS**.
- `pnpm typecheck`, `pnpm lint`, `pnpm build:next`, `pnpm build`: PASS. Builds retain only the known dependency/chunk-size warnings.
- Asset integrity: **10/10 PASS**, including the 991 GLB/991 WebP catalog gate.
- Local World Keys contract and service checks: PASS, including front-run/copy rejection, owner/trader separation, receipt validation, reserve redemption, and fail-closed public configuration. No public RPC, credentials, deployment, or transaction was used.
- Playwright visual journeys: **2/2 PASS** on desktop/mobile, including material change and persistence evidence.
- Playwright Builder journeys: **12/12 PASS in one run** using real pointer/touch input and isolated test-wallet authentication. Coverage includes guest isolation, wallet onboarding, transforms, Duplicate/Delete, Undo/Redo, save/reload, two-wallet visits, ACL grant/revoke, private-scene invalidation, leave, and reconnect. No forced clicks or skipped assertions.

## Integration paths and limits

- Contract: `domain/habitat.ts`; ownership/API summary: `docs/TASK_OWNERSHIP.md`.
- Appearance runtime: `features/habitat/character-catalog.ts`, `features/habitat/character-appearance.ts`, `features/habitat/vrm-avatar.tsx`, `features/habitat/app.tsx`, `features/habitat/stage.tsx`, `server/habitat/service.ts`.
- Persistence: `drizzle/0005_character_appearance.sql`; API: `POST /api/habitat/profile`, existing world/player responses, and existing join/presence routes.
- Regression coverage: `tests/unit`, `tests/release`, `tests/browser/world-editor.spec.ts`, and the visual Playwright suite.
- Current customization is approved VRoid material variation, not fitted modular garment meshes. New character meshes still require explicit license, VRM rig compatibility, optimization, and mobile testing.
- No merge to `main`, public key deployment, mainnet action, or paid transaction has been performed.

Next concrete task after review is to ingest additional approved fitted VRoid exports behind the existing stable appearance IDs, then extend the same persistence contract without accepting remote model URLs.
