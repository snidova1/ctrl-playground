# Token utility and operator policy

CTRL is an access layer. CONTROL is participation capacity, not transferable money. Public observers need no wallet. Normal proposals, support and personal jobs leave CTRL in the holder's wallet.

`config/policy.ts` contains illustrative thresholds and allowances. The current model weights the square root of balance, bounded holding-time and reputation modifiers, a proportional locked-balance modifier, and an overall daily cap. Allocations consume that UTC day's allowance; they are not burned tokens or purchasable fake AI credits. Policy version is explicit; changing economic assumptions does not require changing UI components.

| Tier | Example minimum CTRL | Capability |
| --- | ---: | --- |
| OBSERVER | 0 | Public browsing |
| OPERATOR | 1,000 | Propose and support |
| PILOT | 10,000 | Limited research and transformations |
| ARCHITECT | 50,000 | Small builds, more jobs |
| DIRECTOR | 200,000 | Larger budgets and parallel allowances |

These are configuration defaults, not promises of final economics. Lock tiers of 30/90/180 days use example multipliers 1.15/1.4/1.8. The multiplier applies proportionally to the amount locked, and expired locks have no effect. There is no APY or passive yield. The live lock/burn contract boundary is typed but undeployed. Demo lock actions are clearly simulated, cannot be renewed while active and never send transactions.

EOA wallet signatures authenticate a server session. The token adapter reads ERC-20 `balanceOf`/`decimals` on the configured chain. Without a real address the live balance is unavailable and the holder remains an observer. Live holding duration is zero until an independently verified historical/indexing source is wired; session age is not misrepresented as holding duration.

Reputation is non-transferable. Proposed/completed signals are currently persisted. Accepted/useful/failed/moderated weights are extensible configuration but require validated signal producers before use. Reputation modifiers are bounded. Moderation, Sybil resistance and meaningful output evaluation remain production policy work.

Daily job quotas, parallelism, CONTROL and spending caps are checked server-side. There is no guarantee of financial value, no whale-proof claim and no finalized token economics. Orbio launch economics remain dynamically sourced from active protocol terms.
