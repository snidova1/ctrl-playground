# CTRL: Creative Asset Expansion / ASTRA REVIEW HANDOFF
Updated 2026-10-10. Branch research/creative-assets-expansion -> main as DRAFT PR. This branch is an asset intake proposal with executable registry checks, NOT an alternate website, live asset marketplace, or deployment.

## Product intent

CTRL is an existing 3D multiplayer world where each wallet gets a persistent identity, an approved VRM character, customizable personal worlds and shareable experiences. The key economy and original Astra Habitat must stay intact. Creator freedom means real hair/outfit meshes, emotes, interactive sets and themed world kits, not only color sliders or static decorative lists.

Main currently already contains: Next.js, React Three Fiber/Three.js, three-vrm, Astra Habitat stage/controller, world save API, 991 CC0 Kenney GLBs, preliminary character colorways. Other parallel workers own World Builder UI, asset integrity/performance checks, security, backend and smart contracts. Do not duplicate them.

## Delivered on this branch

- creative-assets/sources.json: **23 curated publisher sources** with primary source URL, rights-evidence URL, rig family, formats, priority, and review gate. Every candidate has downloaded=false and ingested=false.
- creative-assets/customization-contract.json: 11 avatar cosmetic slots, three incompatible rig families and a staged wallet-owned appearance contract, plus sample emote wheel and publish gates.
- creative-assets/world-presets.json: three seed worlds containing 24 **existing** Kenney catalog model IDs, with valid Habitat-compatible coordinate bounds and object shapes.
- tools/creative-assets/validate.mjs and validate.test.mjs: standalone Node checks. Rejects unsafe source URLs, missing usage review, VRM license assumption, raw Mixamo mirroring, Quaternius 2026 QAL oversight, incompatible rigs, unknown assets, duplicate IDs or invalid world geometry.
- tools/creative-assets/plan.mjs: prints an Astra review shortlist with all original links.
- .github/workflows/creative-assets-review.yml: checks above in a short CI job. No dependencies or network downloading.

## P0 character/costume/animation set

1) Universal Base Characters, 6 humanoid bases with ~20 hair choices: https://quaternius.itch.io/universal-base-characters
2) Modular Character Outfits Fantasy, 12 outfits, 62 parts and 3 color variants: https://quaternius.itch.io/modular-character-outfits-fantasy
3) Universal Animation Library, 120+ locomotion, emotes and interactions: https://quaternius.itch.io/universal-animation-library
4) KayKit Characters official repo: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
5) KayKit Animations: https://kaylousberg.itch.io/kaykit-character-animations

IMPORTANT: Quaternius's matching bodies + outfits + animation library are ONE compatible humanoid family. They are not direct wardrobe parts for current Astra Victoria/Fumiriya VRM avatars. Keep existing VRoid characters as primary, add author-approved VRM outfit variants, then optionally pilot Quaternius as a secondary stylized family. KayKit has yet another rig/style family, initially use for themed NPCs. Real player avatar mix-and-match requires dedicated rigged/fitted meshes, material swaps and integration tests: no claim these assets are already available in-app.

Other curated sets: legacy Quaternius modular men/women NPCs, KayKit skeletons, Kenney animated characters, VRoid Hub model-specific permissions (not a blanket reuse grant). Optional Mixamo motion use is not permission to redistribute raw files as asset packs.

## P0 world creator packs

- KayKit City Builder official source: https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (small mobile-friendly gradient atlas).
- Quaternius Downtown City MegaKit: https://quaternius.itch.io/downtown-city-megakit (modular city pieces).
- Quaternius Stylized Nature: https://quaternius.com/packs/stylizednaturemegakit.html (trees, plants, rocks).
- Medieval Village MegaKit: https://quaternius.itch.io/medieval-village-megakit and KayKit Dungeon official: https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0.
- Poly Haven: https://polyhaven.com/license for CC0 PBR models/HDRIs; ambientCG for CC0 material maps. Use local optimized outputs only; do not add a runtime dependency on their hosted API.

Use world-presets.json as safe starter inspiration after owner check, never as a forced replacement of a player's existing world. Current Habitat limits: maximum 120 objects, x -14..14, y 0..8, z -8..12, scale .25..4. For new kits, align pivots, author collision and semantic behaviors, generate licensed thumbnails, convert textures KTX2, create mobile LOD and have the QA worker sign off performance.

## Non-negotiable rights checks before importing ANY third party binary

A. Obtain the file from the original creator or official publisher GitHub, choosing the precisely identified free Standard tier; preserve origin, author, copyright, original license text, ZIP checksum, individual model SHA256, modified output hashes, downloaded UTC date. Store these with the binary in a per-pack provenance manifest.

B. Quaternius posted a Quaternius Asset License QAL v1.0 on Aug 28, 2026 which prohibits redistributing raw assets when that license applies: https://quaternius.com/license.html. Many pack pages still explicitly advertise CC0. Do not guess which terms govern a file. Capture exact pack version and publisher license at the time of obtaining it. Freeze proof and get manual review before GitHub mirroring, public creator download or redistributing originals.

C. VRoid Studio preset meshes are not CC0; each VRM file can contain separate avatar use, author, commercial use, modifications and redistribution conditions. https://vroid.com/en/studio/guidelines and https://developer.vroid.com/en/guidelines/conditions_of_use.html . Avatar uploads require uploader's permission to use their exact model and server-side extraction of VRM 1.0 license metadata, with private-by-default publishing and moderation. A user upload never grants other users rights to reuse that avatar.

D. KayKit official repository LICENSE.txt states CC0 for its public version. Paid EXTRA/SOURCE packs must not be assumed to be included. Mixamo FAQ permits use in complete games, but never treat its library as a redistributable animation shop.

E. Third-party source code licenses NEVER automatically license bundled meshes, costumes, animation or sample VRMs. For the useful MIT VRM retargeting reference https://github.com/norio/vrm-game-starter , review its sample-asset licenses separately. Do not replace Astra's movement controller.

F. Maintain no user supplied arbitrary remote GLB URLs in the renderer. Sanitize uploads, cap decompression, validate allowed MIME/signature/size, mitigate Zip Slip/SSRF, check skin joint count, mesh and texture limits, strip scripts and run off-main-thread preview where safe. QA/security owns this.

## What Astra should review, in order

1. Confirm the character experience: preserve Victoria and Fumiriya style, support more real hairstyles/outfits through compatible authored VRMs, and optionally add a second Quaternius rig-family ONLY if the art direction is approved.
2. Choose an initial capsule of three asset packs, not all 23: one rigged character+outfit+animation family, one official KayKit GitHub world/NPC pack, one city/nature environment pack. Obtain exact binaries and rights evidence through QA asset worker.
3. Validate wardrobe compatibility with animation on desktop and iPhone: no torso jitter, clipping, bad UV, material overflow or missing clothing after network sync. Use a complete visual test for idle/walk/run/jump/sit/dance.
4. Integrate curated approved models into the EXISTING build-assets catalog IDs and Habitat data model, not a competing web app. Keep the licensed original packs out of the git repository until selected/reviewed, then store processed runtime GLBs in an appropriate asset storage/CDN with pinned hashes, attribution and file-size budgets.
5. Build persistence for wallet-owned cosmetic loadout in Astra backend, including permissions, moderation, deterministic fallback, compatibility and publishing rules. Tie emote ID to replicated animation state, not whole asset transfers.
6. Expose world templates as opt-in Create from Template after entitlement/owner checks, with explicit confirmation if replacing an existing draft.

## Current status and verification

The registry, proposed customization schema and seed world layouts have been committed; **no new third-party assets downloaded, converted or integrated**. Running the registry validator is not proof of any external pack's copyright, performance or visual compatibility.

Commands:
  node tools/creative-assets/validate.mjs
  node --test tools/creative-assets/validate.test.mjs
  node tools/creative-assets/plan.mjs

CI runs on this PR under CTRL Creative Asset Review. Keep PR draft until Astra and QA confirm rights/technical approach. No testnet/mainnet deployment, wallet transaction, assets upload or changes to main. PR should be treated as a queue of vetted candidates, not 23 shippable packs.


## 2026-10-10 completion audit: player delight and art workflow gaps closed in shortlist

Now **38** curated sources (23 original + 15 audited additions), covering sound/UI feedback, gameplay VFX, touch/controller prompts, mobile dungeon/world kit, and VRM-native authoring. License-file evidence for **6** canonical KayKit GitHub repos is pinned in `creative-assets/upstream-license-evidence.json` with exact repository HEAD SHA and LICENSE.txt blob SHA. This is **not** proof that any particular model binary was downloaded or approved.

New practical sources: [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds), [Interface Sounds](https://kenney.nl/assets/interface-sounds), [RPG Audio](https://kenney.nl/assets/rpg-audio), [Particle Pack](https://kenney.nl/assets/particle-pack), [Mobile Controls](https://kenney.nl/assets/mobile-controls), [Kenney Modular Dungeon](https://kenney.nl/assets/modular-dungeon-kit), [KayKit Medieval Hexagon](https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0), [KayKit Prototype Bits](https://github.com/KayKit-Game-Assets/KayKit-Prototype-Bits-1.0).

New VRM-compatible workflow tools: [VRoid Studio](https://vroid.com/en/studio) for authoring real avatar hair/outfit variants, [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender) for rig/mesh fitting and export, and [pixiv three-vrm-animation](https://github.com/pixiv/three-vrm) for VRMA emotes. The existence of these tools **does not** supply approved hair/costume meshes. Such meshes must be authored/licensed and tested. Optimization sources: glTF-Transform, meshoptimizer and Khronos KTX tools. QA asset worker owns processing.

**Audio implementation gate:** avoid autoplay before consent; include accessibility mute, per-channel volume, voice cap and spatial attenuation. **VFX gate:** reduced-motion preference, particle budget, texture atlas and capped overdraw. **Mobile gate:** touch input targets, low-memory UI, draw-call budgets, and independent editor navigation.
