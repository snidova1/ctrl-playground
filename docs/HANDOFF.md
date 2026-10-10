# CTRL integration handoff — 2026-10-10

Verified runtime/source checkpoint: `1e44fa79bae6f555d0c0e29c7f6307e8bf0cf50d`, PR https://github.com/snidova1/ctrl-playground/pull/13 on `work/master-integration`. This handoff-only commit follows without runtime changes. Main stays `cbe941bd369424f00c70fdd9c8d1a85f1e76a717`; newer local work149bcd6 and worker ancestry retained. PR11 incorporates PR6/8/9, not reapplied. Latest PR1–12 heads were rechecked unchanged.

Presence hardening checkpoint `5454c84dbac3001e6cb61c842cf5a46833b3cb15`: final review corrected failed-join generation handling before publication. A join synchronously advances generation, so sync recaptures its own attempt's epoch before awaiting it; independent later leave/join still invalidates it. Superseded joins throw rather than returning stale state for callers to adopt. `1e44fa7` only increases the whole-journey CI budget after the real two-wallet flow reached teardown at the old four-minute ceiling; all individual assertions remain bounded.

## Implemented

- Signed-wallet durable identity/profile/one home, persisted Victoria/Fumiriya colorways, owner/editor/visitor ACL, private-world concealment, object CRUD/save revision CAS, 120-object/catalog allowlist and80KB streaming body budget.
- Native Habitat/VRM canvas, builder desktop/mobile hit areas, shared homepage/advanced Undo/Redo6200b5f, real pointer transforms/duplicate/delete/save/reload; guest Common Ground remains isolated. No forced clicks, skipped assertions or feature/auth route mocks.
- Sessioned join/presence/leave, increasing sequences, expiration/reconnect/supersession and resolved avatar loadouts. c113617 blocks expired-session legacy downgrade. Follow-up clears private scene/permissions on403/404, identity on401, and closes active editing when roles are revoked.
- Owner member UIeb7d1a1: invite/update visitor/editor, reload persisted membership, revoke; settings use server canManage. Follow-up settings form captures its initial revision, surfaces409 rather than overwriting another tab, and refreshes server state while preserving unsaved input for explicit close/reopen recovery.
- Owner-bound keys4c22a97: domain+wallet-derived ID, mined squatting/copy rejection, one locked free owner key per wallet, exact CTRL curve/3% fee/reserve. Habitat key API17f370c resolves UUID owner from trusted signed-wallet DB, enforces owner/private ACL and verifies canonical confirmed receipts; fail-closed disabled deployment config, never sends/signs transactions or grants offchain ACL from keys.

## Actual verification / status

Local after hardening: frozen install passed with unchanged lockfile; unit/API/security/migration **165/165,29files**, typecheck/lint, Next+Vinext production builds PASS. Integrity **991GLB/991WebP**, QA/research **32/32** PASS. Four localhost keys gates PASS:12groups386successful tx63mined reverts plus HTTP service,28trade economics and CLI deploy/read-only verification. No public RPC/credentials/transactions.

Exact runtime-head CI is green: Master https://github.com/snidova1/ctrl-playground/actions/runs/38063863739, Builder https://github.com/snidova1/ctrl-playground/actions/runs/38063863733, Security https://github.com/snidova1/ctrl-playground/actions/runs/38063863983, Keys https://github.com/snidova1/ctrl-playground/actions/runs/38063863745, Hooks https://github.com/snidova1/ctrl-playground/actions/runs/38063863799, Asset Integrity https://github.com/snidova1/ctrl-playground/actions/runs/38063863758, Creative Review https://github.com/snidova1/ctrl-playground/actions/runs/38063863795 and Integration Preflight https://github.com/snidova1/ctrl-playground/actions/runs/38063863756. Master and Builder independently passed all **10/10** real desktop/mobile Playwright journeys.

Browser suite **10 journeys** includes real UI grant/reload/revoke, stale owner settings409, active public/private editor revocation, private scene invalidation, return home, logout401 and two-wallet reconnect. Full journey budgets account for two SwiftShader VRM canvases; bounded individual assertions remain. Runtime checkpoint is **READY FOR REVIEW**. Not physical-device/Safari/QR verification.

## Paths / migration / integration

Exact typed APIs/ownership: domain/habitat.ts and docs/TASK_OWNERSHIP.md. New API paths: GET /api/habitat/worlds/:id/keys; POST .../keys/prepare({}); POST .../keys/verify({txHash}). Changed key paths: server/keys/config.ts,server/habitat/service.ts,lib/runtime-env.d.ts,.env.example,tests/unit/habitat-keys.test.ts. Client: features/habitat/{app.tsx,api.ts,world-members.tsx,use-presence.ts,habitat.css}; tests/browser/world-editor.spec.ts; browser CI. Worker history/GPT-6 branch preserved.

Migration0004 rehearsed against actual0000–0003 on-disk fixtures, existing worlds/presence/missions/plaza retained, real CLI resume/foreign-key integrity/rollback verified. Evidence: docs/qa/migration-rehearsal.md. No manual live DB edits/destructive migration. Normal merge PR13 only after exact-head green gates and review; do not separately merge subsumed backend slices. QA/research reports remain independent of runtime.

## Publication / remaining limits / next task

Live public Site version20 at runtime checkpoint `1e44fa7`: https://ctrl-public-machine.raisecompanyro.chatgpt.site, deployment `appgdep_6aca5f2095808191b4600bb39b0cc34c` succeeded. Earlier saved versions are obsolete. Main and financial deployment remain separate.

Keys disabled/undeployed; claim/trade UI remains unfinished and no public deployment is authorized. Reown public project configured; physical-phone QR pairing unverified. Colorways are not fitted modular costumes/original CTRL designs; PR10 sources are not automatically licensed/ingested. Courtyard remote avatars remain legacy, Habitat wallets use persisted VRM metadata. Mission/Orbio/archive/receipt regressions pass; no paid calls. Next concrete task after review/merge: implement unsigned key transaction UI only against an approved local setup, never public transactions without approval.
