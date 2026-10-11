# CTRL — Common Ground

A shared courtyard people can enter, change and use. Walk an animated character through a real 3D space, make an interactive object, test it, and leave it for another visitor. CTRL holder access adds a bounded live object designer; public play stays free.

**Current status: playable alpha.** One authored world, five working object types, durable shared objects, real guest sessions and lightweight multiplayer presence. This is not an unrestricted world generator or a mainnet token launch.

## Run

Node 22.13+ (24 recommended), pnpm 11, a WebGL-capable browser.

```sh
pnpm install
cp .env.example .env.local
pnpm db:local
pnpm dev:next
# Open http://localhost:3000
```

No paid credentials are needed to enter, walk, make/place/test objects or use the drink dispenser. The free workshop kit is deterministic and explicitly labeled. Objects and bags persist in SQLite locally and D1 on the hosted runtime.

## What works

- Animated character; WASD/arrows or touch joystick; drag camera; collision boundaries and a walk-in workshop.
- Make → test → position/rotate → place → interact → remove your own object.
- Orange cat dispenser with a working virtual soda bag; bench, lamp, planter and kinetic sculpture behaviors.
- Presence from actual independent sessions, shared persisted objects, owner-only deletion, interaction idempotency, server limits.
- Public entry without a wallet; a holder passport and the existing signed EVM testnet wallet integration.
- Server-only Orbio recipe endpoint, with strict schema validation, timeout and daily request limits. Missing credentials leave the free kit usable.
- Victoria and Fumiriya VRoid characters with persistent, server-validated outfit, hair, eye and skin palettes.
- Free CC0 Kenney and Quaternius assets, local files and documented provenance.

## VRoid / VRM characters

The active Common Ground and Habitat renderers use the approved Victoria and Fumiriya VRoid assets. Signed-wallet profiles persist an allowlisted appearance and replicate it to other visitors. The optional `/character-preview` route remains available for isolated renderer QA.

```sh
CTRL_CHARACTER_PREVIEW=1 pnpm dev:next
# Open http://localhost:3000/character-preview
```

WASD/arrows walk, Shift runs, Space jumps; touch uses the existing joystick plus run/jump controls. E and the existing interaction buttons still work. The route returns 404 unless explicitly enabled; the main application already uses VRoid.

[VRoid pipeline, customization boundaries, tests and approval gate](docs/vrm-character-pipeline.md).

## Product policy

**Hold CTRL → pass a configurable balance threshold → access the live designer.** Tokens stay in the wallet. No allocation, lock, staking or burn is required. `config/plaza.ts` owns the threshold and operational allowances. Demo wallet balances never authorize paid object generation.

The model converts a request into a safe recipe using five authored behaviors. It cannot run generated JavaScript or create arbitrary 3D geometry. Testnet tokens are clearly labeled; an actual mainnet launch address is still required for mainnet holder gating.

## Source map

| Area | Location |
| --- | --- |
| Shared world, controls and workshop | `features/plaza/` |
| Session, presence, object and inventory API | `server/plaza/service.ts` |
| Holder access and wallet | `features/wallet/`, `server/wallet/` |
| Configurable plaza limits | `config/plaza.ts` |
| Durable schema and migrations | `db/`, `drizzle/` |
| Free models and licenses | `public/plaza/` |
| Tests | `tests/unit/plaza.test.ts`, `scripts/test-plaza-render.mjs` |

The homepage `/` is Common Ground. `/account` is the holder passport. Existing `/commands`, `/work`, `/worlds`, `/archive`, `/machine` and `/lab` routes remain as legacy mission-workbench tools. Their earlier CONTROL support and execution systems are separate from the new plaza's threshold-only access loop.

## Check

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build:next
pnpm build
# With an installed Playwright Chromium:
pnpm exec playwright test --config playwright.plaza.config.ts
# Optional offline component/API browser fixture:
node scripts/test-plaza-render.mjs
```

`CTRL_TEST_CHROMIUM=/absolute/path/to/chromium` supports an existing binary. The offline fixture uses real render components/assets and server handlers with an isolated SQLite DB; it does not test hosted networking. See [verification](docs/verification.md) for actual checks and limits.

## Runtime and deployment

The source supports Next.js App Router on Node for development and Vinext App Router / Cloudflare Workers with D1 + R2 for its existing hosted deployment. Production migrations include the new plaza tables. Vercel/Railway migration remains paused; Node's SQLite adapter must not be used on ephemeral serverless storage.

Set server-only `ORBIO_API_KEY` and `ORBIO_MODEL` for live recipes; configure `APP_ORIGIN`, actual chain RPC and token address for holder verification. The older mission engine uses its separate worker and receipt pipeline; immediate plaza actions do not require that worker. Never place credentials in public frontend variables.

[Common Ground implementation and limits](docs/common-ground.md) · [Architecture](docs/architecture.md) · [Deployment](docs/deployment.md) · [Security](docs/security.md) · [Orbio integration](docs/orbio-integration.md) · [Testnet](docs/testnet.md) · [Asset credits](public/plaza/licenses/README.md)
