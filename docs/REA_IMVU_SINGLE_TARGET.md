# REA SINGLE-TARGET FULL-WORLD EXECUTION: IMVU WEB 3D ROOMS → CTRL

**Instruction:** This is a full implementation order, not a selective inspiration task. Examine ONE target, `https://app.imvu.com/rooms/`, as deeply as legitimately available through REA's browser/JavaScript/runtime inspection. Convert **the whole relevant social-room experience** into a coherent, ORIGINAL CTRL multiplayer world, including actual navigable geography and gameplay. Do not stop at a report, new menu, screenshot or facade. Do not copy IMVU's source, scene files, maps, models, licensed animation clips, textures, proprietary shaders or protected endpoints.

## Critical scope correction (13 October 2026)

PR #26's Public World has just ~64 × 61 units of reachable space, with six homes and two storefronts near one square. That is **a demo courtyard, not an enduring social-life game**. Its source is `features/habitat/public-world-geography.ts` (`PUBLIC_WORLD_BOUNDS`, `PUBLIC_WORLD_BUILDINGS`), `features/habitat/town-scenery.tsx` and `domain/habitat.ts` (`poseInputSchema`). Extending the visual plane alone will NOT satisfy this task.

Keep `/` Common Ground as landing; `/habitat` personal persistent homes; `/public-world` freely explored social multiplayer world. No Join Multiplayer button. IMVU rooms are **interconnected social destinations** rather than a huge seamless open world. Reconstruct the social affordances, spatial density, and destination-to-destination flow, then adapt to CTRL's own walkable multi-district geography.

## A. One complete reverse-engineering pass (where allowed)

Investigate only IMVU Web 3D Rooms and owned CTRL runtime; no hunt for more comparator games. Using authorized/test accounts if available, systematically observe and document:

| Layer | Observation questions | Required CTRL outcome |
| --- | --- | --- |
| Entry and room discovery | How does a player browse, join, leave, revisit and switch rooms? | Discoverable map destinations, in-world travel and visit-home loop |
| World/room layout | What creates zones, density, sightlines, landmarks, subspaces and boundaries? | Large map with multiple navigable districts, not background houses |
| Avatar | How are positions, movement, idle poses and animation state represented? | Responsive VRoid walking, running, idle, turning, smooth camera |
| Object interaction | How do seat spots, furniture, decoration and interaction targets work? | Real click/proximity interactions and synchronized shared context |
| Avatar-to-avatar | How are invitations, paired actions, emotes and social proximity presented? | Mutual opt-in greeting, wave and synchronized group/pair action |
| Social | How do nearby chat, friend/group discovery, room presence, names and invites behave? | Real player presence/chat/party signals, not fake NPC users |
| Creator spaces | What does decorating, visiting, publishing and discoverability feel like? | Existing editable Habitat integrated into living Public World |
| Information architecture | HUD, world map, menu layering, feedback, activity prompts | Responsive compact game HUD; meaningful destination navigation |
| Technical behavior | What is loaded when, how are assets culled and LOD handled? | Zone loading, mobile budgets, scalable presence updates |
| Return loops | What makes a room worth coming back to? | Repeatable lightweight social activities and changing ambient life |

REA should provide evidence with a target URL, captured date, observable fact or source/trace location, uncertainty and implementation mapping. If a feature requires an account/device that isn't available, record `NOT OBSERVED` (not invented). Do not run intrusive probes against a third-party service, collect user data, or bypass safeguards. Continue original CTRL implementation using permitted references.

## B. Mandatory original CTRL map architecture: large connected SOCIAL WORLD

Create one coherent world with **six or more** distinct destinations, at minimum a planned ~300 × 300 metre-scale coordinate footprint (subject to profiling and navigability tests). Example ORIGINAL layout, adjustable following authorized REA observations:

1. **Willow Town Center:** fountain, café, market, avatar rendezvous and world/room directory.
2. **Residential Promenade:** actual visitable exterior front doors, neighborhood gathering points, inviting friends into their separate owned Habitats.
3. **Garden & Riverside Park:** winding paths, bridges, picnic seating, group rest/social activity.
4. **Harbor & Boardwalk:** waterfront, dock, live ambient scene, fishing/pier-like optional original social interaction.
5. **Artisan/Creative Quarter:** shops, outdoor workshop/crafting or building showcase, collaborative interaction area.
6. **Festival Meadow:** outdoor stage, music/dance social activity, event square and re-usable gathering destination.
7. Optional **Forest/Lookout** only after six above are genuinely complete, not as empty land.

**Every district MUST** have a unique strong visual identity; actual accessible walking paths; authored landmarks and boundaries; at least one operable player-facing activity; seating/group slots where appropriate; and a useful reason to travel. Distinct is not merely renamed labels or repeating the same house mesh six times.

Implement:
- Region/district declarations as reusable typed data shared by rendering, client movement and server validation. No phantom scene larger than server's accepted position bounds.
- Continuous paths and bridges (collision/terrain must match rendered surfaces) with real usable routes; exterior/interior transitions where appropriate, and no walking through solid houses or water.
- In-world signposts, mini-map / destination list and **server-authorized travel shortcuts** to shorten crossing a long map. Never implement unrestricted client teleport via large presence coordinate updates. If shortcuts use a server endpoint, validate fixed allowlisted destination IDs, authenticated session, fixed safe spawn points and sequence rules.
- Region/chunk streaming, visibility-distance culling, instanced vegetation/props, pooled animations and LOD. Do not render every building/tree/VRoid everywhere at once. Mobile and desktop screenshot/FPS evidence.
- Presence by nearby area / interest radius and nearby-player UI while retaining the single shared world ID and authoritative actual online counts. Preserve privacy and ACLs; no fake multiplayer counts.
- Behavior and gameplay distributed across the districts: public bench sitting; coordinated greeting; invitation/accept for shared emote; social gathering at café; festival dance/wave loop; interactive activity at creative quarter; visit friend's Habitat and return to public world; transient proximity chat. Preserve keyboard, touch, accessibility and moderation/safe-text constraints.
- Room interiors or scene transitions only when they deliver actual new play space; a rendered locked exterior pretending to be enterable is NOT done.
- Low-cost NPC schedules to create believable motion without falsifying real-user activity. Distinguish NPCs explicitly.

Do not add speculative monetization, token gates or unrelated quests. User wants a complete SOCIAL GAME, not a gigantic MMO economy.

## C. Implement as one integrated vertical slice, not fragmented mockups

Do not ship a first district and call it full release, and do not ship a million-square-metre blank landscape. Work on a single implementation branch; build all six linked destinations and their interaction loop before marking the task complete. Intermediate commits are allowed; "DONE" only after the whole social loop is working.

Core acceptance journey, **two independently signed browser wallets**:
1. User A starts at Common Ground; authenticates, reuses VRoid and enters Public World automatically.
2. User B enters the **same** world and meets A in Town Center. Both see each other and share nearby speech/waves (not two NPCs).
3. Both walk/travel to a **non-center district** and see the correct local scenery, paths and nearby presence without reset, rubber-banding, clipping or huge loading stalls.
4. A invites B to a paired/social activity, B explicitly accepts, and both clients show synchronized state (not single-player animations with fake labels).
5. They repeat a real activity at waterfront/creative quarter/festival, not just read an instruction panel.
6. A visits B's authorized Habitat, and can return to the same Public World while preserving identity and multiplayer connections.
7. B's private Habitat is correctly denied to an unauthorized wallet. Back-end permissions and wallet boundaries never weaken.
8. On a 390x844 mobile viewport the player moves and uses all actions without the HUD obscuring half the rendered scene.
9. REA findings `docs/qa/REA_IMVU_EVIDENCE.md` must link every observed feature to a changed codepath and a passing regression, or explain why not observable/applicable. No 100% claim without evidence.

Visual acceptance: screenshot REAL WebGL output for the **center AND at least 3 remote districts** on desktop/mobile. Confirm there is actual distinct visible architecture, paths, landmarks and playable geometry beyond the former 64x61 square. Screen captures from unrelated image generation are not valid proof.

Engineering acceptance: `pnpm test`, `pnpm typecheck`, `pnpm lint`, actual `pnpm build:next`, both-world browser tests and server-side auth/collision tests. Check performance/memory and budget; record precise exceptions if a platform tool is missing. Preserve original QA suites, no skipped assertions or “temporarily” disabled guards.

Deliver a PR with code, before/after real screenshots, exact SHA, test logs, measurable region coverage and a reconciliation plan with current Public World PRs. Do not merge/deploy production without authorized integration/test.

**Failure modes that are explicitly NOT acceptable:** merely bigger ground plane; distant fake homes; static NPC packs; one café surrounded by empty park; fake social chat; a room-navigation menu pointing to unimplemented areas; empty clickables; unauthorized client teleport; screenshots only of Town Center; claiming close to IMVU/Heartopia quality without matched tested behavior.

## D. Integration constraints

- Public World is a server-owned shared world, not wallet-owned edit space; retain profile/guest boundaries.
- Keep existing two VRoid approved base rigs. No legacy MIO.
- Keep Common Ground landing design untouched and the personal Habitat builder fully functional.
- Do not reuse proprietary assets, map meshes, animation data or copied game code. Independently develop from behavioral observations using allowed library assets.
- READ `docs/REA_PUBLIC_WORLD_EXECUTION.md` and `FIRST_REA_AGENT_TASK.md` as companion orders. This file supersedes them where the older scope says “town square,” “a few activities” or “P0/P1/P2 optional polish.”
