# The Maker avatar

The playable Common Ground character is a real skinned 3D model with a black bob, terracotta overalls, cream tee, cobalt tool pouch, brass hardware, CTRL garment patch and sneakers. It is a stylized interpretation of the selected concept, not a photorealistic reproduction of the generated illustration.

## Asset sources

The base body and bob are adapted from Quaternius's **Universal Base Characters — Standard** free pack. Motion comes from **Universal Animation Library — Standard**. Both downloaded packages include CC0 licenses, copied into `public/plaza/licenses`. Only the free tiers are used. No purchased Source pack is required.

- https://quaternius.com/packs/universalbasecharacters.html
- https://quaternius.itch.io/universal-base-characters
- https://quaternius.com/packs/universalanimationlibrary.html
- https://quaternius.itch.io/universal-animation-library

The body and facial/iris textures are the original artist's work. The clothing meshes, pouch, tools, footwear, buckles, clip and CTRL label are authored for this project. The runtime model is `public/plaza/models/maker.glb`, containing all textures and clips; there are no third-party runtime asset requests. The old `worker.glb` remains a historical asset and is no longer loaded by the courtyard.

## Build pipeline

`scripts/character/build-maker.py` takes the extracted Standard packs and produces the GLB with Blender Python. It fits and skins clothing, welds source UV seam vertices before cloth relaxation, transfers accessory weights, resizes textures to at most 1024 pixels and consolidates materials. Animation retargeting transfers rig-space rotation deltas while preserving the target character's limb lengths. Pelvis translation is scaled to the character; ordinary child bones retain their rest offsets.

Asset generation is an offline development step. Visitors and the application server do not run Python or Blender. The shipped GLB means a normal application build needs neither the source downloads nor Blender.

Example, with a Python environment containing `bpy` 5.x:

```sh
python scripts/character/build-maker.py \
  --assets /absolute/path/to/assets-source \
  --output /absolute/path/to/ctrl/public/plaza/models/maker.glb
```

Expected asset layout:

```text
assets-source/
  universal-base/Universal Base Characters[Standard]/
  universal-animation/Universal Animation Library[Standard]/
```

The author-supplied eye normal filename differs between files in the Standard pack. The build omits normal maps and uses the included base color/iris artwork; it does not require that missing map.

## Runtime

`features/plaza/avatar.tsx` clones the skeleton per visitor, shares the bone palette across that visitor's nine material primitives, and preserves cached geometry/textures. Departing visitors release their own bone palette. The asset is requested inside the lazy 3D scene.

The asset is approximately 2.99 MiB with 32,476 character triangles and nine material primitives. This is a draw/geometry inventory, not a hardware frame-rate claim.

Six clips are included: Idle, Walk, SitDown, Seated, Interact and Victory. Movement interrupts gestures; sitting enters once and transitions into the seated loop. Local interaction timestamps trigger the interaction gesture. Object placement uses the celebration animation. Each visitor's actions and transforms remain independent. Bench geometry and the seated anchor were adjusted to the adult proportions; scaled benches adjust the local seat height.

As before, remote visitors share positions and walking state. Seated/gesture state is local in this alpha; this release does not add authoritative multiplayer animation replication, wardrobe selection or an avatar creator.

## Verification

`node scripts/character/inspect-maker.mjs` renders the shipped GLB in Chromium from front, back, portrait, walking, sitting and celebration angles. `CTRL_TEST_CHROMIUM` optionally names a Chromium binary. Screenshots and actual posed bounds/draw counts are written to `test-results`. This uses the Three.js asset itself, not generated art.

`node scripts/test-plaza-render.mjs` exercises the actual R3F courtyard and API handlers on desktop and mobile. The source and GLB work without any paid provider credentials. Hardware frame rate and phone thermal performance require real-device measurement; a software-rendered test is not evidence of either.
