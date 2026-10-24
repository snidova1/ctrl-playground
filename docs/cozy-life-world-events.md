# Cozy life world entry contract

## Event and responsibilities

After an explicit nearby interaction, the Public World dispatches:

```ts
window.dispatchEvent(new CustomEvent('cozy-life-open', {
  detail: {tab: 'garden'},
}));
```

Exact allowed tabs: `garden | fishing | kitchen | craft | community | barter`.
`features/worldgacha/app.tsx` / the shared launcher must listen once, validate the
payload (ignore unknown/missing tabs), stop movement using `neighborhood-stop`,
and open the matching shared activity panel. The UI worker owns that listener and
input lock: movement, E, touch stick and click-to-walk must not leak behind the
modal. Restore focus and normal controls on close; Escape closes the modal.

The world worker owns `public-world-activities.ts` and
`public-district-environment.tsx`, not app integration. Existing E / touch
interaction calls `interact` → `performPublicActivity`. Life entries enforce the
same strict `< 2.6` distance as the nearby prompt. Merely rendering, arriving at a
station, opening Places, or choosing a walk destination **does not dispatch**.
The global event is an unprivileged UI navigation request, never an authorization
or inventory mutation boundary. Only a validated `LifeAction` changes progression.
Direct toolbar entry remains available independently of spatial entries.

## Authored destinations

| Entry ID | Panel | x | z | Landmark / entry |
| --- | --- | ---: | ---: | --- |
| `life-garden` | garden | -39 | 0 | Seed & Water sign in the garden's clear central aisle |
| `life-fishing` | fishing | -45 | 11.2 | Dry approach to the Quiet Pond's small timber dock |
| `life-kitchen` | kitchen | 35 | -4.8 | Gathered Kitchen, front of northern market stall |
| `life-craft` | craft | 43 | -4.8 | Makers Bench, front of northern market stall |
| `life-community` | community | 39 | 0 | Community Pantry board in the market court |
| `life-barter` | barter | 46 | 0 | Item Exchange sign by the market edge |

Each destination is on the existing authored navigation extension, outside stall,
flower-bed, lantern-post and arch collisions. The focused regression tests walk
actual grid paths from the original spawn and verify each nearest prompt.
The decorative pond's water begins at z=13.3, beyond the navigable district's
z=13 boundary; its dock starts on dry land. No unsupported water walk destination,
new invisible collision wall, or claim of a Recast rebake. The dock tip is scenic,
not a requirement to reach the fishing action. Pond and signs render only through
`PublicDistrictEnvironment`; no default Habitat plot objects are introduced.

Legacy `garden-tend`, `garden-rest`, `market-tea`, `market-bell` retain their
cosmetic/pose behavior. Legacy `watered` / `springTended` booleans are **not**
activity inventory and do not grant crops, fish, meals or crafted items.

## QA scope

`node scripts/qa/build-cozy-life-preview.mjs --serve` builds a **targeted source
fixture**, not the full application, and serves it on 127.0.0.1:3243. Both routes
mount their real route components; the Public World account/profile route guard
is intentionally outside this guest fixture. All `/api/*` requests receive an
explicit 401 because this fixture has no accounts/backend; it never returns fake
successful API state. This permits the real discover client to choose clearly
labeled browser storage. Do not treat this fixture as proof of production guest
access, authentication, real global community totals or server persistence.

`pnpm exec tsx scripts/qa/cozy-life.mts` targets `CTRL_QA_ORIGIN` (default
`http://127.0.0.1:3243`) with fresh desktop and touch-emulated mobile contexts.
It uses real UI actions and reads the real guest save only for assertions; no
inventory seeding, reducer injection, API success mocks, or fixed random catches.
Browser-clock advancement is guest-only, explicitly reported, and does not verify
server time/persistence. The parent runs this browser harness against the complete
integrated frontend. Account/community/barter backend verification is separate in
`scripts/qa/cozy-life-server.mts`; the guest harness must not claim to test trades
with real players or real global totals.
