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

## Paid Orbio integration — 2026-10-05

An explicit one-mission live test passed using the production provider, actual web search and `openai/gpt-6-luna`. Report storage, artifact hash and permanent receipt were verified. Settled mission cost: US$0.00634955 (US$0.03 ceiling). A separate 3-result authentication probe cost 0.0033 CREDIT. No launch transaction, lock or burn was performed. See orbio-integration.md for provenance and the opt-in test command.

### Hosted live verification

The deployed production runtime authenticated the funded testnet signer and read 64,000 tCTRL / ARCHITECT without a demo credential. Private job `CTRL-36E43962` executed through the authenticated tick endpoint and completed using Orbio search plus `openai/gpt-6-luna`. Settled cost: US$0.0059985. Receipt SHA-256: `4fc6b58dbd5335851d008672988b1347b202cc9cf76a46d1f9a5cf474383b0a0`. The receipt remains private to its wallet; it is not a public archive entry.

An earlier hosting-only transport failure was fixed by using manual redirect handling and explicitly refusing 3xx responses; the Cloudflare runtime did not accept the previous redirect mode. The gateway balance read confirmed no charge for that failed attempt. Fifty routine tests, strict typecheck, lint and the hosted build passed after the correction. The standard Next.js build passed in the preceding release. The worker was invoked for this bounded verification only; no persistent 24/7 worker has been provisioned.

## Landing and launch preparation — 2026-10-06

The entrance now contains three lazy-loaded spatial modules with native selection/entry controls, GSAP transitions, reduced-motion support and a canvas renderer fallback. Mobile presents only the selected module. Software mesh winding was corrected to preserve legible CRT screens and weather surfaces.

52 unit/API tests passed during preparation, including concurrent daily resource reservation, settled-release and unknown-liability boundaries. The local mobile preview was inspected at a 390×844 iframe viewport. Explicit demo access, public proposal/support, mission progress, personal JSON transformation and private receipt hash verification were exercised through the visible UI. The local preview initially lacked the new compute-reservation migration; it was applied, and a fresh private transformation completed with a verified receipt. Production packaging includes the generated migration and Drizzle metadata.

The delivered film is an actual 30-second 1920×1080 H.264/AAC render at 24 fps, with an original synthesized score. Twelve X posts were checked below the 280-character limit. No posts were published.

## 2026-10-06 release continuation

- Routine domain/API suite: 60 tests passed across 11 files, including new launch registration/heartbeat and interrupted lease tests.
- Paid opt-in Orbio execution: CTRL-0B0EC9BE, settled US$0.006127425 within a US$0.03 cap; actual receipt hash recorded in orbio-integration.md.
- Real signed testnet holder test repeated successfully: balance, tier, authentication, proposal and support. This does not verify mainnet CTRL.
- Full-screen Internet Weather and Agent Orbit inspected at desktop and 390 × 844 layouts through the managed preview. Hour control, pause and agent approach work. Preview browser used the software renderer for Orbit; GPU frame time/memory remain unmeasured.
- New launch UI shows missing connections rather than a false ready verdict; missing provider credentials degrade explicitly.
- Smart-contract audit, arbitrary world generation, PMF, listing completion and unattended worker hosting are not established by these checks.

## Common Ground alpha — 2026-10-09 (Asia/Jakarta)

The entrance is now one shared walkable 3D courtyard. Browser integration uses the actual React/R3F scene, local CC0 GLBs and actual plaza API handlers against a fresh SQLite database, served through Playwright request fixtures. Desktop (1440×960) and mobile (390×844) both passed guest entry, WebGL render, free object assembly, preview test, placement, persistence after reload, sharing with an independent session and owner-only removal. Screenshots were inspected. No JavaScript runtime errors or horizontal document overflow were observed. The unauthenticated session probe intentionally returns 401 before guest entry.

Visual testing caught and fixed a duplicated FBX mesh/bone animation target and stale skeleton bounds that made the avatar disappear. Character rendering was consolidated from 124 draw meshes to seven. Testing also caught `crypto.randomUUID` being unavailable in the HTTP preview; client-generated action/object IDs now use a secure `getRandomValues` fallback. Sign line breaks and mobile antialiasing were corrected. The model gateway uses the Cloudflare-compatible manual redirect mode and rejects redirects.

The five plaza unit/API tests cover strict recipes, collision boundaries, shared object durability, session isolation, owner enforcement, idempotent actions, interaction proximity, persistent drink inventory, CSRF, unsafe inputs, overspeed and refusal of simulated wallet access to paid generation. They join the 60 pre-existing tests. Software-rendered Chromium verifies behavior and composition, not real iPhone thermal limits, hardware frame rate, production load or Core Web Vitals. The hosted HTTP runtime is a separate verification boundary; the offline fixture is not claimed as a hosted end-to-end test.

This revision does not execute a mainnet transaction or a paid object-generation request. Earlier testnet/Orbio results above are historical evidence, not a fresh verification of the new object generator. The public alpha still requires WebGL, has bounded shared capacity, and does not provide arbitrary mesh/code generation.

Additional browser checks passed: desktop movement to a placed dispenser, on-screen Get a drink interaction, bag increment, Drink decrement, and mobile joystick movement. The preflight now detects missing WebGL before constructing the scene, presents a readable fallback, and avoids an unhandled Three.js context creation error. Rendering pauses while the page is hidden. The holder passport no longer presents allocation or lock controls.


## The Maker character release — 2026-10-09

- Real skinned GLB inspected from front, back and portrait cameras, and in walking, seated and celebration poses. All six named clips are embedded; skin and eye images are embedded too. No external model/texture URLs are required. The animation inspection recomputes posed skin bounds, rather than reporting cached rest-pose bounds.
- Real desktop/mobile courtyard fixtures passed again with The Maker. Existing movement, assembly, object testing, placement, persistence, sharing, dispenser use and removal remain functional. An additional desktop flow creates a bench, sits, enters the seated loop, stands and removes it. The inspected seated screenshot confirms the character fits the revised bench height.
- TypeScript and lint passed with no warnings. All 65 application tests across 12 files passed. No browser runtime exceptions or horizontal overflow were observed. The expected pre-join 401 remains part of guest session negotiation.
- The model uses 32,476 triangles, nine material primitives, six clips and a roughly 2.99 MiB self-contained asset. The same material geometry/textures are cached across visitors; their skeleton poses remain independent. This does not establish hardware FPS or mobile thermal performance.
- This release changes the avatar and its physical bench fit. It does not complete mainnet launch, add unrestricted model generation, or replicate seated/emote state to other visitors. Existing alpha boundaries still apply.
