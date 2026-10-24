# Authored hairstyle expansion — local verification

Status: integrated locally; not committed, pushed or deployed by this pass.

## Accepted additions

- `cc0-shino-long`: long authored Shino hairstyle, **Female Studio only**.
- `cc0-shibu-bob`: authored Shibu rounded bob, Female Studio and accepted male.
- Female Studio now has four hair choices including original; male has three including original. Female signature remains source-only.
- Runtime donor metadata/URLs and catalog/schema/seeded random select the compatible styles. Existing version-one appearances remain supported.
- Compact high/low VRM donors preserve authored UV/material/weights and source CC0 metadata. See `public/plaza/characters/hairstyles/README.md` and provenance JSON for exact bytes and hashes.

## Quality gates, not just asset counts

- Long hair on male is **not selectable**: rear render exposed the hoodie through the hair. CPU head-fit alone was insufficient.
- Vita additional costume remains an **unactivated candidate**. Native alpha cutouts did not provide the intended coverage on the target body; retaining the full source dress underneath obscured most of the design. Neither trial was promoted.
- Shibu/Shino costume candidates were rejected by preparation for six missing weighted target bones. Vivi maps all bones but failed actual torso clearance on both target qualities (negative clearance recorded in `additional-candidate-review.json`). No guessed remapping or skin masking was enabled.
- The accepted wardrobe remains original + Darkness gothic on Female Studio. This pass does **not** add a second accepted costume.

## Creator layout

Character model, hairstyle, costume and expression now come before accessory presets/manual accessories. Helper text contrast improved. Browser assertions check the four primary selects, their order before accessories, minimum 44px heights and no horizontal overflow at 390px viewport. Phone-width browser QA is not physical-device FPS testing.

## Verified execution

- Focused regression: **100 passed, 0 failed, 15 test files**, including signed API/SQLite persistence, new actual-rig CPU hair candidates, wardrobe guards, expressions, legacy appearances and analog input.
- Project `tsc --noEmit --pretty false`: exit 0.
- Production webpack build: exit 0. Existing `ox` dynamic-dependency warning and SQLite experimental warnings remain.
- Fresh production 3173 verified HTML webpack URL exists on disk and serves 200, avoiding the old orphan-server mismatch.
- Hair browser QA: **7 accepted body/hair configurations**, plus side/rear snapshots of new styles.
- Wardrobe browser QA: **8 Female Studio hair/costume combinations**, walk captures, rotated side/rear checks and phone-width controls. Zero collected page/shader errors in this script.
- Signed Habitat QA with `cc0-shino-long` + `darkness-studio`: created character, waited for a distinct gameplay scene UUID, saved/reloaded and preserved appearance. One unauthenticated bootstrap 401 was logged before sign-in; signed flow passed.
- No full-suite/global-lint success or real-device performance claim. Targeted ESLint and diff check run separately.

## Artifacts

- `test-results/avatar-hair-expansion/accepted-hairstyles.jpg`
- `test-results/avatar-independent-hair/report.json`
- `test-results/avatar-wardrobe-live/report.json`
- `test-results/avatar-wardrobe-habitat/report.json`
- `/tmp/ctrl-avatar-expansion-unit.json`
