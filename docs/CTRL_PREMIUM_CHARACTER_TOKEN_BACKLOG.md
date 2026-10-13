# CTRL: Premium ready-made character roster — token-purchase research (FUTURE ONLY)

Research timestamp: 2026-10-14  
Branch: feat/townies-gameplay-stylized-world / PR #30  
Status: **Research and licensing gates only. No purchase, token implementation, shop, contract, or asset import authorized by this note.**

## User decision

CTRL's player avatars must be **fully finished 3D characters**, selectable as whole presets, *without* any modular costume/body/face/hair creator. Baseline players have a set of free characters. Owner now wants to **consider premium complete characters obtainable with a token in a later release**.

For now: **no change to the main character selector**, no price/chain/ticker assumptions, and no deploy of an economy. A future approved premium avatar should look materially better and more distinctive, not be a free character recolor. Players acquire only a non-exportable, non-transferable right to use the avatar **inside CTRL**, subject to legal clearance. Players never receive 3D source files or rights to resell an external artist's model.

## Specific existing catalog candidates

The listed prices below are **the developer's one-time acquisition prices**, never suggested prices in CTRL tokens. All are sourced from real listings; availability, price, contracts and licensing may change. None is approved to be offered as a token purchase until explicit rights clearance.

| Rank | Candidate, exact listing | Developer price observed | Technical compatibility | Pros / risk | Gate |
| --- | --- | --- | --- | --- | --- |
| P0 tech | **Aya — Anime Style** (Deko), Unity Asset Store: https://assetstore.unity.com/packages/3d/characters/aya-anime-style-197624 | **USD 19** | **VRM explicitly included**, Unity humanoid FBX, 11 animations, 6 facial expressions | Cheapest direct fit to current Three.js VRM pipeline; older source model, assess actual appearance and mobile quality | Unity asset store token/blockchain rights expressly approved in writing |
| P0 visual | **Humanoid 3D Charactor_P05_Aki & Mika** (Sabao3179), https://assetstore.unity.com/packages/3d/characters/humanoids/humans/humanoid-3d-charactor-p05-aki-mika-203490 | **USD 28.50** listing price | Humanoid Unity product; **VRM not confirmed**; Magica Cloth 2 dependency referenced | Potential cohesive premium anime appearance, evaluate both advertised characters and conversion workload | Confirm bundled model files and token rights, build clean Three.js VRM export |
| P1 | **Mei 3D Anime Style Character** (Rolo), https://assetstore.unity.com/packages/3d/characters/mei-3d-anime-style-character-356774 | **USD 20** | Unity product, dependency listed; **VRM not verified** | Original anime model, inspect actual look vs CTRL art direction; package 84.4 MB, not runtime size | Confirm file format, Unity shader migration, animation and blockchain approval |
| P1 | **Fran: 3D Anime Character** (Antro), https://assetstore.unity.com/packages/3d/characters/humanoids/fran-3d-anime-character-351604 | **USD 20** | Fully humanoid rigged, Magica Cloth 2 on original Unity prefab; VRM not confirmed | Distinct premium character; convert/reset cloth physics appropriately; 157.8 MB package is **not** necessarily the runtime model size | Licensing clearance and controlled performance conversion |
| P1, HIGH PERF RISK | **Doe: 3D Anime Style Character** (Antro), https://assetstore.unity.com/packages/3d/characters/humanoids/doe-3d-anime-style-character-364018 | **USD 20** | Unity humanoid, 128 facial blendshapes, lilToon, optional Magica Cloth 2, VRM not confirmed | High detail, **189,500 polygons / 98,300 verts and 2K-4K textures**. Must demonstrate optimized phone WebGL fps and memory before acceptance | License+mobile LOD/texture gate; no automatic pass |
| P2 direct VRM | **Lulu (ルル)** by Stella, BOOTH: https://booth.pm/en/items/6006731 | **JPY 10,000 commercial license tier** (JPY 5,000 personal tier not enough) | **.vrm and .vroid files** included | Seller explicitly permits use as a character in self-made games, commercial use on correct tier. **But prohibits redistributing model or textures**, making public-web delivery and token character shop potentially conflicting. | Written permission from creator expressly allowing browser 3D model delivery and token-gated in-game avatar access **before acquiring/importing** |
| P2 maybe male | **3D Anime Male Avatar for VRChat and Gaming**, CGTrader: https://www.cgtrader.com/3d-models/character/man/3d-anime-male-avatar-for-vrchat-and-for-gaming | **USD 17** shown in indexed marketplace listing (verify live checkout) | Advertises VRM, FBX, humanoid rig, facial and hair/cloth physics | Useful to ensure premium roster is not all female, but verify provenance/originality, actual file versions, mobile performance and license. | Per-model rights and user-facing token payment approval before import |

### Useful ready-made *free/core* visual quality references (NOT premium token products)
- **Kaya**, Fox Jump: https://fox-jump.itch.io/kaya-anime-character — name-your-price, VRM+FBX; commercial game use claimed, rigged but no built-in animations.
- **Nao**, Fox Jump: https://fox-jump.itch.io/nao-anime-character — same general terms and VRM+FBX.
- **Miyu**, Fox Jump: https://fox-jump.itch.io/miyu-anime-character — same general terms and VRM+FBX.
- **Kai**, Fox Jump: https://fox-jump.itch.io/kai-vroid-model — two male VRM+FBX models, name-your-price; clothes are credited to additional creators; ensure their license chains permit the intended bundling.
- These should **not** be marketed as exclusive/sold as proprietary original CTRL content simply because files can be downloaded free.

## CRITICAL legal distinction: token-gated unlock is NOT automatically authorized

**Unity Standard Asset Store EULA** (https://unity.com/legal/as-terms):
- Section 2.2.1(d) generally allows monetizing an asset **embedded within a substantial standalone game, including in-app purchases**.
- Section 2.2.1.1(b) forbids enabling users to sell/transfer/distribute/commercialize the underlying asset.
- **Section 2.2.1.1(f)** says **without express authorization** no use of Assets in any **digital representation of value, ownership or contractual rights**. A cryptocurrency-token payment or onchain entitlement could implicate this restriction; do NOT treat generic in-app-purchase rights as approval for CTRL's planned token shop. Ask publisher/Unity for written permission describing the exact on-chain payment + character-use entitlement model. Consult licensing counsel if unclear.
- Section 2.2.1.1(c) restricts monetization when the product's primary purpose is user-generated content without express permission. CTRL includes a Habitat world builder, so evaluate this too.
- Unity model licenses **do not become sublicenses to users**; don't sell, export, NFT mint, transfer or market third-party source-model ownership.

**BOOTH/VRoid assets:** The Lulu example allows commercial self-made game use when commercial tier is purchased, **but bans model or texture redistribution**. WebGL browsers necessarily fetch 3D files: watermarking, URL obfuscation, gating or client-side encryption does not make an unauthorized download permissible. Secure **written explicit web-game redistribution + token-gated selection permission** before using a candidate of this kind. Do not hotlink BOOTH files.

**Fab general standard license** (https://www.fab.com/eula?lang=en) permits embedding assets in commercial projects but forbids standalone redistribution/resale. A paid character selection integrated inside a broader game still needs platform-specific crypto and no-resale terms checked, so don't assume all Fab assets work onchain.

## Product/technical concept for a later owner-approved feature

No cosmetic editor. Whole-character-only catalog:

- `characters` catalog: immutable `characterId`, preview thumbnail, bundled VRM URLs/LOD, `access = free | premium`, optional `premiumProductId` (only after explicit licensing).
- Free characters remain available to every connected player; **never require paid purchase to enter Habitat or Common Ground**.
- Future purchase grants `walletAddress -> characterId` **in-game use entitlement**; no model download button, reselling characters, NFT minting, wallet-to-wallet transfers or external marketplace.
- Do not expose unlocked premium model choices to unauthorized wallet profiles. Important limitation: VRM assets rendered in a browser are technically retrievable by the client; access control prevents casual access but cannot promise DRM.
- Wallet purchase receipt should be independently verified on the backend, idempotent against repeated callbacks, bound to the authorized chain/contract+token and exact product ID, and persist across sessions. Confirmations, reorg handling, refunds and administrative disable controls need specification before implementation.
- Purchasing a premium character must not affect core gameplay, jobs, housing, movement speeds, world access or progression. **Cosmetic only**.
- Network, token ticker/contract, payment pricing, exchange-rate calculation, taxes, jurisdiction/compliance, burn/treasury destination, refund mechanics and transfer policy remain **UNSPECIFIED by user**. Do not invent them or ship a token contract until user supplies or explicitly approves the economics.
- No royalty-free asset is automatically an authorized NFT, metaverse mint or onchain tradable item.

## Approval checklist for each asset

- [ ] Source listing and proof of purchase (if paid), exact model version, official license copy, writer's permission for **token/onchain in-game cosmetic sale + public browser game distribution**.
- [ ] SHA-256 file evidence, creator attribution if required and all subcontracted clothing/texture license chains reviewed.
- [ ] Rig/bone+animation retarget tested: idle/walk/run/sit/dance/high-five; VRM embedded meta validated; alpha/hair and spring bone compatibility checked.
- [ ] Actual browser render screenshots: front/back/side, Common Ground and Habitat, desktop Chrome, iOS Safari, Android Chrome.
- [ ] Mobile performance measured on actual device; geometry/material/texture optimized where needed, not assuming Unity URP effects work in Three.js.
- [ ] Distinct, polished art that visually matches CTRL's cozy style; avoid cyberpunk/sci-fi default.
- [ ] Purchased characters are offered as whole presets; **no builder/wardrobe editing or new XP/level/reward economy**.
- [ ] Before release: approve source-asset acquisition spending, final roster, premium token product specification, and go/no-go on legal permissions.

## Snapshot & execution guardrail

**Nothing bought, downloaded or implemented by this note.** Do not add a shop to PR #30 while the existing full-game rebuild and basic free-character roster are unfinished. Treat this as a separate future backlog feature with clear authorization gates, not a reason to mark PR #30 complete.
