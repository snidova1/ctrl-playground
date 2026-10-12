# CTRL Cozy Playable: First Release Boundary

## Creative reference and original identity

Direction: a warm multiplayer life-sim with an inhabited home, gardens, walking around together, tactile building, approachable mobile controls and a restrained HUD. Heartopia is a **genre/quality reference only**, not a source of copied assets, character designs, brand names, UI art or game code. CTRL remains **A PUBLIC MACHINE**, with a distinct world, wallet-owned space, and later holder economy.

## What this PR actually ships

An editable, open-front **cozy cottage** as the new wallet user's first durable personal world. It is composed only of already-bundled Kenney CC0 assets. The build includes floor, wall and window sections, a walkable doorway, deliberately open dollhouse roof, indoor sitting area, sofa, coffee table, chairs, rug, lamps and plants, and an outside garden with shaded trees, benches and a walkable front path. No new license or remote asset request.

- The ordinary verified-owner state/save API persists real objects, not a staged background.
- Users may move, recolor through approved existing avatar palettes, remove, duplicate, and place normal catalog objects with the existing builder. These models do **not** implement actual modular outfits.
- Existing homes (including deliberately emptied worlds with revision greater than zero) are untouched. Only a new, revision-zero, empty owner's home gets the updated first-run template; an old empty home may use the existing explicit restore action.
- Under the 70-object starter performance budget and 120-object server ceiling. Viewport/mobile WebGL QA is required before release.

## Freeze scope for a fast playable release

Must work end-to-end before deploying: public Common Ground; clear wallet connect and signature; rotatable approved VRoid creator; one durable furnished home; walking/camera/touch input; build/Undo/Redo/save/reload; visitor sessions and private-world ACL; proper no-WebGL fallback; actual tap-to-play original audio; and safe return to home after session expiry.

**Do not block playable release on** onchain Keys, ETH sales, tier monetization, modular wardrobe mesh imports, fishing/cooking/gardening progression, NPC jobs, pets, marketplaces, AI builder agents, new third-party asset packs, or more worlds. Those are not shipped in this PR and must not be advertised as working.

## Release verification

1. Merge/reconcile the independent, already-green PR #21 (API request budget) and #22 (mobile dual-wallet CI time budget) into latest integration without rewriting worker files.
2. Verify this branch's focused unit tests, types/lint/build and genuine composited-pixel browser checks for both desktop and mobile. Screenshots must show cottage geometry, not merely verify asset metadata.
3. Run full combined integration browser tests at the exact release SHA, check staging on an actual WebGL-capable device, and visually accept VRoid + cottage + both viewports.
4. Publish the **tested integrated build** through the authorized existing deployment path, then perform live wallet signing, home save/reload and a second-wallet visit. Do not claim publication from GitHub PR status alone.
5. Keep production `main` and live Site stable until the integrated release is accepted. No external funds, public chain deployment or paid transactions.

Known limitation: this is a cozy playable **MVP**, not Heartopia feature parity. Starter cottage model shells are standard Kenney primitives, not bespoke hand-painted architecture. Improvements to shaders/assets require a dedicated approved pass after stability.
