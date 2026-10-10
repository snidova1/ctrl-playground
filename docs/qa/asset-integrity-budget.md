# CTRL Asset Integrity & Performance Budget Gate

**Owner:** independent Asset QA, branch qa/asset-integrity-budget.  
**Status:** executable Node.js CLI and synthetic fixture tests; isolated from the habitat backend, world editor and security tester.

## What this does

The read-only validator in scripts/qa/check-build-assets.mjs compares the source-of-truth catalog (features/plaza/build-assets.ts), provenance records and shipped files. It checks:

- Every namespaced ID resolves to exactly one local GLB plus one local WebP; URLs cannot point to remote models or use traversal.
- Files, pack counts, categories, stable IDs, manifest byte counts, and animation clip names agree.
- GLB v2 magic, declared lengths, bounded chunks and JSON metadata; WebP RIFF structure and embedded pixel dimensions.
- Non-empty CC0 license files, official Kenney source links and well-formed archive digest records.
- Unexpected/unlisted GLB or WebP files, accidental duplicated entries and corrupt packaging.
- Stored GLB/WebP/palette footprint, individual asset sizes and standalone desktop/mobile VRM size caps.

It **does not** guarantee a GLB is drawable, verify external textures, inspect triangle counts or measure GPU draw calls, VRAM, network waterfall, interaction delay, thermal throttling or FPS. Those remain real-device/render-test responsibilities. Manifest clip names are compared with embedded glTF JSON, not played in a renderer. The built-in tests use synthetic structures and do not pretend to be browser tests.

## Commands

From the repository root, Node 22+; no pnpm install or API credentials required:

~~~sh
node --test tests/qa/check-build-assets.test.mjs
node scripts/qa/check-build-assets.mjs
node scripts/qa/check-build-assets.mjs --json
~~~

Exit status 0: all hard checks pass; 1: integrity or budget violations; 2: missing --root argument. A CI job is included in .github/workflows/ctrl-assets.yml, scoped to asset-related changes and this QA tooling. This QA branch is not merged automatically.

## Initial hard budgets

| Measure | Gate |
| --- | ---: |
| Any build-kit model | 256 KiB |
| Any build-kit WebP thumbnail | 16 KiB |
| WebP thumbnail edges | 160 x 160 max |
| Entire build-kit footprint (GLB + WebP + palette PNG) | 20 MiB |
| Any mobile VRM export | 8 MiB |
| Any desktop VRM export | 12 MiB |

These are **static file-size guardrails**, chosen above the current shipped baseline to flag regressions. They are **not a guarantee** of good mobile frame rates, nor a license to preload the entire catalog. When a new licensed pack legitimately exceeds a threshold, review its render and loading costs before deliberately updating the budget.

## Baseline established from GitHub tree + catalog records

Checked against main snapshot cbe941bd (2026-10-10). This is repository *metadata* and catalog consistency verification, not a full runtime execution of the new binary parser.

| Pack | GLB | GLB bytes | Thumbnail bytes |
| --- | ---: | ---: | ---: |
| Building Kit | 79 | 866,180 | 48,108 |
| Furniture Kit | 140 | 1,960,832 | 219,802 |
| Nature Kit | 329 | 3,034,380 | 182,104 |
| Food Kit | 200 | 3,358,708 | 132,708 |
| City Kit Roads | 95 | 1,569,712 | 60,376 |
| Platformer Kit | 148 | 2,134,844 | 97,484 |
| **Total** | **991** | **12,924,656** | **740,582** |

Additional palette PNGs: 43,334 bytes. Total build-kit file payload: **13,708,572 bytes** (about 13.07 MiB). Largest model: **115,324 bytes**; largest thumbnail: **5,192 bytes**. All 991 catalog records have matching model file sizes and matching thumbnail paths in the GitHub tree; all six License.txt files exist. The original pack documentation reports prior GLTFLoader testing of these 991 files; this independent gate is a separate reproducible regression guard.

Other shipped VRMs from the main snapshot:

- fumiriya-desktop.vrm: 9,900,292 bytes
- fumiriya-mobile.vrm: 6,711,988 bytes
- victoria-desktop.vrm: 7,957,408 bytes
- victoria-mobile.vrm: 5,556,068 bytes

## Verification and integration boundary

Nine Node test cases passed locally using temporary synthetic fixtures: clean baseline, missing/orphan files, tampered bytes/IDs, untrusted URLs, corrupt GLB and clip names, dimension/file-size overflows, provenance/license corruption, mixed-case naming compatibility, and zero-byte thumbnails.

The current workspace lacks an authenticated checkout of all private binary files, so the **full-repository CLI binary pass has not been claimed here**. The scoped GitHub Actions job will exercise it on a checked-out branch if workflows are enabled. Treat a CI failure as a finding to investigate, not something to bypass silently.

No production asset, frontend, backend, migration, contract or other worker branch is modified by this task. The PR is intended for manual integration after any failing checks are understood.

## Confirmed repository defects (GitHub Actions)

The actual checked-out main-derived catalog **does not pass the binary integrity gate**: 14 WebP preview files are precisely **0 bytes**. These are not missing catalog rows or invented URLs. The workflow passed all synthetic fixture tests, then rejected these 14 real files. See [CI run 38039725112](https://github.com/snidova1/ctrl-playground/actions/runs/38039725112). This is a confirmed packaging defect, not a measured GPU regression.

Furniture Kit (3):

- coatRackStanding.webp
- rugRounded.webp
- stairsOpen.webp

Nature Kit (11):

- cliff_blockSlopeHalfWalls_stone.webp
- cliff_cornerLarge_rock.webp
- cliff_waterfall_rock.webp
- fence_simpleCenter.webp
- grass_leafsLarge.webp
- lily_large.webp
- stone_tallC.webp
- tent_detailedOpen.webp
- tree_detailed_fall.webp
- tree_pineTallB.webp
- tree_tall.webp

All names above are in each pack's thumbs/ folder. The other 977 thumbnails did not trigger that empty-header failure. The initial validator incorrectly restricted legal Kenney identifiers to lowercase/hyphen; its rule was fixed after the first CI attempt and a mixed-case/underscore test was added. **Do not waive the thumbnail check or treat this PR as green until valid model previews replace these empty blobs and the full CI run passes.**
