# Deployment

## Hosted Worker / D1 / R2

The supplied managed hosting project declares logical `DB` and `BUCKET` bindings in `.openai/hosting.json`. Build through the included Sites helper (`pnpm build`), which preserves the framework/auth/connector worker. Publish the generated worker/assets archive through the hosting workflow. Do not serve only the browser bundle: the product requires its API and database.

Apply `drizzle/0000_fair_susan_delgado.sql` to a fresh D1 database before traffic. For an independently managed Cloudflare deployment, define D1/R2 bindings with those names, migration directory `drizzle`, Worker entrypoint from the generated `dist/server` configuration, and static assets from `dist/client`. Use standard D1 migration tracking for subsequent releases. Never reapply the initial migration over existing tables blindly.

Demo deployment needs no paid credentials. It uses `CTRL_MODE=mock` (default), retains durable data, and labels simulated entitlement/resources/outputs. Set `APP_ORIGIN` to the deployed origin if using reverse proxies. Do not set a real API key in mock mode to imply that mock work is billed.

## Live runtime values

| Variable | Purpose |
| --- | --- |
| `CTRL_MODE` | `mock`, `development`, or `production` |
| `APP_ORIGIN` | Exact trusted HTTPS origin for requests/challenges |
| `ORBIO_API_KEY` | Secret gateway credential |
| `ORBIO_MODEL` | Exact currently discoverable text model |
| `ORBIO_BASE_URL` | Trusted official origin; defaults to current API host |
| `ORBIO_AGENT_ID` | Optional future agent-specific resource inspection |
| `CTRL_TOKEN_ADDRESS` | Genuine reviewed token deployment; blank until deployed |
| `CTRL_RPC_URL`, `CTRL_CHAIN_ID` | Server chain reads; target Robinhood Chain 4663 |
| `CTRL_LOCK_ADDRESS` | Reserved reviewed lock deployment; live adapter remains to be connected |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Public pairing ID, supplied at build time |
| `WORKER_SECRET` | At least 32 unpredictable characters for worker authentication |
| `DEMO_AUTH_ENABLED` | Optional development demo; always refused in production |

OPENAI_COMPATIBLE fields are reserved; no live adapter selection is implemented for them. Missing Orbio credentials fail gracefully rather than fabricating work. The website deployment does not accept token launch agreements. A separate testnet-only CLI can deploy the disposable integration token; it refuses other chain IDs and enforces a gas budget. See testnet.md.

## Separate worker

Run `worker/run.ts` on a long-running Node/container service with `APP_ORIGIN` and `WORKER_SECRET` matching the API. `pnpm worker` polls the tick endpoint, awaits completion and stops cleanly on termination. One worker is sufficient for MVP throughput. Production private jobs persist in the queue and await that service. For an owner-private Sites origin, also configure `SITE_ACCESS_TOKEN` with an authorized Sites dispatch token; the worker sends it only to the configured origin. `pnpm worker --once` services at most one queue tick. The hosting release configures Orbio and worker authentication but does not provision a persistent external worker automatically. Browser requests do not start long paid work with a 30-second background deadline.

Inspect interrupted leases/provider settlement before recovery; do not blindly rerun paid calls. Manual REVIEW commands require a reviewed administrative workflow before enabling execution. Add alerting and retention/cleanup before sustained traffic.

## Standard Next.js deployment

`pnpm dev:next` and `pnpm build:next` use a separate `.next-node` output with the Node platform adapter. This is a real Next.js compilation target. The adapter uses local SQLite/artifact files and is appropriate for development or a single persistent-volume Node instance. Do not use it unchanged on stateless Vercel functions. For Vercel, port repository/storage adapters to PostgreSQL/Supabase and object storage, retaining the separate worker.

## Release checks

Run unit/API tests, strict typecheck, lint, both builds, desktop/mobile route checks, private job isolation and live-provider missing-key tests. Verify migration coverage, ensure `.env*` files remain ignored except `.env.example`, and confirm no private keys/generated test state enter the source archive. Use the deployment status response as publication verification.
