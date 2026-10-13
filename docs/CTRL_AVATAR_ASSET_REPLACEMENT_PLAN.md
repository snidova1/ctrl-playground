# CTRL PR #30 — Asset-first avatar replacement and release acceptance
Updated: 2026-10-14 (WIB)  
Scope: `feat/townies-gameplay-stylized-world` / PR #30  
Status: **Implementation instruction + researched asset shortlist. NOT an asset-import or completed avatar rebuild.**

## Decision (user direction, binding)

**STOP shipping procedural hairstyle/outfit geometry as the primary player appearance.** The current `features/plaza/characters/modular-wardrobe.tsx` adds heads/hair using spheres/tubes and garments using generated ring geometry. This is a technical proof of concept, **not** acceptable shipped art.

Use **complete, professionally authored VRM characters and ready-made compatible clothing/hair/accessory assets**. Prefer several visually finished full-character presets over a broken "modular" illusion. Maintain the existing wallet-linked avatar identity and multiplayer behavior.

Do not add XP, levels, new currencies, tokens, holder-tier unlocks, purchases, or rewards. No production deployment or PR merge from this note.

### Current repo facts / starting point

- Runtime already loads VRM avatars with animation, spring bones, camera, presence, wallet identity, saved appearance, and 3D character preview.
- Current primary bases are Victoria (`/plaza/characters/victoria-*.vrm`) and Fumiriya (`/plaza/characters/fumiriya-*.vrm`).
- Existing `features/plaza/characters/catalog.ts` has 4 palette variants, 5 hair colors, 5 eye colors, 4 skin variants plus geometry toggles (bob/ponytail, cape/apron, boots, beret/glasses/satchel). Existing wardrobe add-ons are **programmatically constructed primitives**.
- `features/habitat/character-creator-preview.tsx` is an actual orbitable 3D preview. `features/plaza/characters/vrm-avatar.tsx` applies appearance in the shared game world.
- The 991 Kenney assets in `public/plaza/build-kit/` are predominantly environment/building/furniture/props; they are **not** a ready-made, high-quality anime VRM wardrobe. Do not turn environment GLBs into body parts.
- PR #30's prior 212 local unit/API tests and WebGL journeys are functional evidence, not visual approval.

## Asset research: verified source-level permission vs. model-level clearance

No files in this shortlist are claimed to have been downloaded into CTRL or fully validated in Three.js. A source's permissive license is only step one: each imported binary requires exact provenance and embedded VRM metadata audit.

| Priority | Candidate | Direct source | Confirmed source-level terms | Visual/technical role | Intake decision |
| --- | --- | --- | --- | --- | --- |
| **P0** | Existing Victoria (β Ver AvatarSample_4) | https://vroid.pixiv.help/hc/en-us/articles/360014900233 | **Official CC0 model** | Preserve proven female VRM, compare against new variants; reject fake geometry overlays | **Keep base, inspect shipped VRM meta + binary** |
| **P0** | β Ver AvatarSample_2 | https://vroid.pixiv.help/hc/en-us/articles/360014900273 | **Official CC0 model** | Ready-made female, brunette bob; fits cozy look | **First additional VRM candidate** |
| **P0** | β Ver AvatarSample_1 | https://vroid.pixiv.help/hc/en-us/articles/360012381793 | **Official CC0 model** | Another finished VRoid appearance with alternate darker design | **Candidate, check final in-engine** |
| **P0** | β Ver AvatarSample_3 | https://vroid.pixiv.help/hc/en-us/articles/360014900113 | **Official CC0 model** | Alternate ready-made female; stylized/cyber accessories must be reviewed for CTRL's non-tech visual direction | **Optional if art direction fits** |
| **P0** | VRoid HairSample_Female / HairSample_Male | https://vroid.pixiv.help/hc/en-us/articles/4402614652569 | **Officially listed as CC0 samples** | Source of properly authored hair study/base variants; not proof of independently compatible swap meshes | **Verify the exact files** |
| **P1** | Polygonal Mind — 100Avatars VRM/FBX collections | https://github.com/PolygonalMind/100Avatars/releases and https://github.com/PolygonalMind/initiative-opensource-release | Creator's release describes **CC0** commercial game use. Repo README also asks not to sell unmodified avatars as standalone items. | Large pool of ready-made rigged avatars, mostly eclectic/novelty rather than cohesive anime | **Only art-direct selected NPCs; verify each model and respect creator's no-standalone-sale request** |
| **P1** | KayKit Adventurers, official free pack | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | **CC0** per official repo/LICENSE, 4 rigged/animated low-poly characters and 75 animations | Good mobile NPC/animation reference, but dungeon styling clashes with modern cozy world | **Not a drop-in VRM wardrobe; separate rig/retarget QA required** |
| **P2** | Kenney Mini Characters | https://kenney.nl/assets/mini-characters | **CC0** per creator | Rigged low-poly NPC option, not anime VRM style | **Only optional NPC exploration, not the main player identity** |
| **P2** | Kenney Animated Characters Protagonists | https://kenney.nl/assets/animated-characters-protagonists | **CC0** per creator | Animated rigs for study/NPC tests | **Not player VRM; verify visual compatibility first** |
| **Research only** | `madjin/vrm-samples` | https://github.com/madjin/vrm-samples | A **mirror/collection**, not the authoritative license for every file. Beta and stable models have different conditions. | Convenient index of sample binaries, including Victoria, Vivi, Vita, Fumiriya and hair samples | **Use official VRoid FAQ/Hub + embedded license; do NOT mark all mirror files CC0 by association** |
| **Restricted** | VRoidPreset_A–Z / AvatarSample_A–C (stable) | https://vroid.pixiv.help/hc/en-us/articles/4402394424089 | **NOT CC0**. Allows certain game/VRM uses but explicitly forbids use of their data in a character-creation service and fee-based sample redistribution. | May be usable as fixed characters within their terms | **DO NOT use as editable CTRL character creator source without separate permission** |
| **Restricted** | Third-party VRoid Hub / BOOTH outfits | https://developer.vroid.com/en/guidelines/conditions_of_use.html | **Per-owner/per-item terms vary** | Visually attractive clothing/hair, but many are non-redistributable or noncommercial | **Do not bundle until commercial use + modification + redistributable game assets are expressly cleared** |

**Other publisher-level sources:** https://vroid.com/en/studio/guidelines explains that pixiv-owned VRoid Studio presets are NOT blanket CC0. Building a character-creation service that outputs models/data made by combining/deforming these assets requires a separate pixiv license, with restrictions stated in their guidelines. CTRL should initially provide **selection/randomization among approved finished in-game avatars** without exporting/generating avatar files. License counsel should review any commercial in-game customization with pixiv-owned presets, even when no export occurs.

**VRM legal metadata:** https://vrm.dev/en/vrm/meta/license/ and https://developer.vroid.com/en/guidelines/conditions_of_use.html — validate avatar/characterization, commercial usage, modification, redistribution, and other-license URLs. A downloadable .vrm or public GitHub project is *not* automatically CC0 or transferable to commercial in-game customization.

## Target player experience (asset-first, not procedural)

1. Player connects wallet; server resolves saved signed identity.
2. If no appearance, open an actual **3D character selection gallery**, not text-only or a blank room. Show art-approved character cards and preview VRMs rotating in 3D.
3. **Randomize** only among approved, complete avatar presets. No breaking apart unrelated VRMs. Default must be deterministic and saved exactly once, not rerolled on each login.
4. Player selects a complete model, sees matching hair/outfit/shoes (all author-authored and rigged), rotates it, and saves. Persist `avatarId`, `presetId`, `appearanceVersion`, and compatible parameter IDs. Save action must use existing authenticated persistence/ACL.
5. Player joins Common Ground or their Habitat with the same saved avatar; remote players see the same model. Changing avatar in Profile updates world presence after save.
6. Later asset wardrobe packs may offer **ready-made skinned fitted replacements** on a compatible base rig. If an item is not proven compatible, treat it as a separate complete VRM preset, not a swappable garment.
7. No body clipping, floating hat, boots through feet, bald patches, merged hair/material bugs, UI blocking mobile controls, or blank/spinning preview.
8. Avoid cyber/techno themes. Art direction: cozy, colorful, polished, stylized VRM; consistency with CTRL/Common Ground and target Heartopia-adjacent quality, not 1:1 copying.

## Implementation worklist

### A. Create a provenance-backed manifest

Example *schema only*, **not a claim that binaries have passed**:

```ts
type LicensedAvatar = {
  id: string;
  displayName: string;
  creator: string;
  sourceUrl: string;
  licenseUrl: string;
  licenseId: string;
  originalSha256: string;
  processedSha256: string;
  acquiredAtUtc: string;
  vrmFormat: "0.x" | "1.0";
  files: { high: string; mobile: string; thumb: string };
  rig: { humanoid: boolean; heightMeters: number; expressions: string[] };
  artStatus: "candidate" | "approved" | "rejected";
  commercialRedistributionReviewed: boolean;
};
```

Each archive: source page, original license text snapshot, exact free/paid tier, archive checksum, original per-model SHA-256, modified output checksum, VRM embedded metadata report, author attribution where required. Provenance is committed alongside approved binaries. Reject candidates failing any legal check.

### B. Replace the fake wardrobe output, not the working VRM infrastructure

- Retain `loadCharacter`, `disposeVrm`, `HumanoidAnimator`, third-person controller, presence integration, saved avatar/profile, signed wallet and collision.
- In `features/plaza/characters/modular-wardrobe.tsx`, **remove it from the production character path once vetted replacements are ready**. Do not delete fallback before replacements pass visual/functional QA.
- Replace `geometry.hair/outfit/footwear/accessory` fake-generation toggles with `approvedAvatarId` and only genuinely compatible `outfitAssetId/hairAssetId/accessoryAssetId`. If none are fitted, present complete preset swapping only; hide unsupported slots.
- Add runtime source validation, bounded lazy loading and cache, no remote hotlinked avatars, no public arbitrary VRM upload as a shortcut.
- Keep existing appearance records readable via a versioned backward-compatible mapping. Players with legacy appearances should resolve to a known full VRM and never crash; server should reject unauthorized preset IDs.
- Catalog should expose available presets via one typed manifest; gallery, preview and multiplayer renderer should use the **same** selection logic.

### C. Modeling/rig acceptance for every selectable item

- Verify avatar skeleton, bone rest pose, normalized height/feet, eye/mouth expressions, humanoid animations and optional hair spring bones.
- Full-character preset must render correctly on idle/walk/run/sit/dance/high-five.
- For a separate garment: only accept properly **skinned, weighted, fitted** asset built for the *same* target body and bone map. Test elbow/knee bend, hips, shoulder raising and crossed arms. No loose rigid cape glued to chest bone as a stand-in for clothing.
- Materials: coherent toon response with the current working MToon path. Do not introduce incompatible rendering engines. Check alpha/hair sorting and shadow response.
- Design review: front, profile, rear and full-body at gameplay camera distance; distinguish faces/silhouettes; no obvious stock-asset clash. Quantity of choices cannot substitute for art quality.

### D. Measurable QA / proof (not test-only green)

**Functional**
- Signed-wallet new/returning player picks/randomizes/saves; reload, logout/reconnect, return from Common Ground, Habitat owner/guest, same identity.
- Two independent browsers show the selected avatar consistently and match at least 4 interactions: idle, walk, sit, dance/high-five.
- Legacy saved JSON migrates with no profile/appearance data loss, and unauthorized avatar/skin IDs are rejected.
- Desktop and mobile character picker available without menu obstruction. Preview loads and rotates; failed model load surfaces a retry action, never a silently blank canvas.

**Visual**
- Real WebGL screenshots (no generated mocks) of 3 approved female and 3 approved male/other coherent character presets if available; if not, report the actual count and fail that gate honestly.
- Capture gallery, front/side/back full-body, idle/walk/sit/dance, Common Ground & Habitat, mobile and desktop.
- Side-by-side "old procedural wardrobe" vs "real sourced finished assets". Human visual sign-off must confirm obvious improvement, not merely changed colors.
- Verify clipping at moving joints and shoes; mobile material/LOD readability; screenshots taken from exact tested commit.

**Performance**
- Measure actual WebGL download bytes and load-to-interactive on realistic mobile network; use optimized source copies and thumbnail lazy loading, do not preload full roster.
- Log render frame-time, draw calls, texture/material count, VRM memory and GPU performance on iOS Safari and Android Chrome. Use real readings before defining device budgets, rather than inventing green numbers.
- Repeat CI unit/type/lint/build, browser suite and wallet/multiplayer tests on exact final SHA.

### E. Specific done criteria

- [ ] At least one selected P0 official CC0 model is imported from a traceable original source with checked embedded license, hashes and working VRM runtime (beyond the existing 2 models).
- [ ] At least several truly **distinct, finished** avatar choices with consistent art direction, not just skin/hair-color remaps. Do not force unsuitable models to inflate a number.
- [ ] Selection/randomization, live 3D preview, persistence and remote replication work end-to-end.
- [ ] Procedural hair/outfit/boots **no longer appear in the production avatar renderer**.
- [ ] All offered wardrobe pieces have real weighted fittings, or unsupported swap UI is absent.
- [ ] Desktop/mobile real screenshots show a major visual improvement, with explicit review approval.
- [ ] Tested exact-head CI green, migration safe, no added economy, PR stays draft until full CTRL game gates separately pass.

## Execution order / safeguards

1. Preserve current baseline and tests. Capture current ugly procedural wardrobe and existing VRM good base on the same camera/lighting.
2. Download 2–4 P0 VRoid **beta CC0** models from owner-authorized sources (not assume a mirror grants rights). Verify each file and add provenance.
3. Normalize VRM, generate optimized mobile/desktop versions + thumbnails without destructive rig changes.
4. Wire a complete-prefab avatar gallery, randomizer and signed persistence, preserving existing preview/animation/presence.
5. Disable procedural geometry choices only when substitute presets load and pass interactions.
6. Test, capture, compare, fix. Only after a coherent default roster ships, evaluate compatible skinned wardrobe as an **optional later** increment.
7. Update PR checklist with exact imported models, license links, hashes, screenshots, test evidence and any blockers.

**Important:** this document is an execution note, not an assertion that source binaries have been copied, that licenses of third-party models are universally permissive, or that avatar quality has been approved. The old PR #30 functionality is not replaced by a docs-only change.
