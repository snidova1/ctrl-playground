# CTRL PR #30 — FINAL AVATAR DIRECTION: READY-MADE CHARACTERS ONLY
**Updated:** 2026-10-14 (WIB)  
**Branch:** `feat/townies-gameplay-stylized-world`  
**Status:** User-approved replacement of the previous modular/customization brief. **This note is not a claim that new character binaries have been installed.**

> **LATEST OWNER DECISION, OVERRIDES ALL EARLIER AVATAR-CUSTOMIZATION REQUIREMENTS:** Don't build a character creator or modular wardrobe at all. Provide a **varied roster of complete, beautiful, finished 3D characters**. Players select one whole character. No hair, clothing, color, face, body, shoes, or accessory customization. No procedural mesh wardrobe. Keep gameplay, wallet association, saved character identity, and multiplayer animation.

## 1. The simplest player experience

1. Player connects wallet.
2. Show a clean, visual **Choose Character** screen immediately, with thumbnails and a real 3D full-body preview of each finished character.
3. Player taps one complete character. An optional **Surprise me** button selects a full preset from the approved roster, **not** a random combination of parts.
4. Player confirms. Save a single `characterId` linked to the existing signed wallet/profile. This choice must persist after reload/reconnect.
5. Common Ground, Public World and the player's private Habitat load the **same full character**, with existing movement, emotes, chat and social actions.
6. If an existing Profile entry allows changing characters, it must switch the **entire preset** only. No sliders, palettes, hair selections, wardrobe inventory, marketplace, cosmetics editor or unlock progression.

Keep the character chooser fast, simple and mobile-friendly. Never show a blank text-only avatar. If the model fails, show an error/retry and a safe built-in fallback.

## 2. Hard constraints: DELETE FROM SHIPPED EXPERIENCE

- Remove or hide the existing character-appearance editor choices for `hairId`, `skinId`, `eyeId`, `variantId` and `geometry` (bob/ponytail, cape/apron, boots, beret/glasses/satchel). Don't replace them with a different elaborate editor.
- **Stop rendering `features/plaza/characters/modular-wardrobe.tsx`** in the production player and preview paths. It currently creates capsule/tube/sphere/ring-based geometry that the owner rejected as ugly. Do not merely recolor it.
- Do not add individual interchangeable clothes, hair, accessories or skinned garment pipelines. Whole finished VRM = one selectable character.
- Do not manufacture fake visual variety by tinting Victoria/Fumiriya and calling those different characters.
- Don't add XP, player levels, currency, tokens, rewards, paid skins, holder tiers or character monetization. No permissions/eligibility tied to token balances.
- No unauthorized copied game art. Use assets that permit the exact usage and redistribution in a public web game.

## 3. Asset shortlist (specific sources to inspect)

**Preserve existing CTRL baselines:** The branch already contains working VRM models for Victoria and Fumiriya. These are useful functional fallbacks. New models should be genuinely visually distinct, high-quality, modern/cozy and consistent rather than simply numerous.

| Priority | Source | Link | What it offers | License / adoption |
| --- | --- | --- | --- | --- |
| P0 | Official pixiv/VRoid beta CC0 avatar samples (AvatarSample_1, _2, _3, _4) | https://vroid.pixiv.help/hc/en-us/articles/4402614652569 | Finished female/male-looking anime VRM sample variants; useful foundation for an immediate fixed roster | Check each exact model's individual official CC0 information and embedded metadata before import. No assumption that every VRoid preset is CC0. |
| P0 | Official VRoid sample model directories / example binaries | https://github.com/madjin/vrm-samples | An index containing `vroid/beta/Victoria_Rubin.vrm`, `Vivi.vrm`, `Vita.vrm`, `Sakurada_Fumiriya.vrm`, `Sendagaya_Shino.vrm`, and sample variations | **Mirror/index only.** It does not confer license. Match each model to the official license; exclude unverified pieces. |
| P1 | Polygonal Mind 100Avatars | https://github.com/PolygonalMind/100Avatars/releases | Finished rigged character alternatives, potentially for visually coherent NPC groups | Creator's project is described as CC0; verify source/release terms and exact files; assess style/rig before selecting. |
| P1 | KayKit Adventurers official free pack | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | Ready-made animated low-poly characters | Official pack is CC0, but not VRM, different rig and aesthetic. Use only if clearly fits; don't force it into the primary anime roster. |
| P2 | Kenney Mini Characters | https://kenney.nl/assets/mini-characters | CC0 low-poly characters; possible NPCs | Not a substitute for polished main VRM avatars. Test in-game quality and retargeting. |
| Restricted | VRoid Studio stable AvatarSample_A–C and some VRoidPreset assets | https://vroid.pixiv.help/hc/en-us/articles/4402394424089 | Finished models but not blanket CC0 | Official terms have restrictions, including character-creation-service usage; don't import as if public domain. |
| Restricted | Community VRoid Hub / BOOTH models | https://developer.vroid.com/en/guidelines/conditions_of_use.html | Potentially excellent ready-made VRM characters | Permission varies per model; require the right to publicly serve model binaries and commercial game use, not just preview/view permission. |

**Important simplification:** Since there is **no avatar creator** any more, don't spend time acquiring modular clothing/hair packs. Import *whole models only*. Select the best cohesive ready-made roster from eligible sources. Directly downloaded character files can be assets in a public game only with appropriate redistribution permissions. Exact source URL, license text/version, model metadata and checksum must be recorded.

## 4. Required implementation in existing CTRL architecture

**Reuse what already works:**
- `features/plaza/characters/loader.ts`, `HumanoidAnimator`, VRM loading/normalization, locomotion, presence, avatar identity, signed wallet, persistence, guest visibility.
- `features/habitat/character-creator-preview.tsx`: reuse its Three.js canvas/lighting/rotate behavior, but turn it into a *simple complete-character preview*.
- `features/plaza/characters/vrm-avatar.tsx`: render selected VRM with no `ModularWardrobe`.
- `features/plaza/characters/catalog.ts`: replace user-facing customization catalog with a static whitelist/manifest of complete selectable characters.

**Minimal persistent model:** an allowlisted, stable `characterId` per wallet/profile, plus catalog version if needed. Existing records with the old `CharacterAppearance` JSON must remain readable. Map old female selections to the nearest available approved default female preset, old male selections to an approved male preset. Do not destroy existing homes, player identities or activity persistence. Server validates `characterId`; remote users receive it through existing presence mechanisms.

**Asset intake:** For every final model record original author, official URL, applicable license + in-model VRM metadata, date obtained, SHA-256 original/processed files, .vrm version, render LOD/size. Ship local hosted, optimized desktop and mobile variants; lazy-load chosen model and thumbnails, not the whole roster. If the model license blocks public redistribution, it cannot be bundled.

**UI:** Visual full-body cards, one selected model at a time, `Choose`/confirm, and optional `Surprise me`. No appearance sliders or wardrobe menus. A collection of polished completed characters is the product, **not** a body-builder.

## 5. Done = visibly better avatars, not extra code

- [ ] Multiple **distinct complete and fully authored** VRM options are imported and documented with permitted redistribution, exact hashes and metadata.
- [ ] All selectable models pass front/side/back full-body scrutiny, coherent materials/scale, correct shoes/hair, no clipping/holes or missing textures.
- [ ] No procedural hairstyle, cape, apron, boots or accessories are rendered in production.
- [ ] Connect wallet -> visual choose/random complete preset -> save -> reload -> Common Ground -> Habitat -> two-player session consistently shows the same chosen character.
- [ ] Every approved character supports idle, walk, run, sit, dance/high-five where existing game actions require it. Invalid/unavailable IDs resolve safely to a permitted fallback.
- [ ] Desktop and mobile real WebGL screenshots prove that the new roster is substantially better looking than the old generated parts; capture from the final tested SHA.
- [ ] Run unit, typecheck, lint, builds and browser suites. Validate migration and no unauthorized character IDs. Report model counts and device performance based on real results.
- [ ] PR remains draft/unmerged until the rest of CTRL full-game rebuild also meets its own gates.

**Execution priority:** 1) curate real, fully finished character files + rights; 2) wire simple roster chooser and single-ID persistence; 3) remove production procedural wardrobe/editor; 4) test and compare screenshots. **No new customization architecture.**

## 6. Scope and current status

This document **supersedes** the previous text that requested future modular garments, hair packs, or cosmetic customization. It is a specification only; it does **not** indicate that model files were imported, UI was rewritten, tests rerun, or production was deployed. Do not report it as implementation complete.
