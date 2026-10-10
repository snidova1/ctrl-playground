# World Keys Local Checks

Run from the repository root with the already-installed dependencies:

```sh
node scripts/keys/check-contract.mjs
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
- A wallet may create one nonzero, unused world ID. Its immutable owner address
  is the authority, exposed by `worlds` and `isWorldOwner`.
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
