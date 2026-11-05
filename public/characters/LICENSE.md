# Anime avatar assets

These are authored, textured, skinned anime VRM models, not original CTRL geometry and not copies of the rejected procedural dolls.

- **Female, signature:** pixiv Inc., `VRM1_Constraint_Twist_Sample.vrm` from the official `pixiv/three-vrm` examples. The embedded VRM Public License 1.0 settings explicitly permit everyone, corporate commercial use, modification and redistribution. Original metadata is retained.
- **Male, signature:** VRoid Project / pixiv, `HairSample_Male.vrm`, CC0. Official conditions: https://vroid.pixiv.help/hc/en-us/articles/4402614652569 . Original metadata is retained.
- **Female, studio:** `HairSample_Female.vrm`, mirrored at https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/HairSample_Female.vrm . Embedded metadata specifies CC0, everyone and commercial use allowed; author is blank in the original metadata. Distributed as `female-studio.vrm` and `female-studio-mobile.vrm`.
- **Male, studio:** `Sakurada_Fumiriya.vrm`, mirrored at https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/Sakurada_Fumiriya.vrm . Embedded metadata specifies CC0, everyone and commercial use allowed; author is blank in the original metadata. Distributed as `male-studio.vrm` and `male-studio-mobile.vrm`.

`provenance.json` records source URLs, exact SHA-256 hashes, model metadata, high/low sizes and materials. Desktop files are the original bytes. Phone files preserve every mesh, skin, expression and VRM extension, limiting only embedded image dimensions to 1024 px.

CharacterStudio/M3 is a visual and pipeline reference, not the source of these four models. Inspected M3 asset exports carried restrictive author-only/no-redistribution metadata, so they were not copied into the public app. These replacements are not AvatarSample A/B/C, whose separate terms prohibit use in a character creation service.

Do not replace the embedded licenses with CC0. The signature female model is licensed under its existing VRM Public License settings, not CC0. CTRL does not claim authorship of any source model. Mirror URLs and embedded permissions are recorded evidence, not an independent guarantee of the mirror uploader's ownership.

## File names in this build

- `female.vrm` = signature female (VRM1_Constraint_Twist_Sample, mobile export)
- `female-b.vrm` = HairSample_Female (CC0, mobile export)
- `male.vrm` = HairSample_Male (CC0, mobile export)
- `male-b.vrm` = Sakurada Fumiriya (CC0, mobile export)

The game renders these with an enlarged head (chibi proportions) and runtime recolouring/fabric patterns; the files themselves are unmodified.

## Added bodies (VRoid Project sample characters)

Downloaded from the VRoid sample mirror at https://github.com/madjin/vrm-samples (`vroid/beta/`). Embedded metadata: license CC0, allowed user Everyone, commercial use Allow. The same characters are published by VRoid Project on OpenGameArt as "VRoid Studio CC0 models" (https://opengameart.org/content/vroid-studio-cc0-models), where AvatarSample D–G carry the VRoid Hub conditions "everyone, corporate commercial use allowed, modification allowed, redistribution allowed, credit unnecessary".

- `shibu.vrm` = Sendagaya Shibu
- `shino.vrm` = Sendagaya Shino
- `ruby.vrm` = Victoria Rubin
- `vita.vrm` = Vita
- `vivi.vrm` = Vivi
- `noir.vrm` = Darkness Shibu

Each file is the original with embedded images downscaled to at most 512 px (meshes, skins, expressions, spring bones and metadata untouched). Hairstyles in the creator reuse these hair meshes on other bodies at runtime; the files themselves are not merged.
