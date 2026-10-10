# CTRL Integration Preflight QA Handoff

Branch: qa/integration-preflight. This standalone QA tool produces a read-only inventory of parallel PRs, latest CI on each exact commit, integration dependencies, and shared changed files.

## Run

Use Node 22 or newer. From the repository root:

    node --test tests/qa/integration-preflight.test.mjs
    node scripts/qa/integration-preflight.mjs --repo snidova1/ctrl-playground --out preflight.md --json-out preflight.json

The second command needs a GitHub token with read permissions supplied through your environment. No token is stored in results. CI supplies a short-lived read-only token automatically. For offline usage, pass a local fixture with --fixture.

## Artifacts

GitHub Actions workflow CTRL Integration Preflight uploads both a Markdown report and machine-readable JSON as ctrl-integration-preflight. The report includes open PRs, base/head relationships, whether workflows passed for their current head SHA, and file overlap review flags. Only GitHub GET requests are issued. No automatic merge, deployment, patching, force push, or wallet operation.

## Current snapshot, 2026-10-10

- 11 draft PRs; 9 have green current-head CI, one is failing (#2 builder), one has no verified current-head check (#1 integration foundation).
- Backend PR #11 is based on #1 and consolidates #6/#8/#9. Avoid merging these slices twice.
- Shared files requiring reconciliation: features/habitat/app.tsx and stage.tsx between #2 and #5, plus app.tsx shared with backend #11.
- Builder desktop Undo and mobile asset button are blocked by visible UI overlays. Playwright evidence: https://github.com/snidova1/ctrl-playground/actions/runs/38042554866.
- Builder browser fixture currently enters a guest personal world. The new backend requires wallet verification for persistent personal-world creation; reconcile the test scenario.
- World Keys #7 is locally tested but its handoff still records an ID-registration collision risk. Do not treat offline deployment tests as onchain production approval.
- Creative asset PR #10 has a validated list of candidate sources, not integrated clothing, animation or model binaries.
- Asset QA #3 already repaired the 14 broken WebP preview files; do not repeat its patch.

## Review order

Review #1 plus #11 backend first. Then reconcile #2 and #5 editor work with the wallet boundary and run desktop/mobile browser tests against one integrated branch. Review security, asset and world-key gates separately. All final merges remain with the respective owners.

This document and its workflow are deliberately independent of other workers' branches and production code.
