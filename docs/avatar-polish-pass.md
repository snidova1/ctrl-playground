# Avatar polish: retire pendant and coordinated styles

## Implemented
- Removed pendant from selectable neckwear, seeded generation and accessory geometry. Only a legacy compatibility ID remains readable; it normalizes to `none`, retaining all other saved fields. Retired Fumiriya fallback remains in place.
- New seeded avatars draw accessory occupancy independently of catalog size, avoiding every slot being almost always occupied. Existing saved avatars are not rerolled.
- Added six coordinated accessory styles: Artist, Cozy, Scholar, Ribbon, Dreamer, Everyday. These are **accessory combinations**, not new authored costume/hair meshes.
- Styles retain gender, authored model, hairstyle color, eye/skin colors, outfit tint, and expression. Clear accessories resets only accessory slots without erasing identity.
- Shared creator controls have accessible pressed-state buttons, 44px+ touch targets, and a clear action.

## Verified directly by parent
- Latest combined targeted run: **55 tests passed, 7 files**, including real API/SQLite persistence, retired pendant migration, actual skinned-model hand clearance and preset identity preservation. Vitest completed exit0. The chained typecheck/lint command subsequently reached its overall timeout; not reported as a passing combined command.
- Earlier new-preset-only run: 4 tests, project typecheck and scoped lint exit0.
- Actual browser source render at local dev port3171: six presets selected/rendered; original hair color retained; pressed states; pendant absent; clear slots; mobile no horizontal overflow; no page errors. `test-results/avatar-polish/report.json`, screenshots and `coordinated-styles.jpg`.
- Production webpack build with project TypeScript: final **exit0**. Two prior attempts hit SQLite startup `database is locked` during page collection. Root cause: temporary build DB was still in DELETE journal mode while concurrent workers attempted WAL upgrade. Preinitializing **only `/tmp/ctrl-avatar-polish.sqlite`** to WAL before the final build resolved it; application DB implementation and user data unchanged.
- Temporary dev server stopped after screenshots to free memory. No commit, push or deployment.

## Limits of this earlier accessory-only pass
At this earlier pass, independent authored hair/costume meshes were still limited; presets did not satisfy that content gap. BOOTH registration was blocked by CAPTCHA and no BOOTH download was claimed. Later native modular integration is documented separately. AIRI/Amica runtime P1/P2 implementation is now covered by [avatar-gesture-polish-qa.md](avatar-gesture-polish-qa.md); it does not import either full upstream application.
