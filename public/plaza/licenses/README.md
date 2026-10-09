# Common Ground — free 3D asset credits

All downloaded model assets in `public/plaza/models` are CC0. No paid asset is required.

- **Kenney — Nature Kit**: `tree_oak`, `tree_detailed`, `plant_bush`, `flower_yellowA`. Official source: https://kenney.nl/assets/nature-kit . Included license: `kenney-nature.txt`.
- **Kenney — Furniture Kit**: `plantSmall1`, `chairModernCushion`, `tableRound`, `bookcaseOpen`, `books`. Official source: https://kenney.nl/assets/furniture-kit . Included license: `kenney-furniture.txt`.
- **Quaternius — Ultimate Animated Character Pack**: `Worker_Female.fbx` converted to `worker.glb`, with Idle, Walk, SitDown, PickUp and Victory clips. Author's CC0 release: https://opengameart.org/content/animated-characters-pack . Creator: https://quaternius.com/ . CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/ . Orange material recoloring, duplicate animation target repair and material-group consolidation were performed with `scripts/convert-plaza-character.mjs`.

- **Quaternius — Universal Base Characters, Standard (free)**: body, eyes, eyebrows and `Hair_Long` adapted into `maker.glb`. Official source: https://quaternius.com/packs/universalbasecharacters.html . Included license: `quaternius-universal-base.txt`.
- **Quaternius — Universal Animation Library, Standard (free)**: six clips retargeted onto The Maker. Official source: https://quaternius.com/packs/universalanimationlibrary.html . Included license: `quaternius-universal-animation.txt`. The Maker's clothes and accessories are custom project meshes; see `docs/maker-avatar.md`.

The cat dispenser, kinetic marble track, bench, lamp, sculpture, courtyard architecture, signs and CTRL mark are authored in the project. Runtime GLBs are served locally; visitors never fetch models from a third-party asset CDN. Source FBX files are not required at runtime.
