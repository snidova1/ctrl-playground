# CTRL — Free finished characters for FUTURE token-CTRL unlocks

Updated 2026-10-14 (WIB) | PR #30 | Research shortlist, **no asset imports, payments or shop implementation yet**

## Correct owner interpretation (supersedes paid asset backlog)

- **Developer pays $0/¥0 to acquire these source character assets.** Do NOT buy any commercial character models for this feature. The previously-added paid procurement research was withdrawn.
- **Players may later spend the CTRL token to unlock selected premium-looking completed characters INSIDE CTRL.** Token amount, chain, wallet UX, contract, implementation date and pricing are deliberately **not specified**.
- Player avatar choice = **complete, ready-made 3D model only**. No modular hair, wardrobe, body/facial sliders or geometries procedurally manufactured in Three.js.
- Premium = gameplay **cosmetic access/entitlement**, not copyright/exclusive ownership of a freely licensed model, NFT, raw asset download, or transferable artist IP. Never claim to customers that a CC0 external model is CTRL-exclusive.
- Preserve a free starter roster for all players. The eventual paid-character feature does not alter activity rewards, XP, levels, token issuance, holder thresholds, housing, jobs or progression. No new currency; don't invent a token economy.
- This file is an **asset acquisition and product-research note**. **Do not implement token checkout, smart contracts, production rollout or paid tiers until owner explicitly approves their economics.**

## Verified source candidates (all listed downloads ¥0/free at research time)

| # | Character | Owner / exact source | Published source / verified rights | File details | Priority |
| - | - | - | - | - | - |
| 1 | **Ameko (fox-woman)** | HENGE, https://booth.pm/en/items/5407175 | BOOTH **¥0**, creator explicitly publishes **CC0_FBX and CC0_Texture** with rights to incorporate into software, modify, redistribute and sell. Other Unity/emote/shader content has its **own** terms. | Full Unity Humanoid, 6 authored outfits and 2 colorways. **402 MB archive is not runtime model size.** Requires importing full selected preset via FBX->VRM/GLB optimization and verifying web animation. | **P0 art / P1 engineering** |
| 2 | **Himiko 2022** | HENGE, https://booth.pm/ja/items/4023978 | BOOTH **¥0**. Creator explicitly releases the model's FBX and textures under **CC0**, including incorporating into software, distributing or selling; separate third-party Unity motion/shader material must not be blindly copied. | Unity Humanoid rig, FBX textures; **not yet a proven native VRM**. Full-model import/retarget once, no user customization. | **P0 art / P1 engineering** |
| 3 | **Shapell Maid (VRM1.0)** | sashii, https://booth.pm/ja/items/7421313 | BOOTH **¥0**, CC0 derivative of Shapell base with no additional restrictions according to artist. Source base: https://booth.pm/ja/items/1819556. | Finished maid-outfit character, **VRM 1.0**, 11.8MB archive, art/style QA required. | **P0 direct VRM** |
| 4 | **Syaoty Normal_cc0 ONLY** | yomox9, https://booth.pm/en/items/2276392 | BOOTH **¥0**; **ONLY `Normal_cc0`** is CC0. `dress1_not_CC0` is explicitly excluded, even though also ¥0. | Full character archive includes VRM and PMX; download **Syaoty_01.zip**, not dress1. Verify character has a complete usable outfit and license inside archive. | **P0 direct VRM** |
| 5 | **Kin (Anime v05 / appropriate whole preset)** | yomox9, https://booth.pm/en/items/2246156 | BOOTH **¥0**. Creator explicitly describes CC0, commercial use and no attribution requirements. | Finished anime-styled original character; v05 anime pack, multiple variants. **Some newer v06/v07 packs may be .vroid-only**, so inspect which ZIP contains a finished VRM, rather than requiring a new creator pipeline. | **P0 direct VRM when confirmed** |
| 6 | **Peno_v01** | yomox9, https://booth.pm/ja/items/2360776 | BOOTH **¥0**, described by creator as free/commercial-use/CC0. | Original completed character, includes Cluster .vrm, MMD .pmx, .vroid. Choose the authored complete VRM. | **P1 direct VRM** |
| 7 | **Shoujo A — cat-ear/tail full version** | Kutsushita, https://hub.vroid.com/characters/5271108759876567944/models/6364672505953706157 | Creator declares **CC0**, VRoid Hub lists corporate use, individual commercial use, redistribution, modification permitted; attribution not required. | Black-bob anime school-uniform character with pre-authored cat ears/tail **as a whole model**, not an interchangeable accessory. VRM 0.x, Hub/pixiv login may be needed. | **P1 direct VRM** |
| 8 | **Vita (VRM1.0 CC0)** | Official VRoid beta model converted by Coatie, https://hub.vroid.com/en/characters/4593660874193246717/models/7942721847119018516 | Original official pixiv VRoid **beta** character is CC0; linked VRM1.0 conversion page explicitly permits commercial use and redistribution. | A ready-made whole anime character; useful roster baseline or token-only candidate if sufficiently distinctive. | **P1 direct VRM** |
| 9 | **Sendagaya Shino (VRM1.0 CC0)** | Official VRoid beta character / Coatie, https://hub.vroid.com/en/characters/4593660874193246717/models/7956589129305596116 | Linked VRM1.0 page explicitly states CC0 and permits corporate/commercial redistribution. | Finished anime character; compare with existing Victoria and Fumiriya to avoid bland repeats. | **P1 direct VRM** |
| 10 | **Shidoka_v01** | yomox9, https://hub.vroid.com/en/characters/147151296673391957/models/7590656080364442341 | Tagged CC0; VRoid Hub individually confirms corporate + individual commercial use, redistribution and modifications allowed. | Alternate original anime/horror-adjacent character; default CTRL art direction is cozy, so reject if look does not fit. | **P2 optional** |

### More character-finding pools; DO NOT blindly convert entire catalogs into paid offerings

- Official VRoid beta model CC0 policy: https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use — **only named beta CC0 models** (1–4), HairSample and selected base samples. Stable `AvatarSample_A–C` have separate terms, do not mislabel them CC0.
- Open Source Avatars catalog: https://www.opensourceavatars.com/ / registry https://github.com/ToxSam/open-source-avatars — many VRMs with **per-collection CC0, CC-BY and other terms**, so filter per-model and confirm embedded license.
- Polygonal Mind 100Avatars releases: https://github.com/PolygonalMind/100Avatars/releases — **CC0** ready-made VRM, hundreds of distinctive fantasy/novelty silhouettes. However their README **requests not to sell unchanged models directly**. Because paid token unlocks might be interpreted as selling an unchanged avatar, **do not select them as paid unlocks without substantial creator-approved derivative use or written clarification**. They are more natural as free NPC/event characters.
- Original HENGE catalog includes other free CC0 characters. Author-level permission and asset files still require individual evaluation; `Himiko` and `Ameko` source links above are the researched anchors.
- Never use BOOTH entries that are merely *free to download*, private-use-only, `CC-BY-NC`, `no resell`, or `no redistribution`, e.g. https://booth.pm/en/items/7100270 explicitly bans resell/redistribution/NFTs despite being ¥0.

## Recommended initial **candidate** display, not final approval

- **Cozy anime full models:** Shapell Maid, Kin Anime, Syaoty Normal, Shoujo A cat-ear; choose by real in-engine look.
- **Flagship more detailed characters:** Ameko and Himiko 2022; need a one-time conversion/optimization from creator-supplied source files.
- **Backup roster:** Vita / Shino, retaining existing Victoria / Fumiriya if they remain visual fallbacks.
- Do **not** call any model art-approved until screenshots show it actually improves CTRL over the procedural outfit and fits its non-cyber cozy world. Several public models may be too old, inconsistent, adult-coded, or technically awkward; exclude those after visual evaluation.

## Implementation sequence once a later build is actually authorized

1. Download only **verified ¥0 packages**; no paid tier, checkout or developer acquisition cost. Record source URL, author, exact license text, source archive hash, per-model hash and download date. Check that embedded VRM metadata matches public rights.
2. For FBX sources convert the **entire pre-authored character** into one working VRM/GLB (rig, textures and animation) then export optimized desktop/mobile assets. This one-time technical conversion **is not user-facing modular character creation**.
3. Screenshot candidates from actual CTRL WebGL under shared world lighting, front/side/rear full body, idle/walk/sit/dance/high-five; check phone GPU/foot placement/hair and materials.
4. Retain the existing `CharacterDefinition`, `loadCharacter`, `HumanoidAnimator`, camera and `wallet -> selected characterId` persistence. Use *one immutable full-model ID*. Remove `ModularWardrobe` and hair/body/outfit editing controls once the replacement roster works.
5. Public **free** avatars always selectable. Catalog may **reserve** `unlockMode:'ctrl_token_future'` on art-approved premium visuals, but **no pricing, spending UI, contract, transaction, wallet deduction or entitlement enforcement yet**. No arbitrary token-price tiers.
6. For the eventually user-approved token system, purchases are a **CTRL game-use entitlement** bound to player wallet/profile, not a purchase of third-party IP/model. Persist verification, reject unauthorized unlocks and protect the free roster. Don't claim DRM/exclusivity over CC0 binaries, which can be downloaded elsewhere.
7. Submit functional CI, web/mobile real screenshots, exact model/author rights, sizes and a clear shortlist of approved characters before any implementation is called complete.

## Important status

**Source research completed only**. No models purchased, downloaded, installed, token-priced, token-gated, or deployed by this note. Existing PR #30 game/world work continues as before, and the PR remains draft. No developer buying character models is authorized.
