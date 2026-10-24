# Gender-specific standing idle

The shared VRM loader selects a standing idle for the resolved male/female character definition. This applies in Common Ground, creator previews and Habitat; it does not replace locomotion or gesture clips.

## Standing correction

- Male: symmetric relaxed stance, upper legs splayed by 0.125 radians, with opposing foot-roll compensation so soles remain level. Hips stay neutral and hands/wrists relaxed.
- Female: existing close, uncrossed stance and softer arm/wrist pose retained.
- VRM0 axis conversion remains in place. Avatar geometry, appearance JSON, saved identities and asset licenses are unchanged.

The earlier male idle used only 0.025 radians: on the actual hosted male rig its feet were still narrower than hip width. Testing only male/female animation on the female A skeleton failed to catch this. Regression now loads both the actual hosted male and female A rigs.

## Verification

- `tests/unit/avatar-standing-idle.test.ts`: actual hosted rigs, uncrossed feet, equal foot heights, lowered hands, visibly wider male stance; failed against the earlier idle and passed after correction.
- `tests/unit/avatar-*.test.ts`: 181 tests passed in 21 files.
- Full project TypeScript: exit 0.
- Actual shared-renderer captures: `test-results/airi-personalization/idle-male.png` and `idle-female.png`.

Build/deploy completion is tracked separately in `/tmp/ctrl-standing-idle-build.log` and `/tmp/ctrl-standing-idle-deploy.log`; source tests/screenshots alone are not evidence of a live deployment.
