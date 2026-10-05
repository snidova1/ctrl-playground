# MVP verification — 2026-10-04

## Executed checks

- Six Vitest suites, 44 tests passed: CONTROL policy, tiers, command/URL validation, Orbio cost and settlement boundaries, receipt tampering, safe HTML artifacts, API authentication, idempotent support, budget rejection and private-job isolation.
- Strict TypeScript passed. ESLint passed after excluding generated framework output.
- Standard Next.js production build passed, including every product route. The optional WalletConnect peer is installed; its version-check postinstall is intentionally skipped by explicit dependency policy.
- Hosted Worker production build and packaging are release gates in the publishing workflow. See the generated bundle inventory for emitted chunk sizes.
- Repository excludes secrets, build output, local databases and test/browser state. No production token or lock address is fabricated.

## Manual browser checks

All major routes were opened in the running preview. Desktop checks covered the spatial homepage, command arena, world registry, archive, machine instrumentation, operator credential, lab and three distinct worlds. Mobile checks used real embedded viewports at 390 and 320 pixels; core routes and world fallbacks remained accessible. Narrow task drawers and machine resource ticks were corrected to remove observed overflow.

The browser journey proposed a command, allocated 60 CONTROL, selected that command by support, observed worker completion, opened its artifact/receipt and verified its hash. A private JSON transformation completed with a zero-cost local artifact and an owner-only receipt. Simulated locking changed allowance and persisted its unlock date. The injected-wallet dialog loaded; no real wallet transaction was attempted. Signature authentication is exercised with an ephemeral test key at the API boundary, not a funded user wallet.

Dead Web terminal selection updated provenance, Internet Weather's hour/signal controls updated its readings, and Agent Orbit filtering changed the visible map/index. Generated public world records appear in the registry. Report prose is rendered as escaped text; HTML output is an attachment, not an executable embedded page. Receipt verification runs server-side and therefore also works on the HTTP development preview.

## Honest limits

The automated Playwright suite is supplied, but its Chromium download failed in this environment; those tests are not reported as passing. The remote QA browser has no usable WebGL context. Canvas software-rendered Three.js geometry and weather contours were visually inspected; hardware WebGL scenes, actual WalletConnect mobile pairing, real-device GPU timing and Core Web Vitals need follow-up in a suitable browser.

The preview's external Orbio reads showed a deliberate unavailable state. Official endpoints and documentation were researched separately; runtime values are fetched dynamically and are not presented as stale live economics. Paid inference, token balances, real locks and burn cannot be verified without the corresponding credentials/contracts.

Mock mode executes real persistence/event/artifact/receipt code using simulated provider results. It is a runnable MVP, not an audited launch-ready token protocol. Before public funded use, complete contract review, worker monitoring, moderation, stale-lease and paid-settlement reconciliation, backups and live device testing documented in the security/deployment guides.

## Navigation regression repair

Compiled Worker UI testing reproduced a hosted RSC link transport exception that prevented navigation. Product links now use native anchors; private job creation uses full document navigation after the API commits. The homepage browser renderer mounts after hydration to avoid a server Suspense recovery warning. Added a browser regression journey that clicks the visible controls instead of only opening routes directly.

Manual testing of the compiled Worker verified Commands entry, proposal submission, support allocation, worker completion, receipt entry, Lab drawers, private task creation and completion, mobile menu opening, Worlds navigation and world entry at 390 pixels. The 44 unit/API tests, strict type checking, lint and standard Next.js production build passed after the navigation change. Browser automation remains supplied but unexecuted for the environment limitation above.

## Fullscreen exhibition redesign — 2026-10-05

Replaced the dashboard-style entrance with a fullscreen interactive installation, distinct CRT archaeology, atmospheric contour and orbital worlds. Manual preview checks covered exhibit selection, native world entry, CRT record selection and notes, weather hour/layer updates, and the mobile menu at 390 and 320 pixels. The menu manages focus and makes the underlying scene inert. The software renderer preserves spatial objects when WebGL is unavailable.

## Robinhood testnet — 2026-10-05

The funded signer held 0.01 test ETH before deployment. Deployed CTRLTestToken on chain 46630, confirmed its receipt at block 129198978 and matched deployed bytecode to the compiled artifact. Independent live verification confirmed 64,000 tCTRL and a valid signature. Public deployment and verification records are in `deployments/`.

The live API integration test passed (71 seconds): real signer challenge, non-demo session, on-chain holder balance, ARCHITECT access, command submission and 25 CONTROL support allocation. The isolated local database contains these test commands; no production user data was modified. Seven unit/API suites passed (46 tests). Local EVM tests passed deployment, supply, claim/repeated-claim rejection, transfers, allowance and mainnet deployment rejection. Browser wallet signing and faucet confirmation remain user-controlled and were not automated with an injected private key.

The official RPC returned 405 in this environment; the configured publicnode endpoint successfully handled deployment and live reads. Lock and burn contracts remain unconfigured, and inference remains in mock mode. This integration does not constitute an Orbio token launch.
