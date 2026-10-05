# Orbio integration

Research checked official launchpad documentation, agent specifications, whitepaper, public model discovery and current terms on 2026-10-04. The integration deliberately distinguishes Orbio compute economics from CTRL's own agent runtime.

Primary sources:

- https://www.orbio.so/launchpad/docs
- https://www.orbio.so/protocol/agents
- https://www.orbio.so/launchpad/whitepaper
- https://api.orbio.so/api/protocol/agents/terms
- https://api.orbio.so/api/v1/models?output_modalities=text
- https://docs.robinhood.com/chain/connecting/

The current gateway uses `https://api.orbio.so/api/v1`, server-side `Authorization: Bearer …`, an OpenAI-compatible chat-completions request, model discovery, `/key` resource information and `POST /tools/web.search`. Search requests provide `query`, `limit` and a bounded `max_cost`; results are normalised from the documented results objects, including optional markdown. The gateway balance funds models and tools. CREDIT activation can add gateway balance; CTRL does not issue an invented AI-credit token.

`OrbioProvider` implements model/search/resource interfaces with a 25-second request timeout, approved official origins, no redirects, source validation, capped output tokens and pricing preflight. Model IDs/prices are discovered rather than assumed. A missing key/model produces an intentional provider-unavailable error. Live modes never silently substitute demo output. The public catalogue and agent terms remain useful without credentials.

Current terms are fetched dynamically. The inspected response identified Robinhood Chain 4663 and launch-fee, conversion, CREDIT, gateway, creator-tax, cliff and pause fields. These values are not hardcoded into runtime policy. Historical/illustrative whitepaper splits should not replace active terms. Documentation also has legacy `www.orbio.so` gateway examples; the adapter supports the trusted official origins and defaults to the current API host.

Authenticated balances preserve exact decimal strings rather than fabricating a number. Provider costs may be pending. HTTP 202 accepted/running and 200 settlement-pending responses are never automatically retried as unpaid failures. Unknown costs reserve the remaining budget and mark receipt settlement pending. Operators must reconcile provider usage before resubmission.

Agent detail retrieval is exposed by the adapter when an agent ID exists. No official holder/trade/volume endpoints were discovered for this MVP; those metrics are not invented. Harvest/reward explanations in documentation are not presented as independently verified live dashboard measurements.

Required live configuration: `ORBIO_API_KEY`, `ORBIO_MODEL` from the current catalogue, optional `ORBIO_AGENT_ID`, a funded gateway account, and current accepted launch terms handled through Orbio's own workflow. This project has not launched a token or accepted agreements for the user.

## Authenticated verification — 2026-10-05

The user-provided key was stored as a server-side hosting secret. `/api/v1/key` returned a funded account; public model/tool discovery and a capped authenticated search succeeded. A full engine integration test executed mission `CTRL-AA91149B` in production provider mode with a US$0.03 limit. Orbio search and `openai/gpt-6-luna` returned a report. Actual settled usage was US$0.00634955. Artifact SHA-256: `adacd292acd5527a822ea64986eeed7adcb7f391e6826579aa6b5a2ba119da73`. Receipt SHA-256: `729de36a44d224b2d4b846d5f6a014714b69016c634728c796b609b74e94b08c`. This test used the local durable engine database; it is not a hosted archive record.

The adapter accepts either the official origin or its `/api/v1` base URL and normalizes it once. Catalogue routers with negative price sentinels are refused because their worst-case cost is unknown. Live queue selection excludes demonstration missions so seeded commands cannot spend real balance. Paid integration tests are opt-in: `CTRL_ORBIO_SECRET_FILE=/absolute/private/runtime.json pnpm exec vitest run --config vitest.orbio.config.ts`. The private JSON contains a `key` property, remains outside source, and is never packaged. The test runs one paid mission; do not include it in routine CI.
