# Independent hair + wardrobe integration — 2026-10-21

## Shipped in the local working tree

- Independent authored hairstyle controls: Female Studio source/short fringe; accepted male source/twin tails with the donor's authored cat ears. Female signature remains source-only. Source geometry, materials and rig retained; donor bone names are namespaced so animation bindings cannot shadow the live body.
- One additional independent costume: `darkness-studio`, **Female Studio only**. Original outfit remains selectable; unsupported body/outfit combinations normalize to source. The garment is transferred to the target skeleton, not rigidly attached. Only original cloth primitives are masked, leaving skin/face/eyes intact.
- Costume and hairstyle fields are included in normalization, schema validation, weighted seeded random, creator controls, async load/disposal and saved profile roundtrips. Legacy saves remain compatible. Original outfit does not request a garment download.
- Costume GLB is approximately 1.9 MB, not the full approximately 360 MB preparation set. Public provenance/license and preparation instructions: `public/plaza/characters/wardrobe/README.md`.
- Unlit garment materials support existing cloth palettes without cumulative tint. Existing MToon materials retain their original path.
- Expression controller/blink lifecycle remains integrated. Pendant and Fumiriya remain retired. No restricted M3 assets.
- Public-world character aliases no longer replace canonical model IDs, preserving hairstyle compatibility checks in that scene. Existing scene heights are retained.

## Verified on the final production build

- **73 tests passed / 0 failed / 11 files**, single combined run: wardrobe, wardrobe API/palette integration, hairstyles/animation-binding regression, expression controller, customization, accessory presets, authored fitting, retired-profile API migration, VRM runtime, analog input and public-world profile. Machine-readable result: `/tmp/ctrl-avatar-final-unit.json`.
- TypeScript `tsc --noEmit` and Next production build exit 0; 19 static pages. Build retains an upstream `ox/tempo` dynamic dependency warning and Node SQLite experimental warnings; not warning-free.
- Targeted ESLint across 12 changed runtime/test files exits 0 with `--quiet` (no errors; this is not a global lint claim).
- `scripts/qa/avatar-wardrobe-live.mjs`: all four Female Studio hairstyle/costume pairings, walking frames and phone-width creator pass. No page errors or horizontal overflow. Source costume performs no wardrobe GLB fetch. Actual screenshots examined.
- `scripts/qa/avatar-independent-hair.mjs`: four supported source/swapped hairstyle cases pass on production.
- `node --import tsx scripts/qa/avatar-wardrobe-habitat.mts`: real nonce/signature authentication using an isolated ephemeral wallet, create character with short hair and gothic costume, enter actual Habitat, wait for a gameplay avatar instance distinct from creator, then reload and verify persisted appearance. Pass; actual gameplay screenshot examined. Initial anonymous 401 is expected, not an authentication failure.
- Production served HTML's webpack chunk name was checked against current generated HTML before acceptance; HTTP 200 alone is insufficient.

## QA environment pitfall resolved

The initial QA SQLite file had WAL enabled but no application tables. Run `CTRL_LOCAL_DB=/tmp/ctrl-avatar-combined.sqlite node scripts/migrate-local.mjs` before exercising authentication/profile APIs.

Stopping the tracked shell did not stop its orphaned Next child. The old process retained port 3173 and served cached HTML referring to a deleted previous-build webpack chunk, while current disk output was correct. Inspect actual listening PID and cwd, stop only the owned stale QA server, then start with `exec env ... node ... next start`. Verify actual served chunk filenames, not merely that a new launch command returned.

## Scope / remaining limits

This delivers **one newly fitted outfit**, not five new costume designs. Five legal source models/prepared artifacts are not five ready-to-wear CTRL outfits. Compatibility is deliberately restricted; physical-device FPS, universal cross-body garments, full-suite health and global lint are not claimed. All changes are local; no commit/push/deployment is claimed.
