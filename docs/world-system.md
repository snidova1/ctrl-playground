# Living worlds

`/worlds/create` is the recipe workbench. Visitors name a world, describe its intent, choose a mechanics kit, name 3–9 objects, choose an accent and play a local preview. Eligible operators can submit the validated recipe to the public mission queue. Selection and execution produce a stable world URL, downloadable JSON artifact and SHA-256 receipt. Private build jobs create owner-protected worlds.

## Current mechanics

- **The Dead Web:** walk a terminal archive, restore records, reveal source notes.
- **Internet Weather:** cultivate signal beds, animate growth, adjust wind and daylight.
- **Agent Orbit:** connect relay stations, accelerate their moving instruments, reveal routes to a central hub.

These are authored procedural kits, not arbitrary model-generated geometry or scripts. The model supplies a bounded research report; a validated recipe selects the trusted runtime. Renderer modules, assets and behaviors are controlled by application code. Existing exhibition records remain labelled curated or synthetic.

## Runtime

`domain/world.ts` validates recipe version, kit, object limits and client state. `features/worlds/runtime` implements movement, camera tracking, pointer selection, environment controls and active/dormant object state. Three.js is lazy loaded. A software triangle renderer supports devices without WebGL. Hidden tabs stop rendering; reduced-motion disables continuous animation. GPU resources and listeners are disposed on unmount.

DOM controls expose every object and action, including a movement pad and overview control. Pointer ground selection, keyboard WASD/arrows, and touch buttons move the visitor. A goal is complete when all objects are activated. Field notes preserve provenance.

Progress is stored **on the current device**, not onchain or in a shared simulation. Fork creates an editable local recipe. Recipe changes receive a separate local progress key. There is no multiplayer, background world agent, free-form asset generation or cross-device state sync in this release.

## Persistence and security

World manifests and mission references live in D1; recipe/report artifacts live in R2. The world write and mission completion are one database batch. Every generated world fetch checks its mission visibility; private worlds require the owning session. Recipe fields cannot add scripts, remote asset URLs or new renderers. Downloaded artifacts have a sandbox CSP. Publishing a world does not execute untrusted source code.

To add mechanics, register a new schema-approved kit, implement its scene and DOM actions, test state restoration and disposal, and document mobile and reduced-motion behavior.
