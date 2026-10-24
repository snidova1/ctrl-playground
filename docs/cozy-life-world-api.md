# Cozy life world API — stable integration contract

Additive v1 fields on `LifeState`: optional `gardenAnchor?: {x,z}`, `decorations?: LifeDecoration[]`, `mealsEaten?: number`. Missing anchor means **no garden props**, even when beds have crops. Missing decorations/count normalize to `[]`/`0`; existing inventory, beds, revisions and progress remain intact. `LifeDecoration = {id,itemId:'flower-pot'|'wooden-bench',x,z,rotation}`. Decorations are separate from free builder objects.

Existing POST `/api/cozy-life` envelope stays `{revision,action}`. Strict actions:
- `{type:'place-garden',x,z}` opts in or relocates all four beds, without minting seeds/crops.
- `{type:'place-craft',itemId,x,z,rotation}` debits one real crafted inventory item; maximum 20 placements.
- `{type:'remove-craft',id}` removes that placement and refunds one item exactly once.
- `{type:'eat',itemId:'garden-soup'|'grilled-fish'}` debits one meal, increments `mealsEaten`; no financial/stamina reward.
- `{type:'serve',itemId}` debits one actual meal into server escrow.
- `{type:'eat-serving',servingId}` atomically claims an open escrow and increments the authenticated claimant's `mealsEaten`. No inventory credit and no second maker debit. One winner under races; stale revisions return 409.

All positions finite, x -13..13, z -7..11; finite rotation -100..100 radians. Server physical placement requires an **existing owned Habitat**, rejects house/furniture/life-prop overlaps; never creates homes or claims Keys. Pure guest reducer validates bounds only. Guest share must be disabled or explicitly local-only, not represented as a server meal.

Response adds optional `servings: Array<{id,makerId,makerName,itemId,createdAt,mine}>`; list contains only real open meals, bounded to 100 newest peer meals plus 20 own. At most 20 own open servings. Consumed servings disappear. Profile display names only, never wallets.

GET `/api/cozy-life/world?worldId=UUID`: authenticated signed non-demo session and existing Habitat profile required. Public/owner/member visit ACL checked before reading owner progression, including revoked private memberships. Returns only `{beds,gardenAnchor?,decorations}` (no inventory, stats, trades, wallets or identity). Owner without progression returns four empty beds and no props, without creating state. 403 forbidden; 404 missing world; 422 malformed input. POST on world endpoint is 405.

Placement errors: `HOME_REQUIRED` (403), `PLACEMENT_BLOCKED` (422), `DECORATION_LIMIT`, `DECORATION_NOT_FOUND`, `INSUFFICIENT_ITEMS`. Shared errors: `SERVING_LIMIT` (422), `SERVING_NOT_FOUND` (404), `SERVING_UNAVAILABLE` (409), CAS `LIFE_EDIT_CONFLICT` (409). Existing origin, body budget, strict schemas, authentication and rate limits apply.

Apply migration `drizzle/0007_cozy_life_servings.sql` before hosting this API. Shared debit, insertion/claim, revision and consumed count are one guarded D1 batch; any failed guard rolls back all writes.

UI integration remains `cozy-life-state` CustomEvent `{state,local,community?}` after accepted mutation/refresh; scene events never modify inventory. Open panel protocol: `cozy-life-open` `{tab}`. No monetary promises or fake diners.
