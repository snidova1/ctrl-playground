# Willow Common — cozy-sim style spec (clean-room)

This spec turns what is **publicly observable** about the Heartopia-style genre (official store screenshots, gameplay videos, player guides) into measurable targets. No game binaries were disassembled and no third-party assets, code, shaders, names or branding are used. Everything is authored in this repository. Treat every number here as a regression target for screenshots (`node scripts/qa/shots.mjs`).

## 1. Camera
| Parameter | Target | Code |
| --- | --- | --- |
| Mode | third-person, behind and slightly above the character | `game/client/three/player.tsx` |
| Default distance / pitch | 5.8 m / 0.30 rad (≈17°) | `runtime.ts` camera defaults |
| Zoom range | 3–12 m; pitch 0.05–1.05 rad | wheel / pinch clamps |
| Field of view | 50° (38° in photo mode) | `player.tsx` |
| Framing | character in the lower third; aim point 0.35 m above the head, 1.2 m ahead; horizon visible | `camera.lookAt` |
| Follow | eases behind the character while walking (1.1/s) unless the player dragged within 1.6 s or walks toward the lens | auto-follow block |
| Collision | pulls in (min 1.4 m) when walls or trunks block the view | `rt.cameraBlocked` |

## 2. Light and grade
- Soft, luminous shading: 32-step smooth ramp from 150→255 (no hard cel bands). `materials.ts toonGradient`.
- Midday sky: zenith `#2a87e4`, horizon `#bfe6ff`; sun intensity ×0.78 of palette; hemisphere ×0.95. `palette.ts`, `sky.tsx`.
- Painted cumulus: 18 billboard clouds 150–270 m away, lit tops / lavender bellies, slow drift. `clouds.tsx`.
- Atmospheric haze: fog `#c0e1ee`, 26–150 m.
- Post: bloom 0.45 (threshold 0.82), saturation +0.16, contrast +0.07, ACES tone map, vignette 0.42. Low quality skips post. `effects.tsx`.

## 3. Environment
- **Trees**: canopies are leaf cards (≈78 per blob, 4–6 blobs) with normals from the blob centre, plus a darker inner hull; firs are 5 drooping jagged tiers; ~22% of broadleaf trees are white birches. `foliage.tsx Trees`.
- **Bushes & hydrangeas**: leaf-card mounds by every building, the plaza rim and open ground; 65% carry 5 pom-poms of 7 florets in blue / violet / pink / white.
- **Flower drifts**: instanced bell flowers, 2.6k (high) / 1.2k (low), meadow patches in blue and lilac.
- **Grass**: crossed painted clump cards 0.8×0.3 m, 26k (high) / 11k (low), deep greens `#4f9e38–#72bd4e`, wind sway.
- **Rocks**: smooth pale granite boulders `#e8eaf1` along the river, beach and woods.
- **Buildings**: clapboard siding and shingle roofs; Scandinavian red `#b9473d` with white trim and dark green roofs, plus pastel shops.
- **Water**: turquoise shallow `#79e3e6` → deep `#22a9d9`, shore foam, ripple highlights.

- **Leaves**: each card carries ~34 overlapping ovate leaves; colour shifts from warm sun green `#c4e874` to deep teal `#1f5a50` with the card normal (blossoms: `#fff0f5` → `#e08aaa`). Low quality uses 55% of the cards.

## 3b. Habitat
- Cottage restyling lives in `game/core/house.ts` (palette indices, validated by zod on the server). The front door stays on `HOUSE.doorZ` for every size so the yard layout never breaks.
- Build kit pieces are ordinary furniture items flagged in `BUILD_KIT`; the decorate tray splits them into Decor / Build.

## 4. Characters
- Anime VRM bodies with heads scaled ×1.72 (chibi), height 1.42 m. Faces always react: surprised at a bite, happy on catches and level-ups, sad on misses, sleepy emote, talking mouth flaps.
- Fashion: 38 patterned outfits, 12 hats, 10 accessories as owned items.

## 5. HUD
Left: resident card (level, XP, energy) and a next-step guide chip. Right: rounded icon menu. Bottom-right: large contextual action button with label, camera and emote buttons. Bottom-left: joystick (touch). Panels are cream rounded sheets.

## 6. Gameplay rules
See `game/core/life.ts` (authoritative reducer, shared by Worker and browser) and `README.md`.
