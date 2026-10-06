# CTRL public workshop

The homepage is a navigable Three.js workshop, not a marketing scroll. A connected printing machine and three output rooms explain the command → work → artifact relationship through direct manipulation.

## Interactions

- Drag the space to orbit the workshop; labelled rotate, zoom and reset controls provide alternatives.
- Click a physical room or its projected DOM marker to approach it. The lower room index provides a permanent non-canvas alternative. Left/right keys navigate when no interactive control has focus.
- Drag a command ticket into the machine slot, or activate the ticket/slot by keyboard or tap. A six-second local demonstration animates the press, paper and dispatch route, then opens the corresponding existing sample world.
- The demo is explicitly labelled and invokes no provider or wallet mutation. It is not a live mission receipt. Actual proposals remain in `/commands`.
- Public live status is read from the existing mission API. Private workflows, account, wallet and backend execution remain unchanged.

## Rendering

`workshop-model.ts` owns disposable geometry, textures and materials. `portal-scene.tsx` owns camera, input and frame lifetime. `workshop-data.ts` is dependency-free so the shell does not eagerly import Three.js. The scene is lazy loaded through the shared `ClientScene` boundary.

WebGL2 is preferred. The existing software triangle renderer provides the same geometry and camera when WebGL is unavailable. Workshop floor geometry has an explicit background pass to avoid painter-sort artifacts from large ground triangles; other worlds are unaffected. No external models or texture downloads are required.

Hidden tabs stop rendering. Reduced motion disables ambient motion and camera easing. Motion can be paused independently. Geometry/materials/textures, listeners and observers are disposed on unmount. Maximum pixel ratio is 1.6 (WebGL) / 1.3 (software).

## Responsive and accessible

The phone layout keeps the scene above a touch ticket and a permanent four-room index. Touch drag rotates, tap feeds, and all world entry actions are ordinary links. Keyboard activation can complete the entire journey without raycasting. Critical content is HTML, never canvas-only. No audio autoplays.

## Scope

The workshop is an interactive introduction. It does not imply autonomous jobs are always running or that preview worlds are fresh provider outputs. Existing worlds identify curated or synthetic input data, and the operator enters the real mission system separately.
