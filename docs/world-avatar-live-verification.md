# Avatar life, analog/run and connected public districts

## Implementation

- Shared 12-second standing idle: subtle breathing, head/torso/shoulder/arm movement. Existing male/female stance, planted lower body and original finger tracks remain intact.
- Shared face controller adds restrained neutral-idle micro-expression/gaze. Explicit expressions, look targets, speech, custom morph ownership and reduced-motion behavior retain precedence. One animation mixer and one VRM update order remain.
- Common Ground and Public World reuse `AnalogStick` and `TouchRunButton`. Multi-touch run is momentary; pointer cancellation, blur and control unmount release input. Common Ground pauses input during sign-in/creation.
- Public World's local actor now consumes its saved complete-character definition rather than choosing the legacy male/female template unconditionally. The `running` signal reaches the actual locomotion state instead of being forced false in `AnimePeople`.
- Public World includes Willow Common, Spring Garden and Lantern Market as **three connected districts**, not three reskins or independently deployed games. Existing Recast-authored core cells are preserved. Flat lateral exploration cells are authored around colliders for beds, trellises, stalls and lamp posts. District travel validates destinations and resets velocity/input/camera offsets.
- Garden and market structures are visual exploration landmarks. There is no implemented market trading/economy claim. Public-world exploration does not grant Habitat build rights.
- Reown uses the installed, version-compatible EthereumProvider/AppKit bridge. Main Connect opens AppKit; browser-wallet connection is an explicit fallback. AppKit modal Escape does not close the underlying Common Ground sign-in state.
- Public project ID is configured through `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`; staging config generation includes that non-secret runtime binding when provided. Connected/reconnected wallets still require the real nonce/signature/verify sequence before authenticated avatar persistence.

## Verification already executed

- `NODE_OPTIONS=--max-old-space-size=512 node node_modules/vitest/vitest.mjs run tests/unit/avatar-*.test.ts tests/unit/common-ground*.test.ts tests/unit/analog-input.test.ts tests/unit/wallet-reown.test.ts tests/unit/network.test.ts tests/unit/public-world-profile.test.ts tests/unit/public-districts.test.ts tests/unit/worldgacha.test.ts`
  - 31 files / 268 tests passed. Includes actual-rig idle/stance/expression/gesture/Run regressions, controls, wallet signature-state boundaries and district navigation checks.
- `node scripts/qa/build-face-redesign-preview.mjs && node scripts/qa/public-world-alive.mjs`
  - Actual shared Public World browser render: Idle → Walk → Run → Walk → Idle, district travel, phone-emulated two-finger analog/run and zero uncaught page errors.
  - Screenshots/report: `test-results/public-world-alive/`.
- Reown wallet explorer accepted the supplied project ID and staging Origin with SDK headers (HTTP 200). This is not evidence of a completed real-phone wallet pairing/signature.

## Final-artifact checks

Run `scripts/qa/common-ground-direct.mjs` against the final local worker for direct guest entry, restored guest identity, analog/run and no arrow-pad regression.

Run `scripts/qa/reown-public-world.mts` through the existing TypeScript runner against the final local worker. It checks actual AppKit rendering/closing, followed by an explicitly isolated test browser wallet using a fresh throwaway key and the **real backend** nonce/signature verification, profile save, reload and district travel. No application API responses are mocked. Report: `test-results/reown-public-world/`.

Physical-phone GPU/touch behavior and a real wallet-app pairing/approval remain separate human-device checks; desktop touch emulation must not be reported as either.
