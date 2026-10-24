# Cozy life API contract (v1)

Shared exports: `domain/cozy-life.ts`: `LifeState`, `LifeAction`, `BarterAction`, `LifeResponse`, `LifeOffering`, `ItemId`, `Inventory`, `CROPS`, `RECIPES`, `ITEMS`, `FISHING`, `COMMUNITY_ITEMS`, aliases `crops/recipes/items/fishing`, `createLifeState(now)`, `applyLifeAction(state, action, now, random?)`. Reducer returns a NEW state, throws `LifeError` with `.code` or ZodError; never mutates input. Fourth random argument is optional deterministic test/local-only entropy in [0,1); server uses cryptographic randomness. All times are epoch milliseconds.

## HTTP
`GET /api/cozy-life`, `POST /api/cozy-life`. Existing signed wallet session cookie required; anonymous AND demo sessions get 401 `WALLET_SESSION_REQUIRED`. No activity-action wallet signatures. Use same-origin `credentials:'same-origin'`, `Content-Type: application/json`; browser Origin must match configured origin for POST. JSON maximum 8 KiB. POST rate limit 40/minute/profile, GET 120/minute/profile.

POST envelope (strict): `{revision: number, action: LifeAction | BarterAction}`. Revision is current `state.revision` (initial 0). No client time, entropy, inventory, profile ID or arbitrary extra fields accepted. Stale writes return 409 `LIFE_EDIT_CONFLICT`: refresh GET and ask user to repeat action; do not silently repeat a trade or downgrade authenticated failures to guest storage.

GET and every successful POST return exactly:
```
{
  state: LifeState,
  serverNow: number,
  profileId: string,
  offerings: [{id,makerId,makerName,give:{itemId,quantity},want:{itemId,quantity},createdAt,mine}],
  community: {totals: Inventory,totalItems:number,contributors:number,personal:Inventory}
}
```
Offerings are REAL open escrow offers, newest first, max 100 others plus up to 20 own open offers; no NPCs, no fabricated players. `makerName` uses Habitat profile name if one exists, otherwise `Gardener`. Own offers have `mine:true` and can only be canceled; others can only be accepted. Community totals/contributor count aggregate actual committed contributions across ALL wallet profiles; personal equals state.contributions. All values are nonfinancial items, entirely unrelated to Keys/tokens/rewards.

`LifeState`: `{version:1,revision,createdAt,updatedAt,inventory,beds,fishing,nextCastAt,contributions,crafted,stats}`. Inventory/contributions/crafted are sparse ItemId→count maps; absent key means zero. Crafted tracks lifetime creations (not transferable balance); inventory alone is spendable. Four beds `{id:0..3,crop:CropId|null,plantedAt:number|null,wateredAt:number|null,readyAt:number|null}`. Fishing is null or `{castAt,biteAt,expiresAt}`; stats `{harvests,fishCaught,mealsCooked,itemsCrafted}`.

## Actions
- `{type:'plant',bedId:0..3,cropId:'turnip'|'tomato'|'herb'}`: spend 1 crop seed, empty bed only. Starter receives 4 of each seed once.
- `{type:'water',bedId}`: one watering required; growth starts at watering time, readyAt = wateredAt + CROPS[crop].growMs. No passive growth before water.
- `{type:'harvest',bedId}`: only when ready; credits catalog yield and 1 replacement seed, clears bed.
- `{type:'cast'}`: starts fishing; bite after 4s, reel window 20s. Active cast cannot be overwritten; expired casts can be replaced.
- `{type:'reel'}`: before bite error; within window credits one server-random perch/carp/driftwood/clay; expired reel clears line with no item. 3s cooldown after reel.
- `{type:'cook',recipeId:'garden-soup'|'grilled-fish'}` / `{type:'craft',recipeId:'flower-pot'|'wooden-bench'}`: debit exact recipe, credit one output. No purchased inputs.
- `{type:'contribute',itemId: COMMUNITY_ITEMS entry,quantity:1..100}`: irrevocable inventory debit and personal + real global contribution increment atomically.
- `{type:'offer-create',give:{itemId,quantity:1..100},want:{itemId,quantity:1..100}}`: debits give into escrow immediately, max 20 open offers/profile. Same item give/want rejected. No expiry; maker can refund with cancel.
- `{type:'offer-accept',offerId:UUID}`: ONLY another real player's open offer; consumes accepting player's wanted stack, gives them escrow, credits maker wanted stack. Maker and accepter revisions each increment exactly once. Entire trade atomic, including offer closure and both CAS writes; race loses with 409, no partial transfers.
- `{type:'offer-cancel',offerId:UUID}`: maker only; refunds escrow once and closes offer atomically.

## Errors
Errors `{code,detail}`. 400 INVALID_JSON; 413 INPUT_TOO_LARGE; 415 JSON_REQUIRED; 422 INVALID_COMMAND (strict schema) / gameplay error such as INSUFFICIENT_ITEMS, BED_OCCUPIED, BED_EMPTY, ALREADY_WATERED, CROP_NOT_READY, ALREADY_FISHING, FISH_TOO_EARLY, NOT_FISHING, FISHING_COOLDOWN, INVENTORY_FULL, SAME_TRADE_ITEM, OFFER_LIMIT; 403 ORIGIN_NOT_ALLOWED / OFFER_FORBIDDEN; 404 OFFER_NOT_FOUND; 409 LIFE_EDIT_CONFLICT / OFFER_UNAVAILABLE; 429 RATE_LIMITED (existing auth limiter).

## UI guidance
Use `serverNow` offset for countdown displays; poll/refetch state, no server clock advancement from GET. Never count a rendered growing crop as inventory before successful harvest. Local-only guest UI may use reducer+browser storage but must label local-only; server rejects guest progression. Authenticated errors must remain visible, never implicitly switch to guest mode. Catalog names are English defaults; UI may localize labels. No claim of financial value, revenue, token eligibility or rewards.
