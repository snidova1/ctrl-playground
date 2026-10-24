# Audit sumber aset M3 / CharacterStudio

## Status: sumber nyata ditemukan; **belum ada pasangan final yang sah untuk dipublikasikan**

Semua file sumber dalam laporan ini benar-benar diunduh dan dibaca sebagai GLB/VRM, bukan placeholder/procedural dolls. Namun izin tertanam melarang pemakaian avatar oleh pihak lain dan redistribusi; keluarga character-assets juga melarang modifikasi. Tidak ada dasar untuk menyebut aset ini CC0/MIT hanya karena editor CharacterStudio berlisensi MIT. Karena itu **tidak ada VRM base telanjang/underwear maupun model yang belum berizin disalin ke public/**, tidak ada license flag diubah, dan tidak ada assembly final yang diklaim sah.

Aksi selanjutnya: minta izin tertulis yang mencakup penggunaan avatar, modifikasi/assembly, dan redistribusi melalui web dari pemegang hak Webaverse (character-assets) atau Rhinox 3D/pemegang hak Anata. Alternatif: pengguna menyerahkan pasangan VRM berpakaian lengkap berlisensi sesuai proyek. Metadata bisa saja default ekspor, tetapi itu bukan bukti izin pengganti.

## Sumber resmi dan koreksi referensi visual

- Editor: https://github.com/M3-org/CharacterStudio
- Manifest editor: https://raw.githubusercontent.com/M3-org/CharacterStudio/main/public/manifest.json
- Female Anata: https://m3-org.github.io/loot-assets/anata/female/manifest.json
- Male Anata: https://m3-org.github.io/loot-assets/anata/male/manifest.json
- Female anime DropHunter: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/manifest.json
- Male anime NeuroHacker: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/manifest.json
- Repo asal character-assets: https://github.com/webaverse-studios/character-assets
- README editor secara eksplisit memisahkan program dari asset packs: https://raw.githubusercontent.com/M3-org/CharacterStudio/main/README.md
- Screenshot yang diberikan: https://github.com/M3-org/CharacterStudio/assets/32600939/fad3002f-78cd-4cd2-8eae-0c1663a86d25

Screenshot tersebut sudah dilihat langsung: **satu perempuan berambut oranye twintail, crop top hitam, celana pendek ungu, stocking**, bukan pasangan pria/perempuan berambut coklat dalam pakaian adventurer. Panel menunjukkan `ActionCutoffSplattered` dan animasi `idle_drophunter`. Jadi keluarga DropHunter/NeuroHacker lebih relevan terhadap referensi gaya anime itu dibanding Anata. Komposisi di bawah sengaja memilih jaket + celana panjang agar bukan underwear-only.

## Izin yang benar-benar tertanam

### character-assets / VRM 1.0

Kedua base dan seluruh 10 modul yang diinspeksi memiliki:

```json
{
  "authors": ["Webaverse"],
  "avatarPermission": "onlyAuthor",
  "allowRedistribution": false,
  "modification": "prohibited",
  "commercialUsage": "personalNonProfit",
  "creditNotation": "required",
  "licenseUrl": "https://vrm.dev/licenses/1.0/"
}
```

Selain itu penggunaan excessively sexual/violent, hate/antisocial, political/religious disallow. Nama base `DropHunterMaster` versi `v2` dan `HackerMaster` versi `v2.1`. Repo fork dan upstream tidak mempunyai file LICENSE dalam recursive tree yang diambil; GitHub repo API melaporkan `license: null`. README tidak memberikan izin pengganti. PNG tekstur terpisah juga tidak memiliki lisensi permisif yang ditemukan.

### loot-assets / Anata / VRM 0.0

Semua 10 file Anata yang diinspeksi memiliki:

```json
{
  "allowedUserName": "OnlyAuthor",
  "licenseName": "Redistribution_Prohibited",
  "commercialUssageName": "Disallow",
  "violentUssageName": "Disallow",
  "sexualUssageName": "Disallow",
  "otherPermissionUrl": "",
  "otherLicenseUrl": ""
}
```

Female: title `Female Anata`, version `0.03`, author `Rhinox 3D`, contact `Hongzi`. Male: title/author/contact kosong. Repo tidak mempunyai LICENSE dalam recursive tree; GitHub API `license: null`; README tidak memberikan izin pengganti.

## Komposisi minimum kandidat berpakaian lengkap (izin masih diperlukan)

Masing-masing **6 modul resmi**, tidak perlu memasang/menjalankan editor besar:

- Female DropHunter: `body/drophunter.vrm` + `head/straight.vrm` + `eyes/regulareyes.vrm` + `chest/fulljacket.vrm` + `legs/cargopants.vrm` + `feet/shortboots.vrm`.
- Male NeuroHacker: `body/neurohacker.vrm` + `head/hairshort.vrm` + `eyes/regulareyes.vrm` + `chest/fulljacket.vrm` + `legs/cargopants.vrm` + `foot/hikingboots.vrm`.

Manifest membolehkan komposisi tanpa outer terpisah: fulljacket bertipe `solo`; cargo pants bertipe `pants`; DropHunter shortboots bertipe `shoes`, sehingga tidak terkena restriction `pants` terhadap `boots`. NeuroHacker hikingboots tidak mendeklarasikan tipe `boots`. Body dan eyes adalah required traits. Model base saja **bukan avatar final** dan tidak boleh ditampilkan sebagai final.

### Bukti kompatibilitas rig dari data biner

- DropHunter: setiap skin 198 joint; NeuroHacker: setiap skin 102 joint. Keduanya punya 54 human bones VRM.
- Semua joint pada kelima modul tambahan per gender ditemukan dalam base miliknya; **0 missing joint names**, **0 perbedaan local TRS** pada toleransi 1e-5.
- Selisih maksimum inverse-bind matrix terhadap joint base: DropHunter <= 5.960464477539062e-7; NeuroHacker 0.0. Jadi skin modul dapat direbind ke skeleton base berdasarkan nama joint, memakai inverse bind masing-masing, tanpa retarget geometri.
- Body/head/eyes mesh name bisa sama pada file berbeda (`head_geo.baked(copy)` / `Head.baked(copy)`). Jangan dedup mesh hanya berdasarkan nama; gunakan indices dan remap semua reference.
- Bone utama kedua keluarga: `hips`, `spine`, `chest`, `upper_chest`, `neck`, `head`; kaki `upper_leg.L/R`, `lower_leg.L/R`, `foot.L/R`; tangan `upper_arm.L/R`, `lower_arm.L/R`, `hand.L/R`.
- Animate satu humanoid base; pakaian wajib mereferensikan skeleton yang sama, bukan sekadar menumpuk enam avatar VRM yang di-update sendiri-sendiri.
- Gunakan `VRMLoaderPlugin` / VRM 1.0 + `VRMC_materials_mtoon`; pertahankan `VRMC_vrm` humanoid, expressions, firstPerson, lookAt dan `VRMC_springBone`. Remap node/skin/accessor/bufferView/texture/material references saat export; merge metadata tidak boleh melonggarkan izin.
- Jangan campur rig DropHunter, NeuroHacker, dan Anata. Anata female memakai `Hips`, `Left arm`, `Left knee`, dll; Anata male memakai `hips`, `upper_arm.L`, dll. Keduanya VRM0 (`specVersion: 0.0`) dan perlu jalur orientasi VRM0, berbeda dari VRM1.

### Tekstur dan coverage

Semua modul terpilih punya UV dan albedo PNG tertanam (kebanyakan 2048x2048; rambut DropHunter 1024x1024); semua material terpilih memakai baseColorTexture + MToon. Base DropHunter punya empat PNG 2048x2048, NeuroHacker tiga. Jadi geometri sumber bukan mesh tanpa tekstur. Varian tekstur opsional resmi turut diunduh, bukan diwajibkan agar terlihat bertekstur.

Setelah izin ada, assembly perlu pemeriksaan visual front/back dan pose berjalan untuk clipping. Face-culling sesuai layer manifest bisa diperlukan di bawah jaket/celana/sepatu; belum divalidasi visual/animasi karena tidak ada final legal yang dirakit. Tidak ada klaim screenshot/render quality parity dari pemeriksaan biner saja.

## Verifikasi yang dijalankan

`python3 /tmp/m3-asset-inspect/verify_sources.py` berhasil untuk **30 file sumber**: 22 VRM + 8 PNG. Header/chunk GLB, ukuran buffer, decoded image integrity, UV/position finite, index bounds, skin-joint index bounds, joint names, local TRS, inverse bind matrices, bobot skin, hash SHA-256 dan Git blob SHA-1 diperiksa. Error maksimum jumlah bobot skin: 1.1920928955078125e-7. Setiap file cocok dengan Git blob SHA pada tree sumber.

Tidak menjalankan build, browser, tsc, editor CharacterStudio, atau mengedit application source/tests/catalog/loaders.

Laporan mesin lengkap (semua metadata, nama mesh/bones, statistik per-primitive dan hashes): `/tmp/m3-asset-inspect/source-audit.json`. Salinan sumber hanya di `/tmp/m3-asset-inspect/`, bukan public web path; bukan deliverable final/deployable.

## Snapshot tree sumber
- loot: `24e2d470149e6a3235cb0cce9135bea4abafb1a3` (tree SHA, bukan klaim commit SHA).
- character: `c8b5d6f9b4f6e20480e66d5a17198cdc52f2158f` (tree SHA, bukan klaim commit SHA).

## Inventaris unduhan aktual

Setiap entri mencantumkan URL, absolute path, byte, SHA-256, filesystem mode dan isi mesh. Tidak ada salinan di public/.

### drophunter / head/straight.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/head/straight.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/head/straight.vrm`
- Bytes: `572344`
- SHA-256: `16b32406e7305c8bba3d4a7e9dbb058fb9a71fea742ac6b156e0eb78dd5a24bd`
- Git blob SHA-1 (verified): `a78f49c4c57502cc027b50961ee216cdb59add8a`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[198]`
- Mesh `hair_straight.baked`: 2792 vertices, 3188 triangles.
- Embedded images: PNG 1024x1024 RGB.

### drophunter / eyes/regulareyes.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/eyes/regulareyes.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/eyes/regulareyes.vrm`
- Bytes: `1293408`
- SHA-256: `2d05864fdcabe06e52bc48f1d3421e96f8cc8e0581f9e9b450e4a7a1ebef0e47`
- Git blob SHA-1 (verified): `dfc74a3d13f331ed0c629ad0a4449f53cb0075c3`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[198]`
- Mesh `head_geo.baked(copy)`: 822 vertices, 924 triangles.
- Embedded images: PNG 2048x2048 RGBA.

### drophunter / _textureCollections/eyes/IMG_2817.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/_textureCollections/eyes/IMG_2817.png
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/_textureCollections/eyes/IMG_2817.png`
- Bytes: `867370`
- SHA-256: `73d1fdd75101e3f9af5f887af234b836df814871c4ad718b080f937a330b00c8`
- Git blob SHA-1 (verified): `c1e101a1a982f49a32f63600d8762c95da85be77`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGBA.

### drophunter / chest/fulljacket.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/chest/fulljacket.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/chest/fulljacket.vrm`
- Bytes: `1352312`
- SHA-256: `62a9e24c32f900b05c570523eb8d4499659872658b44c0556dafb4c16e257c14`
- Git blob SHA-1 (verified): `1594530b722d0512754b918d8fb637ab16f1a2b7`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[198]`
- Mesh `solo_FullJacket.baked`: 4459 vertices, 7964 triangles.
- Embedded images: PNG 2048x2048 RGB.

### drophunter / _textureCollections/Jacket Outfit 7/jacket_0.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/_textureCollections/Jacket%20Outfit%207/jacket_0.png
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/_textureCollections/Jacket Outfit 7/jacket_0.png`
- Bytes: `706860`
- SHA-256: `c5660cd93b07fbf09a61db0618547ba2e2207e8e0a2f3a446c349d1200887126`
- Git blob SHA-1 (verified): `e6b4684c2b4c21a45b220d5dd1744de51333f501`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGBA.

### drophunter / legs/cargopants.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/legs/cargopants.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/legs/cargopants.vrm`
- Bytes: `1082588`
- SHA-256: `02c84920d112ddd27d1cacd7792553d36cb760eac9ba1d8b05f88ccbf136258a`
- Git blob SHA-1 (verified): `e78ec0cdb35b30c5c5b06e9e3311eec19e085fc0`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[198]`
- Mesh `legs_pants_CargoPants.baked`: 2234 vertices, 3602 triangles.
- Embedded images: PNG 2048x2048 RGB.

### drophunter / _textureCollections/Pants Outfit 8/pants_0.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/_textureCollections/Pants%20Outfit%208/pants_0.png
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/_textureCollections/Pants Outfit 8/pants_0.png`
- Bytes: `763985`
- SHA-256: `f4e9430237675992963c709997f02a58b92a73f1e28471d34e716b3e1a389616`
- Git blob SHA-1 (verified): `e6a94a1fcdf6062c90edecf3420ebe0f53b53dd2`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGB.

### drophunter / feet/shortboots.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/feet/shortboots.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/feet/shortboots.vrm`
- Bytes: `862760`
- SHA-256: `b0a51dc9cc7d6434cbe8517236feb6b03d47685c43fad1ac7ff63b2b15be0128`
- Git blob SHA-1 (verified): `b23514d8dc3467ee071486d9ba2d97de776e02db`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[198]`
- Mesh `foot_shoes_ShortBoots.baked`: 2685 vertices, 3484 triangles.
- Embedded images: PNG 2048x2048 RGB.

### drophunter / _textureCollections/Shoes Outfit 8/shoes_0.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/_textureCollections/Shoes%20Outfit%208/shoes_0.png
- Path: `/tmp/m3-asset-inspect/character-assets/drophunter/_textureCollections/Shoes Outfit 8/shoes_0.png`
- Bytes: `491354`
- SHA-256: `46365278c63c3bf45e0e4c20715fd56d5dd620b0a88ff138c3274b58373dc3a3`
- Git blob SHA-1 (verified): `df490276fab9028706bcb09513d441eee02ade8e`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGB.

### neurohacker / head/hairshort.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/head/hairshort.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/head/hairshort.vrm`
- Bytes: `1023936`
- SHA-256: `d1cbdc26dd76b98d0a88a8d141a6a2b8c39c424360698a1ab3877a88dfa7b88b`
- Git blob SHA-1 (verified): `714fc2edfe884dd52c828c9c913ba27ceb749b75`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[102]`
- Mesh `hair_short_1.baked`: 1040 vertices, 1421 triangles.
- Embedded images: PNG 2048x2048 RGB.

### neurohacker / eyes/regulareyes.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/eyes/regulareyes.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/eyes/regulareyes.vrm`
- Bytes: `1305268`
- SHA-256: `910219bd8d584b536cc870b14760cec82daf99edb1aa3e85649e14e7fbd64f22`
- Git blob SHA-1 (verified): `34078abe494b9314abd789eb9f6d3023645a3062`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[102]`
- Mesh `Head.baked(copy)`: 1386 vertices, 1888 triangles.
- Embedded images: PNG 2048x2048 RGBA.

### neurohacker / _textureCollections/eyes/IMG_2857.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/_textureCollections/eyes/IMG_2857.png
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/_textureCollections/eyes/IMG_2857.png`
- Bytes: `904383`
- SHA-256: `de5da5581f89fa619022aefc8c3d837d2118583467218bed4e89357126804319`
- Git blob SHA-1 (verified): `b6da7112f24f1a84a61df711fe725b612dcd8d47`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGBA.

### neurohacker / chest/fulljacket.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/chest/fulljacket.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/chest/fulljacket.vrm`
- Bytes: `1544052`
- SHA-256: `d3cf89dc526ce3a6de249ef34e45eff592ca6362258c1c8eed6dad67ae17c09a`
- Git blob SHA-1 (verified): `38f8d0d184d648cc4d02426d50bcae1982da0f72`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[102]`
- Mesh `solo_fulljacket.baked`: 2995 vertices, 4500 triangles.
- Embedded images: PNG 2048x2048 RGB.

### neurohacker / _textureCollections/outfit_1/outfit_1_0.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/_textureCollections/outfit_1/outfit_1_0.png
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/_textureCollections/outfit_1/outfit_1_0.png`
- Bytes: `1498241`
- SHA-256: `649f2b85db2bfe5007510ee0fb824b8579fc44de27391ed1cb47d3fc0905fabb`
- Git blob SHA-1 (verified): `3999aa72287fe8b08a8000b57b207449893491c8`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGB.

### neurohacker / legs/cargopants.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/legs/cargopants.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/legs/cargopants.vrm`
- Bytes: `1717820`
- SHA-256: `074c2999a27f4db0d6b0f84175f6676b6006a4b6c621c7cb94b4216437762afb`
- Git blob SHA-1 (verified): `8b01a47815eb09d4897dba6279e7332c961e1a1c`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[102]`
- Mesh `legs_cargoPants.baked`: 2044 vertices, 3352 triangles.
- Embedded images: PNG 2048x2048 RGB.

### neurohacker / _textureCollections/outfit_2/outfit_2_0.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/_textureCollections/outfit_2/outfit_2_0.png
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/_textureCollections/outfit_2/outfit_2_0.png`
- Bytes: `1776570`
- SHA-256: `629f493d05c5130cd7878101fdaf209ff72bc7a37674e14b2893b1b5d7fa8eb1`
- Git blob SHA-1 (verified): `eb9bc7312aedc73b959244e5300c2c4cb89efeba`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGB.

### neurohacker / foot/hikingboots.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/foot/hikingboots.vrm
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/foot/hikingboots.vrm`
- Bytes: `2401032`
- SHA-256: `a312f30e6d3b32388c984573c973f23f5b546cde4a7a35a45beeb42a0a99abbf`
- Git blob SHA-1 (verified): `7b1fe68f8948c3b2b26b955ba6ed5acdfe1cbcc7`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[102]`
- Mesh `foot_hikingboots.baked`: 1064 vertices, 1608 triangles.
- Embedded images: PNG 2048x2048 RGB.

### neurohacker / _textureCollections/outfit_5/outfit_5_0.png

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/_textureCollections/outfit_5/outfit_5_0.png
- Path: `/tmp/m3-asset-inspect/character-assets/neurohacker/_textureCollections/outfit_5/outfit_5_0.png`
- Bytes: `3241637`
- SHA-256: `7dc85293e7076d37068380f7dc952e0e6224171b4ed98fcf36c8d7e21fac10be`
- Git blob SHA-1 (verified): `1e2d72b0a8439b781c52032e8efec36d09941bca`
- Filesystem mode: `0o644`
- Image: PNG 2048x2048 RGB.

### drophunter / body/drophunter.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/drophunter/body/drophunter.vrm
- Path: `/tmp/m3-asset-inspect/drophunter-base.vrm`
- Bytes: `5045104`
- SHA-256: `25934dcc3633f6a2c00c02ebc725538ba89a49405096ff8643cb0b81a3a1bf97`
- Git blob SHA-1 (verified): `65c456f55d29c84d81de0d6d6aba0683cbd41c06`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[198, 198]`
- Mesh `body_geo.baked`: 4185 vertices, 7146 triangles.
- Mesh `head_geo.baked(copy)`: 1601 vertices, 2670 triangles.
- Embedded images: PNG 2048x2048 RGBA, PNG 2048x2048 RGB, PNG 2048x2048 RGBA, PNG 2048x2048 RGBA.

### neurohacker / body/neurohacker.vrm

- URL: https://raw.githubusercontent.com/memelotsqui/character-assets/main/neurohacker/body/neurohacker.vrm
- Path: `/tmp/m3-asset-inspect/neurohacker-base.vrm`
- Bytes: `4975968`
- SHA-256: `426aa6c9810919ca10d0071dbdab9859c46ffab1ab9104865e2a6003f5c47e18`
- Git blob SHA-1 (verified): `0df9082f5be75478e6c15f9823084affe79923ee`
- Filesystem mode: `0o644`
- VRM: `1.0`; skin joints: `[102, 102]`
- Mesh `Body.baked`: 12364 vertices, 22596 triangles.
- Mesh `Head.baked(copy)`: 2379 vertices, 4092 triangles.
- Embedded images: PNG 2048x2048 RGBA, PNG 2048x2048 RGBA, PNG 2048x2048 RGBA.

### anata/female / Body/female.vrm

- URL: https://m3-org.github.io/loot-assets/anata/female/Body/female.vrm
- Path: `/tmp/m3-asset-inspect/female-base.vrm`
- Bytes: `9876472`
- SHA-256: `8f60a37785bdd842119765390d7b99f7ceea8442ee84a485cce9008c51687940`
- Git blob SHA-1 (verified): `43a1d93c4dc867ff96122f735805d1866fba8642`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[56]`
- Mesh `Body.baked.002_LOD1.003_LOD1.002`: 9378 vertices, 12908 triangles.
- Embedded images: PNG 2048x2048 RGBA.

### anata/female / Chest/hard_leather_armor.vrm

- URL: https://m3-org.github.io/loot-assets/anata/female/Chest/hard_leather_armor.vrm
- Path: `/tmp/m3-asset-inspect/female-Chest-hard_leather_armor.vrm`
- Bytes: `1839996`
- SHA-256: `1b99ce7893415075ba809c1ca1fe4678f6c62ce501d4f3bef9491eb1d281818d`
- Git blob SHA-1 (verified): `1831ba4ada5b359428479c10935888b2e7b45d02`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[56]`
- Mesh `Body.baked.002_LOD1.003_LOD1.025`: 1402 vertices, 1916 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.

### anata/female / Chest/robe.vrm

- URL: https://m3-org.github.io/loot-assets/anata/female/Chest/robe.vrm
- Path: `/tmp/m3-asset-inspect/female-Chest-robe.vrm`
- Bytes: `3049328`
- SHA-256: `c91db343b1946bcf674dece1e205778977916a3a12f0184672289663569e79f4`
- Git blob SHA-1 (verified): `54dff96e06447850919fa61c57a63f017fe0d41b`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[56]`
- Mesh `Body.baked.002_LOD1.003_LOD1.027`: 3120 vertices, 5356 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.

### anata/female / Shoes/leather_boots.vrm

- URL: https://m3-org.github.io/loot-assets/anata/female/Shoes/leather_boots.vrm
- Path: `/tmp/m3-asset-inspect/female-Shoes-leather_boots.vrm`
- Bytes: `1612640`
- SHA-256: `90e1a391907fcd2d3a74e18daac5674715d2ece9b9d28e799c31b077c0aacb24`
- Git blob SHA-1 (verified): `af706e9233fad2ef12920f1af635ea2ae0524761`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[56]`
- Mesh `Body.baked.002_LOD1.003_LOD1.035`: 1444 vertices, 1434 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.

### anata/female / Waist/leather_belt.vrm

- URL: https://m3-org.github.io/loot-assets/anata/female/Waist/leather_belt.vrm
- Path: `/tmp/m3-asset-inspect/female-Waist-leather_belt.vrm`
- Bytes: `2387956`
- SHA-256: `e10ad88401b57314b4b21f750086fc0b9b821f9465cd92c581292ce41735c7f4`
- Git blob SHA-1 (verified): `19a843bfa94b3e817ddcb92afa612fbd284532fc`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[56]`
- Mesh `Body.baked.002_LOD1.003_LOD1.006`: 2407 vertices, 2228 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.

### anata/male / Body/male.vrm

- URL: https://m3-org.github.io/loot-assets/anata/male/Body/male.vrm
- Path: `/tmp/m3-asset-inspect/male-base.vrm`
- Bytes: `4130868`
- SHA-256: `00bfa1f21f69f41800f429103cb09145a661c2f8ba2181d6ad294402dbacb9a0`
- Git blob SHA-1 (verified): `a6aacaa51f925ecc70a20bfe087dfc3c3451e282`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[55]`
- Mesh `Male_Body`: 7567 vertices, 11038 triangles.
- Embedded images: PNG 2048x2048 RGB.

### anata/male / Chest/hard_leather_armor.vrm

- URL: https://m3-org.github.io/loot-assets/anata/male/Chest/hard_leather_armor.vrm
- Path: `/tmp/m3-asset-inspect/male-Chest-hard_leather_armor.vrm`
- Bytes: `1341404`
- SHA-256: `32055fdecf8ee44f5f6af7af73e7318d01b29ddfa2c6e0669fd2930540919e74`
- Git blob SHA-1 (verified): `63e45302239506539f940fc57dd86fbb3d36e1d4`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[55]`
- Mesh `Male_Body.004`: 1402 vertices, 1916 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.

### anata/male / Chest/robe.vrm

- URL: https://m3-org.github.io/loot-assets/anata/male/Chest/robe.vrm
- Path: `/tmp/m3-asset-inspect/male-Chest-robe.vrm`
- Bytes: `1962276`
- SHA-256: `4fa263a7b11afcbc6d751f4d0a512b6c5c96d4a732aab45ba1895a9838dec564`
- Git blob SHA-1 (verified): `b2c0f08817f58e1c36c492924a6879f26b491768`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[55]`
- Mesh `Male_Body.010`: 3126 vertices, 5372 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.

### anata/male / Shoes/leather_boots.vrm

- URL: https://m3-org.github.io/loot-assets/anata/male/Shoes/leather_boots.vrm
- Path: `/tmp/m3-asset-inspect/male-Shoes-leather_boots.vrm`
- Bytes: `1099364`
- SHA-256: `3e9e780a26eb5ee0794c37a0b775e1eca9fe467214f0c8884fad061a7035b558`
- Git blob SHA-1 (verified): `fe89b86e4dbad5b9f5e1c48e11088400b6f4546e`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[55]`
- Mesh `Male_Body.021`: 1444 vertices, 1434 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.

### anata/male / Waist/leather_belt.vrm

- URL: https://m3-org.github.io/loot-assets/anata/male/Waist/leather_belt.vrm
- Path: `/tmp/m3-asset-inspect/male-Waist-leather_belt.vrm`
- Bytes: `1551316`
- SHA-256: `8b358c629e9312d4532faa426a7b9d66c443ee4f7fc8d76dd3b897f494a26903`
- Git blob SHA-1 (verified): `596f7af0a35d114bb0d26601fbdf74b114d734cd`
- Filesystem mode: `0o644`
- VRM: `0.0`; skin joints: `[55]`
- Mesh `Male_Body.032`: 2407 vertices, 2228 triangles.
- Embedded images: JPEG 1024x1024 RGB, JPEG 1024x1024 RGB, JPEG 1024x1024 RGB.
