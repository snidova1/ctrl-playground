# FIRST REA AGENT TASK — CTRL Public World

Copy/paste the following paragraph **unchanged** into Codex, Work or an agent with GitHub access. It must execute code edits, not only plan.

> Work in `snidova1/ctrl-playground` on the `handoff/rea-public-world-polish` branch, not on main. Read `AGENTS.md`, `docs/HANDOFF.md`, all of `docs/REA_PUBLIC_WORLD_EXECUTION.md`, and the overriding full-spectrum scope in `docs/REA_IMVU_SINGLE_TARGET.md`. Run `node scripts/rea-world-preflight.mjs` and create `feat/rea-world-polish-execution` from the handoff branch. Use `morluto/rea` MCP/CLI with **one reference only: IMVU Web 3D Rooms (https://app.imvu.com/rooms/)** to observe its visible social room experience, UI flows, character/room actions, avatar-to-avatar co-op animation, chat/friends and furnished spatial composition within available legitimate browser access. Inspect **our own CTRL runtime** with REA/Playwright for implementation debugging. Read `docs/REA_IMVU_SINGLE_TARGET.md` for precise evidence and feature gates. Do not analyze other comparison games. If IMVU blocks access or needs a test account you do not have, use published IMVU documentation and continue implementing/validating CTRL; do not bypass access controls. Use Playwright directly if the REA MCP is unavailable. Implement the ENTIRE relevant observed social-life experience end-to-end, not hand-picked features. **The existing Public World is only ~64×61 units and must be replaced by a large, connected, genuinely playable six-or-more-district social world (~300×300 metre-scale as an initial target).** All districts need distinct original scenery, traversable routes, social activities and player interactions, fast travel validated by the server, interest-aware multiplayer presence, synchronized mutual-consent avatar actions, functioning Habitat visits and scalable mobile rendering. Map GEOGRAPHY and GAMEPLAY both follow the structural and behavioral findings from the single IMVU reference, adapted independently to CTRL's free-walk world. No empty terrain, background-only districts or one-square demo accepted. Keep Common Ground as the walletless demo landing and Habitat as the persistent wallet-owned home. Do **not** add a Join Multiplayer button. Preserve all ownership, wallet signing and server-side permissions. Do not copy Heartopia code/assets or inspect protected binaries. Commit working code and tests, run desktop/mobile WebGL screenshots of Town Center AND at least three remote districts, two-wallet multiplayer journeys across districts plus interactions, signed server-boundary/collision regressions, and open a PR with complete evidence, runnable implementation and exact commit SHA. The task is NOT DONE unless the six-district world and integrated social gameplay are functional. Don't change or deploy main/production. If something cannot run, record the blocker and continue all other safe execution steps rather than stopping at a plan.

## Local manual setup (when an agent host supports it)

```bash
git fetch origin
git switch handoff/rea-public-world-polish
git pull --ff-only origin handoff/rea-public-world-polish
node scripts/rea-world-preflight.mjs
# Review modifications before installing local Codex MCP:
npx -y rea-agents@latest setup --client codex --dry-run --json
npx rea-agents@latest setup --client codex
# Restart/reconnect Codex. Then launch the agent with the quoted task above.
```

For Hermes substitute `--client hermes`; for Claude Code use `--client claude_code`. Never run this setup automatically in CI or assume the agent automatically has a local browser. `REA` is a diagnostic aid; building and verifying original CTRL game code is the deliverable.
