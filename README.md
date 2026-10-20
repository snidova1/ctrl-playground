# CTRL — Public World, Willow Common and Habitat

CTRL's intended product centers on Public World areas and personal Habitat worlds. **Willow Common is one of the primary Public World areas**, not a disposable visual study. **Common Ground is a small non-holder waiting-room/landing**, not the core plaza or the product itself. The older courtyard object workshop is an existing subsystem, not the definition of Common Ground's intended role.

**Current status: playable alpha components, not a completed integrated Public World.** Willow Common is playable at `/world-preview`, but that implementation remains technically isolated from signed-wallet/holder authorization, saved Habitat worlds and authoritative multiplayer. Correcting the product hierarchy does **not** automatically finish authentication or holder integration. Existing courtyard code has five authored object types, durable shared objects, guest sessions and lightweight presence; those capabilities must not be attributed to Willow Common without implementation and verification. This is not an unrestricted world generator or a mainnet token launch.

## Run

Node 22.13+ (24 recommended), pnpm 11, a WebGL-capable browser.

```sh
pnpm install
cp .env.example .env.local
pnpm db:local
pnpm dev:next
# Open http://localhost:3000
```

No wallet or paid credentials are needed to enter the Common Ground waiting room or try the isolated Willow Common preview. Legacy courtyard workshop code and durable object/inventory APIs remain in the repo, but that workshop is not mounted by the Common Ground route. This is not a claim of shared persistence or holder access in Willow Common.

## What works — separate implementations

Willow Common's `/world-preview` has playable VRM avatars, six NPC residents, constrained navigation, local interactions, touch controls and an atmospheric time cycle. NPCs are not online players. See the [Willow Common handoff](docs/HANDOFF_WILLOW_COMMON_2026-10-20.md) for startup, rendering and QA limits.

The following are existing courtyard/Habitat subsystem capabilities, **not** completed Willow Common integration:

- Animated character; WASD/arrows or touch joystick; drag camera; collision boundaries and a walk-in workshop.
- Make → test → position/rotate → place → interact → remove your own object.
- Orange cat dispenser with a working virtual soda bag; bench, lamp, planter and kinetic sculpture behaviors.
- Presence from actual independent sessions, shared persisted objects, owner-only deletion, interaction idempotency, server limits.
- Public entry without a wallet; a holder passport and the existing signed EVM testnet wallet integration.
- Server-only Orbio recipe endpoint, with strict schema validation, timeout and daily request limits. Missing credentials leave the free kit usable.
- Victoria and Fumiriya VRoid characters with persistent, server-validated outfit, hair, eye and skin palettes.
- Free CC0 Kenney and Quaternius assets, local files and documented provenance.

## VRoid / VRM characters

The existing courtyard and Habitat renderers use the approved Victoria and Fumiriya VRoid assets. Habitat signed-wallet profiles persist an allowlisted appearance and replicate it to other visitors; this does not establish a shared identity/profile in `/world-preview`. The optional `/character-preview` route remains available for isolated renderer QA.

```sh
CTRL_CHARACTER_PREVIEW=1 pnpm dev:next
# Open http://localhost:3000/character-preview
```

WASD/arrows walk, Shift runs, Space jumps; touch uses the existing joystick plus run/jump controls. E and the existing interaction buttons still work. The route returns 404 unless explicitly enabled; the main application already uses VRoid.

[VRoid pipeline, customization boundaries, tests and approval gate](docs/vrm-character-pipeline.md).

## Product policy and existing designer limits

Product hierarchy: Willow Common belongs to the primary Public World experience; Common Ground is only the compact non-holder entry/waiting area. Route names and legacy plaza code do not override that hierarchy. Public World authentication/holder access still needs explicit integration and verification; a working preview or an existing wallet endpoint is not proof it has shipped.

For the existing live object designer: **Hold CTRL → pass a configurable balance threshold → access the live designer.** Tokens stay in the wallet. No allocation, lock, staking or burn is required. `config/plaza.ts` owns the threshold and operational allowances. Demo wallet balances never authorize paid object generation. This designer policy is not evidence of Public World holder gating.

The model converts a request into a safe recipe using five authored behaviors. It cannot run generated JavaScript or create arbitrary 3D geometry. Testnet tokens are clearly labeled; an actual mainnet launch address is still required for mainnet holder gating.

## Product / implementation source map

| Area | Location |
| --- | --- |
| Willow Common — primary Public World area; current isolated preview | `app/world-preview/`, `features/worldgacha/` |
| Willow Common assets, navigation and provenance | `public/worlds/neighborhood/`, `public/worlds/worldgacha/` |
| Common Ground — compact non-holder waiting-room/landing | `app/courtyard/`, `features/common-ground/` (legacy workshop in `features/plaza/` remains unmounted) |
| Habitat entry, personal worlds and builder | `app/page.tsx`, `app/habitat/`, `features/habitat/`, `server/habitat/` |
| Existing courtyard session, presence, object and inventory API | `server/plaza/service.ts` |
| Existing holder access and wallet (not automatically integrated into Willow Common) | `features/wallet/`, `server/wallet/` |
| Configurable plaza limits | `config/plaza.ts` |
| Durable schema and migrations | `db/`, `drizzle/` |
| Free models and licenses | `public/plaza/` |
| Tests | `tests/unit/plaza.test.ts`, `scripts/test-plaza-render.mjs` |

At this checkpoint, `/courtyard` renders the compact Common Ground waiting room, while `/` and `/habitat` use that same scene before sign-in and preserve the existing signed-wallet Habitat flow. `/world-preview` still renders Willow Common separately. See [Common Ground lobby implementation and verified checks](docs/common-ground-lobby-pass.md). This wiring describes implementation, not a finished product entry/access flow. `/account` is the holder passport; `/worlds` and `/worlds/editor` relate to Habitat worlds. Earlier mission-workbench routes such as `/commands`, `/work`, `/archive`, `/machine` and `/lab`, and their CONTROL support/execution systems, remain separate from the courtyard designer's threshold-only access loop.

## Check

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build:next
pnpm build
# With an installed Playwright Chromium:
pnpm exec playwright test --config playwright.entry.config.ts --timeout=180000
# Optional offline component/API browser fixture:
node scripts/test-plaza-render.mjs
```

`CTRL_TEST_CHROMIUM=/absolute/path/to/chromium` supports an existing binary. The offline fixture uses real render components/assets and server handlers with an isolated SQLite DB; it does not test hosted networking. See [verification](docs/verification.md) for actual checks and limits.

## Runtime and deployment

The source supports Next.js App Router on Node for development and Vinext App Router / Cloudflare Workers with D1 + R2 for its existing hosted deployment. Production migrations include the new plaza tables. Vercel/Railway migration remains paused; Node's SQLite adapter must not be used on ephemeral serverless storage.

Set server-only `ORBIO_API_KEY` and `ORBIO_MODEL` for live recipes; configure `APP_ORIGIN`, actual chain RPC and token address for holder verification. The older mission engine uses its separate worker and receipt pipeline; immediate plaza actions do not require that worker. Never place credentials in public frontend variables.

[Product clarification and historical handoff](docs/HANDOFF.md) · [Willow Common handoff](docs/HANDOFF_WILLOW_COMMON_2026-10-20.md) · [Public World implementation/provenance](docs/worldgacha-public-world.md) · [Historical courtyard implementation and limits](docs/common-ground.md) · [Architecture](docs/architecture.md) · [Deployment](docs/deployment.md) · [Security](docs/security.md) · [Orbio integration](docs/orbio-integration.md) · [Testnet](docs/testnet.md) · [Courtyard asset credits](public/plaza/licenses/README.md) · [Willow Common credits](public/worlds/neighborhood/credits/index.html)
