# CTRL Playground Handoff

## Snapshot

This repository is the current CTRL Playground development state. It must be continued in place; do not restart or rebuild the project from scratch.

The live public character is still the previous stable MIO build unless a later deployment explicitly changes it. The current development branch contains the newer VRM character pipeline, personal world groundwork, build asset catalog work, and onchain key contract groundwork. This state is intended as a development checkpoint, not a final production release.

## Product Decisions

- CTRL is the platform token used for world key buy/sell.
- A new wallet can create its first personal world through an onchain transaction.
- The first owner key has price `0 CTRL`, but the user still pays gas.
- Club/world member keys are bought and sold in CTRL.
- Buy and sell each take a `3%` development treasury fee.
- The contract reserve must remain able to serve key sales back to the curve.
- Owner/admin rights are separate from member key ownership.
- The core builder must work without LLM availability.
- LLM help is only an assistant layer for arranging supported catalog objects and recipes.
- Testnet deployment for keys should wait until the implementation is complete and locally tested.

## Current Development Work

- Stable VRM character preview using `@pixiv/three-vrm`.
- Existing movement controller and camera are reused for VRM preview.
- Female VRM candidate is approved visually as the current target direction.
- Male/female selection and randomized outfit architecture is started but not finished.
- Personal world/habitat route and server service groundwork is started.
- Build asset catalog groundwork is started.
- Large modular asset packs have been staged locally for catalog import.
- CTRL world key contract draft is present under `contracts/keys/`.
- Database migration for personal worlds is present as `drizzle/0003_personal_worlds.sql`.

## Existing Stable Systems To Preserve

- Common Ground plaza route and interactions.
- Movement, camera, joystick, and collision controller.
- Make/test/place/remove object loop.
- Dispenser, bench, lamp, planter, and kinetic sculpture behaviors.
- Session persistence, ownership checks, and presence.
- Holder passport and existing wallet integration.
- Orbio recipe endpoint as a bounded optional generator.
- Tests and browser render fixtures.

## Next Implementation Order

1. Finish the personal world model:
   - one durable world per wallet,
   - owner permissions,
   - member/visitor permissions,
   - no duplicate free-owner-key abuse.
2. Finish character onboarding:
   - wallet sign-in,
   - choose male or female,
   - randomized outfit from curated sets,
   - save appearance per wallet.
3. Promote the approved VRM character only after preview tests pass:
   - desktop,
   - mobile,
   - idle/walk/run/jump/interact,
   - no torso/head jitter.
4. Convert staged asset packs into a lazy-loaded builder catalog:
   - building,
   - furniture,
   - nature,
   - food/props,
   - roads,
   - platform/game pieces.
5. Add behavior wiring without LLM:
   - sit,
   - open/close,
   - light toggle,
   - button target,
   - moving platform,
   - portal,
   - checkpoint/timer/finish.
6. Complete key contract and local contract tests:
   - 0 CTRL first owner key plus gas,
   - CTRL-denominated buy/sell curve,
   - 3% fee,
   - reserve invariants,
   - permissions separated from member keys.
7. Only then prepare testnet deployment.

## Do Not Do Yet

- Do not deploy the current character replacement without approval.
- Do not deploy key contracts to testnet yet.
- Do not make the builder dependent on live LLM calls.
- Do not remove existing plaza features while adding personal worlds.

## Verification Baseline

Run the standard checks before any handoff or deployment:

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build:next
pnpm build
```

Browser verification should cover both the existing Common Ground flow and any VRM/personal-world preview routes.
