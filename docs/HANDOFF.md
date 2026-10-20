# Product source of truth — owner clarification, 2026-10-20

This clarification supersedes older product framing below; the dated integration results remain historical evidence, not a new release claim.

- **Willow Common is one of the primary Public World areas**, not a disposable study or a side demo. Its current route name does not reduce its intended product importance.
- **Common Ground is a small non-holder waiting-room/landing**, not the core plaza or the product. The older courtyard workshop is existing implementation, not the intended product hierarchy.
- **Product direction is not shipped integration.** Willow Common currently runs as a technically isolated `/world-preview` implementation in `features/worldgacha/`. Signed-wallet authentication, holder authorization, shared profiles, saved-world persistence and authoritative multiplayer are not automatically integrated by this correction. Implement and verify those paths before claiming Public World access is complete; NPCs must never count as real players.
- Preserve existing server-side wallet verification, holder checks, private-world concealment, ACLs, request/object budgets and asset allowlists. Do not authorize from demo balances or weaken backend boundaries to make entry appear connected. Preserve asset licenses/provenance; VRoid assets are not CC0.

Common Ground now mounts a compact waiting room at `/courtyard` and before Habitat sign-in; the legacy workshop is not mounted on that route. See `docs/common-ground-lobby-pass.md` for current entry behavior, passing checks and remaining access-integration limits.

Current Willow Common implementation and guardrails: `docs/HANDOFF_WILLOW_COMMON_2026-10-20.md` and `docs/worldgacha-public-world.md`. Older Common Ground, guest-entry and publication descriptions below describe their dated checkpoints, not the corrected product hierarchy or proof of current Public World integration.

---

# CTRL integration handoff — 2026-10-11

Runtime checkpoint: `27b6daf6c0ca139640d7d8ddffc3ab540662a67e` on `work/visual-integration`, based on PR #13 (`work/master-integration`). `main` remains unchanged at `cbe941bd369424f00c70fdd9c8d1a85f1e76a717`. Reviewed PRs #15–#19 are integrated without rewriting worker or GPT-6 history.

## Wallet and Habitat entry repair

The production v21 client had an empty build-time WalletConnect project ID even though the Site runtime had a valid public ID. It displayed `INJECTED` instead of a clear wallet action, had no `/habitat` route, and exposed unavailable Keys navigation. Closing panels could strand unsigned visitors without the entry panel.

- `/api/network` now returns only the validated public pairing ID from runtime bindings. No server credentials are serialized. Wallet configs are cached by network and project ID.
- Explicit Connect wallet and QR/mobile actions replace provider jargon. No-extension browsers receive actionable wallet-app guidance. Signing in requires no chain switch or gas; token operations retain their network checks.
- `/`, `/habitat`, and `/worlds/editor` share the working Habitat entry. Escape and Settings return to sign-in or unfinished character setup. Returning wallets restore their existing world, including an explicit presence reconnect after session expiry without a reload.
- Removed the undeployed Keys panel and unsigned World/Character navigation. Trimmed implementation copy and heavy HUD styling; entry displays the real starter-garden template as an inert preview. No public-world or wallet authorization boundary was weakened.
- Added desktop/mobile entry regressions using real local signatures and the real nonce/session API, including an EVM wallet on another network and expiration/re-sign-in. Existing builder and visual suites share the same isolated signer.
- Entry browser regressions: **8/8 PASS** on desktop/mobile, including session expiry and real re-sign-in without reload.
- Production Next and Worker builds, typecheck, lint, 178 unit/API tests, 991 GLB/991 WebP checks and 32 QA checks passed. Worker preview resolved the runtime pairing ID and displayed a real WalletConnect QR modal; screenshots reviewed at 1440×900, 820×1180, 390×844 and 360×780. Physical-device wallet pairing remains unverified.

The latest tested source, browser results and publication version are recorded in PR #13. The publication section below is the prior v21 checkpoint, not a claim that these fixes are already live.

## Prior checkpoint: implemented and exercised

- Verified wallet onboarding now randomizes a rotatable Victoria/Fumiriya VRoid appearance; guests remain restricted to Common Ground.
- `CharacterAppearance` v1 persists allowlisted outfit, hair, eye, and skin palettes through `POST /api/habitat/profile`, reloads between sessions, and is replicated to world visitors. The Character panel edits the same server-backed profile.
- Migration `drizzle/0005_character_appearance.sql` adds nullable-safe appearance JSON while preserving existing profiles, worlds, objects, missions, and presence data.
- Legacy non-VRoid MIO/Maker/Worker assets, renderers, preview pages, and build scripts were removed. Release tests reject their reintroduction.
- The furnished starter garden, legacy empty-home recovery, desktop/mobile builder, pointer/touch transforms, Duplicate/Delete, Undo/Redo, Save & Play, reload, ACL changes, and multiplayer leave/reconnect paths are exercised end to end.
- Existing signed-wallet boundary, private-world concealment, owner/editor/visitor permissions, asset allowlist, 80 KB request budget, 120-object limit, optimistic revisions, sequenced presence, missions, Orbio, archive, receipts, and disabled/undeployed key service remain intact.
- PR #14 was reviewed but not integrated: its ETH product list is empty, it has no approved entitlement/payment contract, and its server patch targets an obsolete backend. Holder-tier presentation can be reconsidered after the economy interface is real.

## Prior checkpoint verification

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

## Prior publication

Public Site version **21** deploys source `7ef0dcb89ccc52935f4aa5941559cb671d4d553b`: https://ctrl-public-machine.raisecompanyro.chatgpt.site (deployment `appgdep_6acadb491cbc81919970ae100124c430`, status `succeeded`). A production smoke check confirmed the app shell, wallet state, onboarding copy, panels, and Common Ground entry render. The managed cloud browser exposes no WebGL device (`GL_RENDERER=Disabled`), so its canvas correctly showed the render fallback; desktop/mobile WebGL behavior is covered by the passing Playwright suites above.

Next concrete task after review is to ingest additional approved fitted VRoid exports behind the existing stable appearance IDs, then extend the same persistence contract without accepting remote model URLs.
