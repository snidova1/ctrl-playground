# Victoria Rubin — VRoid reference candidate

Reviewed 2026-10-09. Not the approved CTRL character.

- Creator: VRoid Project / pixiv Inc.
- Official identity and license: https://vroid.pixiv.help/hc/en-us/articles/360014900233 (β Ver AvatarSample_4, CC0).
- Source archive used: https://opengameart.org/sites/default/files/avatarsample_g.zip ; contained `AvatarSample_G.vrm`.
- Original SHA-256: `ad5750ce944b708155abb7ac6807e19d7f5e73a939f0ee32daf0539acfca57c0`.
- Original file: 15,321,932 bytes, VRM 0.x. This repository ships optimized exports, not the editable `.vroid` project.
- Desktop SHA-256: `af0efaa72b61c6532c41be1959e5ab9dad2bf515aaa0dc90805776740c3a3c28`.
- Mobile SHA-256: `a4d4870d98cf3fc25701f52b3a5521e22992d82b47a455a0792aaa25ab511358`.

The original embedded VRM metadata says `licenseName: Other`, while the publisher's current model-specific page explicitly says CC0. Embedded permission fields also allow commercial use, redistribution and modification through its linked terms. We retain the original metadata and document this difference rather than changing it to pretend it was a new export. Check the publisher's model-specific terms again before a public character release.

`scripts/character/optimize-vrm.py` rebuilds aligned buffer views and resizes embedded textures (1024 desktop, 512 mobile), preserving geometry, rig, expressions and metadata. No generative art replaces the actual model. Runtime MToon exposure and secondary-motion settings are adapted to the existing courtyard.

CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/ . VRoid base materials and individual Hub submissions can have different permissions. This sample's license does not license unrelated outfits, hairstyle packages, accessories or user uploads.
