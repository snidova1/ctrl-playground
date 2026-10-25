# CTRL — Willow Common

**A Heartopia-style cozy life game with friend.tech-style World Keys.** Make an anime chibi resident, live in a pastel seaside town, pick up hobbies, decorate your own home, visit friends — and own your Habitat on-chain through Keys that anyone can trade in CTRL.

## Product intent (kept from the original CTRL design)

| Layer | What it is |
| --- | --- |
| **Common Ground** (`/`) | Small open-air plaza. Anyone can walk in instantly with a random guest avatar — walk, look, emote. No wallet needed. |
| **Public World** (`/public-world`) | The full town of Willow Common. Requires a signed wallet session (no gas). Saved avatar, hobbies, shops, NPC neighbours, real-player presence, friends. Exploring never requires buying Keys. |
| **Habitat** (`/habitat`) | Your personal home: garden plots, a fishing pond, workbench, mailbox and a decoratable cottage. Owner / editor / visitor permissions; friends may visit private homes. |
| **World Keys** (`/keys`) | friend.tech mechanics on `contracts/keys/CTRLWorldKeys.sol`: each wallet's world has Keys on a sum-of-squares bonding curve priced in CTRL, 3% fee on buy and sell, the owner key is 0 CTRL (gas only). Holding someone's Keys never grants build rights. |

In-game coins, items, levels and fashion are **nonfinancial** and never convertible to CTRL or Keys.

## Gameplay

- **Hobbies** taught by mentors: Fishing (Marlo, pier), Gardening (Bea, florist), Cooking (Chef Tomo, café), Bug Catching (Pip, meadow), Birdwatching (Wren, woods), Foraging. Each levels 1–10.
- **Fishing**: face any water (pond / river / sea / your home pond), wait for the bite, then hold to keep the tension in the green. 14 species by water, time of day and weather, with sizes.
- **Bug catching**: sneak up slowly (running scares them), swing the net. 12 species by habitat and time.
- **Birdwatching**: camera mode, frame the bird in the viewfinder, photo quality pays coins. 10 species.
- **Gardening**: 8 crops, water twice, harvest; plots expand with level.
- **Cooking** (timing minigame, 1–3 stars) and **crafting** furniture from wood, stone and flowers.
- **Shops**: General Store (seeds, ingredients, furniture), Petal Boutique (38 outfits with fabric patterns, 12 hats, 10 accessories), sell anything.
- **Daily requests**, town level, energy, album/collection, NPC friendship hearts and gifts, emotes, day/night cycle (48-minute town day) and weather.
- **Social**: real-player presence in town and homes, friend requests, gifts by mail, home visits.

## Run

Node 22.13+, pnpm 11, a WebGL browser.

```sh
pnpm install
cp .env.example .env.local
pnpm db:local
node scripts/dev-node.mjs        # Next.js dev with local SQLite, http://localhost:3000
# Wallet-free full gameplay: http://localhost:3000/preview  (add ?hour=11 to preview daylight)
```

## Check

```sh
pnpm test                         # life rules, map, layouts, API (wallet sessions, ACLs, gifts, presence, keys)
pnpm typecheck
node --test tests/cloudflare-*.test.mjs
pnpm build                        # Sites target; set CTRL_HOSTING_TARGET=cloudflare-staging for the Worker
node scripts/qa/play-preview.mjs http://localhost:3000   # headless gameplay tour + screenshots
```

## Source map

| Area | Location |
| --- | --- |
| Shared rules (server + browser) | `game/core/` — items, map, life reducer, spawns, NPCs, quests, wardrobe, home layouts, Keys ABI |
| 3D client | `game/client/three/` — anime VRM avatars, toon materials, town, home, creatures, sky |
| HUD & panels | `game/client/ui/` |
| API | `server/api.ts`, `server/life`, `server/town`, `server/friends`, `server/habitat`, `server/keys`, `server/wallet` |
| Migrations | `drizzle/` (`0008_town_life.sql` adds town life, presence, friendships, mail) |
| Contracts | `contracts/keys/CTRLWorldKeys.sol`, `scripts/testnet/` |
| Deploy | `.github/workflows/cloudflare-staging.yml`, `scripts/cloudflare-staging.mjs`, `docs/cloudflare-staging.md` |
| Asset credits | `public/kit/licenses/README.md`, `public/characters/LICENSE.md` |

## Deployment

Push to `deploy/staging` → GitHub Actions verifies, builds the standalone Worker, backs up D1, applies `drizzle/` migrations, deploys `ctrl-staging` and runs `scripts/qa/preview-smoke.mjs` against the live URL. See [docs/cloudflare-staging.md](docs/cloudflare-staging.md). World Keys trading turns on when `CTRL_KEYS_*` variables point at a deployed contract ([docs/world-keys-testnet-handoff.md](docs/world-keys-testnet-handoff.md)).
