# CTRL Integration Contract

- Astra: `server/`, `domain/habitat.ts`, database migrations, key contracts, API tests.
- GPT-6 (`gpt6/world-builder`): isolated asset browser/editor, transforms, undo/redo, mobile controls, behavior UI, avatar previews. Do not replace existing plaza/mission systems.
- Astra owns final review: helpers are accepted only after source review and tests. PR13 uses `work/master-integration`; worker history is preserved and `main` stays stable.
- Owner access/settings UI is isolated in `features/habitat/world-members.tsx`, using existing member APIs and server `permissions.canManage`. Editors retain object editing only; no competing builder changes.

## Wire Contract

Import types and Zod schemas from `domain/habitat.ts`; existing `features/habitat/types.ts` remains compatible. Transforms are flat `x,y,z,rotation` (yaw radians), `scale` (uniform). Maximum 120 objects. UUID object IDs and stable local catalog asset IDs only; no scripts or model URLs.

All endpoints below are under `/api/habitat`. JSON mutations require same-origin `Origin`, JSON Content-Type and a signed wallet `ctrl_session` cookie. Error response: `{code,detail}`. 401 authentication, 403 permissions, 404 private/missing world, 409 stale revision/session, 422 invalid input. Never silently retry a conflicting save.

| Endpoint | Input | Response |
| --- | --- | --- |
| GET `state`, GET `worlds/:id` | none | `HabitatState` |
| GET `worlds` | none | `{worlds}` from visible state listing |
| GET `worlds/:id/permissions` | none | `WorldPermissions` |
| GET `profile` | none | `{profile:CharacterProfile|null}` |
| POST `profile` | `CharacterProfileInput` | `HabitatState`; creates one durable home per verified wallet, not an onchain key |
| POST `save` or PUT `worlds/:id/objects` | `WorldEditorSavePayload` | `HabitatState` with incremented revision |
| POST `worlds/:id/objects` | `{revision,object}` | `HabitatState` |
| PATCH `worlds/:id/objects/:objectId` | `{revision,object:partial}` | `HabitatState` |
| DELETE `worlds/:id/objects/:objectId` | `{revision}` | `HabitatState` |
| POST `assets/resolve` | `{ids:string[]}` | `{assets}` reviewed catalog metadata |
| POST `join` | `{id:worldId}` | `HabitatState`, including new sequenced `presenceSession` |
| POST `presence` | `PresenceInput` with sessionId and increasing sequence | `HabitatState & {accepted:{x,z}}` |
| POST `leave` | `{worldId,sessionId}` | `{ok:true}` |
| POST `worlds/:id/settings` | `{name,visibility,revision?}` | `HabitatState` |
| GET/POST `worlds/:id/members` | POST `{wallet,role:'editor'|'visitor'}` | `{members}`; owner only, recipient must onboard first |
| DELETE `worlds/:id/members/:profileId` | `{}` | `{members}`; owner only |
| GET `worlds/:id/keys` | none | `WorldKeysRead`; trusted database owner binding, private-world ACL |
| POST `worlds/:id/keys/prepare` | `{}` | `PreparedOwnerClaim`; owner only, unsigned transaction |
| POST `worlds/:id/keys/verify` | `{txHash:0x...64 hex}` | `VerifiedOwnerClaim`; owner only, confirmed canonical receipt |

Legacy `visit` explicitly creates a compatibility session (`id:''`); `pose`, `settings`, `use` remain available. Sessionless pose cannot downgrade an active/expired modern session. New clients heartbeat at 700ms and leave on hiding/unmount; TTL15s. Join supersedes old sessions; stale clients stop and offer reconnect instead of fighting tabs. Players carry server-resolved loadouts; colorways are not garment meshes. Owner-managed ACL is independent of tradeable keys.

Keys: `worldKeyId(trustedOwnerWallet)` matches Solidity `worldIdFor(address)`. Pass app UUID plus its database-resolved signed owner wallet and authenticated viewer/trader separately; never request-body owner bindings. Routes validate chain/deployment/receipt and never send transactions. Deployment configuration is fail-closed, disabled by default (`CTRL_KEYS_ENABLED=false`); reads return `not-deployed`, prepare/verify return 503. Do not enable public RPC/deployment without approval. Offchain drafts never claim an onchain key or grant member/admin roles from a receipt.
