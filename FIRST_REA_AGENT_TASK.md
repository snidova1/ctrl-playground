# FIRST REA AGENT TASK — CTRL Public World

Copy/paste the following paragraph **unchanged** into Codex, Work or an agent with GitHub access. It must execute code edits, not only plan.

> Work in `snidova1/ctrl-playground` on the `handoff/rea-public-world-polish` branch, not on main. Read `AGENTS.md`, `docs/HANDOFF.md`, and all of `docs/REA_PUBLIC_WORLD_EXECUTION.md`. Run `node scripts/rea-world-preflight.mjs` and create `feat/rea-world-polish-execution` from the handoff branch. Use `morluto/rea` MCP/CLI with **one reference only: IMVU Web 3D Rooms (https://app.imvu.com/rooms/)** to observe its visible social room experience, UI flows, character/room actions, avatar-to-avatar co-op animation, chat/friends and furnished spatial composition within available legitimate browser access. Inspect **our own CTRL runtime** with REA/Playwright for implementation debugging. Read `docs/REA_IMVU_SINGLE_TARGET.md` for precise evidence and feature gates. Do not analyze other comparison games. If IMVU blocks access or needs a test account you do not have, use published IMVU documentation and continue implementing/validating CTRL; do not bypass access controls. Use Playwright directly if the REA MCP is unavailable. Implement real visual and gameplay improvements to the existing shared Public World: cohesive town environment, legible camera, movement/collision, low-cost NPC ambience, clear multiplayer presence, responsive mobile HUD, visit-to-habitat navigation. Keep Common Ground as the walletless demo landing and Habitat as the persistent wallet-owned home. Do **not** add a Join Multiplayer button. Preserve all ownership, wallet signing and server-side permissions. Do not copy Heartopia code/assets or inspect protected binaries. Commit working code and tests, run visual WebGL desktop/mobile screenshots and API/world/presence regressions, and open a PR with before/after **real browser screenshots**, evidence and exact commit SHA. Don't change or deploy main/production. If something cannot run, record the blocker and continue all other safe execution steps rather than stopping at a plan.

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
