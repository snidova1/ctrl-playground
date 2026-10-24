# Complete AIRI-style character — local prototype

## Result

A **complete AvatarSample_A VRM** is now an opt-in authored character (`lookId: airi`, `ctrl-anime-airi-a`). This is not a new head grafted onto the modular bank. Original hair, face, full body, outfit, humanoid rig, expressions and metadata are retained. Existing saves/defaults and the two modular collections remain available.

AIRI's current authoritative `packages/stage-ui/src/stores/display-models.ts` lists `preset-vrm-1` as AvatarSample_A. Source model successfully downloaded from `https://dist.ayaka.moe/vrm-models/VRoid-Hub/AvatarSample-A/AvatarSample_A.vrm` (HTTP 200, 26,781,812 bytes). Embedded author/title: VRoid Project / AvatarSample_A. This identifies the preset/model; it does not assert AIRI has one universal startup default or that Hiyori Live2D is a VRM.

Only embedded images were resized using the existing `prepare-modular-runtime.py:prepare` routine: high max1024, mobile max512. Prepared sizes are 9,756,736 / 8,041,444 bytes; geometry/rig/expression structure is unchanged. Provenance with hashes is under `public/plaza/characters/airi-reference/provenance.json`.

Embedded VRoid Hub conditions explicitly allow commercial use, avatar use, alterations and redistribution, attribution optional; the linked conditions page was fetched and checked. Original metadata retained. This is separate from the older modular bank's unchanged licensing hold.

## Integration

- Creator model selector: **AIRI · AvatarSample A · complete character**.
- Saved v1 appearance JSON recognizes `lookId: airi`; the resolver selects the new complete model. Normalization keeps its compatible source hair/costume only.
- Selecting it resets old body/donor/color/accessory choices to the complete source look. No cross-rig grafting.
- Old saved original/alternate identities remain readable. Existing legacy seed look distribution is explicitly unchanged; no forced model migration.
- The original outfit/hairstyle is a package for this model. Native M3 wardrobe pieces are **not** advertised as compatible with it.

## Verified

- Full project TypeScript noEmit: exit 0, heap1536 MB.
- `avatar-airi-complete.test.ts`: **5 PASS**, covering save normalization/resolution, old save/gender behavior, seed stability, compatible styles, and high/mobile rig/mesh/expression/metadata identity.
- Actual unmodified React `CharacterCreatorPreview` + `AppearanceControls`, freshly bundled from source: desktop/high and phone touch-emulation/low both pass. Direct new asset HTTP200; no route overrides or page errors.
- Real loaded-model switching native→AIRI verified using renderer model telemetry and ready state, not just select value. Explicit animation states: Interact→cancel→Walk→Idle.
- Neutral whole-body and face screenshots visually inspected. Real six-second 640×650 MP4 generated and probed.

The full unrelated unit suite exceeded its 240-second command budget; **no full-suite pass is claimed**. A fresh full Next production build/deploy was not performed. Phone checks are emulation, not physical-phone performance validation. New model visual acceptance is still the user's decision.

## Reproduce

```sh
node scripts/qa/build-face-redesign-preview.mjs
python3 scripts/qa/serve-face-redesign.py
# another shell
node scripts/qa/airi-whole-character.mjs
node node_modules/vitest/vitest.mjs run tests/unit/avatar-airi-complete.test.ts
```

Open `http://127.0.0.1:3198/live.html?model=airi` for the actual shared React creator prototype. Evidence: `test-results/airi-whole-character/` (report, full-body/face/walking screenshots and `ctrl-airi-whole.mp4`). No commit, push or deployment performed.
