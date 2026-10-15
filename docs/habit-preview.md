# Habit interactive preview

Route: `/preview`. PC and phone, pointer/touch parity; not mobile-only.

- One exterior home; select its door to enter a cutaway interior.
- Original rounded/procedural furniture and canvas-generated wood/fabric textures. No extracted Heartopia game mesh, texture or binary is shipped.
- Eight movable starter items for fresh storage. Existing v2 layouts (including intentionally empty rooms) are preserved; v1 yard/house data migrates. Empty rooms offer an explicit example-room action.
- Open the furniture bag, choose an item and click/tap the floor to place it. Drag the object directly, rotate and change its primary material color, or return it to the bag. No XYZ inspector.
- Room walls/roof color controls; mouse orbit/pan/scroll and touch orbit/pinch camera controls.
- Storage: `ctrl-habit-local-v2`, with separate `yard`, `room`, `house`, `colors`. Browser-local only, not cross-device/cloud synchronization.
- Camera/shadow values are Habit implementation choices inspired by reference analysis, not a claim to run Heartopia's renderer.

`node scripts/qa/preview-smoke.mjs` against the staging origin exercises entry/exit, actual mouse/CDP-touch placement and drag, rotation, color, save/reload, removal and wall paint at desktop and phone viewports. It saves screenshots and a JSON acceptance report; `window.__habitProject` only projects world coordinates to screen for test targeting, never mutates scene state.
