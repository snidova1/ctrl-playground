# World Keys | isolated testnet deploy-readiness handoff

> Integration addendum (2026-10-10, `4c22a97`, PR13): squatting finding below is remediated in the integrated candidate. `createWorld` requires caller-derived `worldIdFor(address)`; mined attacker copies revert before rightful registration. UUID maps through its signed DB owner, separate from trader. Parent reran all four offline economic/service/CLI gates. Still unaudited, undeployed, and not public-chain authorization. Original independent report preserved below.

Owner: independent QA/deployment-preflight worker (not Astra backend owner)
Base: main at cbe941bd369424f00c70fdd9c8d1a85f1e76a717
Scope: NEW testnet scripts, offline contract test and isolated CI only. No source contracts, application routes, secrets, database schema, or deployed state changed.

## What is ready

- scripts/testnet/world-keys-artifact.mjs compiles the exact existing contracts/keys/CTRLWorldKeys.sol with solc 0.8.30, optimizer 200, EVM Paris and viaIR:true. Standard non-IR compilation currently fails with Stack too deep.
- The compiled ABI and creation/deployed bytecode are available without checking generated artifacts into Git.
- Runtime verification compares every non-immutable byte while masking the exact compiler-provided immutable offsets; then verifies ctrl(), developmentTreasury(), curveUnit(), FEE_BPS=300 and MAX_SUPPLY=10000.
- scripts/testnet/check-world-keys-cli.mjs runs the *real CLI* against an isolated localhost Ganache server and disposable wallets: dry-run cannot change nonce; missing auth, wrong chain or token are rejected; confirmed local-only broadcast writes pending and final records; deployed bytecode is checked; duplicate deployments and altered verification records fail. It never uses the public testnet.
- scripts/testnet/world-keys-verify.mjs verifies an existing deployment record **read-only** against chain ID 46630, receipt, code hash, bytecode and constructor parameters. It does not use a private key.
- scripts/testnet/check-world-keys.mjs runs entirely on ephemeral Ganache, chain ID 46630. It tests deployment, constructor, tamper-detection, zero/duplicate world IDs, one permanent free owner key, owner-only world creation limit, allowance, deadline, slippage, unknown worlds, buy max 100, hard supply cap, exact square-sum pricing, 3% fee on either trade direction, multi-world isolation, 28 deterministic mixed trades, and redemption of every nonowner key. Reserves must equal exact outstanding curve obligations after EVERY trade.
- CI workflow .github/workflows/world-keys-readiness.yml executes this without wallet secrets or any public RPC.

Run from repository root:

    pnpm install --frozen-lockfile
    node scripts/testnet/check-world-keys.mjs
    node scripts/testnet/check-world-keys-cli.mjs
    node scripts/testnet/world-keys-deploy.mjs --help

## TESTNET dry run only (no transaction)

Only after the curve price unit and development treasury recipient have been explicitly approved:

    export CTRL_TESTNET_WALLET_FILE=/absolute/path/outside-repo/wallet.json
    export CTRL_KEYS_TREASURY=0xReviewedTreasuryAddress
    export CTRL_KEYS_CURVE_UNIT_WEI=1000000000000000
    node scripts/testnet/world-keys-deploy.mjs --dry-run

The numeric curve unit above is merely an ILLUSTRATIVE shell value, not an approved economic parameter. The CLI requires an explicit uint-valued parameter rather than selecting one on behalf of the team. It reads the already-recorded TESTNET tCTRL fixture at deployments/robinhood-testnet.json and refuses any other chain than 46630. CLI dry-run verifies the chain, token code and tCTRL symbol, wallet identity, gas estimate, sufficient test ETH, budget <=0.002 ETH, and any existing deployment/pending record. It DOES NOT send a transaction.

Optional explicit testnet broadcast, AFTER human review of preview and wallet:

    CTRL_KEYS_BROADCAST_CONFIRM=TESTNET_ONLY node scripts/testnet/world-keys-deploy.mjs --broadcast

The CLI broadcast path runs in CI only on a throwaway localhost Ganache blockchain, never against a public RPC or real wallet. It stores the transaction hash in deployments/robinhood-worldkeys-pending.json BEFORE waiting for confirmation. Successful verification writes deployments/robinhood-worldkeys.json containing contract address and immutable parameters. Independently recheck the result with `node scripts/testnet/world-keys-verify.mjs` using a trusted testnet RPC. These are NEW intended runtime records; they do not currently exist in main. A local deployment lock prevents concurrent broadcasts. A crash after broadcast leaves the lock for manual review; do not delete the pending or lock record or retry before reconciling the chain explorer and deployer nonce.

The wallet file must stay OUTSIDE the repository and never be attached to any chat or committed. No mainnet broadcast path is provided. Do not deploy using production token, mainnet chain ID 4663, or real funds.

## Newly reproduced launch blocker: permissionless World ID squatting

`CTRLWorldKeys.createWorld(bytes32 id)` currently authorizes the **transaction caller**, not a prior signed binding between an app UUID and its intended wallet owner. In a local Ganache proof, an unrelated wallet creates a known candidate world ID first; the rightful wallet's later attempt to create the same ID reverts with WORLD_EXISTS. A third party could observe an unconfirmed transaction and front-run the same bytes32 or reserve a public/predictable app ID. This does not steal existing keys, but can prevent the app owner's deterministic onchain enrollment. **Do not claim protection from front-running.**

Recommended remediation for contract owner: design a verifiable wallet-to-world-ID binding (e.g. owner-authorized registration or signed registration permit checked onchain), or choose an ownership-safe non-guessable mapping with front-run-resistant creation semantics. A purely obscured world ID does not stop mempool observation. Decide whether `createWorld` should accept a wallet-owner authorization proof, how a backend world UUID maps to bytes32, whether registration can be recovered if squatted, and test all variants before live launch. This independent worker has deliberately not changed the Solidity contract or production server.

## Remaining Astra/backend integration work (NOT done here)

1. Decide approved production/token address, fee recipient, and curveUnit, and commission contract review before public money is used. Check integer dust fee and user-visible price floor for selected curveUnit.
2. For testnet: approve and perform the deliberate CLI broadcast only after preview; record and verify live address, chain ID and code hash.
3. Add app transaction states for wallet-initiated createWorld(bytes32), buy(bytes32,uint256,maxTotal,deadline), sell(bytes32,uint256,minPayout,deadline), and await final receipts (not merely transaction hashes).
4. Define deterministic, collision-resistant mapping between app world IDs and bytes32 world IDs; **resolve the reproduced world-ID front-running/squatting risk** with the contract owner before live deployment. Verify chain events/owners instead of trusting browser submissions, and reconcile asynchronous backend writes.
5. Enforce signed wallet owner identity for durable home creation and permission changes. The independent SEC-01 report in PR #4 currently proves a guest plaza-cookie bypass on the baseline.
6. Keep owner/editor/admin ACL independent of tradeable membership keys. Handle network switching, rejected transactions, chain reorganizations, approve allowance, stale slippage/deadline, and unavailable RPC. Do not market testnet keys as production.
7. Require full unit/API/browser tests and external security review before mainnet. There is no proof here of production safety or a deployment.

This deliverable does not change Astra's owned files or branches and does not merge itself. Review/cherry-pick only after reconciling with concurrent backend changes.
