# World system

Worlds are modules with typed manifests: slug, index, title, originating mission, renderer ID, assets, metadata, data source, mobile behavior, demo flag and interaction hooks. `features/worlds/world-page.tsx` loads registered renderers lazily. Unknown slugs produce a deliberate missing-world state.

The three initial exhibitions are distinct:

- **The Dead Web**: six curated historic internet destinations, rounded Three.js terminal objects, raycast selection and an accessible catalogue. Original sites open externally. Current uptime is explicitly unverified.
- **Internet Weather**: a synthetic 24-hour sample, procedural canvas contours, temporal scrubbing, separate attention/friction/curiosity channels and motion control. Speed/amplitude respond to the sample rather than random particle decoration.
- **Agent Orbit**: structured demonstration agents with age determining distance, activity determining motion, resource footprint determining scale, and capability determining plane. The non-WebGL version projects the same geometry onto Canvas2D, with the same inspector and index.

Generated mock-world URLs add a manifest tied to the completed mission, while retaining the curated renderer and dataset. They do not pretend to be live discovery or newly generated source code. To add a world: define and validate its dataset, register the manifest, add a lazy renderer, implement its non-3D control equivalent, and document data provenance and reduced-motion behavior.

Active exhibition modules live in `features/exhibition` and `three/exhibition`. Scene code is lazy-loaded and owns geometry/material/texture disposal, pointer raycasting, camera framing, visibility-aware animation and reduced-motion behavior. Internet Weather has its own Canvas2D contour renderer. Mobile uses deliberate camera scale and typography rather than a miniature desktop layout.

The public machine and arena use a radial blade installation. Sector widths respond to square-root-weighted mission support; selection highlights a sector and updates the real command inspector. All critical selection and navigation remain available through DOM controls. WebGL uses environment lighting; browsers without WebGL project the same geometry using a software renderer.
