# Wallet onboarding: real 3D character studio + editable starter home

Branch based on Astra master-integrated PR #13. No changes to main/prod. Do not overwrite newer Astra backend revisions.

## Fix for reported live experience
- Actual code previously persisted new worlds with JSON layout [] and the profile onboarding panel contained only a text line "Victoria/Fumiriya". New users saw an empty floor and could not inspect the intended VRoid before saving.
- The panel now mounts the **real bundled Victoria/Fumiriya low-profile VRM assets** with animated idle and drag-to-rotate OrbitControls. Female/Male, 4 palette swatches, Surprise me, name and enter/save buttons. Existing profile editing opens the same 3D view. Source avatar stays VRoid; no MIO GLB fallback in the preview.
- For **only a newly created or existing untouched revision=0 empty wallet-owned home**, the client saves an actual 34-object garden patio with pavilion, tree canopies, seating, potted flowers, walkable entry stones and lights. Assets come from real already installed GLBs. Thus every object is selected/editable/removable/saveable in standard Habitat builder and visible to visitors.
- The initializer uses the existing secure save route, verifies owner/home identity, and serializes through server's revision compare-and-swap. 409 conflict refreshes authoritative world. It NEVER seeds visited worlds, previous saved layouts or revision>0 intentionally empty worlds. A failed save leaves the existing world intact and does not block profile onboarding.
- Starter assets are basic (no high-tier CTRL gate), art style consistent with existing Kenney models, inside the existing 120-object limit. Later holder premium templates may build on this but may not claim crypto purchases here.

## Review tasks
- Reconcile with Astra current master integration branch before merge. The operation is frontend-initiated for the onboarding account, not a database migration; independent or headless API creation still defaults to empty until user opens the app.
- Verify desktop/mobile preview VRM loads and rotates with pointers/touch; use real wallet-signature browser fixture. Check renderer GPU overhead from simultaneous world and avatar canvases on iOS (pause world frameloop during onboarding if needed).
- Verify 34 GLB references and scene appearance; inspect arbor/canopy and collision. Test seed idempotence, preserving a deliberately cleared layout, guest isolation, stale revision conflicts and world editing in a browser. Existing tests previously assert "2 objects" after two builder actions and must become relative-to-start or use a fresh cleared canvas for E2E.
- Do not claim outfit mesh swapping yet: currently only 4 genuine VRM material colorways and VRoid gender options; future real fitted costume/hair exports require import.

No wallets or purchases sent and no live deployment triggered.
