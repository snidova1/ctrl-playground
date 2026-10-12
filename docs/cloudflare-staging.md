# Standalone Cloudflare staging

The default build remains ChatGPT Sites-compatible. Explicit `CTRL_HOSTING_TARGET=cloudflare-staging` selects the standalone Worker and disables the Sites auth/mock and connector plugins. No existing ChatGPT Site is deployed or modified by this pipeline.

## Single deployment authority

Use `.github/workflows/cloudflare-staging.yml`, not Cloudflare Git integration in parallel. PRs to `work/master-integration` or `deploy/staging` run tests, typecheck, the existing Sites build, and a standalone build. Only a push to `deploy/staging` may deploy, and only after verification passes. Manual workflow dispatch runs verification only. Production has no deployment path.

`CTRL_MODE=production` is the application's real-auth runtime mode, **not the deployment environment** (the application only supports mock/development/production). The Worker name, origin, resource bindings and deployment target remain staging-only. Demo auth and public release are disabled.

## Resources and GitHub configuration

Provision isolated resources in the selected Cloudflare account:
- Worker `ctrl-staging` (created on first deploy).
- D1 database `ctrl-staging-d1` with its actual UUID; never use a production database.
- R2 bucket `ctrl-staging-r2` (R2 must be enabled on the account).

Configure repository or GitHub environment `staging` variables:
- `CLOUDFLARE_ACCOUNT_ID`: actual 32-hex Cloudflare account ID.
- `CTRL_STAGING_D1_ID`: actual UUID returned when creating staging D1.
- `CTRL_STAGING_ORIGIN`: `https://ctrl-staging.<your-workers-subdomain>.workers.dev`.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect project ID with staging origin allowed.

Configure environment `staging` secret:
- `CLOUDFLARE_API_TOKEN`: limited to this account, with Workers Scripts edit, D1 edit/export and the relevant R2 access. Do not put it in files tracked by git.

Runtime application secrets such as `ORBIO_API_KEY` and `WORKER_SECRET` must be installed directly on `ctrl-staging` using Wrangler secrets, not bundled into Vite or committed. Consult `.env.example` for application configuration. Secrets are not supplied to PR verification jobs.

Cloudflare credentials are currently not configured in this workspace. Resource creation, remote migrations, deployment and browser acceptance cannot run until valid account access is supplied. GitHub authentication alone is not Cloudflare deployment authorization.

## Local build and release

Export the non-secret variables above and `CTRL_HOSTING_TARGET=cloudflare-staging`, then:

```sh
pnpm install --frozen-lockfile
node --test tests/cloudflare-config.test.mjs tests/cloudflare-deploy.test.mjs
pnpm test
pnpm typecheck
pnpm build
# CLOUDFLARE_API_TOKEN is required only for remote operations:
node scripts/cloudflare-staging.mjs validate
node scripts/cloudflare-staging.mjs deploy
```

The script rejects non-staging targets, Sites-built artifacts and placeholder D1 IDs. A failed backup or migration stops deployment. It validates the standalone artifact, writes a staging-only D1 config, exports a nonempty D1 SQL backup, lists/applies pending migrations using Wrangler's tracker, and only then deploys `dist/server/wrangler.json`.

`.cloudflare-staging/` (generated configs and backups) is gitignored. The deployment job uploads the SQL backup as a private Actions artifact even after a subsequent failure; deployments are not cancelled by a newer push. Set appropriate artifact access/retention because SQL exports may contain application data.

Migration SQL must be backward compatible with the previously running staging Worker: migrations happen before deploy. Do not replay raw SQL or reuse a populated database migrated with a different tracker. Wrangler tracks new staging migrations; it does not automatically import the application's custom local tracker. Backups do not constitute an automatic rollback plan.

## Acceptance after deployment

Before enabling production or moving any users, verify on the actual staging URL:
- Wallet connect/sign-in/sign-out and rejection of forged Sites identity headers.
- VRoid avatar load, textures and animation.
- Habitat render, movement and persistence after reload.
- Builder edits and persistence after reload, including a second session.
- D1/R2 upload/download and saved world data.

These browser checks and live remote migrations are **not yet verified**. The visual comparison branch `visual/habitat-cozy-comparison` is separate and is not automatically included in this infrastructure branch.
