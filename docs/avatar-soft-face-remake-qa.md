# Native anime face remake — local QA

## What changed

The AIRI visual references were verified in its preset registry: Hiyori is Live2D; AvatarSample_A/B are VRM presets. This implementation does **not** import Hiyori or claim it is a 3D model. It sculpts and repaints CTRL's existing native heads toward softer anime proportions.

- Eight reversible derivatives: body + eyes, high + mobile, for drophunter and neurohacker.
- Rounded eye opening, larger curved irises, relaxed/thinner brows, shorter/rounder lower face, softer nose and small resting-mouth adjustment.
- Authored gray-blue irises with dark pupils and highlights, softer sclera/brow colors, nose repaint and restrained blush.
- Positional morphs and normals carried through deformation; topology, UVs, node/bone names, skins, weights, expression registry and non-head geometry retained.
- `modular-parts.json` selects versioned derivative filenames, avoiding stale original-URL binary caches. Original VRMs remain untouched.

## Real execution

- Focused native-asset/runtime/expression/gesture/modular tests: **56 passed / 6 files**.
- Full TypeScript `--noEmit`: **exit 0**, with 1536 MB heap. A 1024 MB attempt exhausted its heap; the retry exposed and fixed a DOM append typing issue in the diagnostic viewer.
- Native THREE/VRM portrait harness: **8 cases**, before/after neutral plus after happy/closed-blink for both families. Closed-eye screenshots inspected: no visible iris leakage.
- **Actual, unmodified shared React `CharacterCreatorPreview` and `AppearanceControls`** freshly bundled from source: desktop/high and touch-emulated phone/low for both families; wardrobe swap + expression selection passed. New catalog URLs loaded directly, HTTP 200, **no route overrides, no page errors**.
- All eight on-disk derivative SHA-256 hashes verified against `test-results/face-redesign/face-derivatives.json`.

A fresh full Next build was **not** run. A dev-wrapper attempt was too memory-heavy and was stopped; old running production wrappers had stale client assets. The successful React-component harness above avoids claiming those wrappers tested the new source. Touch emulation is not physical-phone/FPS validation. No commit, push or deployment performed. Original asset license metadata/release hold remains unchanged.

## Reproduce from repo root

```sh
python3 scripts/assets/redesign-native-faces.py
node scripts/qa/build-face-redesign-preview.mjs
python3 scripts/qa/serve-face-redesign.py
```

In another terminal, while the local server is listening on 3198:

```sh
node scripts/qa/face-redesign-capture.mjs
node scripts/qa/face-redesign-app.mjs
NODE_OPTIONS=--max-old-space-size=1536 node node_modules/typescript/bin/tsc --noEmit --pretty false
```

`http://127.0.0.1:3198/live.html` uses the real shared React creator. Add `?family=neurohacker` for the other rig. The standalone portrait harness at `/` supports deterministic face inspection. The generator parameters and UV painting coordinates are specific to the recorded native source hashes, not a generic VRM editor.

Evidence: `test-results/face-redesign/{drophunter,neurohacker}-comparison.jpg`, neutral/happy/blink portraits, actual-component desktop/phone screenshots, `browser-report.json`, `app-report.json`, and `face-derivatives.json`.

Visual resemblance is a design direction, not a claim of exact AIRI identity or user acceptance. Neutral face quality remains the acceptance gate before more expression polish.
