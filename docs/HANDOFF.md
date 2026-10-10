# CTRL integration handoff — 2026-10-10

Source checkpoint: `eb7d1a1e449daef4b8533bb66384081881e52f18`; follow-up hardening described below. Resulting SHA/current checks: PR https://github.com/snidova1/ctrl-playground/pull/13, `work/master-integration`. Main stays `cbe941bd369424f00c70fdd9c8d1a85f1e76a717`; newer local work149bcd6 and worker ancestry retained. PR11 incorporates PR6/8/9, not reapplied. Latest PR1–12 heads rechecked unchanged.

## Implemented

- Signed-wallet durable identity/profile/one home, persisted Victoria/Fumiriya colorways, owner/editor/visitor ACL, private-world concealment, object CRUD/save revision CAS, 120-object/catalog allowlist and80KB streaming body budget.
- Native Habitat/VRM canvas, builder desktop/mobile hit areas, shared homepage/advanced Undo/Redo6200b5f, real pointer transforms/duplicate/delete/save/reload; guest Common Ground remains isolated. No forced clicks, skipped assertions or feature/auth route mocks.
- Sessioned join/presence/leave, increasing sequences, expiration/reconnect/supersession and resolved avatar loadouts. c113617 blocks expired-session legacy downgrade. Follow-up clears private scene/permissions on403/404, identity on401, and closes active editing when roles are revoked.
- Owner member UIeb7d1a1: invite/update visitor/editor, reload persisted membership, revoke; settings use server canManage. Follow-up settings form captures its initial revision, surfaces409 rather than overwriting another tab, and refreshes server state while preserving unsaved input for explicit close/reopen recovery.
- Owner-bound keys4c22a97: domain+wallet-derived ID, mined squatting/copy rejection, one locked free owner key per wallet, exact CTRL curve/3% fee/reserve. Habitat key API17f370c resolves UUID owner from trusted signed-wallet DB, enforces owner/private ACL and verifies canonical confirmed receipts; fail-closed disabled deployment config, never sends/signs transactions or grants offchain ACL from keys.

## Actual verification / status

Local after hardening: frozen install previously passed with unchanged lockfile; unit/API/security/migration **165/165,29files**, typecheck/lint, Next+Vinext production builds PASS. Integrity **991GLB/991WebP**, QA/research **32/32** PASS. Four localhost keys gates PASS:12groups386successful tx63mined reverts plus HTTP service,28trade economics and CLI deploy/read-only verification. No public RPC/credentials/transactions.

Browser evidence: compiled production6/6 passed805abe1;41b9d61 Builder https://github.com/snidova1/ctrl-playground/actions/runs/38059466918 passed7/8, mobile re-entry exceeded5s despite restored HTTP200/DOM (artifact11673255817). fff0a41 uses existing20s reload readiness budget and adds wallet/home identity assertions. eb7d1a1 master https://github.com/snidova1/ctrl-playground/actions/runs/38061002058 and builder https://github.com/snidova1/ctrl-playground/actions/runs/38061002101 were still running when follow-up hardening was prepared; six independent workflows passed. Do not infer follow-up success from these older checks.

Follow-up browser suite **10 journeys** includes real UI grant/reload/revoke, stale owner settings409, active public/private editor revocation, private scene invalidation, return home, logout401 and two-wallet reconnect. Full journey budgets account for two SwiftShader VRM canvases (prior desktop2.8m); bounded individual assertions remain. **Not READY FOR MERGE until all exact-head gates pass.** Final CI evidence belongs on PR13. Not physical-device/Safari/QR verification.

## Paths / migration / integration

Exact typed APIs/ownership: domain/habitat.ts and docs/TASK_OWNERSHIP.md. New API paths: GET /api/habitat/worlds/:id/keys; POST .../keys/prepare({}); POST .../keys/verify({txHash}). Changed key paths: server/keys/config.ts,server/habitat/service.ts,lib/runtime-env.d.ts,.env.example,tests/unit/habitat-keys.test.ts. Client: features/habitat/{app.tsx,api.ts,world-members.tsx,use-presence.ts,habitat.css}; tests/browser/world-editor.spec.ts; browser CI. Worker history/GPT-6 branch preserved.

Migration0004 rehearsed against actual0000–0003 on-disk fixtures, existing worlds/presence/missions/plaza retained, real CLI resume/foreign-key integrity/rollback verified. Evidence: docs/qa/migration-rehearsal.md. No manual live DB edits/destructive migration. Normal merge PR13 only after exact-head green gates and review; do not separately merge subsumed backend slices. QA/research reports remain independent of runtime.

## Publication / remaining limits / next task

Live Site16 at05840a7: https://ctrl-public-machine.raisecompanyro.chatgpt.site, user confirmed opens. Saved Site18 matcheseb7d1a1 but is unpublished; obsolete after hardening, do not deploy it. Package and publish only verified follow-up using same Site/audience. Main and financial deployment remain separate.

Keys disabled/undeployed; claim/trade UI still unfinished and no public deployment authorized. Reown public project configured; physical-phone QR pairing unverified. Colorways are not fitted modular costumes/original CTRL designs; PR10 sources not automatically licensed/ingested. Courtyard remote avatars remain legacy, Habitat wallets use persisted VRM metadata. Mission/Orbio/archive/receipt regressions pass; no paid calls. Next concrete task: finish follow-up exact-head browser/master gates, repair any real failures, publish verified Site and make PR reviewable; then implement unsigned key transaction UI only against approved local setup, never public transactions without approval.
