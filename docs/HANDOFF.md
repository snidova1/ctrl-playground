# CTRL integration handoff — 2026-10-10

Implementation checkpoint: `3f836b4cb3ea306698890b8748cf5cdc59cfcb3e`, `work/master-integration`; draft PR https://github.com/snidova1/ctrl-playground/pull/13. Main unchanged at `cbe941bd369424f00c70fdd9c8d1a85f1e76a717`. Unfinished local work preserved in `149bcd6`; separate worker/merge ancestry retained. PR11 includes PR6/8/9, not reapplied.

## Implemented and tested

- Signed-wallet-only durable profiles/homes; persisted Victoria/Fumiriya and curated colorways; owner/editor/visitor ACL, private-world concealment, object CRUD/save with revision CAS, catalog allowlist and streaming 80KB body budget.
- Native Habitat builder: masthead/mobile hit areas repaired; real pointer transforms, duplicate/delete, Undo/Redo, Save & Play and reload. No forced clicks, skipped assertions or backend route mocks.
- Sequenced join/presence/leave, reconnect/expiration/supersession and avatar metadata. Expired modern sessions cannot downgrade to legacy pose (`c113617`).
- Owner-bound keys (`4c22a97`): Solidity ID = packed domain 'CTRL_WORLD_V1' + owner wallet hash. Mined attacker copies revert. Resolve UUID owner from trusted signed-wallet DB record, separate from member/trader wallet.
- Migration0004: existing on-disk worlds/presence/missions/plaza preserved; actual CLI resume, constraints and rollback verified. No live database manually changed.

## Actual local gates

Frozen install PASS; `pnpm test` **160/160, 28 files**; typecheck/lint PASS, zero warnings; Next and Vinext production builds PASS; integrity **991GLB/991WebP** PASS; QA/research **32/32** PASS. Keys: **12 economic groups, 386 successful local transactions, 63 mined reverts**, service + PR7 economic/CLI gates PASS. Playwright desktop/mobile **6/6** PASS, isolated real signed test wallets/SQLite. Not physical-device/Safari or public financial testing.

Checkpoint CI https://github.com/snidova1/ctrl-playground/actions/runs/38057450130 pending at handoff; require final PR-head checks. Not READY FOR MERGE while pending.

## Interfaces and changed paths

Exact schemas/APIs: `domain/habitat.ts`, `docs/TASK_OWNERSHIP.md`. Core: `server/habitat/`, wallet auth, `db/`, migration0004, local D1 adapter. Client: `features/habitat/`, editor CSS, VRM label portal, shell, wallet connector, framework configs. Tests: Habitat/security/migration/browser/keys; runners: keys/testnet CLI, migration CLI, master CI. Milestones: `d2c9d36` security, `c113617` session/migration fixes, `1ae3352` client integration, `3f836b4` production-server browser CI.

## Publication and unfinished work

User requested website publication to view/share characters on Oct10; preserve same public Site/audience. Alpha publication is not main merge or onchain approval. Reown configured as public build/runtime setting; real-phone QR pairing unverified. Current models Victoria/Fumiriya are not an original CTRL design or modular costume meshes; latest visual-choice approval was not independently recovered. Courtyard remote visitors still use legacy avatars; Habitat remote wallets use persisted VRM metadata.

Keys remain undeployed; claim/buy/sell UI and trusted deployment config unfinished. PR10 sources not automatically ingested. Mission/Orbio/archive/receipt regressions pass; no paid calls or public-chain transactions made. Next: inspect final current-head CI, repair failures, merge PR13 normally only after gates/approval; finish key transaction UI without public transactions. No force push, destructive migration, or GPT-6 branch overwrite.
