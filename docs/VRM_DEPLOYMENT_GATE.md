# VRoid-only Character Deployment Gate

**User-approved visual choice:** Victoria from VRoid/VRM. Fumiriya is the checked-in VRoid male base. MIO/Maker are Quaternius-derived GLB legacy characters, **not accepted as replacements** for Victoria. Do not deploy a change that restores MIO as default or error fallback.

As of this change:
- Habitat already renders Victoria/Fumiriya using VrmAvatar.
- Common Ground previously used MIO on ordinary visits and for ALL remote visitors, even when preview mode demonstrated Victoria.
- VrmAvatar previously rendered legacy MIO on VRM load failure. This change makes loading failures visible/retryable instead of deceptively switching visual identity.
- Common Ground now renders VRM for own and remote visitors. Its standalone guest-session API still does not store each visitor's chosen gender/outfit. Remote guest users show the approved Victoria VRM, rather than inventing a profile API. The persistent Habitat uses the real per-player gender and colorway.
- The original mio.glb and retired renderer may remain in the repository as a historical unreferenced asset for rollback/debugging; the playable player rendering paths do not import it. Removing binary files should be a separate explicitly-reviewed change.

**Important limitations:** Proper hairstyle/outfit mesh swaps, VRM fitted garment assets and persisted wardrobe customization are **not implemented** by this patch. Current palette variants tint outfits; they are not distinct clothes. Use PR #10's reviewed research, check mesh binding/license compatibility and keep VRoid aesthetics.

**QA/merge checklist:**
1. Run `pnpm exec vitest run tests/unit/vroid-live-default.test.ts`; `pnpm lint`; `pnpm exec tsc --noEmit --target ES2020`.
2. Browser test both /courtyard and /worlds/editor on desktop/mobile (hardware WebGL where possible), VRM load, fallback retry, and multiple visitors.
3. Ensure no network fetch to `/plaza/models/mio.glb` from active pages; monitor VRM load errors. Limit remote displayed avatars by graphics tier (this patch caps 5 light / 15 full).
4. Review VRM per-instance GPU memory, draw calls, shared texture & material lifecycle under multiplayer load; the VRM system was previously tested as a preview, not 100 concurrent avatars.
5. Merge into current Astra master PR #13, without overwriting wallet persistence and Habitat editor features. Deploy only after visual and functional QA and the user's visual approval.

This PR uses no new VRM binary assets, does not touch world DB, does not deploy production, and does not claim true runtime outfit swapping.
