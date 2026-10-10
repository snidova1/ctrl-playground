# World Keys Local Checks

Run from the repository root with the already-installed dependencies:

```sh
node scripts/keys/check-contract.mjs
node scripts/keys/check-service.mjs
node scripts/testnet/check-world-keys.mjs
node scripts/testnet/check-world-keys-cli.mjs
pnpm exec vitest run tests/unit/security/keys-economic-adversarial.test.ts
```

The script compiles the existing contract and a test-only adversarial ERC20 with
solc 0.8.30, then executes real transactions on an in-process Ganache chain.
The mnemonic, initial time, block-time increment, chain ID, Shanghai EVM target,
and modeled trade sequence are fixed. No external RPC, public deployment,
environment credentials, or generated deployment files are used. Ganache is
disconnected on success or failure. An assertion or compiler error exits nonzero.
Some Node versions print a native uWS compatibility warning; Ganache's JavaScript
fallback still executes the same EVM checks.

## Contract Semantics

- Creation costs native gas only, even with zero CTRL and zero allowance.
- A wallet may create only `worldIdFor(msg.sender)`, equal to
  `keccak256(abi.encodePacked('CTRL_WORLD_V1', owner))` (UTF-8 domain then the
  20-byte owner address). An attacker cannot claim a victim's ID, even before
  the victim registers and even by copying pending calldata. Repeat creation
  cannot mint a second free key, including through another offchain UUID.
  Its permanent owner address is the authority, exposed by `worlds` and
  `isWorldOwner`. UUIDs are offchain metadata, never the input to a key hash.
- Existing `supply` and `balanceOf` include the single locked owner key.
  `memberBalanceOf` excludes it. Buying membership never grants administration.
  The owner can trade additional membership but cannot sell the locked key.
- No key-transfer or ownership-transfer API is provided. Membership trades
  against the curve through `buy` and `sell`, not through ERC721/ERC1155 transfers.
- At supply `s`, buying `a` costs principal `curveUnit * sum(i^2)` for
  `i = s .. s+a-1`. Selling reverses the same integral.
- Both directions charge `floor(principal * 300 / 10000)` in the smallest CTRL
  unit, once per trade. The buy total is principal plus fee; the sell payout is
  principal minus fee. Fees go only to the treasury, never the curve reserve.
  Fractional fees are discarded; dust trades can have zero fee, and splitting
  trades can reduce rounded fees. This is intentional, not rounding to nearest.
- Each world reserve equals `curveUnit * sum(i^2)` for `i = 1 .. supply-1`.
  Contract CTRL equals summed reserves plus any unsolicited donations. Donations
  do not grant keys, change quotes, or become redeemable curve principal.
- Max supply is 10,000 including the owner; each trade is 1 through 100 members.
  Deadlines are inclusive. Buy caps and sell floors compare total and net payout.
- CTRL must be a fixed-balance, bool-returning ERC20 with exact balance deltas.
  Taxed, extra-debit, no-op, false-return, and empty-return transfers are rejected.
  Balance checks cannot defend against a token that fabricates `balanceOf` or
  changes balances asynchronously. This remains an unaudited local candidate.

## Verification

The independent BigInt model checks principal, rounded fees, events, token
balances, owner/member balances, per-world reserves, and aggregate backing.
Invalid operations are simulated for their expected reason and then mined as
reverting transactions; economic snapshots verify rollback, including allowance.
Tests cover duplicates, unauthorized selling, unsupported transfers, stale
quotes, deadlines, multiple worlds, donations, treasury trading, reentrancy
through incoming/fee/payout transfers, the maximum unit and supply, and complete
redemption to the locked owner key. This is not a substitute for an audit.

`check-service.mjs` runs `tests/keys/service-checks.ts` against an ephemeral
localhost Ganache HTTP server. It checks prepared calldata, mined attacker
reverts, confirmed receipt verification, sender/case normalization, wrong,
reverted, missing and insufficiently confirmed receipts, deployment mismatches,
and owner vs trader reads when the trader has a separate personal owner key.
Legacy contracts lacking `worldIdFor` and fake contracts with a wrong derivation
fail closed. The CLI test uses only local disposable Ganache wallets and a temp
directory, removed in `finally`; it never uses real credentials or a public RPC.

## Parent Server Integration (no backend/UI changes in this patch)

Exact exports from `server/keys/service.ts`:

```ts
worldKeyId(ownerWallet: string): Hex
readWorldKeys(config: KeysConfig | null, worldId: string, ownerWallet: string, wallet: string): Promise<WorldKeysRead>
prepareOwnerClaim(config: KeysConfig | null, worldId: string, ownerWallet: string, wallet: string): Promise<PreparedOwnerClaim>
verifyOwnerClaim(config: KeysConfig | null, worldId: string, ownerWallet: string, wallet: string, txHash: string): Promise<VerifiedOwnerClaim>
```

- `worldId`: canonical app UUID, metadata only. The parent must load its durable
  world record and resolve `ownerWallet` from the verified signed-wallet owner
  binding, not from a request-supplied UUID hash, owner address or trader wallet.
  This low-level service does not authenticate sessions or look up UUID records.
- `ownerWallet`: trusted offchain world owner. Used for key ID derivation and
  `ownerWorldId`; the returned `ownerWallet` is checksum-normalized.
- `wallet`: authenticated viewer/trader. Used for `balance`, `memberBalance`,
  and `isOwner`, not for deriving the world ID. A trader can have its own
  permanent owner key while buying someone else's memberships.
- Claims require `wallet === ownerWallet` after address normalization (403
  `KEYS_NOT_WORLD_OWNER` otherwise). `transaction.from` is that owner wallet.
  Configuration must remain server-supplied. No RPC URLs appear in results.
- A successful receipt proves registration by an owner wallet, not ownership
  of a UUID. Enforce one durable UUID/home per verified owner wallet in the
  parent and bind any stored claim to that record; do not accept arbitrary
  UUID aliases or use replayed receipt hashes to create additional app homes.
- Key IDs intentionally do not encode chain or contract: namespace persisted
  registration/receipts by chain ID and contract address as well as owner key ID.
- `WorldCreated(bytes32,address)` and `createWorld(bytes32)` remain unchanged;
  ABI adds `worldIdFor(address) pure returns (bytes32)`. Recompile rather than
  reusing old artifacts. Old arbitrary-ID deployments are not compatible.

All verification here is offline/local only. Public deployment and transactions
remain blocked pending separate authorization and security review. Historical
`docs/world-keys-testnet-handoff.md` describes the pre-fix risk and is outside
this worker's owned paths; this scoped handoff supersedes that registration
description, not the broader release gates.
