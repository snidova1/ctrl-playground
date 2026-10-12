# CTRL — REA-Assisted Public World Polish (execution order)

**Status:** prepared handoff; this document does **not** claim that REA was installed, that Heartopia was inspected, or that a new game build was released.

**Source branch:** `feat/public-world-real-neighborhood` (PR #26, itself layered on Public World PR #25). This handoff branch contains its code plus instructions. Do not work on `main`, `work/master-integration`, `work/integration`, PR #24's cottage branch, or other workers' branches.

## Mission, in one line

Make CTRL's **Public World** feel like a coherent, populated, explorable, cozy 3D multiplayer neighborhood, not a sparse canvas with NPCs and scattered props. Use REA to inspect **CTRL's own authorized JavaScript/web runtime** and diagnose flow/render issues; use publicly available gameplay footage and permissioned observation for inspiration, but implement original mechanics, art, and code. **Deliver and verify changes**; do not stop at a report.

## Non-negotiable product flow

- `/` and `/courtyard`: Common Ground is an immediately playable landing/demo area, with truly randomized guest appearance **without wallet**. Do not replace or redesign it in this task.
- `/habitat`: verified wallet + signing + saved VRoid character; owned persistent home; builder; visiting another player's home subject to permissions.
- `/public-world`: same verified character and wallet enter the **shared** Public World; automatically join existing world, no separate **Join Multiplayer** button. Real players share sequenced presence, waves and transient speech; ambient NPCs are clearly marked and never count toward player totals.
- Preserve save/reload, ACL revocation, asset allowlists, signed session, rate limits and server-side world/presence validation.

## Repository reality (inspect before editing)

- World entry: `app/public-world/page.tsx`, `features/habitat/app.tsx`
- Scene: `features/habitat/town-scenery.tsx`, `features/habitat/stage.tsx`
- Shared geography/collision: `features/habitat/public-world-geography.ts`, `features/habitat/types.ts`, `domain/habitat.ts`, `server/habitat/service.ts`
- Third-person controller/camera: `features/plaza/scene.tsx`
- NPCs, VRoid and presence: `features/plaza/characters/vrm-avatar.tsx`, `features/habitat/use-presence.ts`
- UI: `features/habitat/habitat.css`, `components/shell.tsx`
- Existing QA: `tests/unit/public-world.test.ts`, `tests/browser/public-world-visual.spec.ts`, `playwright.public-world.config.ts`, `.github/workflows/public-world-visual.yml`
- REA upstream: https://github.com/morluto/rea . REA is a standalone external **MCP/CLI inspection tool, not the CTRL 3D engine**. CTRL retains Next.js, React, Three.js, R3F, VRM and its own networking.

## Execution sequence (do the work, don't merely plan it)

### 0. Create a clean work branch

```bash
git fetch origin
git switch handoff/rea-public-world-polish
git pull --ff-only origin handoff/rea-public-world-polish
git switch -c feat/rea-world-polish-execution
node scripts/rea-world-preflight.mjs
pnpm install --frozen-lockfile
```

If this handoff has already been merged into another integration branch, start a new branch at **that** exact integrated SHA instead. Never mix stale PR #25/26 code into another team's active work by force. Commit in small, reviewable steps.

### 1. REA setup and source-backed inspection

REA currently documents Node **22.19+**, 24.11+, or 26+. CTRL's `package.json` permits Node 22.13+, so **verify the higher REA minimum first**. Check the **actual npm release and help output** before assuming tool support.

```bash
node --version
npm view rea-agents dist-tags.latest
npx -y rea-agents@latest doctor --client codex --json
npx -y rea-agents@latest setup --client codex --dry-run --json
```

For a local Codex agent, review the proposed MCP registration, then explicitly approve and run:

```bash
npx rea-agents@latest setup --client codex
```

Restart/reconnect Codex to load the MCP. `setup` may modify **local agent configuration** and must be reviewed. If using Claude Code instead, substitute `--client claude_code`; if using Hermes, use `--client hermes`. Do **not** run setup automatically in GitHub Actions, modify secrets, install native decompilers unnecessarily, or commit machine-specific agent config.

REA CLI can analyze **CTRL's own built JS** without a native engine. After a local build, point it to a real extracted JS bundle directory; inspect the output path instead of assuming it. For example, only if the directory exists:

```bash
pnpm build:next
mkdir -p .tmp/rea-local
# if .next/static/chunks exists:
npx -y rea-agents@latest analyze-javascript-application "$PWD/.next/static/chunks" --json > .tmp/rea-local/ctrl-bundle-evidence.json
```

Beware large evidence files. Keep them **outside git** (e.g. `/tmp/ctrl-rea-evidence.json`) unless deliberately sanitized and small; do not upload authenticated sessions, wallet addresses, tokens, cookies, private URLs or private asset binaries. If the JS analysis cannot map R3F source meaningfully, prefer REA's permissioned browser observation/scenario workflow against **the locally running CTRL app**. Use `docs/browser-observation.md` and `docs/browser-scenario-contract.md` in the REA repository and the connected tool schema. A normal Playwright browser trace is an acceptable fallback when REA MCP is unavailable.

**Scope boundary:** analyze owned CTRL code, locally built bundles, and test sessions. Do **not** extract/copy Heartopia source, textures, game assets, proprietary shaders, client binaries, protected network protocols or bypass DRM/anti-cheat. Use public videos, screenshots and published design breakdowns only to identify **high-level** movement, camera, pacing and environment affordances. All shipped assets and implementation must be original or licensed.

Log findings in `docs/qa/REA_PUBLIC_WORLD_FINDINGS.md` with:
- Target and exact app commit/version, observation timestamp and permission basis.
- Evidence source (source file/line, screenshot path, trace, REA evidence key or public reference).
- What was *observed* vs what is only a hypothesis.
- Specific CTRL implementation fix and how it is tested.

### 2. Implement three user-visible improvements

**P0: A world, not a blank floor**
- Preserve the new town streets, plaza, six neighborhood homes, storefronts, waterfront, two bridges, terrain silhouettes, foliage and landmark from PR #26.
- Fix remaining obvious seams: floating facades and signage, incorrect waterbank collisions, harsh/unlit instanced materials, empty horizons, poor depth/composition, and excessive UI overlays.
- Improve environment structure with recognizable destinations: a central square, café/market, garden, waterfront/bridges, residential paths. Prefer instancing and existing legal/CC0 assets to expensive downloads.
- The exact same footprint/bounds rules must run server-side and client-side. No new free-walk boundaries for personal Habitat.

**P1: Game feel and living environment**
- Refine R3F third-person camera follow, orbit/pitch, zoom and collision-aware movement for mouse + touch. Character remains visible and roads/landmarks are legible on both desktop and mobile.
- Add low-cost ambience, such as deterministic NPC activity loops, sitting/walking/waving, subtle water/wind/foliage or interactable benches and existing authorized audio. NPC activity is **not** faked as online users.
- Keep real multiplayer chat bubbles/waves responsive and preserve the real player-count source of truth. Do not build a second multiplayer stack.

**P2: Game-first UI and visit flow**
- Preserve **Common Ground / Habitat / Public World** navigation. No separate Join Multiplayer button.
- Compact responsive game HUD and clear world name; leave enough visible 3D viewport on iPhone-sized screens; avoid double header.
- Public World directory opens real habitat list and respects invite/public/private-world permissions.
- A user can travel from public world to their own habitat and back without losing character/profile or corrupting world state.

### 3. Proof gates, not checkbox theatre

Run exactly the existing and relevant suites, adding missing tests only when behavior changed:

```bash
pnpm exec vitest run tests/unit/public-world.test.ts
pnpm typecheck
pnpm exec eslint features/habitat/town-scenery.tsx features/habitat/public-world-geography.ts features/habitat/stage.tsx features/habitat/app.tsx features/plaza/scene.tsx
pnpm exec playwright test --config playwright.public-world.config.ts
pnpm build:next
```

At the **final commit SHA**, capture and inspect *actual browser-produced* 1440x900 desktop and ~390x844 mobile screenshots; store paths/CI artifact links in findings. Tests must reject an empty/unlit scene, black shader tiles, giant HUD occlusion and uncaught WebGL exceptions. Check real walkability across both bridges, central plaza and building footprints. Complete a two-wallet signed presence/chat/wave scenario and one visit to a permitted/denied home. Preserve all original wallet/access-control tests.

Record at least a basic performance observation on a low-power mobile profile; do not claim a measured device FPS or Heartopia quality without actual evidence. Reduce detail before adding heavy models if performance regresses. If an assertion passes but the screenshot is visibly bad, **fix the visual** and rerun.

### 4. Deliverables

Produce **code changes** plus:
1. `docs/qa/REA_PUBLIC_WORLD_FINDINGS.md`: concise evidence table, completed code fixes, before/after actual screenshots, known limitations, test results and commit SHA.
2. PR `feat/rea-world-polish-execution` into `feat/public-world-real-neighborhood`, or the exact integration branch that currently contains PR #25/#26 after reconciliation. Include visual evidence and all CI results.
3. Handoff instruction to release owner: merge after full combined CI, then deploy tested SHA via authorized staging/Sites workflow, then smoke test with two real signing wallets. Do **not** announce live deployment solely from PR merge.

**Definition of done:** not merely “REA installed” or “100 new objects.” A signed player entering `/public-world` experiences a legible, inhabited, **navigable world** with clear destinations, smooth controllable avatar, usable social interactions and a mobile HUD that does not bury the view. Automated browser QA and actual screenshots demonstrate it.

## Stop conditions

Pause edits to `main`, production credentials, onchain contracts, store/ETH products, other workers' branches, and the Common Ground landing design. If REA installation is unavailable in an ephemeral environment, note the limitation and **continue implementation and Playwright QA using the existing code**, rather than turning the job into an installation project. No spending on optional paid binary-analysis providers.
