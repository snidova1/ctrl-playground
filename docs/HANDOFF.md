# CTRL integration handoff — 2026-10-10

Implementation checkpoint: `41b9d6134a9159896792cebcce74b057f86bcde5`, `work/master-integration`; draft PR https://github.com/snidova1/ctrl-playground/pull/13. Main unchanged at `cbe941bd369424f00c70fdd9c8d1a85f1e76a717`. Unfinished local work preserved in `149bcd6`; separate worker/merge ancestry retained. PR11 includes PR6/8/9, not reapplied.

## Implemented and tested

- Signed-wallet-only durable profiles/homes; persisted Victoria/Fumiriya and curated colorways; owner/editor/visitor ACL, private-world concealment, object CRUD/save with revision CAS, catalog allowlist and streaming 80KB body budget.
- Native Habitat builder: masthead/mobile hit areas repaired; real pointer transforms, duplicate/delete, Undo/Redo, Save & Play and reload. No forced clicks, skipped assertions or backend route mocks.
- Sequenced join/presence/leave, reconnect/expiration/supersession and avatar metadata. Expired modern sessions cannot downgrade to legacy pose (`c113617`).
- Owner-bound keys (`4c22a97`): Solidity ID = packed domain 'CTRL_WORLD_V1' + owner wallet hash. Mined attacker copies revert. Resolve UUID owner from trusted signed-wallet DB record, separate from member/trader wallet.
- Migration0004: existing on-disk worlds/presence/missions/plaza preserved; actual CLI resume, constraints and rollback verified. No live database manually changed.
- `17f370c`: Habitat key read/prepare/verify routes resolve UUID owners from signed-wallet database records, enforce private-world ACL/owner-only claims, strict body budgets and fail-closed deployment settings. Five real API tests pass, including isolated localhost EVM deployment/confirmed receipt; no public RPC/signers/transactions.
- `6200b5f`: homepage Undo/Redo shares the advanced editor's history-state handlers. Real pointer save/reload regressions on `/` passed desktop/mobile CI at `41b9d61`.

## Actual local gates

Frozen install PASS; `pnpm test` **165/165, 29 files**; typecheck/lint PASS, zero lint warnings; Next and Vinext production builds PASS for backend key API checkpoint. Integrity **991GLB/991WebP**, QA/research **32/32** PASS. Keys: **12 economic groups, 386 successful local transactions, 63 mined reverts**, service + PR7 economic/CLI gates PASS. Compiled-production Playwright desktop/mobile **6/6** PASS at `805abe1`, real signed test wallets/SQLite, 2.0m. New homepage regressions expand the CI suite to 8 journeys; do not infer their result from the prior 6. Not physical-device/Safari or public financial testing.

Old head `05840a7`: Builder https://github.com/snidova1/ctrl-playground/actions/runs/38058049234 and master https://github.com/snidova1/ctrl-playground/actions/runs/38058049188 failed the 90s whole-test timeout in two-wallet VRM journeys (4/6 passed). Downloaded traces show mobile completed revocation before context-disposal timeout; desktop timed out after re-entry. `805abe1` budgets that journey at 180s, preserves all assertion deadlines, and uses compiled production in both CI gates. Require current-head checks on PR13; not READY FOR MERGE while pending. Never force clicks, skip assertions or accept obsolete-head checks.

`41b9d61` Builder https://github.com/snidova1/ctrl-playground/actions/runs/38059466918: **7/8 PASS**, mobile re-entry failed `tests/browser/world-editor.spec.ts:196` at the default 5s visibility deadline. Artifact11673255817 shows restored `/api/habitat/state` HTTP200 and Build button in the final DOM; no auth bypass. Follow-up uses the existing reload's bounded 20s readiness budget and adds HTTP200, wallet and own-home identity assertions. Six other CI workflows passed; master gates through both production builds, assets and local keys passed, browser pending. Require the follow-up exact-head browser results; keep PR draft and live Site16 until verified. Saved Site17 is not published.

## Interfaces and changed paths

Exact schemas/APIs: `domain/habitat.ts`, `docs/TASK_OWNERSHIP.md`. New paths: `GET /api/habitat/worlds/:id/keys`, `POST .../keys/prepare` (`{}`), `POST .../keys/verify` (`{txHash}`). Changed: `server/keys/config.ts`, `server/habitat/service.ts`, `lib/runtime-env.d.ts`, `.env.example`, `tests/unit/habitat-keys.test.ts`; browser CI/test and `features/habitat/app.tsx`. Prior core/client paths remain unchanged in ownership.

## Publication and unfinished work

Live Site version16 at `05840a7`: https://ctrl-public-machine.raisecompanyro.chatgpt.site (published 21:00 WIB Oct10; user confirmed it opens). Preserve Site/audience. Alpha publication is not main merge or onchain approval. Reown configured as public build/runtime setting; real-phone QR pairing unverified. Victoria/Fumiriya are not original CTRL designs or modular costume meshes; latest visual-choice approval was not independently recovered. Courtyard remote visitors still use legacy avatars; Habitat remote wallets use persisted VRM metadata.

Keys remain undeployed: `CTRL_KEYS_ENABLED` defaults false; prepare/verify fail 503, reads report not-deployed. No receipt grants offchain admin/member ACL. Claim/buy/sell UI and trade API remain unfinished; do not enable public deployment without approval. PR10 sources not automatically ingested. Mission/Orbio/archive/receipt regressions pass; no paid calls or public-chain transactions. Next: exercise the new homepage regressions/current-head CI; repair failures, then normally merge PR13 only after green gates/approval. Follow with owner-managed member UI and key transaction UI, never public transactions. No force push, destructive migration, or GPT-6 branch overwrite.
