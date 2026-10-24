# AIRI / Amica avatar-runtime polish — implemented follow-up

This is an implementation follow-up to `avatar-three-repo-audit.md`, not a claim to import either upstream application wholesale. It covers the agreed shared avatar P1/P2 runtime patterns.

## Delivered
- A single expression/blink owner: smooth changes from current weights, persistent appearance baseline, supported-morph filtering, open-eye handoff, blink arbitration and inert/idempotent disposal.
- Two authored one-shot gestures, `interact` / `victory`, using the existing shipped motion bank. Each run owns a private clip/action identity, LoopOnce, clamping and crossfades. Unrelated or replaced `finished` events cannot finish a newer run.
- Cancel/retrigger and restoration to the latest sampled Idle / Walk / Run. Sitting, jump and landing interrupt safely; blocked inputs are consumed rather than queued to surprise the player afterwards.
- Retired private actions are stopped and uncached; the finished listener is removed on disposal. Mixer → expression → base VRM → native modular parts remains the fixed-step update order.
- Gesture face moods use that same face owner: wave → relaxed, cheer → happy, then restore the latest creator baseline. Unsupported morphs fall back without leaving the previous mood stuck. No extra VRM updates or wall-clock mood timers.
- Shared renderer used by Studio and Habitat. Studio exposes walk/run/sit, one-shot hello/cheer and cancel. Habitat exposes 44px+ wave/cheer controls and uses existing presence flags. No new persistence schema or synthetic animation tracks.
- Studio navigation wraps on phones; all gesture controls remain reachable. Remounting a model consumes old UI commands without replay, and a new gesture works on the new model.

## Verified on actual execution
- Complete Vitest run: **63 files, 373 tests passed**, exit 0. This includes 13 gesture-lifecycle cases, 5 gesture-expression bridge cases, expression/blink tests, real prepared native VRMs in both qualities and API/SQLite persistence.
- Production Next webpack build, including project TypeScript and static page generation: **exit 0**. Existing transitive `ox` dynamic-dependency warning remains; it was not a compiler failure. Node build output is `.next-node`.
- Real Chromium/SwiftShader desktop (1280×900) and touch-phone (390×844): wave returns to walking; cheer returns to running; replacement/cancel; seated interruption; actual happy morph transitions back to saved sad weights; gestures do not reload the body; swapping the body during a gesture cancels it and new gestures work. No page/shader errors or private API writes in Studio.
- Signed throwaway-wallet Habitat QA completed separately for **drophunter** and **neurohacker**: creator → saved native selections → fresh gameplay instance → WASD → wave/cheer → reload → all seven native fields retained → actual touch-stick movement and touch-triggered wave. No user wallets, payments or live database writes.

## Reproduce
Use a loopback-only production QA server with an isolated migrated WAL database. Set `APP_ORIGIN` to the exact loopback origin on the **running process**, not just its build.

```sh
NODE_NO_WARNINGS=1 node node_modules/vitest/vitest.mjs run --maxWorkers=2
CTRL_AVATAR_QA_ORIGIN=http://127.0.0.1:3173 node --import tsx scripts/qa/avatar-gesture-polish.mts
CTRL_AVATAR_QA_ORIGIN=http://127.0.0.1:3173 CTRL_AVATAR_QA_FAMILY=drophunter node --import tsx scripts/qa/avatar-modular-habitat.mts
CTRL_AVATAR_QA_ORIGIN=http://127.0.0.1:3173 CTRL_AVATAR_QA_FAMILY=neurohacker node --import tsx scripts/qa/avatar-modular-habitat.mts
```

Evidence: `test-results/avatar-gesture-polish/report.json`, `ctrl-gesture-polish.mp4`, desktop/phone wave/seated/face PNGs; native gameplay PNGs and persistence report under `test-results/avatar-modular-habitat/`. The filtered signed-QA report contains its most recent selected family; both family runs were observed to finish successfully.

## QA infrastructure corrections
The first cold production build exceeded a 300-second command limit during TypeScript; it was not counted as passing. The subsequent complete build exited 0. A stale QA listener also survived the background process wrapper's reported stop: its old origin rejected writes and its old asset manifest returned missing styles after rebuilding. The listener PID, cwd, QA database and actual APP_ORIGIN were inspected, only that isolated stale listener was terminated, the new listener/origin and every CSS response were verified, and browser checks were rerun successfully. A real mobile nav-overflow issue was corrected by wrapping the Studio's own stylesheet.

No commit, push, production deployment, blanket asset-license certification, new AI chat/TTS stack or full upstream-app integration is claimed by this runtime polish.
