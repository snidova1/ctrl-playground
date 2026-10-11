# CTRL security adversarial regression report (independent worker)

> Integration addendum (2026-10-10, PR13): historical isolated-main audit below. Integrated source replaces guest XFAIL with positive HTTP401 and real EOA signatures. SEC-01/streamed-budget SEC-02 are fixed; combined-backend ACL/revision/presence tests pass. Expired-session downgrade was found then fixed in `c113617`. Full local run 160/160; require current-head CI. See HANDOFF and migration rehearsal, not the historical results below, for current evidence.

Date: 2026-10-10 | Repository: `snidova1/ctrl-playground` | Branch: `qa/security-adversarial` | Base: `main@cbe941bd369424f00c70fdd9c8d1a85f1e76a717`

## Scope and provenance

Reviewed `docs/HANDOFF.md`, `docs/security.md`, `docs/TASK_OWNERSHIP.md` (integration branch), live API source at `server/api.ts`, `server/wallet/auth.ts`, `server/habitat/service.ts`, `server/plaza/service.ts`, `server/missions/service.ts`, `server/policy/mission.ts`, `features/habitat/types.ts`, and `contracts/keys/CTRLWorldKeys.sol`. Branch heads at snapshot: `main@cbe941b`, `work/integration@1137948`, `gpt6/world-builder@2340675`, `qa/asset-integrity-budget@cbe941b`. The worker integration branch has `domain/habitat.ts` and `drizzle/0004_habitat_permissions.sql`, but did **not** yet include the described permission and presence endpoints in `server/habitat/service.ts` when compared.

All changes are limited to new security tests, this report and a targeted GitHub Actions workflow. No production code, DB migration, contract, live provider, or real network was changed or invoked. The local contract test runs a disposable Ganache instance.

## Findings ranked by severity

### SEC-01 | MEDIUM | Guest plaza cookie crosses wallet-only habitat creation boundary
- **Evidence in code:** `server/habitat/service.ts` `principal()` accepts `ctrl_plaza` for any valid `plaza_visitors` row and returns `guest-<id>` as a habitat principal, without requiring a cryptographic wallet identity. `POST /api/habitat/profile` creates `habitat_profiles` and `habitat_worlds` using that principal. The signed-wallet requirement in `docs/TASK_OWNERSHIP.md` contradicts this flow.
- **Impact:** A non-wallet guest can create a durable habitat world by acquiring a low-friction anonymous plaza cookie. This bypasses wallet-gated onboarding and permits persistent world allocation outside the intended key-ownership lifecycle. No theft of another wallet's world or tokens has been proven.
- **Deterministic reproduction:** `POST /api/plaza/join` with a valid guest name, capture `Set-Cookie: ctrl_plaza=...`; then `POST /api/habitat/profile` using that cookie with `{ "name":"Unauthorized Guest", "character":"female", "variant":"original" }`. Source control flow reaches `habitat_worlds` insertion. `tests/unit/security/habitat-adversarial.test.ts` includes this as `it.fails` documenting the known violated 401 expectation, so future remediation requires converting it to a normal assertion.
- **State:** **Confirmed in isolated CI**, including an independent positive reproduction that asserts HTTP 200 and the resulting `guest-` owner ID. The separate 401 security expectation is XFAIL, not a secure pass. [Proof run 38040181998](https://github.com/snidova1/ctrl-playground/actions/runs/38040181998).
- **Owner for remediation:** Backend/habitat worker. Require a wallet-authenticated identity for owner profile/world creation and privileged updates. Define separately whether anonymous visitors may join public realms; do not authorize durable creation from guest session alone.

### SEC-02 | LOW (hardening) | Body size evaluated only after reading full habitat request
- **Evidence:** `server/habitat/service.ts` `body()` calls `await r.text()` before enforcing the 80,000-character limit and does not first reject oversized `Content-Length`.
- **Impact:** A very large POST body consumes memory before validation; actual operational exploitability depends on upstream reverse-proxy limits and worker runtime caps.
- **State:** Static observation, production/resource-exhaustion severity not proven. Automated test verifies a finite >80KB payload returns HTTP 413, **not** worst-case resource behavior.
- **Owner for remediation:** Backend worker if upstream input caps are insufficient.

## Implemented security regression tests

| Suite | Adversarial assertions |
| --- | --- |
| `auth-adversarial.test.ts` | 4 concurrent uses of one signed nonce: exactly one succeeds; replay; wrong signer; wrong address; fake/revoked cookie; invalid origin, missing origin, non-JSON content type |
| `habitat-adversarial.test.ts` | Known guest-origin bypass recorded as XFAIL; private-world visit exclusion; cross-wallet save/settings protection; invalid/remote/script object input; 120-object ceiling; oversized body; cross-origin mutation; two simultaneous same-revision saves, exactly one accepted |
| `plaza-presence-adversarial.test.ts` | Cookie/session impersonation, forged caller player IDs and movement, foreign object-ID collision/removal, action-ID replay between visitors, unsafe plaza blueprint fields |
| `missions-adversarial.test.ts` | Private jobs, receipts, events, execute/support and downloaded artifacts inaccessible across sessions; artifact download sandbox headers; malicious destination forms and unsupported tools; unsigned/cross-site writes |
| `keys-economic-adversarial.test.ts` | Compile **actual Solidity source** with solc and deploy locally to Ganache; unique free first owner key; irreversible owner key restriction; 3% buy and sell treasury fees; quote/slippage math; reserve solvency and zero outstanding liability after round-trip; amount ceiling |

### How to execute

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run tests/unit/security --config vitest.config.ts --reporter=verbose
pnpm exec tsc --noEmit --target ES2020
```

The PR workflow `.github/workflows/security-adversarial.yml` runs these tests on a GitHub-hosted Node 22 worker when actions are enabled. No paid provider keys, external token RPCs, or production state should be supplied. The project's unit-test setup initializes a local `node:sqlite` database.

### Verification limitations (not false positives)

- **Wallet EIP-1271 contract accounts:** not supported by current authentication code; unverified, not a claimed bypass.
- **World editor member/editor roles, world deletion, object mutation/deletion endpoints and session-sequenced presence:** described in `docs/TASK_OWNERSHIP.md`, not yet implemented on the inspected branch. No adversarial pass claim.
- **Economic properties on a live mainnet, third-party ERC-20 behaviors, exchange-rate manipulation, cross-world trade sequences:** not examined. Local Ganache fixture only.
- **Rendered XSS, browser multi-tab CSRF, and production distributed race conditions:** unit tests verify API-level restrictions; no production browser or distributed deployment test was conducted.
- **Run status:** **Executed on GitHub Actions.** Final code-bearing commit `42474df` passed its isolated CI run (16 positive tests, 1 expected failure), and ES2020-override TypeScript check succeeded. Production/deployment penetration tests remain unperformed.

## CI execution evidence

- Initial GitHub Actions execution: [run 38039913599](https://github.com/snidova1/ctrl-playground/actions/runs/38039913599), 2026-10-10 09:01 UTC. Dependency installation succeeded. **11 assertions passed, one signed-wallet bypass assertion was explicitly XFAIL, and one contract execution failed at Solidity compilation.** The specific compiler diagnostic was `CTRLWorldKeys.sol:60:67, Stack too deep`, not an observed token reserve failure.
- Initial full-project typecheck also failed because the repository's existing `tsconfig.json` targets ES2017 while `features/keys/policy.ts` uses native `bigint` literals. This is an existing project configuration mismatch, not a reason to modify production code in this PR.
- Follow-up test-only fixes: Solidity compile with `viaIR: true` to compile the *unchanged* contract; CI typecheck overrides target ES2020 without modifying `tsconfig.json`. Added a fifth suite for cross-session plaza presence/action replay. **Final verification:** [run 38040181998](https://github.com/snidova1/ctrl-playground/actions/runs/38040181998) on code commit `42474df` passed: **5/5 test files, 16 positive tests, 1 explicit SEC-01 XFAIL, no unexpected test failures, and successful ES2020 typecheck**.

## Review gate

SEC-01 should be resolved before wallet-gated world creation is advertised. Do not merge on the basis of XFAIL or static observations alone. Rebase after the backend worker lands the planned permissions/session code, rerun the entire isolated suite, and replace the known XFAIL with a positive 401 assertion once the defect is fixed.
