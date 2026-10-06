# CTRL — A PUBLIC MACHINE.

CTRL is a working public mission system. Holders propose commands, allocate participation capacity, inspect execution, and receive artifacts with permanent receipts. Public browsing stays open. The token is the machine's access layer; CONTROL is a non-transferable allowance, not a second token.

## Run locally

Requirements: Node 22.13+ (Node 24 recommended), pnpm 11, modern browser. No paid key is needed for the complete mock demo.

```sh
pnpm install
cp .env.example .env.local
pnpm db:local
pnpm dev:next
# http://localhost:3000
```

Open `/account` and choose **ENTER DEMO** explicitly. This creates a simulated operator credential; it does not connect a fabricated blockchain wallet. The public exhibition seeds on the first mission request. Propose a command, allocate support, then use `/work` to execute the highest-supported feasible command. Run private research, JSON transformation, or a playable world build in `/lab`. Execution writes real database events, artifacts and hashed receipts, even when the provider is simulated.

The app has two supported targets: standard Next.js App Router on Node with local SQLite/filesystem adapters, and the hosted Vinext App Router runtime on Cloudflare D1/R2. Next.js production compilation is available with `pnpm build:next`; the managed hosting bundle uses `pnpm build`. Local adapters are for development, not stateless serverless production.

## Product surfaces

| Route | Behavior |
| --- | --- |
| `/` | Spatial machine exhibit, selectable rooms, actual command and record counts, latest public work |
| `/commands` | Physical command arena, accessible index, mission form, CONTROL support |
| `/work` | Worker stages, SSE tool events, settled usage, completion/failure receipt |
| `/worlds` | World registry |
| `/worlds/create` | World recipe workbench, playable local preview, public build proposal |
| `/worlds/dead-web` | Walkable terminal archive with restoration mechanics |
| `/worlds/internet-weather` | Living signal garden with growth, wind and daylight controls |
| `/worlds/agent-orbit` | Walkable relay field with animated instruments and connections |
| `/archive`, `/archive/:id` | Public ledger, permanent receipts, JSON export, verified artifact downloads |
| `/machine` | Worker instrumentation, live Orbio catalogue/terms, gateway balance when configured |
| `/account` | Operator credential, holder tier, allowance, reputation, simulated flexible allocation |
| `/launch` | Current integration and release gates; honest testnet/mainnet distinction |
| `/lab` | Authenticated private task workbench, tier and quota enforcement |

## What is live and what is simulated

The API, durable mission/support records, authenticated private access, queue, execution stages, artifact publishing, receipt verification and live public Orbio reads are implemented. Injected wallet connection and EOA signature verification are implemented; WalletConnect requires its public project ID. Token balances are read on the server only when a genuine CTRL address/RPC are configured.

Default mock mode simulates holder balance, holding time, allocation state, provider outputs and compute consumption. The three exhibition datasets are labelled curated/synthetic. They are not claims of current internet activity. Public demo missions start with zero support. Build jobs register an interactive world from a validated recipe in both mock and live modes. Three authored mechanics kits support walkable space, animated objects, saved local progress and forks; they do not autonomously invent renderer code.

Orbio inference/search require server credentials and an exact current model ID. A bounded live execution was verified on 2026-10-05: search and `openai/gpt-6-luna` produced a SHA-256-verified report and settled receipt for US$0.00634955. This local engine integration test does not imply that a persistent hosted worker is running. A disposable tCTRL test token is deployed on Robinhood Chain Testnet (46630); see docs/testnet.md and deployments/robinhood-testnet.json. No production CTRL or allocation contract is deployed. Flexible allocation is simulated only; burn and fixed-duration lock actions are removed. Contract wallet authentication, arbitrary code execution, automatic website deployment, external posting and image generation are not enabled. Build jobs produce validated world-recipe JSON plus a research report and a playable world URL; they are not unrestricted software workers.

## Architecture

Strict TypeScript domain models → configurable policy → server services → D1 transactional allocations → leased mission worker → model/search/tool providers → R2 artifacts → SHA-256 receipt. The frontend reads API snapshots and subscribes to execution events. Secrets remain server-side. Orbio supplies inference/search/resources, while CTRL owns scheduling, permissions, storage and execution.

`config/policy.ts` owns thresholds, sublinear CONTROL weighting, flexible allocation multipliers, daily proposal/job limits, parallelism and budgets. Values are illustrative and editable. `features/worlds/data.ts` owns typed world manifests and curated datasets. `server/providers/types.ts` defines provider boundaries. The optional OpenAI-compatible environment fields are reserved; that adapter is not selected by this MVP.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build:next
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

Unit/API tests cover CONTROL, tiers, validation, SSRF URL policy, provider settlement and budget checks, receipts, CSRF, authentication, allocation idempotency, private job isolation and artifact verification. Browser smoke tests cover major routes, demo submission/support/execution, wallet controls, personal transformation and accessibility. Browser test installation depends on the Chromium download service. See `docs/verification.md` for this environment's actual results and limitations.

## Production

The new entrance is a Three.js collection with tactile selection, accessible controls and a canvas fallback. The launch film, original score and X copy are delivered separately as a campaign pack.


Use durable D1 and R2 bindings, apply the included Drizzle SQL migration, set `CTRL_MODE=production`, `APP_ORIGIN`, genuine token/RPC configuration, Orbio key/model and a strong worker secret. Run the separate authenticated queue worker; production API submissions do not start long paid jobs in request background tasks. Do not deploy the Node development SQLite adapter to Vercel's ephemeral filesystem. A PostgreSQL/Supabase port can implement the same repository interfaces but is not shipped here.

Read [deployment](docs/deployment.md), [architecture](docs/architecture.md), [Orbio integration](docs/orbio-integration.md), [mission engine](docs/mission-engine.md), [token utility](docs/token-utility.md), [world system](docs/world-system.md), and [security](docs/security.md).

## Robinhood testnet integration

The default network is now Robinhood Chain Testnet (46630). Connect a browser wallet on `/account`, claim 64,000 tCTRL once, and sign the session challenge. Holder access reads the real ERC-20 balance. The hosted instance now uses live Orbio inference/search with a server-side key. Local development defaults to mock. Live jobs can execute on demand from the authenticated Work page; an external queue worker is needed for continuous unattended execution. See [the testnet runbook](docs/testnet.md) for deployment, verification and signer isolation.

## Current release boundary

Live Orbio model/search and real signed Robinhood testnet holder flows have been verified. Three world experiences are available: a first-person archive, an interactive signal field and a navigable orbital census. The data in the initial worlds is explicitly illustrative; generated worlds use bounded authored kits.

Mainnet launch still requires the owner-signed Orbio transaction, the actual CTRL token address and agent ID, and a persistent external queue service. `/launch` fails closed until its separate checks pass. Worker health is written after successful ticks; expired executions are quarantined without retrying unresolved paid calls. Burn is excluded and optional flexible allocation is not yet live. Follow [the release runbook](docs/launch-runbook.md) for listing copy, configuration, operations and accurate announcement drafts.
