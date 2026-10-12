# Common Ground and Public World — 12 October 2026

Base: work/master-integration 94a40b5634e71249b9027a6963564e282fa1a3ad (live Site v22).

## User-approved flow

- `/` and `/courtyard`: immediately playable Common Ground, no wallet API or guest account needed. Retains the existing courtyard architecture. A local VRoid character is randomly assigned. Visitors can walk, jump, sit, wave, reroll their appearance, and use the actual visual builder with undo/redo, transforms, delete and Save & Play. Demo edits remain in component memory for the current visit, separate from persistent player worlds.
- Habitat and Public World are peer destinations. Buttons update the URL so mobile wallet return/reload retains the destination. Both require the existing verified wallet session and saved character. Existing profiles are reused; new profiles use the existing rotatable creator.
- `/habitat`: private owner home and existing builder/ACL flows.
- `/public-world`: server-owned Willow Square. Authenticated POST `public-world` idempotently provisions its fixed world record, only after a character exists. All wallets join the same ID through existing sequenced presence. Visitors cannot edit the public layout/settings/membership, even if a stale editor membership exists.

## Delivered world

Bounded cafe, flower stalls, shaded gardens, fountain, benches, lanterns, and habitat directory. All interactive layout models use the bundled CC0 catalog. Distant cottages/canal are scenery. NPCs have explicit NPC name labels and run client-local ambience; they never inflate real player counts. Mobile uses two residents, desktop four. Remote avatar rendering retains the pre-existing mobile/desktop caps.

Short nearby speech (120 characters, eight-second bubbles) and wave state replicate through authenticated presence, using existing motion JSON storage. Speech is transient, text-rendered, and has no message history. No schema migration, paid service, or onchain action is introduced.

## Honest limits

- This is a compact playable town square, not the generated concept image's rendering quality or an unlimited open world. The canal and distant neighborhood are not walkable districts.
- Guest randomization independently varies 24-bit garment/hair/eye colors and simple head accessories, plus approved material presets. It uses the two currently approved VRoid base meshes. It does not claim unlimited authored faces, hairstyles, bodies or garment meshes.
- Common Ground demo changes are not durable, shared, or automatically imported into a wallet home. Use the persistent Habitat builder after authentication.
- Existing Habitat starter remains the currently integrated garden. This branch does not overwrite the separate cottage PR #24.
- No commerce, fishing, quests, NPC progression or ETH purchases.

## Verification

183 unit/API tests passed, including five new tests covering session/profile prerequisites, two-wallet shared presence and speech, unauthorized public mutations, guest isolation, asset budget and collision paths. Typecheck, focused ESLint and Worker production build passed. The targeted public-world suite was rerun after the guest scene adjustment.

WebGL/browser visual QA and physical-device wallet return remain unverified: this managed session has no supported control-browser skill. No screenshot or generated concept is presented as a runtime acceptance result.
