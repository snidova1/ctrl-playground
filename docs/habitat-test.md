# Habitat test playground (staging/local only)

`/habitat-test` is a client-local gameplay/build playground. It is **not** the normal owned `/habitat` route.

- Entry needs no wallet, signature, Key purchase, mint, profile creation or backend membership.
- An exact server-side host allowlist accepts `ctrl-staging.suhiro211.workers.dev` and local development hosts. Other hosts return `notFound()`.
- The Public World HUD shows **Tes Habitat** only on those hosts.
- The playground reuses the actual Habitat Stage, native AIRI character, house geometry, camera/collision, doors/windows, seat/light actions, touch analog/run, modular HouseWorkshop and furniture catalog.
- Fresh local snapshots use the spacious six-module default house and clean starter plot.
- Save writes validated layout + interaction state only to `localStorage['ctrl-habitat-test-v1']`. It never writes the actual Habitat API. Another browser/device has its own independent test copy. Storage denial shows an error and keeps the current session usable.
- Normal owner/guest/Keys ACL, normal owned-world saves, contracts, accounts and wallet ownership are unchanged. The in-memory `canEdit` flag belongs only to the standalone sandbox scene, not a server permission.
- Portal/world travel is not active in the playground. This is not multiplayer or server persistence.

## Furniture placement and interaction

- Choose **Perabot → an asset** to start a camera-center ghost preview; choosing an asset alone does not modify the layout.
- Drag the scene to aim, use the analog to walk, and use **Putar / Pasang / Batal**. On keyboard, `R` rotates and `Escape` cancels.
- Green means a valid floor position. Red disables confirmation for overlaps, walls/door obstruction, sky/out-of-range targets or world limits. Placement snaps to 0.25 m and requires explicit confirmation.
- **Your pieces → select an object → Posisikan lewat kamera** relocates an existing object without changing its ID or duplicating it. Cancel preserves the original transform.
- Save & play commits the draft to this browser's sandbox snapshot; reload keeps the confirmed transform. No server save, wallet or Key grant is involved.
- Interaction proximity uses normalized, rotated/scaled 3D asset bounds rather than only a mesh center. Seat/HUD/camera anchoring follows the selected chair ID and its current transform. Normal server ownership checks remain enforced.
- The Habitat canvas disables browser touch gestures so a camera swipe is not cancelled as page scrolling. Placement uses a shoulder camera offset to keep the avatar away from the reticle.

## Verification

```sh
NODE_OPTIONS=--max-old-space-size=1536 node node_modules/typescript/bin/tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=512 node node_modules/vitest/vitest.mjs run tests/unit/habitat-test-sandbox.test.ts tests/unit/public-world-hud.test.ts
CTRL_QA_ORIGIN=http://127.0.0.1:3240 node --import tsx scripts/qa/habitat-test.mts
CTRL_QA_ORIGIN=http://127.0.0.1:3240 node --import tsx scripts/qa/public-world-hud.mts
CTRL_QA_ORIGIN=https://ctrl-staging.suhiro211.workers.dev node --import tsx scripts/qa/furniture-aim.mts
```

The furniture check also asserts that the actual rendered ghost follows the reticle, that saved transforms match the ghost, and that scaled-chair reach uses the visible bounds. A seated screenshot waits for the completed `Seated` animation and checks the actual VRM hip world height against the seat surface; a changed button label alone is not proof of correct seating.

On memory-limited WSL, run full tests, TypeScript, builds and browser QA serially. SQLite fixture runs can use a cleaned-up temporary directory under the canonical `realpath /dev/shm` to avoid slow disk sync; the noncanonical `/dev/shm` alias can fail native database-path assertions.

The sandbox browser check uses a fresh anonymous browser, native touch events, real avatar/scene loading, local structural undo/redo/save/reload and furniture placement, and asserts zero `/api/` requests. The HUD check uses a generated throwaway signed test wallet through the existing real Common Ground/public-avatar flow; it does not mock API responses or mint a Key. Mobile checks are Chromium viewport/touch emulation, not a physical iPhone/Bitget-wallet FPS or pairing acceptance test.
