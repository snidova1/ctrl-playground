# CTRL — Public World, Willow Common and Habitat

**CTRL is a friend.tech-style social economy with worlds.** Anyone can trade someone else's member Keys; buying those Keys does not transfer Habitat ownership or build rights. **Common Ground is a small OPEN-AIR playable landing**, not an enclosed waiting room: visitors immediately receive a random, non-customizable guest avatar and can walk/look around. A verified wallet unlocks avatar customization and **Public World**, including Willow Common. Exploring Public World does not require buying a Key. A personal, buildable Habitat and owner Key are a separate ownership layer.

**Current status: playable alpha, not a mainnet release.** `/` and `/courtyard` open Common Ground; `/public-world` checks the signed-wallet profile API and loads Willow Common using the saved avatar. The new `POST /api/habitat/public-profile` saves identity/appearance without creating or joining a private Habitat. `/world-preview` remains the standalone technical preview. Shared multiplayer/presence, on-chain Key purchase/deployment and ownership-gated Habitat provisioning are not completed by this entry pass. Existing saved Habitat visuals, builder and authorization are preserved. NPCs are not online players. See [the current open-air handoff](docs/common-ground-open-air-pass.md).

## Run

Node 22.13+ (24 recommended), pnpm 11, a WebGL-capable browser.

```sh
pnpm install
cp .env.example .env.local
pnpm db:local
pnpm dev:next
# Open http://localhost:3000
```

No wallet or paid credentials are needed to explore Common Ground. Guests cannot edit avatars or build there. Wallet sign-in is required by the product Public World entry, not by the standalone `/world-preview` development route. Legacy courtyard workshop code and durable object/inventory APIs remain in the repo, unmounted by Common Ground.

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

The courtyard, Habitat and Public World renderers use the approved Victoria and Fumiriya VRoid assets. Public World now receives the allowlisted appearance saved for the signed wallet; the standalone `/world-preview` still defaults to its preview avatar. This is shared identity, not a claim of shared multiplayer state. The optional `/character-preview` route remains available for isolated renderer QA.

```sh
CTRL_CHARACTER_PREVIEW=1 pnpm dev:next
# Open http://localhost:3000/character-preview
```

WASD/arrows walk, Shift runs, Space jumps; touch uses the existing joystick plus run/jump controls. E and the existing interaction buttons still work. The route returns 404 unless explicitly enabled; the main application already uses VRoid.

[VRoid pipeline, customization boundaries, tests and approval gate](docs/vrm-character-pipeline.md).

## Product policy and existing designer limits

Product hierarchy: Common Ground is the open-air guest landing; verified wallet identity/custom avatar opens Public World (Willow Common etc) without a Key purchase. Member Key trading and owner-Key Habitat ownership/build rights are distinct. The old live object designer below is a legacy subsystem policy, not a Public World entry requirement. The avatar bridge does not imply a deployed Key economy or authoritative multiplayer.

For the existing live object designer: **Hold CTRL → pass a configurable balance threshold → access the live designer.** Tokens stay in the wallet. No allocation, lock, staking or burn is required. `config/plaza.ts` owns the threshold and operational allowances. Demo wallet balances never authorize paid object generation. This designer policy is not evidence of Public World holder gating.

The model converts a request into a safe recipe using five authored behaviors. It cannot run generated JavaScript or create arbitrary 3D geometry. Testnet tokens are clearly labeled; an actual mainnet launch address is still required for mainnet holder gating.

## Product / implementation source map

| Area | Location |
| --- | --- |
| Willow Common — Public World with saved avatar; standalone development preview | `app/public-world/`, `features/common-ground/public-world.tsx`, `app/world-preview/`, `features/worldgacha/` |
| Willow Common assets, navigation and provenance | `public/worlds/neighborhood/`, `public/worlds/worldgacha/` |
| Common Ground — small open-air playable guest landing | `app/page.tsx`, `app/courtyard/`, `features/common-ground/` (legacy workshop remains unmounted) |
| Habitat entry, personal worlds and builder — preserved | `app/habitat/`, `features/habitat/`, `server/habitat/` |
| Existing courtyard session, presence, object and inventory API | `server/plaza/service.ts` |
| Existing holder access and wallet (not automatically integrated into Willow Common) | `features/wallet/`, `server/wallet/` |
| Configurable plaza limits | `config/plaza.ts` |
| Durable schema and migrations | `db/`, `drizzle/` |
| Free models and licenses | `public/plaza/` |
| Tests | `tests/unit/plaza.test.ts`, `scripts/test-plaza-render.mjs` |

`/` and `/courtyard` now render the same open-air playable Common Ground; `/public-world` loads Willow Common using the signed wallet's saved avatar. `/habitat` retains the approved personal home/builder. See [current Common Ground implementation and QA](docs/common-ground-open-air-pass.md); the enclosed-room pass was rejected and is historical. `/account` remains the legacy holder passport, and `/worlds` / `/worlds/editor` remain Habitat routes. Earlier mission-workbench routes such as `/commands`, `/work`, `/archive`, `/machine` and `/lab` remain separate from this product entry and the old courtyard designer's threshold-only access loop.

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
