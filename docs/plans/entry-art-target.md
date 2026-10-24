# Habitat entry art target implementation plan

**Goal:** Produce one actual in-engine visual/interaction reference, not another game system: the existing house facade and front door, compared at identical desktop/phone camera positions.
**Architecture:** Preserve saved house dimensions, wall/roof/floor color choices, structural IDs, collision, avatar, camera and plot objects. Add a small coordinated material family and deterministic door-motion/confirmed-state sound response. No new dependency, sky overhaul, automatic garden, patio, tree or furniture placement.
**Stack:** Existing React Three Fiber, Three.js CanvasTexture, native Web Audio, Playwright.

## Art contract
- Shape: softly bevelled, human-scale construction; stone plinth, quiet plaster, cedar-clad gable, painted timber door, restrained brass.
- Values: light plaster body; medium warm timber gable; one darker sage interactive door. Fine grain is secondary and low contrast, never a noisy high-frequency filter.
- Palette roles: existing user wall/roof colors remain authoritative; warm limestone/cedar support them, sage marks the door, small brass highlights identify the handle. No extra saturated accents.
- Light: retain the current daylight preset and camera. Use inexpensive local contact shading at wall feet, not bloom or a new postprocessing stack.
- Detail: concentrate readable panel relief/lever hardware at the doorway. Gable and roof courses use shared textures, not hundreds of extra meshes. Keep low/mobile quality viable.
- Motion: quiet handle turn then smooth 0.44s opening / 0.38s closing. No shake, squash, hit-stop or input lock for a household action.
- Audio: low-volume latch/wood response only after the accepted state changes; never on mount, failed action or polling. Unlock with real user input; provide a sound toggle; no autoplay or external audio download.
- Approval: this is a candidate visual reference. Do not roll this material treatment into unrelated props/worlds until user sees the actual before/after.

## Tasks / verification
1. Capture actual `/habitat-test` before images at 1000x760 and 390x760 (`scripts/qa/entry-art-target.mts`). Completed before edits; do not replace them with renders or generated pictures.
2. Write failing unit tests for finite, bounded, reversible door motion and palette/feedback constraints; run the focused command red before implementation.
3. Implement shared procedural material family and use only in the existing modular house; keep geometric openings and all saved inputs intact.
4. Implement motion and confirmed-state audio feedback; update existing near-door prompt styling without changing its accessible action labels. Test initial/opened-snapshot silence, state transition one-shot, bounds and reversals.
5. Rebuild the existing source preview. Run `CTRL_ART_LABEL=after node --import tsx scripts/qa/entry-art-target.mts --exercise` sequentially, not beside a build or second Chromium suite. Assert actual hinge angles, PC E/mobile touch, shell/roof visible, no layout rewrite, no JS errors.
6. Inspect actual screenshots, generate an honest before/after contact sheet from them, and show the candidate. Run focused existing house tests and project `tsc --noEmit`.

Baseline images: `test-results/entry-art-target/before/`. Working implementation is in the real source route, not a separate cosmetic fake scene. Local source verification does not imply signed-server QA or public deployment.

References (read, not mass-installed): `gamedev-skills/awesome-gamedev-agent-skills` / `create-game-assets/references/art-direction.md` and `game-feel/SKILL.md`. New material patterns, geometry detail, easing and sound synthesis are authored here; no third-party image/audio assets are copied.
