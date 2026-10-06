# CTRL release runbook

The site and live inference exist. CTRL is not yet a mainnet token or a verified Orbio listing. Never announce token availability from a gateway-key test.

## Prepared listing copy

Name: **CTRL**. Symbol: **CTRL**. Core phrase: **A PUBLIC MACHINE.**

Description:

> CTRL is a publicly directed machine. Holders propose and support bounded missions. Selected work becomes a report or an interactive world, with an execution receipt. CONTROL is participation capacity, not a transferable token. The MVP includes three authored world kits; it does not generate arbitrary games or multiplayer worlds. Burn is excluded. Optional flexible allocation is planned separately and is not required for normal holding utility.

Website: https://ctrl-public-machine.raisecompanyro.chatgpt.site

Do not invent supply, creator tax, creator wallet, launch price, allocations or vesting. These are launchpad/owner decisions and must match the transaction preview. Current `/launch` terms are the source for protocol fees and supported network, not old campaign copy.

## Remaining external steps

1. The owner reviews the current Orbio listing form, economic terms and transaction preview, then signs the actual launch on Robinhood Chain mainnet. Testnet tCTRL and its signer must not be reused as a mainnet CTRL deployment. Save the real token address, launch transaction and CTRL agent ID.
2. Set server runtime `CTRL_CHAIN_ID=4663`, the verified mainnet RPC, `CTRL_TOKEN_ADDRESS`, and `ORBIO_AGENT_ID`. The wallet reads these values through its runtime configuration; no fake production address is built into the app. Verify balance, signed login, holder tier, mission support and a capped private job using an actual holder wallet.
3. Deploy the supplied queue container to a persistent service. Configure only `APP_ORIGIN` and the existing `WORKER_SECRET`; the Orbio key stays on the backend. Run `docker compose -f worker/compose.yaml up -d --build`. Observe repeated successful ticks, verify a queued mission completes without the browser staying open, and inspect its receipt. Do not count a temporary development process as production hosting.
4. Enable WalletConnect with an owner-supplied public project ID at build time if mobile wallet pairing is required. Injected EVM wallet access already works. The project ID is not a private key.
5. Once the preceding checks pass, set `CTRL_PUBLIC_RELEASE=true`. Inspect `/launch`: mainnet bytecode, matching agent registration, live gateway/model, active approved terms and a recent successful worker heartbeat must all pass. Hosting audience is verified separately. Publish the accurate launch announcement only then.

Optional flexible allocation remains disabled until a separately reviewed contract is deployed and wired. There is no fixed holding period and no burn loop. Its absence must not be advertised as live staking or yield.

## Operations

- Start with the configured US$1 daily compute ceiling; raise only after checking actual usage and funding. It is a spend ceiling, not a guaranteed holder reward.
- Missing credentials/models fail explicitly. Paid work never silently becomes mocked output.
- Review interrupted jobs marked `EXECUTION_INTERRUPTED_SETTLEMENT_REQUIRED`. Reservations stay held when a paid call's final cost is unknown. Reconcile provider usage before allowing a new attempt. Never bulk reset leases.
- Unknown public commands remain in REVIEW. Do not enable unrestricted tools or shell execution to clear this state.
- Keep owner access to D1/R2 export and recovery tooling. Make backups and test restoration before sustained production traffic. Managed hosting resources do not imply a separately tested backup policy.
- Monitor worker failures, provider settlement and the daily budget; stop the worker to pause unattended paid execution. Set release false if token or provider configuration becomes invalid.

## Announcement drafts

Before token launch:

> CTRL / A PUBLIC MACHINE.\n> The public preview is open: commands compete, work produces artifacts, and worlds can be explored. Live Orbio inference is connected. Token launch and mainnet holder access are pending.\n> https://ctrl-public-machine.raisecompanyro.chatgpt.site

After verified launch (replace brackets with verified facts before posting):

> CTRL / A PUBLIC MACHINE.\n> Launched on Orbio: [verified listing URL].\n> Hold CTRL to access the machine, propose commands and support public work. Every completed mission gets an artifact and receipt.\n> Token: [verified mainnet address]\n> https://ctrl-public-machine.raisecompanyro.chatgpt.site

These are drafts, not posted messages. They make no return, APY, price or PMF claim.
