# Native modular avatars — integration and release status

## Technical state

Integrated into the shared main `VrmAvatar` renderer used by `/avatar-studio`, the signed Habitat creator, Common Ground guest generation and gameplay. This is not just `/character-preview`.

Registry: `features/plaza/characters/modular-parts.json`.
- 2 native body families, 2 eye parts.
- 20 hairstyles, 20 tops, 18 bottoms, 20 shoes.
- 5 optional outer layers, 9 native accessories.
- 96 source VRMs total, each prepared in high (embedded images max 1024) and low (max 512) quality. Native mesh, humanoid, expressions and license metadata remain intact. Original downloads remain under `/tmp/ctrl-modular-smoke`.
- Main-part selection is family-scoped; no fitting unrelated avatar rigs or treating recolors as hairstyles.
- Optional layers can overlap bulky tops; the controls explicitly disclose this. Arbitrary all-layer combinations have not been visually certified.

`CharacterAppearance.version` stays 1, with optional `modular: {family,hair,top,bottom,shoes,outer?,accessory?}`. Strict API allowlisting and existing legacy save compatibility are preserved. Existing stored guest appearances are not regenerated. Only new guests/profiles use the new random constructor.

Native parts keep separate raw/normalized rigs. One shared animator writes the base normalized pose; every native layer copies it after the mixer, updates its own raw rig once per fixed step, and mirrors supported face expressions. Donor node names are namespaced to avoid mixer collisions. Disposal, abort races and failed-load cleanup are covered by tests. Palette classification recognizes native material roles, including skin/Face consistency.

## Verified execution

- 96 tests passed across 11 targeted avatar/customization/runtime/wardrobe/input suites.
- Project `tsc --noEmit --pretty false`: passed.
- Optimized Next Node build: passed (existing `ox/viem` dynamic-import warning remains).
- Main creator Playwright: 20 combinations, every one of the 78 primary part choices exercised, both families, optional layers, walking, expression, 390px layout, low-quality asset requests; no page errors or failed asset responses.
- Fresh production chunk filenames checked against `.next-node/static` before the end-to-end tests.
- Two fresh signed throwaway wallets: creator -> save -> fresh gameplay instance -> WASD -> reload, all seven modular fields preserved by `/api/habitat/state`.
- 390px coarse-pointer emulation: joystick visible; actual dispatched touch start/move/end events exercised for both families. This is browser emulation, not a physical handset FPS claim.

Proof:
- `test-results/avatar-modular-main/report.json` and actual screenshots.
- `test-results/avatar-modular-habitat/report.json` and creator/gameplay/phone screenshots.
- `scripts/qa/avatar-modular-live.mjs`
- `scripts/qa/avatar-modular-habitat.mts`

## Public-release blocker: asset license

**This bank is not verified CC0/free-to-redistribute. Do not describe it as commercially cleared or publish it as a free asset bank.**

All 96 prepared files were independently read and retain VRMC_vrm metadata:

```
authors: [Webaverse]
avatarPermission: onlyAuthor
commercialUsage: personalNonProfit
allowRedistribution: false
modification: prohibited
licenseUrl: https://vrm.dev/licenses/1.0/
```

Downloaded source: https://github.com/memelotsqui/character-assets at `c8b5d6f9b4f6e20480e66d5a17198cdc52f2158f`.
Actual upstream: https://github.com/webaverse-studios/character-assets . Neither repository provides a root LICENSE in the inspected revision/current upstream. The MIT license of M3 CharacterStudio's application code does not itself grant permission for separately hosted third-party assets. No superseding grant for these exact assets was found.

No public deployment was performed. The current integrated local mock demonstrates the complete runtime/save path, but release is blocked on an explicit applicable license/permission or replacement with genuinely permitted common-rig assets. The data-driven registry and integration can be reused for such replacements; no need to rebuild the renderer/save contract.

## Reproduce locally

Run one renderer/browser workload at a time on this small WSL machine. Avoid rebuilding the output directory of a still-running Next server; stop only the QA server you started. Use isolated temporary SQLite databases, not another active app's `.sites-runtime/ctrl.sqlite`.

```sh
CTRL_BUILD_TARGET=node CTRL_MODE=mock CTRL_LOCAL_DB=/tmp/ctrl-modular-build.sqlite node scripts/migrate-local.mjs
# Initialize WAL on the isolated DB before concurrent build workers, if new.
CTRL_BUILD_TARGET=node CTRL_MODE=mock CTRL_LOCAL_DB=/tmp/ctrl-modular-build.sqlite NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=2048 node node_modules/next/dist/bin/next build --webpack
CTRL_BUILD_TARGET=node CTRL_MODE=mock CTRL_LOCAL_DB=/tmp/ctrl-modular-integration.sqlite node scripts/migrate-local.mjs
CTRL_BUILD_TARGET=node CTRL_MODE=mock CTRL_LOCAL_DB=/tmp/ctrl-modular-integration.sqlite APP_ORIGIN=http://127.0.0.1:3173 node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3173
CTRL_AVATAR_QA_ORIGIN=http://127.0.0.1:3173 node scripts/qa/avatar-modular-live.mjs
CTRL_AVATAR_QA_ORIGIN=http://127.0.0.1:3173 NODE_NO_WARNINGS=1 node --import tsx scripts/qa/avatar-modular-habitat.mts
```

The first unisolated build hit transient `database is locked` during page-data collection; the isolated WAL build passed. No application rows were edited and no unrelated server was stopped to resolve it.
