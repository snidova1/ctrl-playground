# Security boundaries

> Current Common Ground alpha (2026-10-09): see [the plaza architecture and release boundary](common-ground.md). The shared courtyard and holder passport use holding thresholds only; no lock, burn or CONTROL allocation is required. Older mission-workbench sections below describe retained legacy routes.

Secrets are read on the server from runtime bindings/environment. There are no production addresses, keys or private wallet credentials in source. Public WalletConnect IDs are not secret. Private keys are never requested.

Sessions are random opaque tokens stored hashed, HttpOnly, SameSite=Lax, Secure over HTTPS and time-limited. EOA challenges bind wallet/origin/chain and use a short-lived nonce that is atomically consumed once. Signature verification grants session access, not transaction authority. Contract-wallet signatures are not supported by this MVP.

Every mutating application request requires a same-origin JSON request, length limits, schema validation and a database rate-limit window. Worker ticks use a separate strong bearer secret and do not accept browser origin as authority. Private mission, event, receipt and artifact access checks ownership independently of the UI. Missing credentials fail closed; production refuses demo sessions.

CONTROL allocations and related mutations use database batches, available-capacity predicates and quota/state guards. Support cannot enter a selected command. Operation IDs prevent routine duplicate allocations. Remaining operational concerns include distributed retry/error reconciliation and operator moderation; do not assume the MVP is an audited token/governance system.

Tools are allowlisted by task kind. Mission text cannot execute shell commands, read server files, call arbitrary endpoints, send messages, transfer tokens or publish into external accounts. Consequential/uncertain requests enter REVIEW. Keyword classification is a conservative MVP aid, not a complete abuse classifier. All execution remains behind explicit tool capabilities and finite budgets.

URLs require HTTPS, reject credentials/custom ports, local/private-style hosts and IP literals. The executor calls fixed approved Orbio origins and refuses redirects. It does not implement arbitrary server-side URL scraping, so DNS-rebinding-capable arbitrary fetch is not enabled. If adding a scraper, require DNS/IP checks at every hop and egress isolation.

Search content is untrusted source material, never executable instructions. React escapes textual output. No raw HTML is injected into receipt views. Artifact downloads verify stored hashes, use attachment disposition, `nosniff` and a sandbox CSP. HTML builds contain escaped data and are not executed inside CTRL. CSP and permissions headers restrict browser capabilities; tighten script nonce policy before adding third-party scripts.

Paid call settlement is explicit. Running/settlement-pending calls are not blindly retried. Unsettled charges reserve allowance; provider request caps/pricing preflight and budget limits constrain known work. Receipts prove integrity of stored bytes, not factual truth or on-chain inclusion.

Production launch work: reviewed token/lock contracts, indexing for holding history, verified moderation signal producers, monitoring, stale-lease reconciliation, session/rate-window cleanup, backups, billing reconciliation, wallet-device testing and a security review of live provider credentials. No contract audit is claimed.

## World runtime boundary
World recipes are strict-schema data, never executable code. Only three registered procedural kits are accepted. Generated private-world reads use mission ownership checks. Local progress is device-only and has no effect on server permissions or CONTROL. Burn and fixed locks are removed; live flexible allocation fails closed until a reviewed contract exists.

## Queue interruption and release checks

An expired mission lease is quarantined after a two-minute grace period. A possibly billed invocation is never automatically retried; unknown settlement retains its reservation. Terminal missions missing a receipt are repaired by the worker. Expired auth challenges, sessions and rate-limit windows are cleaned during worker ticks. Heartbeats are written only after successful ticks, and future or stale timestamps cannot satisfy release readiness.

Launch readiness validates mainnet ERC-20 reads and a token-matching Orbio registration. A funded API key or arbitrary deployed contract cannot satisfy the full release checklist. Optional allocation is disabled; burn has been removed.

Dependency maintenance pins Next.js 16.3.6 and patched transitive packages in the lockfile. The seven-day package maturity policy remains enabled. One exact security patch, source-map-js@1.2.2 (GHSA-68fv-2mgg-jv7q), has a documented maturity exception; this is not a wildcard or global bypass. A dependency audit is an advisory check, not a penetration test or smart-contract audit.
