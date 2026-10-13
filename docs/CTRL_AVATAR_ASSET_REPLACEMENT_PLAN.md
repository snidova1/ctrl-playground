# CTRL PR #30 — Whole-character playable roster implementation

Updated: 2026-10-14 (WIB)

## Final owner decision

**All sixteen previously researched models are accepted as future CTRL character choices, even across different art styles.** Variety is intentional. No anime-only rule and no extra art-direction veto merely because a source is realistic or film-cartoon. Every character is **FREE to every player**, with no token unlock, purchase, customization or wardrobe parts.

1. Blender Studio: **Rain, Snow, Ellie, Jay, Victoria, Rex, Phil, Einar, Vincent, Lunte**.
2. BOOTH: **Haku, Shikk/Sick, Akane, Satake Nagisa, Summer-Chan, Donut-Chan**.

**IMPORTANT: Request to make them PLAYABLE, not a documentation-only task.** Every completed import should end with a valid local VRM, a visible entry in the whole-character selector, persisted wallet/profile selection, working multiplayer rendering and full animation/QA.

## Code already implemented in PR #30

- `features/plaza/characters/requested-sources.ts`: all 16 source links with license/dependency flags and honest import status.
- `features/plaza/characters/ready-character-assets.ts`: audited imported binary manifest. Initially **empty** for these 16. Unlike research sources, this is consumed by the actual production runtime.
- `features/plaza/characters/catalog.ts`: resolved full-character IDs + automatic import from installed manifest.
- `server/habitat/service.ts`, `domain/habitat.ts`: wallet profile accepts and replicates a validated whole-character ID. Unauthorized/uninstalled IDs are rejected.
- `features/habitat/app.tsx`: whole-character selector, Surprise me, no outfit/hair/skin sliders.
- `features/plaza/characters/vrm-avatar.tsx` and `features/habitat/character-creator-preview.tsx`: removed rendering of procedural wardrobe parts.
- `scripts/ingest-character-vrm.mjs`: **one-command ingest** of each complete audited **self-contained VRM** file; validates GLB/VRM magic, embedded resources, 20MiB browser budget, provenance and SHA-256, and automatically enables character selection in game.
- Regression tests: `tests/unit/character-source-roster.test.ts`, `tests/unit/character-appearance.test.ts`, character-selection browser journeys.

### How to actually import an available finished VRM

Example only after obtaining a source-licensed file and checking it:

```bash
node scripts/ingest-character-vrm.mjs \
  --id booth-akane --file /tmp/Akane.vrm --name Akane --gender female \
  --creator minto_akayama --license CC0 \
  --source-url https://booth.pm/en/items/8861598 \
  --height 1.75 --rights-confirmed
```

The committed local binary autoappears in the selector because `ready-character-assets.ts` is runtime-wired. The game does not need new character per-ID source-code patches.

## BLOCKERS AND HONEST PLAYABLE STATUS

**Currently in repo:** two original working full VRMs, Victoria and Fumiriya. **New 16 imported: 0/16 as of this update.** A source filename in TypeScript is NOT a playable imported model.

Why not all sixteen immediately: BOOTH free downloads route through mandatory **pixiv sign-in**, and none of those original downloadable package files was provided in this task. Blender Studio rigs are distributed as **.blend** projects (often tens of megabytes) that require **baking/retarget/export to humanoid VRM** in a functioning Blender/Unity exporter runtime; the currently available GitHub connector can edit repository code but does not run Blender, sign into BOOTH, or transfer these authenticated binary archives. Do not substitute some other unrelated VRM and label it as Rain/Akane/etc.

**To finish**: obtain legal source binaries, convert Blender rigs in a proper 3D authoring runtime, run the importer, test animations and mobile, record authentic screenshots, then merge when all release gates pass. Do not claim green tests/screenshots unless actually run. Existing 2-avatar fallback remains intentionally usable until replacement files arrive.

### License constraints
- Blender Studio CC-BY materials require attribution in CTRL and corresponding derivative documentation.
- BOOTH license policies vary. Satake Nagisa, Summer-Chan, Donut-Chan require individualized public-game redistribution authorization and/or derivative ingredient checks.
- Source is `¥0` or free to browse; do not assume it grants hosting commercial downloadable VRM assets. Only import with distribution rights and creator-specified conditions observed.
- Do not buy 3D avatar assets. Do not invent XP, tokens, price tags, token shop or other economy.

## Completion definition

All 16 are *actually available in browser player picker*, each using its original authorized 3D model; full-body rotates, is visible in worlds for all players, animates, persists after re-login, and mobile runs. Signed server allowlist rejects arbitrary IDs, source credit and exact binary checksums are retained. CI, browser tests and visual screenshots pass on exact final SHA. Until the binary ingestion happens, **16/16 playable must not be claimed**.

## Actual download proof — 2026-10-14

**Rain v2.6 source successfully fetched** from Packt's public GitHub repository using CTRL's GitHub Action runner, after direct chat-file downloads were blocked:

- Original public archive: https://github.com/PacktPublishing/Realizing-3D-Animation-in-Blender/blob/main/rain_v2_6_packt.zip
- Run: https://github.com/snidova1/ctrl-playground/actions/runs/38467834462
- Job: `public-rain-source`, outcome **success**.
- GitHub artifact: `ctrl-rain-public-source`, artifact ID `11849292126`; contains ~20MB original ZIP, `SHA256SUMS.txt` and provenance.
- SHA-256 original Rain inner ZIP: `e31659d181f4b2674958d01b9471bfecc9d7b2faf9cec404ed6d72b9d3111334`.
- Verified inner archive contains **`rain_v2_6_packt.blend`**, approximately 7.99MB, plus source maps/textures (31 entries total).
- Extracted into user's persistent ChatGPT Library: `/CTRL/Character_Sources/CTRL_Rain_Character_Source.zip`.
- License: CC BY, Rain © Blender Foundation, attribution required.
- **Not playable yet:** the `.blend` rig still must be exported/retargeted into a self-contained normalized humanoid VRM, with visual QA. The 16 new playable roster count remains **0**.
- Other 15 sources: no authenticated original model files fetched or claimed by this note. BOOTH downloads require account sign-in. Blender Studio rig pages may also require membership/login for actual original file downloads.
