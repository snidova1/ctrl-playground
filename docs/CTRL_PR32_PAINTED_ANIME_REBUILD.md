# PR32: Painted Anime World Rebuild

## Decision

**Do not polish PR31 into the visual foundation.** Branch PR32 directly from PR30 and reauthor the visual scene. Preserve existing authoritative collision, signed movement, NPC ownership and world activities. A successful first milestone is a distinctive, attractive **real Willow Square gameplay render**, not an attractive AI mockup.

## Willow Square implementation (first checkpoint)

- New \`town-anime-village.tsx\`: coherent hand-painted-material color system; winding ivory paths instead of full-screen red brick; original gabled curved-roof cottages and two storefronts; layered leafy canopies and narrow branching trunks; planted edges, wildflowers, far layered ridgelines and real water/boats/fountain.
- New \`town-scenery.tsx\` orchestration: old procedural center shell removed from rendering. Keep signed avatar/NPC simulation, visible world labels and directory access, bridges and peripheral district access.
- Existing collision footprints \`PUBLIC_WORLD_BUILDINGS\`, \`PUBLIC_WORLD_SHOPS\`, bridge widths, river boundary and activity state remain authoritative. Pretty geometry is not trusted by server.
- New unit coverage for footpath normals, roof mesh and collision invariants.

## Visual acceptance criteria before any reuse elsewhere

1. Render the **real app**, signed player and WebGL scene in production mode, both desktop 1440×900 and mobile 390×844. Review at actual gameplay eye level, not an editor bird's-eye view.
2. Compare against PR30 screenshot at the same camera with **visible architectural, landscape and spatial differences**. If it still reads as low-quality primitives, redo the assets and composition.
3. Test world movement, boat/bridge passages, all seven districts, doors/activities, multiplayer and visit-habitats directory. Zero scene errors.
4. Keep a capped draw-call, triangle and software-WebGL budget, then validate on physical mobile hardware separately. Never mistake browser mobile emulation for iPhone performance.
5. Source/license ledger for any future third-party 3D models. No premium asset scraping.
6. No PR32 merge, Common Ground migration or Habitat migration until the **real Willow Square hero render is approved**.

## Next steps after approval

- Complete Harbor, Clover Neighborhood, Fernwood Park, Artisan Row, Sunset Meadow and Applehill Orchard using the same **authored environment architecture**, replacing each old procedural district shell.
- Extract visual tokens, materials, foliage, paths, props, sky and lighting into portable packages. Common Ground adopts the landscape + social plaza aesthetic; Habitat adopts the editable modular furnishing/house palette with its **own** player-placed object collision and access control. No copying public-world fixed coordinates into personal habitats.
- Re-run screenshot and behavior tests separately for Public World, Common Ground and Habitat.

## Scope notes

No user screenshot asset has been fabricated. PR32 is an engineering candidate until the CI browser captures, visual approval and performance gates pass. Rebuild first, then polish. The creative reference is a warm *hand-painted Japanese animated-film feeling*, not copied copyrighted film backgrounds or characters.
