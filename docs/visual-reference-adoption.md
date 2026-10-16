# CTRL stylized visual reference adoption

This is a WebGL adaptation in `/preview`, not a renderer replacement or a claim to reproduce Heartopia assets. Existing door, room, furniture, save and VRM animation paths stay intact.

| Reference | Revision inspected | Adopted / decision |
|---|---|---|
| [stylized-components](https://github.com/cortiz2894/stylized-components) | `1cece0a296b29299d1380c34feb5c158b2f04500` | Grass root-to-tip shading, quadratic rooted wind masks and instance-local correction for a world-space wind field. WebGL materials retain lighting/shadow/fog integration. |
| [summer-cycle](https://github.com/StarKnightt/summer-cycle) | `8b977baad061e797c2f6c19cfcf07c1e79b23a67` | `src/world/timeofday.ts`: coordinated sky/sun/fill/fog palettes and eased transitions. Four exterior presets with clickable UI and T key; not an automatic real-world clock. |
| [ghibli-style-shader](https://github.com/craftzdog/ghibli-style-shader) | `8f140c5684a3a0273acbc7be9e328fde0f62eb05` | Inspected as an art/shading reference. Original four-band foliage shading inspired by its normal/light-driven palette approach, implemented in `ghibli-shading.ts` and the canopy. No upstream code or texture copied; repository license remains unverified. |
| [three-liltoon](https://github.com/mochiya-labs/three-liltoon) | `9669b22a2f230b211bf3fcfc6c205c8f6c414244` | Package `@mochiya/three-liltoon@0.1.5` integrated in preview: renderer bridge, in-memory MToon-to-lilToon loader adapter after VRM 0 migration, expression bindings and cleanup. Other routes keep default MToon. Browser acceptance asserts actual lilToon material count and preserved expressions. |
| [stylized-scene](https://github.com/dedekpo/stylized-scene) | `ec8fd6b311f1963871977181caf60e6a3121c67c` | Shared wind field, grass/path blending/composition, shaped foliage and Neutral tone mapping approach. Its WebGPU/TSL implementation is not imported into the WebGL scene. |

## Scope and controls

- Still one enterable home, not a copied village demo.
- Exterior atmosphere: Daylight → Golden hour → Sunset → Blue hour. Click the sky/time button or press T outside text inputs. Transition blends light and sky together over 3.6 seconds.
- Indoor lighting remains its dedicated cozy setup; exterior sky presets are not a claim that the indoor window artwork is a live sky portal.
- Landscape geometry and procedural textures are generated locally; no new remote texture/font dependencies or upstream demo binaries.
- Low/high quality paths bound vegetation density. A browser render and interaction check is required in addition to TypeScript checks: GLSL compile errors do not reliably become React errors.
- This change does not migrate from WebGL to WebGPU or replace the VRM loader.

License notices for adapted MIT code/techniques: [visual-reference-licenses.md](visual-reference-licenses.md).

## Cottage and HUD polish

- Actual cottage mesh scaled 1.75× without enlarging the avatar; ground-picking, vegetation exclusion and solid colliders share the exterior layout.
- Compact Enter/Exit pill retains a 44px minimum touch target.
- English HUD with icon dock, furniture search/categories, paint swatches, selected-item controls, camera reset and responsive desktop/phone layouts.
- Grass height reduced to 0.15–0.43 world units so it does not dwarf the avatar.
- Browser screenshots and smoke results under `test-results/` are generated locally; these changes are not automatically deployed.
