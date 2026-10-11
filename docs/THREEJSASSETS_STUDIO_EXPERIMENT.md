# Three.js Assets Studio -> CTRL Common Ground / Habitat experiment

This is an **isolated proof of concept**. Branch:
`experiment/threejsassets-studio-common-ground`, based on
`work/master-integration`. No edits to `main`, `gpt6/world-builder`
or Astra's branches; no deployment, purchases, token logic or server changes.

## What has been implemented

- The **existing** `/worlds/editor` advanced Habitat Builder now offers
  **Import Three.js Assets Studio map (.json)** in the asset sidebar.
- Accepted documents: Studio `mapproj` v1 / Map data JSON and `WorldPlan`
  `schemaVersion: 1`. Input capped at 128 KB and 120 placements.
- Before anything changes, the UI previews resolved/unresolved object counts and
  explains the skipped references. **Replace unsaved draft** is an explicit step.
- Import uses the normal `change()` draft history, so **Undo** reverses the
  replacement. **Save & Play** still persists via CTRL's wallet-authenticated,
  revision-checked server endpoint with its asset allowlist and object limits.
- Converts positions in metres, yaw in radians and uniform scale, refusing
  out-of-range transforms rather than silently clipping objects to fit.
- Resolves **only** against existing, locally bundled Kenney CC0
  `BUILD_ASSETS`. Exact basename and small curated semantic aliases only.
  Ambiguous/unknown/locked site slugs and `source:local` refs are skipped.
  No third-party model URL is ever fetched or trusted.
- Does **not** consume Studio's road cell network, environment lighting or world
  size. Missing roads are shown as a warning. Layouts larger than CTRL's
  -14..14 X / -8..12 Z editor region need editing in Studio first.

## Sample / reproducibility

`examples/studio/ctrl-common-ground-garden.mapproj.json` is a **Studio-format
fixture**, not a claim of an actual Studio-authored export or an entitlement to
their paid asset catalog. It specifies 18 locally resolvable objects: patio
tiles, two benches, a coffee table, trees, lamps, potted plants and a short
stone entry path. Importing it should produce an editable small social garden
in the original CTRL Habitat scene, with the existing VRoid avatar retained.

To exercise the path:

1. Start the CTRL app on this experiment branch; connect and verify a test
   wallet with an editable home (or a world where you have edit access).
2. Open `/worlds/editor`, enter Build mode, open the Studio JSON importer,
   select the sample fixture and inspect the preview.
3. Apply the import only after checking the object count. Undo, transform and
   edit objects as desired. Use Save & Play to persist, then reload.
4. For a real Studio export, use Studio Map -> Export -> Map data (.json).
   The exporter has asset slugs from a **different** catalog: not all will
   match CTRL. Skipped assets are intentional and visible.

## Character investigation (NOT implemented)

CTRL's approved avatars are **VRoid -> VRM 0/1**, using `@pixiv/three-vrm`,
VRM material variants and an established motion retargeter. Three.js Assets
Studio's Character tool accepts **Mixamo-rigged GLB (65-bone)** and exports
Mixamo bone tracks. Directly sending CTRL's current VRM to Studio is not a
supported round-trip, and sending a Studio-created GLB to CTRL would bypass
the VRM provenance/rig approval gate. A reviewed conversion or animation
retarget pass would be needed. This experiment therefore deliberately leaves
Victoria/Fumiriya, wardrobe persistence, materials, physics and multiplayer
untouched.

Character exports from Studio's generator are additionally subject to
product ownership: its UI being free does not mean generated GLBs can be
downloaded free. We did not sign into a user Studio account or purchase
anything. No character or paid asset binary was imported.

## Verification

New unit tests: `pnpm exec vitest run tests/unit/studio-map-adapter.test.ts`.
They cover exact/semantic mapping, seat/light behaviors, transformations,
unknown/rejected references, invalid versions, unsupported roads and object
budgets. Run these and existing Habitat browser gates before merging.

**Not a passing test claim:** Tests and in-browser Studio roundtrip had not
been executed in the initial isolated experiment. A successful source commit
does not imply mobile WebGL, build, Studio login or production deployment.

## Source references

- Studio file formats: https://docs.threejsassets.com/studio/studio-formats-reference
- Map export: https://docs.threejsassets.com/studio/studio-map-exporting
- WorldPlan seeding: https://docs.threejsassets.com/studio/studio-map-worldplan-seeding
- Studio Character export: https://docs.threejsassets.com/studio/studio-character-exporting
