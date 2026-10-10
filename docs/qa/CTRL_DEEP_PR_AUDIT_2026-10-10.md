# CTRL Deep PR Audit: Integration Handoff

Audit date: 2026-10-10. Repository: snidova1/ctrl-playground (private). Snapshot main cbe941bd; active PR heads verified via GitHub. Scope: source-oriented review of relevant backend, schemas, migrations, editor, assets, security tests, key contracts, deployment tooling, and CI logs across PRs #1 to #12. This is static + executed-CI evidence, NOT a combined build, browser replay by this reviewer, external penetration test, or mainnet audit.

## Verdict

NOT READY FOR INTEGRATED MERGE / DEPLOYMENT. The backend and asset gates are useful, but the World Builder browser workflow has confirmed failures. The current app's guest workshop flow conflicts with the new wallet-only Habitat API. Onchain World Keys are missing owner-bound ID registration. No PR was merged in this audit.

## Findings and exact evidence

### H-01 | P1 | World Builder cannot complete UI workflow

PR #2, branch gpt6/world-builder at 6b7c882; CI run 38042554866. Desktop Playwright test cannot click Undo because the global page masthead intercepts the pointer. Mobile cannot click a catalog model because the inspector/footer and status overlay intercept pointer input. 2 of 4 desktop/mobile browser tests failed (one functional journey per viewport). Unit/API, scoped lint, TS, Next build passed on that isolated branch; global lint had eight errors. Review features/plaza/editor/habitat-tools.css (mobile/desktop stacking and hit areas), features/habitat/habitat.css (parent panel/header layers), global masthead and placement controls. Fix real clickable layout, never force-click or skip E2E. Rerun both screen sizes and add viewport hit tests.

### H-02 | P1 | New wallet boundary incompatible with existing guest-based builder onboarding

PR #11 server/habitat/service.ts lines 27-32, 315-327 permits only verified non-demo wallet sessions; guest plaza cookies are rejected. PR #2 features/habitat/app.tsx lines 20, 25, 42-43 still advertises an 'Enter guest workshop' path using /api/plaza/join and refreshes /api/habitat/state, which now returns 401, while tests/browser/world-editor.spec.ts opens guest and attempts POST /api/habitat/profile. The two branch workflows do not test the composed state. Keep guests directed to Common Ground/courtyard, use wallet test auth for durable world E2E, and remove misleading UX promise. Ensure visit/public-world discovery and offline draft rules are explicitly decided.

### H-03 | P1 | Presence integration only backward-compatible, not adopted by browser client

PR #11 adds join/sessionId/sequence/leave, 15-second expiry and replay rejection in server/habitat/service.ts lines 132-175, 225-239. PR #2 features/habitat/app.tsx lines 22, 27 still uses legacy visit/pose, lacking the new sessioned heartbeat contract. Legacy mode is explicitly supported, so this is an INTEGRATION GAP, not a proved security bypass. Update the client intentionally once server semantics are finalized, handling reconnect, leave, 409 stale and tab switch; use real signed-wallet multiplayer test. Test alternate legacy flow only if deliberately retained.

### H-04 | P0 for public tokenized launch | Permissionless world-ID squatting

contracts/keys/CTRLWorldKeys.sol lines 29-35 allows any msg.sender to call createWorld(bytes32 id) for an unregistered id; no onchain authorization binds an offchain world owner to the id. PR #7 docs/world-keys-testnet-handoff.md and scripts/testnet/check-world-keys.mjs reproduce collision on local Ganache. Victim wallet fails if another wallet registers the chosen ID first. Implement owner-bound registration or an equivalent authoritative secure mapping, defend against mempool front-running, and add adversarial tests. Do not broadcast publicly until addressed; all current CI is offline only.

### H-05 | P1 | Parallel PRs overlap the same runtime files

PR #2 and #5 change features/habitat/app.tsx and stage.tsx; PR #11 also changes app.tsx. Independent CI green on #5/#11 does not establish correct merged behavior. Preserve the latest Astra backend changes and GPT-6 advancedBuilder native Habitat canvas, with World Builder controls using actual server revision/permissions; do not replace whole files. Rebase/reconcile on dedicated integration branch and run combined API/browser checks. These are shared-file review hazards, not proof Git will conflict.

### H-06 | P1 | Consolidated backend supersedes individual fixes

PR #11 is based on PR #1's work/integration and carries PR #6 asset resolver, #8 SEC-01 guest boundary, #9 SEC-02 body streaming limit. Confirmed in docs/habitat-contract-integration.md and files in PR #11. Merge #1 foundational schema/migration then integrate #11; avoid blindly merging #6/#8/#9 again. Verify database 0004 against an existing-state copy before deployment.

### H-07 | P2 | Security baseline is stale and carries a deliberate XFAIL

PR #4 tests/unit/security/habitat-adversarial.test.ts lines 28-45 proves guest-to-Habitat bypass in old main and keeps an expected-failing security assertion. PR #11 introduces separate successful wallet-boundary regression tests in tests/unit/habitat-wallet-boundary.test.ts. When composed, update the adversarial regression to assert 401 on guest and retain plaza guest access as a positive test; run the entire suite against the new server. Old XFAIL green does not prove current integration safety.

### H-08 | P1 | Product behavior remains partially unimplemented despite successful unit tests

World key UI (features/habitat/app.tsx) explicitly says contract not deployed, while server state returns keyStatus not-deployed. Cosmetic variants currently change colorway, not real interchangeable hair/outfit meshes; PR #10 is only approved-candidate research. Avoid depicting launch/testnet wallet trades, confirmed onchain ownership or downloaded costumes as functional. After security sign-off, implement wallet-initiated tx lifecycle with verified receipts, database mapping and role separation under Astra ownership.

### H-09 | P2 | Rig/licensing/performance release gates not satisfied by registries

PR #10 creative-assets registry has 38 sources, customizer contract and safe preset-instantiation utility; every upstream asset has downloaded=false and ingested=false. It does NOT ship fitted VRM outfits, audio/VFX runtime or new 3D packs. Some source rights require per-pack/per-avatar approval. PR #3 repairs 14 zero-byte WebPs and validates 991 GLBs statically, but no real iPhone GPU/thermal frame tests or full glTF shader/render acceptance. Keep new asset ingestion blocked until binary checks, rights evidence, compatibility and mobile performance gate.

### H-10 | P2 | Current-head CI gaps and false confidence from isolated green results

PR #1 has no verified current-head workflow. #2 current-head World Builder workflow fails. Other isolated PRs #3-#12 have green checks as of snapshot, but no complete cross-PR merged browser or D1 migration run. PR #12 is a read-only PR/CI path-overlap reporter, not text conflict detection or completed integration QA. Require one integration branch with pnpm test, typecheck, lint, build:next, build, backend ACL tests, security, asset, editor Playwright desktop/mobile, and test DB migrations.

## Per-PR triage (all 12 inspected)

| PR | Scope | CI/status | Audit disposition |
| --- | --- | --- | --- |
| #1 | Astra schema contract, D1 0004 migration | no current-head CI | Foundation, migration rehearsal required |
| #2 | Native Habitat World Builder and Playwright | failing browser + global lint | BLOCKED: H-01/H-02/H-05 |
| #3 | Asset integrity and fixed WebP previews | success | Eligible for independent code review; no FPS claim |
| #4 | Independent security regression | success with known old XFAIL | Update for wallet-fix after merge |
| #5 | React Hooks/UI lint fix | success | Apply carefully with #2/#11 shared files |
| #6 | Reviewed asset metadata resolver | success | Subsumed by #11 |
| #7 | World Keys offline compile/tests/deployment CLI | success offline | Gate: H-04, no public deployment |
| #8 | Wallet-only Habitat / guest separation | success | Subsumed by #11 |
| #9 | Bounded Habitat request body | success | Subsumed by #11 |
| #10 | Creative asset research / world presets | success | Registry only; manual asset rights/rig review |
| #11 | Complete backend ACL, CRUD, presence, wallet | 2 workflows success | Integration foundation, not whole app release |
| #12 | Read-only PR/CI overlap report | success | Reporting tool only; no app test |

## Astra execution gates

1. Preserve all current branches and latest Work workspace. Inspect docs/HANDOFF.md and docs/TASK_OWNERSHIP.md; no force push.
2. Integrate #1 and #11 first on dedicated integration branch, with D1 migration rehearsal; do not duplicate #6/#8/#9.
3. Reconcile #2/#5 UI with that exact backend. Fix real desktop/mobile hit targets (not Playwright bypass), signed-wallet onboarding and presence session flow. Keep Common Ground and the same VRM Canvas intact.
4. Update #4 old XFAIL and run all tests on composed branch including cross-wallet edits, privacy, stale revisions, member revocation, presence replay/timeouts and mobile/desktop Save/Reload.
5. Review #3, #10 asset work separately; only ingest vetted assets. Keep World Keys launch held until #7 squatting case is resolved in Solidity and wallet-to-world mapping.
6. Require exact successful CI links/SHAs, browser screenshots/traces and a handoff documenting every unverified release gate. Leave main stable until human review. No testnet/mainnet transactions without separate authorization.

## Evidence anchors

- Builder CI failure: https://github.com/snidova1/ctrl-playground/actions/runs/38042554866
- Backend CI success: https://github.com/snidova1/ctrl-playground/actions/runs/38044841448
- World Keys offline CI: https://github.com/snidova1/ctrl-playground/actions/runs/38045040939
- Asset integrity CI: https://github.com/snidova1/ctrl-playground/actions/runs/38042085943
- Current-head integration preflight: https://github.com/snidova1/ctrl-playground/actions/runs/38045891102

All identified gaps are supported by reviewed source/docs or actual CI logs; unexecuted composed flows are explicitly labeled unverified. No source code or other worker branch was changed by this report.