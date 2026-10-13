# CTRL full rebuild: canonical upstream reference stack

**Scope:** One integrated game, not a visual-only PR. This file records the user's chosen references and their exact responsibilities. It is a **source list and implementation contract**, not evidence that an upstream library/game has already been installed or ported. Execution continues in PR #30 and subsequent tested code; no docs-only completion.

## Gameplay, map and social systems (PRIMARY reference)

- [Brayden/townies](https://github.com/Brayden/townies): analyze and adapt its world geography and expansion, social gameplay loops, jobs, world-state changes, co-op gardening and community contributions, housing visits, town progression, presence/chat/friends, object interactions, and multiplayer server architecture. **Gameplay reference, NOT final drone/isometric camera or visual quality.** Rebuild each relevant system in CTRL's original freely walkable third-person world.

## Visual world (ALL FIVE references)

| Reference | Assigned work in CTRL | Integration status |
| --- | --- | --- |
| [cortiz2894/stylized-components](https://github.com/cortiz2894/stylized-components) | Stylized animated grass, foliage and water rendering/components | Original concept-inspired grass and water implemented; upstream components not integrated |
| [StarKnightt/summer-cycle](https://github.com/StarKnightt/summer-cycle) | Cohesive countryside/cozy world visual language, sky, sunlight, atmosphere and time-of-day behavior | Original time-of-day prototype; upstream scene/character not integrated |
| [craftzdog/ghibli-style-shader](https://github.com/craftzdog/ghibli-style-shader) | Stylized environmental light response, tone and shadow/color grading | Reference only; not integrated |
| [mochiya-labs/three-liltoon](https://github.com/mochiya-labs/three-liltoon) | Candidate toon material pipeline for VRM/GLB characters, outlines and lighting consistency | Reference/candidate only; existing VRoid renderer still uses @pixiv/three-vrm MToon |
| [dedekpo/stylized-scene](https://github.com/dedekpo/stylized-scene) | World scene composition, vegetation dressing, density and props | Reference only; implementation, licenses and formats require review |

**Visual goal:** high-quality original 3D social town from a third-person ground-level camera, not Townies-style orthographic aerial graphics, and not an empty map or isolated polished spawn square. Deliver distinct, asset-rich, physically traversable districts on desktop and mobile. Before using upstream code/assets, inspect repository-specific licenses/credits and verify Three.js/R3F compatibility; don't blindly combine incompatible shaders.

## Character, camera and physics candidates (ALL FIVE)

| Repository | Assigned evaluation |
| --- | --- |
| [norio/vrm-game-starter](https://github.com/norio/vrm-game-starter) | VRM animation, humanoid retargeting, foot IK and third-person camera patterns; port compatible modules, not its WebGPU renderer wholesale |
| [pmndrs/BVHEcctrl](https://github.com/pmndrs/BVHEcctrl) | Preferred R3F ground movement/collision controller candidate (benchmark before replacing current movement) |
| [hh-hang/three-player-controller](https://github.com/hh-hang/three-player-controller) | Optional advanced camera/physics controller comparison, not an unconditional second controller |
| [VerseEngine/three-avatar](https://github.com/VerseEngine/three-avatar) | Social/avatar/networking architecture comparison; check legacy dependency versions |
| [yomotsu/meshwalk](https://github.com/yomotsu/meshwalk) | Optional collision/pathfinding alternative; don't install overlapping movement stacks |

**Character goal:** genuinely redesigned original VRM-compatible anime characters with proper swappable hairstyles/outfit meshes, expressions, animation blending, foot IK, idle/walk/run/jump/sit/paired interaction, creator preview and persisted cross-player appearance. The current Victoria/Fumiriya tint variants are an intermediate state, **not** completion.

## Investigation tool

- [morluto/rea](https://github.com/morluto/rea): optional technical inspection of legitimately accessible upstream references and CTRL's own authorized runtime. Prioritized source-level audit for Townies and technical/visual study for five world repos. **No claim REA has already executed in this PR.**

## Definition of done for Codex / Work / Hermes

1. Read and analyze each linked source, confirm actual component interfaces and license terms, select a *compatible* implementation and document exact code mapping (or concrete reason to reject).
2. Implement complete original Townies-grade gameplay: multi-district map, real jobs and repeatable activities, shared progression, meaningful multiplayer encounters, persistent state, Habitat visits and safe chat/actions.
3. Implement a coherent world look using all five visual references as research inputs where relevant, not necessarily five incompatible installed libraries. New original high-quality geometry, architecture, environment effects, and visual consistency throughout districts. Prioritize actual rendered pixels over file counts.
4. Rebuild the avatar/animation/controller stack, keeping server-side authorization, mobile performance and existing wallet/World/Habitat functionality intact.
5. Test with two independent signed players: walking/travel, job progress on both clients, synchronized social interactions, visit/revoke/return to Habitat, desktop/mobile world-builder, valid map collision and WebGL screenshots from town square **plus four distant districts**. Fix failing CI rather than disabling tests or claiming success.
6. Keep PR draft and don't merge/deploy until tests, screenshots and acceptance criteria pass.

## Honest PR #30 baseline

Already implemented in this branch: 7 district declarations (~240 × 220 unit map), shared server-side activity markers/cooldown, server-authorized travel, responsive district map, original procedural grass/water and day/night prototypes, tests. **Not yet finished:** substantive Townies job/city/social systems, actual upstream visual tech integration, original modular characters/rig/controller overhaul, visual polish, browser release gates. Read [PR #30](https://github.com/snidova1/ctrl-playground/pull/30) for current exact run statuses.
