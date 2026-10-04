# World system

Worlds are modules with typed manifests: slug, index, title, originating mission, renderer ID, assets, metadata, data source, mobile behavior, demo flag and interaction hooks. `features/worlds/world-page.tsx` loads registered renderers lazily. Unknown slugs produce a deliberate missing-world state.

The three initial exhibitions are distinct:

- **The Dead Web**: six curated historic internet destinations, R3F terminal objects, raycast selection and an accessible catalogue. Original sites open externally. Current uptime is explicitly unverified.
- **Internet Weather**: a synthetic 24-hour sample, procedural canvas contours, temporal scrubbing, separate attention/friction/curiosity channels and motion control. Speed/amplitude respond to the sample rather than random particle decoration.
- **Agent Orbit**: structured demonstration agents with age determining distance, activity determining motion, resource footprint determining scale, and capability determining plane. The mobile/non-WebGL version is an SVG map with the same inspector/index.

Generated mock-world URLs add a manifest tied to the completed mission, while retaining the curated renderer and dataset. They do not pretend to be live discovery or newly generated source code. To add a world: define and validate its dataset, register the manifest, add a lazy renderer, implement its non-3D control equivalent, and document data provenance and reduced-motion behavior.

Rendering infrastructure includes CanvasRoot, quality profiles, camera/pointer/transition helpers, muted optional audio infrastructure, WebGL capability probing and frame/geometry instrumentation. R3F assets are disposed with component teardown. CSS3D scenes explicitly cancel animation frames, remove handlers/observers and clear scene references. Heavy worlds do not block the homepage shell.

The atrium and arena render real Three.js spatial geometry through CSS3D, preserving their full visual language even without WebGL. Arena object size and selection distance reflect support. Bounded collision separation preserves readable objects. Mission selection is available from HTML buttons and the list; visual geometry is not the source of truth.
