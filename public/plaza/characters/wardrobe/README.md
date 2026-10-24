# Darkness Studio — real skinned wardrobe seam

**Integrated into application UI/runtime by the parent.** Creator controls, schema/catalog/seeded random, shared avatar loader, appearance palettes and saved profile roundtrip are wired. Final acceptance: 73 tests/11 files, production build, desktop/mobile studio and signed Habitat create/reload pass. See `docs/avatar-independent-wardrobe-pass.md`. Wiring notes below retain the original worker contract as implementation reference.

## Reviewed mapping

| Saved garment ID | Label | Supported resolved character ID | Source fallback |
|---|---|---|---|
| `source` | Original outfit | all | existing outfit, no request |
| `darkness-studio` | Darkness · gothic dress & boots | `ctrl-anime-female-studio` ONLY (female / lookId `alternate`, high and low) | source if unsupported/error |

`variantId` remains the existing **outfit colorway**, NOT a garment mesh ID. Do not repurpose it. Parent should add optional `wardrobeId?: 'source'|'darkness-studio'` to appearance/schema, default/migration `source`. Normalize it against `availableWardrobeStyles(resolveCharacter(appearance).id)`; a gender/look change must normalize unsupported costume back to source. No arbitrary URL or near-match body accepted.

## Exact parent wiring (apply only when hair worker releases owned files)

1. Import from `features/plaza/characters/wardrobe.ts`:
   ```ts
   import {loadCharacterWardrobe, clearCharacterWardrobe} from './wardrobe';
   ```
2. Add OPTIONAL trailing parameter to `loadCharacter`, **after** current `hairStyleId`, preserving existing callers:
   ```ts
   wardrobeId: 'source'|'darkness-studio' = 'source'
   ```
3. Inside its existing try/catch, immediately AFTER `await loadCharacterHair(...)` and BEFORE return:
   ```ts
   await loadCharacterWardrobe(vrm, definition.id, wardrobeId, signal);
   ```
   This is after `VRMUtils.combineSkeletons/rotateVRM0`. Wardrobe binds to actual raw target bones using existing rest inverse matrices, **not current pose**. Do not call `skeleton.calculateInverses()` on a posed character. Do not optimize/combine wardrobe into body afterwards.
4. At START of `disposeVrm(vrm)` (before hair/deepDispose):
   ```ts
   clearCharacterWardrobe(vrm);
   ```
5. Avatar owner passes `appearance.wardrobeId ?? 'source'` as final loader argument and adds it to existing load effect/memo dependencies. Alternatively on an existing avatar call `loadCharacterWardrobe(vrm, definition.id, id, signal)`; abort previous switch request before next switch/unmount to prevent async races. `source` and unsupported IDs restore source synchronously without fetch. Error keeps previous/source outfit; show failure instead of reporting costume applied.
6. UI options use `availableWardrobeStyles(resolveCharacter(appearance).id)` in a **new garment selector**, separate from the current colorway selector. Appearance tinting already matches `_CLOTH` material names; donor retains those exact names, so apply tint AFTER wardrobe load. Runtime material is lightweight unlit artwork, not a claim of MToon/lilToon shader parity. No expression or animation changes needed: garment skeleton references the same target raw bones.

Explicit lower-level ownership contract:
```ts
const loaded = await loadWardrobe(signal);        // new, caller-owned resource
try {
  const handle = applyWardrobe(vrm, characterId, loaded); // takes ownership on success
  // handle.id; handle.meshes (2 real SkinnedMesh); no per-frame wardrobe tick needed
  handle.dispose();                             // idempotent, restores original cloth
} catch (e) {
  loaded.dispose();                              // only if apply failed
  throw e;
}
// clearCharacterWardrobe(vrm) is equivalent to active handle.dispose().
```
Do NOT call `loaded.dispose()` while applied; dispose handle instead. Do NOT deepDispose the target while wardrobe still active. Source body skeleton is never disposed by wardrobe.

## Actual work + evidence

- CC0 donor: official VRoid beta **Darkness Shibu**, pixiv Inc. License evidence read first; URL/hashes/embedded authorizations in `provenance.json`, notice `LICENSE.txt`. No restricted/retired donor.
- `darkness-studio.glb`: **1,887,960 bytes, 2,882 triangles, two cloth materials/embedded RGBA PNGs <=1024 px**, 44 weighted bones plus needed ancestors. Original triangles, UVs, normalized source weights preserved, unused body/hair/face/morphs/textures pruned. Alpha retained, no JPEG damage.
- Recomputed target inverse binds and weighted rest-space warp; max positional correction **0.000482633 m** for sleeve rest differences. Runtime maps weighted joints to actual target bone objects; no rigid attach, skeleton duplicate posing, head/hips-parent trick, or missing-bone fallback.
- Hides ONLY two exact reviewed `_CLOTH` material primitives, including old shoes. Whole-body mixed material meshes use cloned group filtering; original skin/face/eyes/groups and preexisting visibility remain untouched. Disposal restores source clothes.
- CPU tests load BOTH actual shipped female-studio high/mobile VRMs, run same vertex/skeleton optimizations and VRM0 rotation as loader, sample rest and 15 shipped Idle/Walk/Interact frames plus arm-up/seated-leg pose. Target clothing is same template family but sleeves/weights are not identical: **max native-cloth surface vertex deviation 0.011141582 m at rest / 0.017179825 m sampled motion**. Tests explicitly bound this at 12/18 mm, not pretend zero-deformation parity. Boots agree within 0.000000314 m.
- CPU raycasts compare covered central torso against actual target skin, front/back 18 rays: **minimum rest clearance 0.009217869 m**. This is targeted coverage, not a global self-collision/alpha guarantee. Source skin stays intact; no destructive skin masking.
- Khronos glTF validator: **0 errors, 0 warnings, 0 infos** (`gltf-validation.json`). `tsc --noEmit` passed. Unit test command below passed 4/4.
- No browser/screenshot acceptance yet, no all-poses collision or dynamic skirt physics claim. Parent must sequentially wire and visually inspect alpha, knees/hem, torso, sleeves, footwear, toon/light style and seated poses. Other bodies deliberately unsupported.

## Reproduce offline

```sh
python3 scripts/assets/prepare-studio-wardrobe.py
node node_modules/vitest/vitest.mjs run tests/unit/avatar-wardrobe.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
```
Preparation requires numpy/Pillow and retained source artifacts in `scripts/assets/cc0-costumes`; does not download anything. Existing source GLBs remain audit originals. Do not distribute all source candidates; only this compact reviewed asset is runtime-addressable.
