# GPT-6 / Astra CTRL Habitat World Builder handoff

**Branch:** `gpt6/world-builder` → **Draft PR #2**. **Do not deploy or merge before browser gates pass.**

## Product correction
The World Builder is **inside the exact existing Astra Habitat**. The route `/worlds/editor` mounts `<HabitatApp advancedBuilder />`, using the original Astra VRM avatar, multiplayer state, movement controller, camera, 3D stage and world objects. The homepage `/` remains unchanged; editing on the workshop route is opt-in.

No standalone duplicate scene, no competing local-storage world, and no replacement of Astra's deployed interface. Existing `/worlds/create` remains the separate mission recipe workbench.

## Change ownership and files
- `features/plaza/editor/habitat-tools.tsx` + `habitat-tools.css`: advanced tools **overlaid on Astra Habitat scene**, verified catalog browser, category/search, 7 existing CTRL primitives, object inspector, behavior/targets, undo/redo, Save & Play, mobile tabs
- `features/habitat/app.tsx`: very small opt-in advancedBuilder hook; reuses Astra's existing `draft`, `change`, `patch`, `save`, `history`, and server state
- `features/habitat/stage.tsx`: opt-in Drei TransformControls gizmo on the selected object in the **existing** Canvas, behind same avatar/camera; objects are still Astra WorldObjects
- `app/worlds/editor/page.tsx`: mounts existing HabitatApp advanced mode
- `features/worlds/worlds-index.tsx`: opens advanced builder route without changing legacy workbench
- `tests/browser/world-editor.spec.ts`, `playwright.editor.config.ts`: real desktop/mobile Habitat onboarding, canvas continuity, object edits, undo/redo, save/reload and screenshots
- `tsconfig.json`: ES2020 compatibility for existing CTRL BigInt key policy
- `.github/workflows/world-builder.yml`: automated gates

An earlier experimental standalone editor was retired from the branch before merge.

## Persistent backend stays Astra-owned
Advanced tools call original `onAdd/onPatch/onSave` callbacks inside HabitatApp. Its `save()` still POSTs to `/api/habitat/save` using `{worldId,revision,objects}`; the same server enforces access/owner, catalog IDs, transform bounds, anti-stale revision and identity. There are **no new server routes, wallet auth, key contracts or migrations**.

Interactive doors/lights/switches/portals/checkpoints remain handled by the real Habitat runtime after **Save & Play**; not fake local gameplay.

## Merge rules
1. Compare with Astra's fresher `work/integration` changes in `features/habitat/app.tsx` and `stage.tsx`. Integrate *only* the optional advanced prop, advanced tool component mount and selected-object TransformControls logic into those files. Never replace the other agent's newer code with older snapshots.
2. Verify one world saves through real APIs; stale revision conflict and cross-wallet denial; visitor can see saved layout.
3. Verify desktop and mobile avatar movement, 3D placement, transform drag, cancel rollback, undo/redo, save and reload.
4. Review [PR #2](https://github.com/snidova1/ctrl-playground/pull/2) and [GitHub Actions](https://github.com/snidova1/ctrl-playground/actions/workflows/world-builder.yml). Current run results must be checked, no unverified success claims.
5. Do not modify `main` without PR, no deploy, no force push, no key transactions.

**Astra owns all production Habitat/server integration and release. GPT-6 owns the isolated editor add-on and its tests.**
