# Token utility / policy v2

> Current Common Ground alpha (2026-10-09): see [the plaza architecture and release boundary](common-ground.md). The shared courtyard and holder passport use holding thresholds only; no lock, burn or CONTROL allocation is required. Older mission-workbench sections below describe retained legacy routes.

CTRL is the access token. CONTROL is a non-transferable daily participation allowance. It is not a tradable token or a substitute for Orbio compute resources. No burn action exists.

`config/policy.ts` owns editable thresholds, daily limits, and square-root balance weighting with bounded time/reputation modifiers. Live holding duration is not inferred from snapshots. Illustrative access classes remain OBSERVER, OPERATOR, PILOT, ARCHITECT and DIRECTOR, with thresholds 0 / 1,000 / 10,000 / 50,000 / 200,000 CTRL.

## Flexible allocation

The optional allocation specification has no fixed duration. An operator can allocate, change or release the amount whenever desired. The sample multiplier is `1 + 0.25 × allocated / held`, capped at 1.25. Releasing immediately lowers capacity; it does not erase spent CONTROL or duplicate daily allowance. There is no APY or yield promise.

Demo allocation is implemented at `POST /api/account/allocation` and is explicitly simulated. It never moves tokens. Live allocation fails closed until a reviewed contract and adapter are deployed. `AllocationAdapter` specifies read, allocate and release operations without inventing an address or ABI.

Legacy database column names `lock_amount`, `lock_days`, and `lock_until` remain for compatibility. New writes always use zero days and null expiry. The account's legacy `lock` response carries the flexible allocation amount; the UI does not offer fixed locks. Legacy lock and burn routes return HTTP 410. Historical receipt fields remain readable so existing hashes stay verifiable.

Participation unlocks proposals, support, bounded private jobs and build capabilities. Current thresholds are a configurable prototype, not finalized token economics or evidence of market demand.
