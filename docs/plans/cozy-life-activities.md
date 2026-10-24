# Cozy life activities implementation plan

**Goal:** Real repeatable gardening, fishing, cooking, crafting, community contributions and item barter in Habitat/Public World, without token/revenue promises.
**Architecture:** Shared deterministic domain reducer; server-authoritative wallet-profile progression in D1 with revision CAS; clearly labeled browser-only guest/sandbox progression. Shared mobile-first activity panel connected to both world clients. Cross-player barter and community totals must come from backend, never fabricated NPC/player counts. Activity inventory is nonfinancial and separate from Keys.
**Stack:** Existing TypeScript/React, Zod, Vitest, D1, Playwright. Preserve large dirty tree and all furniture/house/avatar behavior.

## Product boundaries
- No stamina, paid seeds, token rewards, APY, revenue-sharing UI, wallet signatures for activity actions, or financial balances.
- Future tentative fee distribution: weight = quantity of OTHER creators' Keys held, not distinct creators. Own Keys excluded. Not part of this implementation; no promises of eligibility or returns.
- No mandatory objects cluttering default plot. Activity UI opens intentionally. Accessible touch cards/tabs and visible world activities, not admin forms.
- Guest data explicitly browser-only, shared across Habitat sandbox and Public World in that browser; authenticated identity data persisted on server. Never silently downgrade authenticated save failure to guest.

## Task 1: domain + authenticated service
Create domain/cozy-life.ts, server/cozy-life/service.ts, migration and focused tests. Inspect existing router/auth/db patterns. Export type LifeState, LifeAction, function createLifeState(now), applyLifeAction(state, action, now). Define crops/recipes/fishing and document final exported contract for UI. Test invalid actions, growth/water/harvest, fishing cast + reel window, ingredient debit, crafting debit, contributions, no negative inventory, revision conflict and server authentication. Route /api/cozy-life GET/POST; independently owned route registration patch only. Cross-player barter must escrow offered items and atomically accept/refund with no duplication. Community contributions personal plus true shared totals. Server time/randomness authoritative. Tests first, run focused then project typecheck. No full builds/deploy by worker.

## Task 2: shared activity UI
After domain exists, create features/cozy-life/{activity-panel.tsx,activity-panel.css,use-cozy-life.ts}; integrate ONLY features/habitat/habitat-test.tsx, features/habitat/app.tsx and features/worldgacha/app.tsx. All activity buttons functional; garden beds with growth and water indicators, crop choice, fishing timed interaction, inventory, recipes, crafted collection, real community/barter surfaces where authenticated. Explicit local-only guest label. No money/reward language. Handle errors, loading, concurrency, storage errors and dialog focus/escape; don't steal game input behind dialog. Preserve accessible names of existing QA. Targeted tests and typecheck.

## Task 3: integration/verification/release
Parent reviews contracts, security tests and mobile UI; add scene affordances where feasible without forced starter objects. Run full Vitest with TMPDIR=$(realpath /dev/shm), tsc, browser activity loop PC/mobile, existing furniture regression. Build staging sequentially and validate. Deploy with existing staging script (backup before migrations), test public URLs and unauthenticated rejection. Document precise verified scope and limitations. No commits sweeping other dirty work.
