# CTRL Integration Contract

- Astra: `server/`, `domain/habitat.ts`, database migrations, key contracts, API tests.
- GPT-6 (`gpt6/world-builder`): isolated asset browser/editor, transforms, undo/redo, mobile controls, behavior UI, avatar previews. Do not replace existing plaza/mission systems.
- Integrate client changes by PR after API and browser tests; no direct edits to each other's branch. `main` stays stable.

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
| POST `join` (legacy `visit`) | `{id:worldId}` | `HabitatState`, including new `presenceSession` |
| POST `presence` | `PresenceInput` with sessionId and increasing sequence | `HabitatState & {accepted:{x,z}}` |
| POST `leave` | `{worldId,sessionId}` | `{ok:true}` |
| POST `worlds/:id/settings` | `{name,visibility,revision?}` | `HabitatState` |
| GET/POST `worlds/:id/members` | POST `{wallet,role:'editor'|'visitor'}` | `{members}`; owner only, recipient must onboard first |
| DELETE `worlds/:id/members/:profileId` | `{}` | `{members}`; owner only |

Legacy `pose`, `settings`, `use` remain available. New clients use `join` + `presence`, poll state, and leave using the returned session ID. Presence expires after 15 seconds; heartbeat before expiry. New join supersedes old connection. Players carry server-resolved loadouts. Colorways are not separate garment meshes. Member/editor ACL is owner-managed and independent of tradeable keys. Key status remains `not-deployed`; do not imply offchain world creation minted a key.
