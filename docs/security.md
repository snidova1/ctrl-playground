# Security boundaries

Secrets are read on the server from runtime bindings/environment. There are no production addresses, keys or private wallet credentials in source. Public WalletConnect IDs are not secret. Private keys are never requested.

Sessions are random opaque tokens stored hashed, HttpOnly, SameSite=Lax, Secure over HTTPS and time-limited. EOA challenges bind wallet/origin/chain and use a short-lived nonce that is atomically consumed once. Signature verification grants session access, not transaction authority. Contract-wallet signatures are not supported by this MVP.

Every mutating application request requires a same-origin JSON request, length limits, schema validation and a database rate-limit window. Worker ticks use a separate strong bearer secret and do not accept browser origin as authority. Private mission, event, receipt and artifact access checks ownership independently of the UI. Missing credentials fail closed; production refuses demo sessions.

CONTROL allocations and related mutations use database batches, available-capacity predicates and quota/state guards. Support cannot enter a selected command. Operation IDs prevent routine duplicate allocations. Remaining operational concerns include distributed retry/error reconciliation and operator moderation; do not assume the MVP is an audited token/governance system.

Tools are allowlisted by task kind. Mission text cannot execute shell commands, read server files, call arbitrary endpoints, send messages, transfer tokens or publish into external accounts. Consequential/uncertain requests enter REVIEW. Keyword classification is a conservative MVP aid, not a complete abuse classifier. All execution remains behind explicit tool capabilities and finite budgets.

URLs require HTTPS, reject credentials/custom ports, local/private-style hosts and IP literals. The executor calls fixed approved Orbio origins and refuses redirects. It does not implement arbitrary server-side URL scraping, so DNS-rebinding-capable arbitrary fetch is not enabled. If adding a scraper, require DNS/IP checks at every hop and egress isolation.

Search content is untrusted source material, never executable instructions. React escapes textual output. No raw HTML is injected into receipt views. Artifact downloads verify stored hashes, use attachment disposition, `nosniff` and a sandbox CSP. HTML builds contain escaped data and are not executed inside CTRL. CSP and permissions headers restrict browser capabilities; tighten script nonce policy before adding third-party scripts.

Paid call settlement is explicit. Running/settlement-pending calls are not blindly retried. Unsettled charges reserve allowance; provider request caps/pricing preflight and budget limits constrain known work. Receipts prove integrity of stored bytes, not factual truth or on-chain inclusion.

Production launch work: reviewed token/lock contracts, indexing for holding history, verified moderation signal producers, monitoring, stale-lease reconciliation, session/rate-window cleanup, backups, billing reconciliation, wallet-device testing and a security review of live provider credentials. No contract audit is claimed.
