# Authored anime VRM replacement

## Why
The owner rejected the procedural storybook dolls and asked for proper anime avatars like CharacterStudio/AIRI/Amica. Passing tests on those dolls was not visual acceptance. This change replaces the **active** procedural entry point with real authored, skinned, textured anime VRMs.

## Live path
- `catalog.ts`: new female/male definitions and desktop/phone exports under `/plaza/characters/anime/`.
- `vrm-avatar.tsx`: real `loadCharacter` + `HumanoidAnimator` + three-vrm update, preserving pose/motion, labels, sitting, celebration and floor positioning. A keyed instance prevents stale gender/quality models and disposes replaced resources.
- `character-creator-preview.tsx`: uses that exact gameplay component, rather than a separate procedural preview.
- `loader.ts`: retains authored new-model colors and reports actual MToon material counts. Legacy assets remain available but are not catalog defaults.
- Both models have authored facial expressions. Existing version-one appearance IDs, wallet/profile/world persistence and analog input remain intact. Source metadata, licenses, exact hashes and mobile image preparation are recorded with the assets.

## Attribution and scope
Female: official pixiv three-vrm `VRM1_Constraint_Twist_Sample`, with its embedded VRM Public License settings. Male: official VRoid `HairSample_Male`, CC0. These are **not original CTRL models and not M3/Anata assets**. M3 assets inspected during research had restrictive embedded metadata and were not copied into the app. The reference is model quality and the VRM rendering pipeline, not the entire CharacterStudio editor.

Existing color controls tint the authored materials; they are not a modular hairstyle/outfit geometry editor. No claim is made that this implements all CharacterStudio features.

## Actual verification
- Production webpack build: **exit 0**, including TypeScript and 19 static pages.
- Focused real API/persistence, VRM retargeting, binary cache, analog and new-model integration tests: **28 passed in 5 files**. A prior broad all-unit run was stopped by its 150-second timeout, after revealing one obsolete hard-coded default-model assertion; that assertion now derives the catalog ID and the complete affected Habitat suite passed. No claim of a full all-unit rerun.
- Real Chromium studio smoke, desktop + phone: **exit 0**. Both genders actually requested the new local VRM URLs, face view, appearance controls and animated rendered pixels passed; zero page/console errors and zero private writes. Report: `test-results/anime-vrm/report.json`.
- Real signed-wallet onboarding/reentry browser tests: **2 passed**, desktop and mobile, including the existing continuous analog acceptance and persistent same-home return. Results: `test-results/anime-vrm-entry/`.
- Targeted ESLint for all seven edited TS/TSX files, QA script syntax and `git diff --check`: **exit 0**.
- Screenshots were inspected from actual CTRL rendering. Contact sheets are simple crops/composites of those screenshots, not generated imagery or repo thumbnails. Studio source shots: `test-results/anime-vrm/`; actual mobile Habitat shot: `test-results/anime-vrm-entry/...entry-mobile/returning-wallet-habitat.png`.

## Delivery
Local preview: `http://127.0.0.1:3168/avatar-studio`. **No deploy or push performed.** Browser phone emulation is not a physical-phone FPS benchmark. Visual acceptance remains the owner's decision after seeing the actual screenshots.
