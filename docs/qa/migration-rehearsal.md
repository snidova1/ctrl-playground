# Existing-state Habitat migration rehearsal

> Parent follow-up: `c113617` fixes the expiry downgrade reported below and adds a fourth test invoking the actual migration CLI on an existing fixture, then safely resuming. Runner validates foreign keys/integrity before commits. Latest integrated result 160/160, including all four migration tests and active expiry regression. Earlier 31-pass/1-fail evidence records the discovered defect, not current status.

Date: 2026-10-10. Branch: `work/master-integration`. This is a local, on-disk SQLite rehearsal using the checked-in SQL, not a Cloudflare D1 deployment or a production database backup. Server, migration, UI, Solidity and parent-owned contract-test files were not edited by this work.

## Reproduce

```sh
pnpm exec vitest run tests/unit/habitat-migration.test.ts
```

The fixture deliberately does not use the already-upgraded database from `tests/setup.ts`. Each test creates its own temporary SQLite file, enables foreign keys, applies actual `0000_fair_susan_delgado.sql`, `0001_nifty_iron_fist.sql`, `0002_legal_madame_masque.sql` and `0003_personal_worlds.sql` in order, seeds existing data, closes the connection, and reopens the file before applying `0004_habitat_permissions.sql` inside `BEGIN IMMEDIATE` / `COMMIT`. The migration ledger is written in that same transaction. The rehearsal wrapper additionally requires a clean `PRAGMA foreign_key_check` before committing; this is a verification gate, not a claim that the deployment runner implements that check.

## Evidence and assertions

| Gate | Evidence |
| --- | --- |
| Existing durable data | Two users, one wallet session, one completed mission, one mission-generated world, one compute reservation; two Habitat profiles/worlds/presence rows and a saved lamp layout/state; existing plaza guest/player/object/action |
| Preservation | Snapshot every pre-existing table and column; compare all original row values after upgrade and a second close/reopen, not just row counts. Includes names, wallet/session identity, private/public visibility, revisions 9/3, JSON layouts/motions, coordinates, timestamps, lamp active state and plaza data |
| Migration ledger | Exactly the four baseline migration names plus 0004 after successful commit |
| Presence columns | `session_id TEXT NOT NULL DEFAULT ''`, `sequence INTEGER NOT NULL DEFAULT 0`; both existing rows receive empty legacy session and sequence zero, with original fields unchanged |
| Member table | `world_id`, `profile_id`, `role`, `created_at`; composite primary key, profile/world index and both foreign keys with `ON DELETE CASCADE` |
| Constraints | Real editor insertion succeeds; duplicate membership, missing world/profile, and invalid `owner` role fail. Profile/world deletion probes remove corresponding memberships; original world-owner FK still rejects a deleted profile |
| SQLite validation | `PRAGMA foreign_keys=1`, empty `foreign_key_check` before/after, `integrity_check='ok'` after upgrade and constraint probes |
| Recovery | Inject failure after 0004 DDL but before ledger/commit; prove all original table/schema/row snapshots remain identical, members table and both new columns are absent, then successfully retry 0004 |
| Invalid legacy DB | Deliberately seed an orphan with enforcement disabled, re-enable it, detect the violation and prove the validation-gated 0004 attempt rolls back its schema/ledger without hiding or deleting the orphan |

All fixture connections are closed and only freshly-created temporary rehearsal directories are cleaned up. No existing user database is migrated or deleted.

## Owned security regression run

```sh
pnpm exec vitest run \
  tests/unit/security/auth-adversarial.test.ts \
  tests/unit/security/habitat-adversarial.test.ts \
  tests/unit/security/habitat-input-adversarial.test.ts \
  tests/unit/security/habitat-presence-adversarial.test.ts \
  tests/unit/security/missions-adversarial.test.ts \
  tests/unit/security/plaza-presence-adversarial.test.ts \
  tests/unit/habitat-migration.test.ts
```

Latest executed result: **31 passed, 1 failed (32 tests, 7 files)**, duration 7.75 seconds. All three migration tests pass. Scoped ESLint on all added/modified test and fixture files and `pnpm typecheck` pass. There are no XFAIL, skipped tests, auth mocks, direct wallet-user inserts or directly minted wallet sessions in the updated adversarial fixtures. Wallet fixtures use viem EOA signatures over API-issued nonces; expiry tests only age the isolated fixture's nonce/session/presence rows. The existing demo-mission tests remain intentionally demo-only; courtyard tests remain guest-only. `keys-economic-adversarial.test.ts` is excluded from this owned run.

Coverage includes explicit guest 401 for durable profile/state/write endpoints with unchanged Habitat row counts and successful courtyard state/pose/place/remove; real-wallet one-home persistence; private 404 concealment and public cross-wallet 403 denial; owner-managed editor/visitor ACL, downgrade and private/public revocation; concurrent revision winner and stale save/CRUD/settings; approved local asset resolution and script/remote/duplicate/over-cap input rejection; authenticated oversized stream cancellation without absent/lying Content-Length bypass; exact 80,000-byte acceptance; auth nonce concurrency/replay, signer impersonation, modified/expired challenge and expired/revoked cookie denial; presence contention/replay/session impersonation/rejoin/stale leave and explicit legacy compatibility.

Private-world save denial now expects **404**, not the former 409: an unauthorized caller must not learn that a private world exists or its revision. Public non-editor save remains 403; an authorized stale revision remains 409.

## Reported parent-owned server bug

Active failing regression: `security: signed-wallet presence replay and impersonation > expires sequenced sessions without implicit legacy rejoin`, in `tests/unit/security/habitat-presence-adversarial.test.ts`.

Reproduction: sign a real wallet, create home, call modern `join`, age only that profile's `habitat_presence.seen_at` by 20 seconds, confirm sequenced `presence` rejects with 409, then submit sessionless `pose` for the same home. Actual result: **200**, desired result: **409**, preserving the expired row until an explicit rejoin/visit. In `server/habitat/service.ts`, the implicit legacy-join branch runs before the nonempty `old.session_id` rejection and replaces the expired modern row with `session_id=''`. This bypasses the modern-session guard after TTL expiry. The parent fix for active modern-session `pose` and stale `leave` passes the new tests; explicit `visit`/`pose` also passes independently. Do not fix by disabling wallet verification or accepting session replay. No server changes were made here; the failing assertion is intentionally active, not XFAIL.

## Remaining deployment gates

This proves SQLite compatibility with seeded existing state, not actual remote D1 behavior, browser integration, real multiplayer network timing, mobile performance, or onchain readiness. Before deployment: take a recoverable existing-D1 backup, rehearse the real runner against a non-production copy, compare source/target rows and migration ledger, validate foreign keys and integrity, and test owner/member/session behavior with migrated legacy presence. Do not infer a full integration pass from this scoped run.
