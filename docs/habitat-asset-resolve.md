# Habitat asset resolve API (Astra integration slice)

This endpoint is a small, server-owned, deterministic bridge between CTRL's reviewed
asset catalogue and the Habitat editor. It is not a model upload service, file
proxy, content generator, or invitation to arbitrary remote URLs.

## Contract

`POST /api/habitat/assets/resolve`

Requirements: an existing verified `ctrl_session` wallet session; same-origin
`Origin` header; `Content-Type: application/json`. A plaza guest cookie alone is
not authorized. Requests count against the standard Habitat mutation rate limit.
Do not interpret metadata access as permission to edit any world.

Request:

```json
{"ids":["building-kit/column","ctrl-door"]}
```

Success: `200` and `{ "assets": [...] }`. Entries return in first-seen order.
Repeated IDs are deduplicated; the input remains limited to **120 IDs**, before
deduplication.

- `kind: "model"` entries contain only pre-reviewed metadata from the existing
  `BUILD_ASSETS` registry (currently 991 Kenney CC0 GLBs), including stable ID,
  name, category, local GLB and thumbnail URLs, bounds, origin offset, byte size,
  animation clip names, and conservative collision hint.
- `kind: "primitive"` entries cover CTRL's seven built-in shapes: block, seat,
  lamp, door, switch, portal and checkpoint. There is no GLB for these items:
  `url` and `thumbnailUrl` are `null`, `sourcePack` is `ctrl`,
  and `defaultBehavior` tells the renderer what built-in behavior to use.
  The simplified `bounds` for primitives are placeholders, not verified colliders.

Error responses contain `{ "code", "detail" }`:

| Status | Meaning |
| --- | --- |
| 401 | No valid signed-wallet session, or an unsigned plaza guest |
| 403 | Origin does not match application origin |
| 415 | Missing JSON Content-Type |
| 422 `INVALID_INPUT` | Invalid, oversized or unexpected fields |
| 422 `UNKNOWN_ASSET` | At least one ID is absent from the reviewed registry |
| 429 | Standard Habitat per-session rate limit exceeded |

Unknown IDs fail the *entire batch*: the API never constructs a URL using the
request's ID, and never silently returns a partial list that a builder might save.

## Integration boundaries

This is the existing `assets/resolve` endpoint from
`docs/TASK_OWNERSHIP.md`. It does not change profile creation, existing world
persistence, membership ACLs, presence sequencing, object interactions,
the CTRL key curve, or deployments. World writes must still revalidate asset
IDs independently of this lookup. No LLM or Orbio token is needed.

Tests: `pnpm exec vitest run tests/unit/habitat-asset-resolver.test.ts`.
The integration PR adds scoped lint, unit/API suite, TypeScript and Next build CI
with the temporary ES2020 target already owned by the World Builder PR.
