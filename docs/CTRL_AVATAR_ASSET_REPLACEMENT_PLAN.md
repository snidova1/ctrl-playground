# CTRL PR #30 — PREMIUM-QUALITY COMPLETE AVATARS, FREE FOR EVERY PLAYER

**Updated:** 2026-10-14 (WIB)  
**Current status:** source discovery/visual research, **NO APPROVED NEW ROSTER**. Do not claim assets imported, UI shipped, browser quality approved, or PR ready.

## OWNER'S LATEST DECISION — THIS OVERRIDES ALL PRIOR ROSTER / TOKEN IDEAS

1. **REMOVE THE PREVIOUS PROPOSED CHARACTER ROSTER FROM THE BUILD PLAN.** All earlier named candidates in `docs/CTRL_FREE_CHARACTER_SOURCES_FOR_TOKEN_UNLOCKS.md` are now withdrawn and are **NOT approved or queued for import**. Do not silently re-add them as an automatic shortlist.
2. Find **genuinely premium-looking, fully modeled, ready-made** 3D avatars **male AND female, in roughly equal variety**, not obviously dated free/preset/default-looking assets.
3. Every available character is **FREE to select and use by every CTRL player**, even if the finished model looks premium. **No token purchases, no premium price tags, no holders-only character tiers, no unlocking, no marketplace, no NFT and no character paywall.**
4. **Developer spends $0 on model acquisition**. Research assets with no mandatory model acquisition fee and licenses compatible with embedding/distributing models in a public commercial WebGL game. Do not take paid or restricted models without permission.
5. **No character customization.** Players select a **complete authored avatar**. No modular hair, clothes, face, body, slider, palette or procedural geometry.
6. CTRL must **not ship an empty selector** while scouting. Existing Victoria/Fumiriya VRMs remain **temporary technical fallback** until a visually approved replacement roster is available, **not** the final art roster. Never delete working production model files before replacements are validated.
7. The game's world, Habitat, signed-wallet profile, existing social animations, saved character selection and multiplayer must keep working. Do not add XP/rewards or change existing economics.

## ART DIRECTOR GATE: "PREMIUM-LOOKING", NOT "MARKED PREMIUM"

Target is a single coherent **high-polish, playful/cozy, modern social-life-sim** aesthetic complementary to CTRL/Common Ground; no cyberpunk/neon-tech/futuristic-tech default.

**Every proposed avatar must be examined in-engine before nomination:**
- Finished full-body character with deliberately styled silhouette, face and polished facial expression; hair is an authored mesh with appropriate alpha/physics, not procedural cylinders/spheres.
- Real finished outfit with proper garment construction and weight/skin deformation; aesthetically cohesive shoes, accessories and materials **integral to the one complete model**.
- Variation includes actual distinct male and female identities and silhouettes (e.g. smart-casual, relaxed streetwear, cute weekend, fashionable elegant, warm outdoors), not recolors or five outfits of one face counted as five characters.
- No obviously flat/prototype VRoid preset, amateur blockout, AI-looking art mismatch, low-poly toy character when rest of world uses polished VRM, or inappropriate extreme fantasy look.
- Real 3D **front, side and back** screenshots, idle, walking, sitting and dancing under CTRL's actual world lighting, not just sales-page renders.
- High fidelity while practical for iOS Safari: verified optimized textures/LODs, clean humanoid rig, correct MToon/material, readable mobile silhouette, hair sorting, spring-bone performance.
- **Selection rule:** curate quality *before quantity*. Seek a broad mixed-gender discovery pool, then select the **best coherent** subset only after visual QA. Equal priority to men and women; cannot claim "roster complete" if male selection is an afterthought.

## RESEARCH POOLS (NOT A CHARACTER ROSTER OR IMPORT AUTHORIZATION)

| Pool | Primary source | Current state / release caution |
| --- | --- | --- |
| BOOTH VRM/CC0 category | https://booth.pm/en/browse/3D%20Characters?q=cc0&tags%5B%5D=VRM | Large discoverable list of VRM CC0 tagged content. Search filters do **not** guarantee full models, original author permission, male/female balance, or quality. Manually review originals, visuals, exact license and binary. |
| **Haku** CC0 creator source, higher-detail discovery lead **(not roster-approved)** | https://booth.pm/en/items/8214054 | **¥0**, author explicitly states **CC0 + redistribution allowed**, Unity Humanoid, ~45,262 PC triangles and ~11,726 Quest triangles, many expressions. Has full original package and lightweight fallback. This is a **visual audition lead only**, not an automatically approved character. Need inspect complete outfit, real world style, licensed subcomponents and actual VRM export; Unity VRChat dependencies/lilToon are **not part of CC0**. |
| Independent public-domain VRMs | https://karindou.itch.io/vroid | Shikigami Collection declares **CC0**, download bundle and includes different fantasy presentations. **Art-direction inspiration / QA lead only**; fantasy theme may fail modern cozy requirement. |
| Premium-looking mixed stylization reference | https://booth.pm/ja/items/5452012 | Free red/white two-character VRoid example by Pike, **but plain redistribution is forbidden** by creator; use **visual research only** unless explicitly cleared for hosting full binary on CTRL. |
| Premium-looking fantasy reference | https://booth.pm/ja/items/5578944 | Free light/dark Wing avatar example by Pike, but plain redistribution prohibited and general commercial usage requests consultation; **reference only, NOT approved game asset**. |
| Full styled 4-model art direction reference | https://booth.pm/ja/items/4939358 | Free prebuilt VRMs by MillyDusa, commercial video-game usage mentioned, **redistribution of reusable models restricted**. Visual reference only until public browser-delivery permission verified. |
| Official VRoid sample model rights | https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use | Some beta files CC0, later preset models have their own restrictions. They are **functional fallbacks, not assumed premium art**. |
| General VRM permission definitions | https://developer.vroid.com/en/guidelines/conditions_of_use.html | Commercial and redistributable are distinct flags. A ¥0 download is **not** license to publish and distribute the .vrm in public WebGL. |

**License rule:** Source creator's explicit CC0/commercial game/public-binary redistribution rights and *VRM embedded metadata* must agree. Check derivative parts, textures, third-party clothing, attribution, and web delivery. A model requiring purchase, credit negotiation beyond published permission, no redistribution, or incompatible license stays **research-only**; do not silently ship it.

## IMPLEMENTATION PLAN — AFTER VISUAL SIGN-OFF, NOT BEFORE

1. Produce a **visual audition board** of many distinct male and female fully authored free-source avatars, with exact download, creator, license and direct thumbnails.
2. Visually veto weak models first. Get approval on a balanced, coherent final selection; **until then the approved roster = none**.
3. Download only approved ¥0/US$0 authorized assets from original publisher; per-model provenance including SHA256, VRM license metadata and redistribution rights.
4. Retain existing `features/plaza/characters/loader.ts`, `HumanoidAnimator` and wallet/presence plumbing. Use `characterId` of one complete preset; keep backward compatible existing profiles. `ModularWardrobe` must stop rendering when replacement is proven.
5. Replace parts editor with **pick one full character** gallery, real rotatable preview and optional "Surprise me" **whole-character randomizer**. All characters show **FREE** (or no price label at all).
6. Screenshot and measure actual WebGL in desktop/mobile and two-player Common Ground + Habitat, identity persistence and high-level existing actions. Reconcile fixes, rerun CI.
7. Do NOT merge/deploy or mark avatars complete until both visual gate and functional build gate pass.

### Explicit supersession and non-claims

Earlier documents or PR comments recommending **Ameko, Himiko, Syaoty, Kin, Shapell Maid, Neku Shiro, Bunny-Kun, Kai, Kiichi, Chunen, Vita/Shino** or other starter/premium candidate names are **WITHDRAWN and not approved for selection**. This does not assert all those models are inherently bad; owner rejected using an unreviewed shortlist. We are starting the aesthetic selection again.

**No new character model was imported in this documentation update. No token/checkout changes. Production runtime's old avatar files must not be removed without a working replacement.**
