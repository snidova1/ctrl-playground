# Deployment

> Current Common Ground alpha (2026-10-09): see [the plaza architecture and release boundary](common-ground.md). The shared courtyard and holder passport use holding thresholds only; no lock, burn or CONTROL allocation is required. Older mission-workbench sections below describe retained legacy routes.

## Hosted Worker / D1 / R2

The supplied managed hosting project declares logical `DB` and `BUCKET` bindings in `.openai/hosting.json`. Build through the included Sites helper (`pnpm build`), which preserves the framework/auth/connector worker. Publish the generated worker/assets archive through the hosting workflow. Do not serve only the browser bundle: the product requires its API and database.

Apply all tracked `drizzle/*.sql` migrations in order before traffic. `0001_nifty_iron_fist.sql` adds atomic daily compute reservations. For an independently managed Cloudflare deployment, define D1/R2 bindings with those names, migration directory `drizzle`, Worker entrypoint from the generated `dist/server` configuration, and static assets from `dist/client`. Use standard D1 migration tracking for subsequent releases. Never reapply the initial migration over existing tables blindly.

Demo deployment needs no paid credentials. It uses `CTRL_MODE=mock` (default), retains durable data, and labels simulated entitlement/resources/outputs. Set `APP_ORIGIN` to the deployed origin if using reverse proxies. Do not set a real API key in mock mode to imply that mock work is billed.

## Live runtime values

Reown/WalletConnect: supply `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` at build time and in Sites; ignored `.env.local` works in Next and Vinext. User's project configured locally/hosted. Keep values out of tracked source and allow the actual public origin in Reown dashboard. Injected wallets remain independent; real-phone QR pairing is not attested by isolated injected-wallet browser tests.

| Variable | Purpose |
| --- | --- |
| `CTRL_MODE` | `mock`, `development`, or `production` |
| `APP_ORIGIN` | Exact trusted HTTPS origin for requests/challenges |
| `ORBIO_API_KEY` | Secret gateway credential |
| `ORBIO_MODEL` | Exact currently discoverable text model |
| `ORBIO_BASE_URL` | Trusted official origin; defaults to current API host |
| `ORBIO_AGENT_ID` | Required for launch readiness; registration must match CTRL mainnet token |
| `CTRL_TOKEN_ADDRESS` | Genuine reviewed token deployment; blank until deployed |
| `CTRL_RPC_URL`, `CTRL_CHAIN_ID` | Server chain reads; target Robinhood Chain 4663 |
| `CTRL_LOCK_ADDRESS` | Reserved flexible allocation deployment; disabled until reviewed, with release at any time |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Public pairing ID, supplied at build time |
| `CTRL_DAILY_COMPUTE_USD` | Total daily reservation ceiling; defaults to US$1; unsettled calls retain their reservation |
| `CTRL_PUBLIC_RELEASE` | Explicit release flag; defaults false; does not change hosting access |
| `WORKER_SECRET` | At least 32 unpredictable characters for worker authentication |
| `DEMO_AUTH_ENABLED` | Optional development demo; always refused in production |

OPENAI_COMPATIBLE fields are reserved; no live adapter selection is implemented for them. Missing Orbio credentials fail gracefully rather than fabricating work. The website deployment does not accept token launch agreements. A separate testnet-only CLI can deploy the disposable integration token; it refuses other chain IDs and enforces a gas budget. See testnet.md.

## Separate worker

Run `worker/run.ts` on a long-running Node/container service with `APP_ORIGIN` and `WORKER_SECRET` matching the API. `pnpm worker` polls the tick endpoint, awaits completion and stops cleanly on termination. One worker is sufficient for MVP throughput. Production private jobs persist in the queue. The authenticated Work page can dispatch a queued job through `POST /api/missions/:id/execute`, which awaits the bounded run in the request. Closing the connection can interrupt execution; this does not replace an unattended worker. For an owner-private Sites origin, also configure `SITE_ACCESS_TOKEN` with an authorized Sites dispatch token; the worker sends it only to the configured origin. `pnpm worker --once` services at most one queue tick. The hosting release configures Orbio and worker authentication but does not provision a persistent external worker automatically. Paid work is never put in a 30-second request background task. Keep the Work page open for on-demand runs. For continuous operation, deploy the supplied container with `docker compose -f worker/compose.yaml up -d --build`, after setting the environment variables above. The container needs no Orbio credential: only the backend does.

Expired execution leases are quarantined after a two-minute grace period. Their compute reservations remain held and receipts record unresolved settlement. Inspect provider usage before recovery; do not blindly rerun paid calls. Worker health is recorded only after a successful queue tick. Manual REVIEW commands require a reviewed administrative workflow before enabling execution. Add alerting and retention/cleanup before sustained traffic.

## Standard Next.js deployment

`pnpm dev:next` and `pnpm build:next` use a separate `.next-node` output with the Node platform adapter. This is a real Next.js compilation target. The adapter uses local SQLite/artifact files and is appropriate for development or a single persistent-volume Node instance. Do not use it unchanged on stateless Vercel functions. For Vercel, port repository/storage adapters to PostgreSQL/Supabase and object storage, retaining the separate worker.

## Release checks

Run unit/API tests, strict typecheck, lint, both builds, desktop/mobile route checks, private job isolation and live-provider missing-key tests. Verify migration coverage, ensure `.env*` files remain ignored except `.env.example`, and confirm no private keys/generated test state enter the source archive. Use the deployment status response as publication verification.

## Launch status

`/launch` exposes current resource, model, mainnet, worker heartbeat, terms and release checks. It is an operational checklist, not proof of a launchpad listing. A real mainnet token and launchpad record must be created and verified separately. Switch both server and wallet configuration to chain 4663 only with the genuine deployment. The current hosting audience is public; token release remains gated separately. Setting `CTRL_PUBLIC_RELEASE=true` does not itself grant public access. Burn is excluded. Flexible allocation remains disabled until its contract is deployed and reviewed; holding utility does not require allocation.
