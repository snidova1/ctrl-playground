# Modular avatar library audit — recovered parent review

Both research delegates timed out without final reports. Their logs contain leads, not accepted assets. Parent inspected the original sources listed below. No asset was purchased, installed into CTRL, or claimed compatible from this research.

## Strongest stylistic candidate: BoZo Anime Pack

Primary: https://assetstore.unity.com/packages/3d/characters/humanoids/humans/bozo-stylized-modular-characters-anime-pack-323550
Preview inspected: https://assetstorev1-prd-cdn.unity3d.com/package-screenshot/5d8f3433-f605-419c-9933-0c79f9f05637_scaled.jpg
Price lead, not checkout quote: https://www.gameassetdeals.com/asset/323550/bozo-modular-anime-characters-base-pack (USD40 at inspection).

Primary listing explicitly enumerates 17 tops, 15 bottoms, 12 footwear, 10 gloves, 9 hats, 11 front hair, 19 back hair, 4 head accessories, 5 face accessories, 1 head and 1 eyes. Its advertised grand total is inconsistent with its enumerated list; do not repeat the total as independently verified. Hair entries are front/back components, not 30 independent complete hairstyles.

Visually full-proportion cel-shaded anime characters, not the previously rejected faceless procedural avatars. Listing claims common humanoid rig, body/face blendshapes, outfit morphs for body/chest/weight, and diffuse/normal textures. These are seller claims until archive inspection. Uses Unity shader graph: exporting to CTRL will require a material adapter, not importing the Unity customization application.

BLOCKERS: paid archive unavailable for real rig/one-part smoke test without acquisition; public-browser delivery permission must be verified. Unity Asset Store EULA 2.2.1.1(c) addresses monetized products whose primary purpose is UGC; (f) addresses digital representations of value/ownership/contractual rights. Applicability to CTRL is not resolved merely because the listing supports in-game character customization. No purchase authorization or special permission has been obtained. No fabricated compatibility result.
License: https://unity.com/legal/as-terms

## Free candidate bank, not a modular anime pack: OpenSourceAvatars

https://github.com/ToxSam/osa-gallery
https://opensourceavatars.com/

Parent checked README. ToxSam original 100Avatars R1/R2/R3 are stated CC0, but the whole gallery is mixed-license; VIPE/community collections are not automatically CC0. Do not call all advertised 4260+ entries public domain. Collection consists of complete avatars with mixed styles; common-base modular hair/clothing compatibility is NOT established. No download/fit test completed.

## Free modular pack with style mismatch

https://quaternius.itch.io/modular-character-outfits-fantasy

Listing specifies CC0, 12 outfits / 62 parts and three texture variants per outfit. Standard archive is free; source archive paid. Do not count recolors as additional designs. Universal Base style is not automatically acceptable anime style and is not a drop-in fit for the current VRoid body.

## Production decision

Keep stable CTRL renderer and accepted assets. Do not add more ad-hoc foreign-body costume fitting. Acquire a style-approved common-base bank with appropriate permissions, verify one real part, then implement a manifest-driven batch exporter with cached rig mapping and a single gallery/QA/build cycle. Blender/MCP can aid inspection and repairs; it does not supply the bank or solve licenses. Current research has not cleared a suitable downloadable large anime pack, and has not produced new in-game options.
