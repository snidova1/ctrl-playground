# Habitat backend contract: integrated implementation

This branch completes the server routes specified in docs/TASK_OWNERSHIP.md, including independent SEC-01 and SEC-02 hardening.

## Delivered surface

- Verified wallet identity is mandatory for personal Habitat APIs; guest plaza access stays separate.
- Profile GET/POST creates one durable home per wallet, supports deterministic tint randomization and server-resolved curated VRM character loadouts.
- GET worlds and world detail/permissions list only owner, members, and public realms. Private worlds are hidden from outsiders.
- Owner/editor/visitor roles: only owner manages membership, recipient must be wallet-onboarded; editors can change objects but cannot manage roles.
- Revision-aware full save plus PUT/POST/PATCH/DELETE object endpoints, strict layout schema, reviewed asset IDs, atomic compare-and-swap updates.
- Sessioned multiplayer join/presence/leave with monotonically increasing sequence, 15s expiry, movement bounds, and stale-connection rejection. Legacy visit/pose remains as a distinct session mode.
- Asset resolution for reviewed Kenney 991 and seven built-in primitives, no caller-supplied URL interpolation.
- JSON request buffering limited to 80,000 UTF-8 bytes including chunked bodies.

## Compatibility and safety

State responses include per-wallet presenceSession, WorldPermissions, server-derived avatar loadouts, and the existing WorldState fields. This is offchain world creation; it does NOT mint a key or move CTRL. There is no claim of live smart-contract deployment, production load tests, VRM browser validation, physical collider correctness or GPU mobile certification.

## Integration

This is a **consolidated integration branch** that includes PR #8 wallet security, copies PR #6 asset resolver, copies PR #9 streaming reader and adds the remaining server routes. It supersedes merging these patches separately once tests/review pass. Their PRs remain separate audit records.

Branch originates at fix/habitat-wallet-boundary and targets work/integration. Do not force push to Astra's active work or auto-deploy. Astra should inspect and reconcile newer uncommitted Work changes before merging. GPT-6 retains ownership of the World Builder, Three.js and VRM UI.

Run new tests in tests/unit/habitat-contract.test.ts plus copied wallet, asset and body-budget regression suites, existing pnpm test, lint, TS ES2020 and Next build. ES2020 is applied transiently in CI until the GPT-6 tsconfig fix lands.

Legacy members migration drizzle/0004_habitat_permissions.sql is already owned by Astra and required by this API. No new migration is added.