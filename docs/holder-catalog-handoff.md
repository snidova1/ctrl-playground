# CTRL Holder Visual Gallery + ETH Exclusive | Astra review handoff

Base branch: gpt6/world-builder PR #2, not main. Review after backend PR #11 is integrated. No deployed tokens, onchain purchases or wallet payments.

## Holder shelves, no mandatory typing
Players open a photo-first catalogue inside the same Astra Habitat scene. Click a real model thumbnail, place it, use gizmos/inspector, save. No text-to-object requirement. Search is optional.

Holders gain more available items based on *verified CTRL ERC20 wallet balance*, not CONTROL:
- Basic: under 500,000 CTRL.
- Studio: 500,000 to under 1,000,000 CTRL.
- Luxe: 1,000,000 to under 2,000,000 CTRL.
- Grand: 2,000,000 through exactly 3,000,000 CTRL.
- Signature: strictly greater than 3,000,000 CTRL.

Higher tiers inherit lower assets. Lower tiers cannot add/duplicate premium objects by editing API JSON. Once a premium object is already in a world, it remains usable after the owner sells tokens, but new copies require current holder balance.

The source repository already has 991 real Kenney GLBs and matching thumbnail metadata, of which 56 are mapped to above-Basic shelves; this is curation, not proof of luxury-model art quality. Import better artwork later through the QA-approved asset intake from PR #10. No copyrighted binaries have been redistributed in this branch.

## ETH Exclusive, above Signature in actual art quality
ETH is separate from CTRL holding. Purchase an individual premium design permanently for in-game use once ownership contract and licenses are approved, regardless of CTRL balance.

Three USD list-price bands, payable in ETH based on a fresh quote at checkout:

| Band | USD per item | Intended original asset quality |
| --- | --- | --- |
| Atelier | $1–10 | Original detailed handmade objects |
| Estate | $10–50 | Designed architecture, interactive room sets |
| Masterpiece | $50–100 | Landmark environments and custom interactive scenes |

Products on exact $10/$50 boundary have one explicit assigned band. The ETH amount is not hardcoded: show chain, wallet transaction, quote expiry, slippage tolerance, gas, and seller terms before signing.

Current implementation only shows these shelf bands with a clearly inactive shop. Product array is empty; no product assets, checkout or receipt contract is invented. Never call a fake Buy button or pretend a Kenney asset is above Signature in quality.

## Required production pathway
1. Astra reviews integration with PR #11 backend, which has more recent wallet/ACL code than this PR base.
2. Server validates ownership, approved asset IDs and incrementally added premium asset counts. Get onchain CTRL balance via verified wallet identity and RPC. Missing balance fails closed; demo/guest is Basic.
3. Official artist/QA supplies brand-consistent luxury GLBs, specific redistribution/commercial permissions for individual in-game sales, hashes, preview, mobile LOD, animations, collision, and performance budgets.
4. Confirm ETH chain, payment contract, onchain receipt verification, idempotency, replay resistance, durable wallet-owned entitlements, refund/cancel behavior, whether purchased items transfer, and fees. No transaction until contract and economics are explicitly approved.
5. Persist server-side ETH asset entitlements, and refuse world save if trying to newly place ETH-exclusive asset without valid ownership. Never rely on client-provided purchased flag or tx hash only.
6. Fix inherited World Builder browser failures: desktop Undo overlay and mobile thumbnail overlays, and adapt test guest login to PR #11 verified wallet boundary. Full desktop/mobile E2E and integration tests are mandatory before merging.
7. Preserve existing Habitat, characters, wallet connection, scene state and world objects. This is a draft PR, not a live migration.

## Tests
Run pnpm exec vitest run features/plaza/editor/holder-tiers.test.ts features/plaza/editor/eth-exclusive.test.ts.
Run pnpm exec eslint features/plaza/editor/holder-tiers.ts features/plaza/editor/eth-exclusive.ts features/plaza/editor/habitat-tools.tsx.
Run pnpm exec tsc --noEmit --target ES2020.

ETH transactions, live SKUs, external asset binaries and onchain entitlement contracts are intentionally absent.
