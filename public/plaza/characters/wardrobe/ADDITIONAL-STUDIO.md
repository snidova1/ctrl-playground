# Additional studio garment — parent wiring contract

## Accepted: Vita cyber dress and boots

- ID: `vita-studio`; label: `Vita · cyber dress & boots`.
- URL: `/plaza/characters/wardrobe/vita-studio.glb`.
- Target `characterId`: **`ctrl-anime-female-studio` only**, high and mobile. Reject other bodies. Do not make gender-only compatibility decisions.
- Metadata: `vita-studio.provenance.json`; license: `vita-studio.LICENSE.txt`.
- GLB `extras.ctrlWardrobe`: `{id:'vita-studio', supportedCharacterId:'ctrl-anime-female-studio', targetRestBound:true, weightedBones:[44 exact target names], license:'CC0-1.0'}`.
- Mask ONLY original material groups `F00_002_01_Tops_01_CLOTH` and `F00_002_01_Shoes_01_CLOTH`. No skin/face/body mask. Existing applyWardrobe group filtering/rest-bind validation applies unchanged.
- Garment 586388 bytes, 2882 triangles, two embedded RGBA PNG textures <=1024px; no face/hair/body, no avatar replacement. SHA256 `3d46695e96440e874380c5c554be73cb4810f1180f67523b3a724fb8ed5b2ced`.
- All 44 weighted bones mapped, none dropped. Same Darkness weighted rest-bind correction, max correction 0.044464459981071326m. This is a rest correction magnitude, NOT fit error.
- Official CC0 checked against existing embedded metadata, source sanitized SHA and verified official license excerpts before preparing.

## Minimal parent changes — shared files deliberately untouched

1. Add the ID/label/URL/characterId to `wardrobe-catalog.ts`; extend existing appearance/schema saved ID validation as appropriate.
2. `wardrobe.ts` currently hardcodes Darkness at lines 12,24-31,42,70,81,93-95. Generalize `loadWardrobe` with an optional trailing ID parameter after existing `signal` (default `darkness-studio` preserves callers), resolve the exact reviewed catalog entry, fetch that entry URL, require matching `ctrlWardrobe.id`, exact `supportedCharacterId`, `targetRestBound`, embedded-only resource policy and existing 3MiB cap. Never accept arbitrary URLs.
3. Keep the metadata ID on LoadedWardrobe (derive it from loaded scene userData for headless prepareLoadedWardrobe tests); AppliedWardrobe.id becomes the reviewed non-source ID union, not literal Darkness. `applyWardrobe` verifies selected metadata/canonical character ID before any masking; preserve exact all-bones and rest-inverse checks, resource ownership, target actual bone reuse and rollback. Root name can use selected ID; handle.id must return selected ID.
4. `loadCharacterWardrobe` resolves ID through catalog instead of `id !== 'darkness-studio'`, checks exact compatible target, passes ID into loadWardrobe, preserves unsupported/source no-fetch behavior and abort/disposal.
5. Existing cloth mask is already correct for Vita. No extra per-frame tick, body replacement, physics, skin hiding or re-calculated posed inverses.
6. Parent must browser-review alpha openings, sleeves, hem, boot fit, seated motion and tint. No browser/build/server was run by this worker. CPU coverage is not all-pose collision or shader parity acceptance.

## CPU evidence / reproduce

```
python3 scripts/assets/prepare-additional-studio-wardrobe.py
node node_modules/vitest/vitest.mjs run tests/unit/avatar-additional-wardrobe.test.ts tests/unit/avatar-wardrobe.test.ts
```

New tests load actual high/mobile target VRMs with runtime VRM0 rotation and skeleton optimization. They apply real garment through existing public CPU seam, preserve skin/face geometry/groups/bone ownership, compare deformed vertices against independent linear blend skinning, sample 15 shipped Idle/Walk/Interact frames plus arm-up/seated-leg pose, reject missing bones/wrong rest inverses/wrong bodies before masking, and verify exact disposal restoration.
Vita minimum rest central torso clearance on both targets: **0.009188525018180793m**; maximum sampled animated vertex displacement **0.781874943302681m**. Targeted rest coverage only; not global dynamic collision proof.

## Rejected rather than silently supported

`additional-candidate-review.json` records actual reasons. Shibu/Shino uniform candidates require six skirt bones absent on target; no guessed remapping. Vivi apron candidate maps all bones but fails real rest torso raycast after proven warp: clearance **-0.004630977306084083m** (penetration), both target qualities. Vivi trial GLB/provenance/license outputs were removed. Do not register Vivi/Shibu/Shino. Accepted preparation explicitly refuses them. Returning one verified outfit follows task fallback, rather than weakening fit test or hiding skin.
