# CTRL advanced 3D editor / Habitat integration

## Implementation

Route: `/worlds/editor`. Linked from `/worlds`; existing `/worlds/create` recipe workbench and the main Habitat remain intact. This is an advanced, client-owned world layout interface for the **existing** Habitat backend, not a competing backend or a replacement for world visiting.

Modules:
- `features/plaza/editor/editor-app.tsx`: searchable catalog, inspector, 3D edits, local autosave, owner save UI.
- `features/plaza/editor/scene.tsx`: lazy GLBs, procedural CTRL builtins, selection and move/rotate/scale gizmos, deterministic play preview.
- `features/plaza/editor/model.ts`: strictly validated versioned draft, undo/redo and spatial limits.
- `features/plaza/editor/preview.ts`: local light, door, spin, checkpoint, finish interactions.
- `features/plaza/editor/habitat-bridge.ts`: lossless conversion between `EditorDocument` and existing `WorldObject[]` layout.
- `tests/unit/world-editor*.test.ts`: round-trip, allowlist, history, preview, malicious input and constraint tests.

Library: 991 Kenney CC0 models already present in `features/plaza/build-assets.ts`, plus seven authored CTRL procedural Habitat primitives. The client renders at most 48 thumbnail entries per page and loads GLBs when actually placed. No mandatory LLM or provider call.

## Actual server integration

There is **no new API**. The editor reads:
`GET /api/habitat/state` and writes:
`POST /api/habitat/save` with `{worldId,revision,objects}`.

`features/habitat/types.ts` and `server/habitat/service.ts` remain authoritative:
- Signed-wallet or existing guest session resolves identity.
- `canEdit` must be true and the selected world must belong to the authenticated owner.
- World revision is required: backend rejects stale editor saves with HTTP 409; local draft is never discarded.
- Existing server layout schemas enforce UUID IDs, catalog allowlists, bounded transforms, known behavior tags, switch target references, and 120-object cap.
- Browser UI makes loading an owned world explicit; existing unsaved local draft requires user confirmation before replacement.
- Publishing requires pressing **Save to world**; local autosave alone is not publication.
- Browser import/export preserves an independent JSON draft; importing or clearing it detaches from the remote world to prevent accidental remote overwrite.

The editor's limits match the backend: x -14..14, y 0..8, z -8..12, scale 0.25..4. Names, target IDs and primitive objects survive round trips; a document with unknown assets is rejected completely, never partially imported. Newly placed objects use UUID IDs.

Behavior mapping:
- none → decoration, solid → solid, sit → seat
- toggle-light → light, open-close → door, button → switch
- spin → spin, portal → portal, checkpoint → checkpoint, finish → finish

**Local Play Test** is a limited simulation: clickable lights, doors, spin, checkpoint and finish. Full movement, proximity, collision, seating, switching to configured targets, real portals and shared state are executed by the existing Habitat runtime after saving and entering the world. Do not present Play Test as a complete gameplay session.

## Verification

GitHub Actions workflow: `.github/workflows/world-builder.yml`. Tests and lint for owned modules run before project-wide compatibility checks; the workflow also reports any unrelated baseline regressions. Separate browser suite:
`pnpm exec playwright test --config playwright.editor.config.ts`.

Do not merge a draft PR or deploy before TypeScript, full builds, actual desktop/mobile browser testing, and multi-session saved-world verification. The initial backend already exists, but actual live-user editing/persistence behavior is not yet browser-verified in this PR.
