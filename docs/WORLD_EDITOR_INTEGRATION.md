# World Builder 3D: integration contract (GPT-6 branch)

Status: browser-local editor implementation, **not yet wired to personal-world server persistence or deployed**. This module does not replace the legacy /worlds/create mission-recipe workbench or the existing Common Ground plaza.

## Entry

- Route: `/worlds/editor`
- Client: `features/plaza/editor/editor-app.tsx`
- Rendering: `features/plaza/editor/scene.tsx`
- Validated model/history: `features/plaza/editor/model.ts`
- Source catalog: `features/plaza/build-assets.ts` (991 licensed local GLB assets)

Users can search and filter the asset catalog, place approved models, select them, move/rotate/scale with 3D gizmos or numeric inputs, duplicate, delete, and undo/redo. Mouse/touch orbit and grid snapping are supported by the scene controls. Only the thumbnails in the active 48-item batch are rendered; GLB models are loaded on demand.

The editor autosaves a **local browser draft** under `ctrl:world-editor-v1`. The user can import/export a versioned JSON document. There is no claimed cross-device storage or API persistence yet. Invalid existing local drafts are preserved until explicit recovery.

## Serialized WorldEditorDocument v1

```ts
interface EditorDocument {
  version: 1;
  objects: Array<{
    id: string;                // stable unique alphanumeric, hyphen or underscore ID
    assetId: string;           // exact allowlisted BUILD_ASSETS ID
    position: [number,number,number]; // x/y/z, bounded
    rotationY: number;         // radians
    scale: number;             // uniform
    behavior: EditorBehavior;  // trusted tag, not runnable code
  }>;
}
```

Exported validators: `parseEditorDocument(unknown, assets)`, `readEditorJSON(string, assets)`, and `serializeEditorDocument(doc, assets)` in `model.ts`.

Current caps: 120 objects; x/z within ±24, y from 0 to 12, scale 0.15 to 8; rotation finite and bounded. Imports reject extra document/object keys, unknown assets, duplicates, unsafe IDs and invalid numeric values. Controls use a maximum of 60 history snapshots.

Behavior tags (`none`, `sit`, `toggle-light`, `open-close`, `button`, `moving-platform`, `portal`, `checkpoint`, `finish`) are **only metadata**. Interaction/runtime wiring remains unfinished. Do not claim enabled gameplay behaviors.

## Work/Astra backend integration

Astra owns persistence and authorization. Suggested adapter boundary:

- `GET /api/worlds/:worldId/editor`: return an ownership-checked document and revision.
- `PUT /api/worlds/:worldId/editor`: validate `EditorDocument` on the server against the same approved asset manifest and caps; check wallet session + owner/editor rights, revision match and rate limit; atomically persist document and increment revision.
- The client may import an existing document via `loadEditorHistory`, save `history.present`, then reset history on confirmation.
- Treat asset IDs and behavior tags as plain data, **never** remote URLs or generated JS.
- Keep world identity and wallet permissions separate from the editor document; the client must not dictate ownership.
- Future runtime should render catalog objects from the stored IDs with calibrated colliders and per-behavior allowlisted implementations.

Astra should connect these after its personal world APIs and permission model are ready. Do not create competing client-side storage backends.

## Verification

New pure-model test suite: `tests/unit/world-editor.test.ts` (allowlist, duplicate IDs, transform limits, history, import/export).

Recommended checks at merge time:

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build:next
pnpm build
```

Browser test: visit `/worlds/editor`; add two different assets, move/scale one, duplicate/remove, undo/redo, reload and verify local persistence, export/import JSON, then test at mobile viewport width 390px. Verify no GPU leaks when unmounting editor scene.

This branch's changes have **not** been executed in the full Work runtime yet. Merge/deploy only after the checks above pass.
