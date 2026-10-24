# Cozy life: playable staging integration

## Scope

The existing farming/fishing/cooking/crafting/bag/community/barter loop now has an opt-in physical layer in Habitat and the local Habitat sandbox.

- A new state has no garden anchor or decoration. Planting a panel bed does not silently landscape a plot.
- **Tempatkan kebun** selects a clear plot location for four actual raised beds. Soil moisture and authored instanced crop geometry track the same seed/water/ready/harvest state as the panel. Walk near it and use E/touch/click to open garden actions.
- Crafted pots/benches can be placed as physical decorations. Placement removes exactly one inventory item. Storing the placed object returns that same item once; replays cannot mint items. The lifetime crafting album is not spendable inventory. Crafted benches in this release are decorative, not a new seating interaction.
- Existing homes/furniture block placement. The character cannot walk through raised beds/decorations. A subsequent builder save cannot overwrite a planted patch or placed craft; move the patch/store the craft before building there.
- **Makan seporsi** consumes an actual cooked meal and records a meal eaten; no fabricated stamina, tokens or reward is awarded.
- **Sajikan untuk pemain** moves one cooked meal into server escrow. The shared table exposes actual available portions, not fake guests. Eating a shared portion is guarded atomically; a portion has only one winner. Local-only guests cannot participate in cross-player sharing/barter.
- Owner physical views refresh after actions and poll every 15 seconds. Visitors receive only garden/decor fields via the normal public/private/member ACL; bags and owner IDs are not returned. Account expiry is not converted to local guest progress.
- Public World station navigation and the local Habitat activity panel share the same browser state; authenticated profiles use separate server state.

## Data and ownership

`domain/cozy-life.ts` maintains version 1 and additive optional fields. Legacy bags/beds/contributions/statistics are preserved. `normalizeLifeState` supplies empty decoration and meal-count defaults; it does not reset progress.

`drizzle/0006_cozy_life.sql` stores authoritative activity state, offers, contributions and guarded batches. `0007_cozy_life_servings.sql` stores real meal escrow. Apply both through the existing staging deploy command; do not invent a new database or deploy target.

Placement validates the owner's existing saved home layout and atomically guards its revision. Builder saves check the inverse constraint and guard the activity revision. Neither placing a garden nor crafting creates a Habitat, buys a Key, sends a transaction, grants a visitor editor rights or modifies an avatar.

## Verification commands

Run the focused extension tests first, then all tests and the project type checker:

```sh
TMPDIR="$(realpath /dev/shm)" NODE_OPTIONS=--max-old-space-size=512 node node_modules/vitest/vitest.mjs run tests/unit/cozy-life-world-api.test.ts tests/unit/cozy-life-world-integration.test.ts tests/unit/cozy-life-route-continuous.test.ts tests/unit/cozy-life-world-scene.test.ts
TMPDIR="$(realpath /dev/shm)" NODE_OPTIONS=--max-old-space-size=512 node node_modules/vitest/vitest.mjs run
NODE_OPTIONS=--max-old-space-size=1536 node node_modules/typescript/bin/tsc --noEmit
CTRL_HOSTING_TARGET=cloudflare-staging NODE_OPTIONS=--max-old-space-size=1536 pnpm build
node scripts/cloudflare-staging.mjs validate
node scripts/cloudflare-staging.mjs deploy
```

Canonicalize the tmp directory: SQLite reports `/run/shm` on this WSL system even if invoked through the `/dev/shm` symlink. Do not change database assertions to hide a mismatched test environment.

Live target: `https://ctrl-staging.suhiro211.workers.dev`. Use fresh output directories and inspect the report JSON status before claiming a pass:

```sh
CTRL_QA_ORIGIN=https://ctrl-staging.suhiro211.workers.dev CTRL_QA_OUTPUT=test-results/cozy-life/live node --import tsx scripts/qa/cozy-life.mts
CTRL_QA_ORIGIN=https://ctrl-staging.suhiro211.workers.dev CTRL_QA_OUTPUT=test-results/cozy-life/live-server node --import tsx scripts/qa/cozy-life-server.mts
CTRL_QA_ORIGIN=https://ctrl-staging.suhiro211.workers.dev CTRL_QA_OUTPUT=test-results/cozy-life/live-account node --import tsx scripts/qa/cozy-life-account.mts
```

The browser loop uses real UI actions and actual random catches. It never injects earned inventory, alters saved quantities or forces random outcomes. Only guest Date is advanced for growing/reeling; RAF and timers remain real so navigation uses the actual frame loop. It checks rendered ripe crop/loaded craft meshes, replacement seeds, ingredient debit, meal debit, one-time craft refund, cross-route persistence, local sharing restrictions, focus, keyboard and touch/nearby station interaction on desktop and phone layouts. Captures can take up to 120 seconds on WSL software rendering. Do not run multiple Chromium suites or a heavy build concurrently.

The server loop uses throwaway, unfunded signed wallet sessions, a private offchain QA home, actual server time and real catches. It verifies profile isolation, stale revision, escrow cancellation/exchange/replay, private garden ACL, builder overlap rejection, crafting/placement/refund, eating, serving to a second account, and contributions. It does not buy a Key or submit any blockchain transaction. Real-time crop maturation takes several minutes.

The account browser test checks authenticated account storage, cross-session/browser and desktop/phone persistence and the real escrow/cancel controls. Never print session cookies or private keys.

## Not included in this release

This does not create communal shared 3D planting beds, recurring NPC requests, a fish/crop collection album, a visual community-building milestone, meal buffs, a full serving-table 3D furniture system or new crafted-bench seating. Community contributions remain the existing truthful server-backed pantry. Those are separate gameplay iterations, not implied by a successful test or deploy.
