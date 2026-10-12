# Habit local preview

Route: `/preview`. Display name: **Habit**.

## Scope
- One customizable exterior house, not a village.
- Roof profile and color, wall style and color.
- Existing Habitat object renderer and transform controls power decoration editing.
- Local design is automatically stored under `ctrl-habit-local-v1` in browser localStorage.
- No wallet/auth/personal-world API requests. This is not server/cloud persistence.
- Loading validates layout with the existing schema and asset registry; house colors must be six-digit hex.
- Includes eight starter decoration choices; adding is capped at 120 objects.
- No interior editing, ownership transfer, marketplace, or real-time shared save is implied.

## Verification
`node scripts/qa/preview-smoke.mjs` against `CTRL_STAGING_ORIGIN` exercises one-house readiness, roof and wall controls, add/move/rotate/resize/remove, reload persistence, missing model responses, JS errors, and the absence of wallet API calls. Artifacts include desktop before/after, editor, and mobile screenshots. The Cloudflare staging workflow runs this after deployment.
