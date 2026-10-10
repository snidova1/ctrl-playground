# CTRL Luxury Asset Sourcing (real sources; no fake SKUs)

Sourced on **2026-10-10** directly from artist-approved Poly Haven asset pages, which explicitly list CC0; license: https://polyhaven.com/license. Structured shortlist is at `creative-assets/premium-source-candidates.json` and can be reviewed without downloading binary content.

## 15 real source assets

1. **Modern Arm Chair 01** (LUXE): https://polyhaven.com/a/modern_arm_chair_01  | original author: Vibrant Nordic | source page package: approx. 138.8 MB | rework-materials-and-LOD
2. **Mid Century Lounge Chair** (LUXE): https://polyhaven.com/a/mid_century_lounge_chair  | original author: Kuutti Siitonen | source page package: approx. 46.47 MB | mobile-LOD
3. **Coffee Table Round 01** (LUXE): https://polyhaven.com/a/coffee_table_round_01  | original author: Ulan Cabanilla | source page package: approx. 35.74 MB | mobile-LOD
4. **Sofa 03** (GRAND): https://polyhaven.com/a/sofa_03  | original author: Fran Calvente | source page package: approx. 9.33 MB | mobile-LOD
5. **Ornate Mirror 01** (GRAND): https://polyhaven.com/a/ornate_mirror_01  | original author: James Ray Cock | source page package: approx. 6.8 MB | reflection-fallback
6. **Chandelier 03** (GRAND): https://polyhaven.com/a/Chandelier_03  | original author: Kirill Sannikov | source page package: approx. 26.85 MB | static-light-bake
7. **Lantern Chandelier 01** (GRAND): https://polyhaven.com/a/lantern_chandelier_01  | original author: Kirill Sannikov | source page package: approx. 57.52 MB | static-light-bake
8. **Chinese Screen Panels** (GRAND): https://polyhaven.com/a/chinese_screen_panels  | original author: Kirill Sannikov | source page package: approx. 34.32 MB | low-poly-with-PBR
9. **Chinese Sofa** (GRAND): https://polyhaven.com/a/chinese_sofa  | original author: Kirill Sannikov | source page package: approx. 34.59 MB | mobile-LOD
10. **Chinese Tea Table** (GRAND): https://polyhaven.com/a/chinese_tea_table  | original author: Kirill Sannikov | source page package: approx. 35.51 MB | mobile-LOD
11. **Brass Vase 03** (SIGNATURE): https://polyhaven.com/a/brass_vase_03  | original author: Rico Cilliers | source page package: approx. 28.97 MB | single-object-LOD
12. **Marble Bust 01** (SIGNATURE): https://polyhaven.com/a/marble_bust_01  | original author: Rico Cilliers | source page package: approx. 51.83 MB | reduce-mesh-and-atlas
13. **Vintage Grandfather Clock 01** (SIGNATURE): https://polyhaven.com/a/vintage_grandfather_clock_01  | original author: James Ray Cock; Yann Kervran | source page package: approx. 34.92 MB | retarget-pendulum-animation
14. **Horse Statue 01** (SIGNATURE): https://polyhaven.com/a/horse_statue_01  | original author: Rico Cilliers | source page package: approx. 21.36 MB | LOD-and-bake
15. **Modular Urban Apartments Facade** (SIGNATURE): https://polyhaven.com/a/modular_urban_apartments_facade  | original author: James Ray Cock | source page package: approx. 663.38 MB | HIGH-MEMORY-REQUIRES-SPLIT

**Do not claim these models have been imported.** They are genuine published third-party source art, not yet downloaded, converted, optimized, integrated, previewed locally, or runtime tested in CTRL. They are also CC0 and hence fundamentally **non-exclusive**. All candidate rows are marked `approvedForCtrlGallery:false`, `approvedForEthSale:false`. No source screenshots copied; thumbnail art requires individual rights/ToS check even though downloadable CC0 3D models are freely reusable. Only official source URLs are currently used.

## ETH tier production candidates, definitely above CTRL Signature

- **Moonphase Desk Clock** (atelier): proposed **$7.99**. Custom miniature clock body, motion-animated moon disc, emissive painted face, three selectable colorways. Source inspirations: ph-vintage_grandfather_clock_01, ph-brass_vase_03. Status: **concept / not for sale**.
- **Living Gilt Mirror** (atelier): proposed **$9.99**. New ornate silhouette, user camera portrait reflection capture fallback, custom PBR frame and interactive shimmer. Source inspirations: ph-ornate_mirror_01. Status: **concept / not for sale**.
- **Imperial Lounge Kit** (estate): proposed **$29.99**. Original curated 3D room composition, made-to-fit woodwork, seat hotspots and authored dynamic lighting. Source inspirations: ph-sofa_03, ph-ornate_mirror_01, ph-Chandelier_03, ph-brass_vase_03. Status: **concept / not for sale**.
- **Lacquer Pavilion Set** (estate): proposed **$49.99**. Original architectural pavilion mesh, bespoke painted floor and screens, material variations, interactive seating. Source inspirations: ph-chinese_screen_panels, ph-chinese_sofa, ph-chinese_tea_table. Status: **concept / not for sale**.
- **Sculpture Palace** (masterpiece): proposed **$79.99**. Original palace/gallery architecture, custom animated art presentation, themed lighting and authored exploration route. Source inspirations: ph-marble_bust_01, ph-horse_statue_01, ph-lantern_chandelier_01, ph-brass_vase_03. Status: **concept / not for sale**.
- **Skyline Terrace** (masterpiece): proposed **$99.99**. Original high-rise rooftop terraces, bespoke structure and vegetation, ambience and interactable social features. Source inspirations: ph-modular_urban_apartments_facade, ph-modern_arm_chair_01, ph-coffee_table_round_01. Status: **concept / not for sale**.

ETH Exclusive will sell original **in-game rights to the enhanced authored prefab/world kit** after true source-to-product transformation, polish, QA, legal check, and payments engineering. We cannot claim copyright exclusivity over the CC0 donor files, even if a paid pack includes original value. Distinguish sale of item license from sale of a 3D model for use outside CTRL; never mislead buyers into thinking the raw public domain part is exclusive.

## Shipping pipeline (must be real, not just metadata)

1. Obtain files using official Poly Haven asset page/download or documented public API `https://api.polyhaven.com/files/{id}`. Treat API response URL, md5, sizes and upstream files hash as canonical. Live API terms may require attribution to provider. Respect hosting bandwidth and terms; do not scrape pages or assume CDN paths.
2. Save upstream asset URLs, actual downloaded file SHA256, source CC0 evidence and conversion log. Do not commit raw archives to app production bundles.
3. Convert with glTF Transform / Blender, bake textures to 1K or 2K, KTX2 or WebP as supported, mesh/Draco/Meshopt optimize, generate separated desktop/mobile LODs. Generate **local owned** thumbnails after import.
4. Run 3D validation including geometry, texture formats, triangle counts, GPU draw calls, compression, collisions, scene loads and license. The raw source 663.38 MB modular facade must be split into modules; do not load that entire file on client.
5. Register only finalized binary asset IDs in the existing build catalog and Astro/Astra's merged Habitat asset resolver; enforce holder tier on server using verified CTRL on-chain balance. Do not enable paid ETH products by adding a frontend Buy button.
6. ETH asset publication needs *more* than optimized donor GLBs: build unique authored 3D prefabs/environments with functional interactions; add explicit product terms and non-exclusive CC0 source disclosure; verify per-wallet entitlement, paid on-chain receipt, refunds/finality and prevent replay attacks. Only then create real ETH shop inventory.

## Reliable source licensing judgment

- **Poly Haven** CC0 explicitly allows commercial use, redistribution, and products you sell (https://polyhaven.com/license , https://docs.polyhaven.com/en/faq). Do not claim original authorship or exclusive rights over the sources.
- **Smithsonian Open Access** CC0 designated specific 3D scans (https://www.si.edu/openaccess/faq). Quality often huge and source-specific flags need review.
- **Fab Standard** (https://www.fab.com/eula) permits incorporating assets into commercial projects but restricts standalone redistributions. Do not use it as automatic ETH item-resale permission.
- **Sketchfab Standard** (https://sketchfab.com/licenses) also restricts standalone sublicensing/sale. Require custom author license for individual paid inventory before import.

## Owner handoff

This research belongs to the separate builder/gallery PR #14, based on PR #2. Do not rewrite new Astra backend #11, move any funds, merge production, or share token credentials. Ask QA worker to approve hashes, tri budgets and mobile profiles before import. The current `ETH_PRODUCTS` is intentionally empty.
