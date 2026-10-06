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

## Immersive archive expedition

Dead-web manifests now open a full-viewport first-person archive (`features/worlds/archive`). The hall contains shelves, terminals, overhead lighting, drifting paper and an animated exit gate. Visitors walk with WASD or touch buttons, turn by dragging (arrow keys also turn), and restore nearby terminals with E or the context action. The guide button physically walks to the next unconnected terminal; it does not teleport. Terminal collision and hall boundaries constrain movement. All terminals restored opens the gate. Field records appear only when requested; the main view remains the world.

Archive connection progress is stored on the device. Return to entrance resets position but preserves progress. Index and receipts remain available as semantic DOM controls. Reduced motion disables ambient motion; the pause button pauses environmental animation. This is one authored expedition, not a claim of unconstrained AI world generation. The other two mechanics kits retain their previous presentation in this iteration.
