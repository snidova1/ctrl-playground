# Audit source tiga repo untuk avatar CTRL

Diperiksa dari remote GitHub pada **2026-10-20 UTC** (jam sistem lingkungan audit). Ini audit kode, bukan klaim integrasi. Hanya dokumen ini yang ditambahkan; file aplikasi milik worker creator/catalog/accessories tidak disentuh. Tidak mengunduh VRM/GLB/FBX/VRMA, tidak mengimpor aplikasi AI, dan tidak menjalankan aplikasi upstream.

## Revisi dan lisensi yang benar-benar dibaca

Tree rekursif dan commit default branch diambil melalui GitHub API, lalu source teks diambil dari `raw.githubusercontent.com` menggunakan SHA berikut, bukan hanya README. Ketiga tree tidak terpotong.

| Repo | Branch / SHA yang diaudit | Lisensi source dan pemilik notice |
| --- | --- | --- |
| M3-org/CharacterStudio | `main` / `293182bf4a6087f4a4a7fd00e4fbdfb590029da7` | [MIT — © 2022 Atlas Foundation](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/LICENSE) |
| moeru-ai/airi | `main` / `bc41885f0bfb3483a93833f4bcfbc8ad3afe483d` | [MIT — © 2024-PRESENT Neko Ayaka](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/LICENSE) |
| semperai/amica | `master` / `ca2415c77d20ec41dd4fcf917dbb0e97961ddf08` | [MIT — © 2023 Semper AI, pixiv Inc.](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/LICENSE) |

Jika menyalin bagian kode substansial, sertakan copyright dan teks izin MIT masing-masing, misalnya dalam notice pihak ketiga. **Lisensi source tidak otomatis memberi izin model, pakaian, rambut, tekstur, maupun motion.** Batas redistribusi model M3 yang dilaporkan pada konteks pekerjaan tetap berlaku; audit ini tidak memverifikasi ulang biner model dan tidak memberi clearance aset tersebut.

## 1. CharacterStudio → slot customization, pilihan mesh, random kompatibel

### Teramati pada kode

- [CharacterManifestData.js:31–106](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/CharacterManifestData.js#L31-L106): `CharacterManifestData` memisahkan `requiredTraits`, `randomTraits`, dan `initialTraits`; default awal adalah union required + random.
- [CharacterManifestData.js:769–897](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/CharacterManifestData.js#L769-L897): `TraitModelsGroup` berisi `collection`, `collectionMap`, `isRequired`, `cameraTarget`, dan culling. `getRandomTrait()` mengambil satu item dari `getCollection(lockFilter, false)`; item terkunci/tidak tersedia tidak ikut undian. Ini filter akses aplikasi, **bukan** pemeriksaan legal aset.
- [CharacterManifestData.js:422–430](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/CharacterManifestData.js#L422-L430): `getRandomTrait(groupTraitID)` menghasilkan `SelectedOption(trait, traitTexture, traitColor)`. Random model/mesh terpisah dari texture/color; tidak sekadar mengganti tint.
- [CharacterManifestData.js:1180–1258](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/CharacterManifestData.js#L1180-L1258): `ModelTrait` memiliki direktori aset, thumbnail, tipe, `restrictedItems`, collection texture/color/decal dan `blendshapeTraits`; `isRestricted()` menguji aturan antar-trait/type.
- [manifestDataManager.js:409–443](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/manifestDataManager.js#L409-L443): `getRandomTrait()` memilih dari kandidat tiap manifest; `getRandomTraits()` mengumpulkan slot, lalu memanggil [_filterTraitOptions():550–572](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/manifestDataManager.js#L550-L572), filter greedy terhadap pilihan yang sudah diterima.
- [manifestRestrictions.js:68–115](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/manifestRestrictions.js#L68-L115): `_setupSpecificItemRestrictions()` membangun map konflik item dan menambahkan relasi balik. [characterManager.js:739–797](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/characterManager.js#L739-L797): `_checkRestrictionsBeforeLoad()` membuang slot/item/type yang menghalangi sebelum `loadTrait()`.
- [characterManager.js:1022–1107](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/characterManager.js#L1022-L1107): `_loadTraits()` mengaplikasikan hasil load dan memanggil `cullHiddenMeshes`; `_loadBlendShapeTrait()` / `toggleBinaryBlendShape()` mengganti morph yang memang ada di mesh.
- [characterManager.js:1649–1732](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/characterManager.js#L1649-L1732): `_disposeTrait()` unregister blink/emotion/look-at/animation lalu dispose; `_addLoadedData()` mengganti `avatar[traitGroupID]` dan mendaftarkan model baru. [TraitLoadingManager.loadTraitOptions():1769–1817](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/characterManager.js#L1769-L1817) memuat model, texture, color secara terpisah.
- [vrmMetaUtils.js:76–126](https://github.com/M3-org/CharacterStudio/blob/293182bf4a6087f4a4a7fd00e4fbdfb590029da7/src/library/vrmMetaUtils.js#L76-L126): penggabungan metadata mempertahankan `allowRedistribution === false` dan pembatasan komersial; mekanisme merge bukan izin untuk mendistribusi.

### Pemetaan yang disarankan untuk CTRL — belum diterapkan oleh audit

`catalog.ts` menjadi manifest ringan berisi slot/item stabil: `assetId`, `slot`, `thumbnail`, `compatibleBodies`, `conflictsWith`, serta provenance/izin. Pisahkan `hairStyleId`/`costumeId` (geometri) dari `hairId`/`variantId` (warna), dan `faceShapeId` (morph/geometri) dari `expressionId` (pose wajah). Simpan ID yang sudah dinormalisasi, bukan Object3D/URL bebas. Creator memakai katalog yang sama dengan loader, world, dan random.

Pertahankan PRNG seed milik CTRL, lalu filter kompatibilitas sebelum draw per-slot dan validasi hasil akhir; tambahkan fallback agar required body/head tidak hilang. Gunakan pola replace/dispose per-slot untuk aksesori rigid; rambut/pakaian skinned perlu aset rig-compatible yang diautor/difit. Tidak bisa mencopot rambut/outfit dari sembarang VRM utuh secara aman hanya dengan manifest.

**Batas penting:** random upstream menggunakan `Math.random()`, bukan seed; pemilihan antar-manifest tidak menjamin uniform antar-semua-item. Cabang `if/else` di `getRandomTraits()` sama-sama overwrite. Filter greedy dapat menghapus pilihan tanpa backtracking/refill; jangan disalin sebagai constraint solver yang terjamin benar. Model M3 terlarang tidak dipakai. Arsitektur ini tidak dengan sendirinya menyediakan banyak kostum/rambut legal baru.

## 2. AIRI → emote halus, kepemilikan morph, blink yang tidak tersangkut

### Teramati pada kode VRM, bukan hanya Live2D

- [expression.ts:15–100](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/expression.ts#L15-L100): `useVRMEmote()` mendefinisikan state happy/sad/angry/surprised/neutral/think/relaxed dengan bobot dan `blendDuration`, bukan mengganti wajah menjadi gambar statis.
- [expression.ts:102–205](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/expression.ts#L102-L205): `ownedExpressionNames()`, `trackedExpressionNames`, `setEmotion()`, `setEmotionWithResetAfter()` mempertahankan nilai awal, menargetkan morph milik emote saja, cocok nama case-insensitive, clamp intensitas, dan reset terjadwal.
- [expression.ts:207–355](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/expression.ts#L207-L355): `isEmoteActive` mengabaikan state mouth-only; `update(deltaTime, {skipVisemes})` memberi prioritas lip-sync pada aa/ee/ih/oh/ou, tetap memajukan transisi, dan menulis target terminal (termasuk 0) sebelum melepas ownership saat neutral. `dispose()` membersihkan timeout pada [baris 365–380](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/expression.ts#L365-L380).
- [animation.ts:92–152](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/animation.ts#L92-L152): `useBlink()` memakai kurva sinus 0,2 detik dan interval acak 1–6 detik. `update(vrm, delta, {suppress})` tetap menjalankan siklus ketika emote menguasai mata, menahan blink di 0 sampai siklus selesai agar tidak muncul kelopak setengah tertutup ketika suppression dilepas.
- [animation.ts:18–89](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/animation.ts#L18-L89): `loadVRMAnimation()`, `clipFromVRMAnimation()` menggunakan API `@pixiv/three-vrm-animation`; `reAnchorRootPositionTrack()` mengikat posisi ke hips **lokal**, bukan world-space, sehingga parent transform tidak diterapkan dua kali. Fungsi ini memutasi clip dan menggeser semua position tracks: clone dan evaluasi rig sebelum menggunakan.
- [VRMModel.vue:462–520](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/components/Model/VRMModel.vue#L462-L520): urutan aktual mixer → humanoid/look-at → blink → lip-sync → emote → expression update → constraints → spring bones; status lip-sync dibaca sesudah update lip-sync.
- Bukti regresi yang bisa diadaptasi: [animation.test.ts:154–230](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/animation.test.ts#L154-L230) menguji suppress mid-blink/between-blinks/release; [expression.test.ts:36–249](https://github.com/moeru-ai/airi/blob/bc41885f0bfb3483a93833f4bcfbc8ad3afe483d/packages/stage-ui-three/src/composables/vrm/expression.test.ts#L36-L249) menguji hold, mouth-only, state dihapus sebelum reset, speech handoff dan terminal neutral. Test upstream dibaca, **tidak dijalankan** dalam audit ini.

### Pemetaan yang disarankan — belum diterapkan oleh audit

Buat controller TS kecil, bukan mengimpor Vue/Pinia/TresJS: `setExpression(id, intensity)`, `update(dt)`, `dispose()`. Hubungkan ke `HumanoidAnimator` agar wajah persisten dan blink punya satu penulis per-channel; panggil update expression/blink setelah mixer dan sebelum `vrm.update(fixedStep)` yang sudah ada. Tidak perlu menyalin pipeline manual AIRI lalu juga memanggil `vrm.update()` karena akan double-update.

Pertahankan ekspresi creator sebagai baseline persisten; emote interaksi sementara kembali ke baseline tersebut, bukan selalu neutral. Suppress blink hanya bila morph aktif memengaruhi mata. Tawarkan hanya morph yang ada pada `expressionManager.expressionMap`/`getExpression()`; state upstream `think` atau `surprised` tidak dijamin ada pada model CTRL. Morph wajah/face-shape baru perlu diautor; controller tidak menciptakannya.

## 3. Amica → controller kecil dan lifecycle gesture/ekspresi

### Teramati pada kode

- [autoBlink.ts:7–63](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/emoteController/autoBlink.ts#L7-L63): `AutoBlink` menyimpan waktu tersisa/open/enabled. `setEnable(false)` mengembalikan waktu sampai mata terbuka; update tetap bisa membuka kelopak. [emoteConstants.ts](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/emoteController/emoteConstants.ts) menetapkan closed 0,12 detik/open 5 detik. Ini blink biner, **bukan** random/sinus AIRI.
- [expressionController.ts:37–103](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/emoteController/expressionController.ts#L37-L103): `registerExpression()` menemukan preset/custom expression, `playEmotion()` mengosongkan ekspresi lama dan menunda ekspresi baru sampai blink terbuka; neutral mengaktifkan blink kembali. Bobot surprised/custom 0,5; preset lain 1. `lipSync()` reset viseme sebelumnya; update mengurangi bobot mulut saat non-neutral.
- [model.ts:276–309](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/vrmViewer/model.ts#L276-L309): `Model.loadAnimation()` menerima `AnimationClip` atau `VRMAnimation.createAnimationClip(vrm)`; `fadeToAction()` fade-out action lama dan reset/fade-in baru. [playAnimation():368–406](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/vrmViewer/model.ts#L368-L406) memakai `LoopOnce`, `clampWhenFinished`, lalu listener `finished` mengembalikan idle; [update():425–436](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/vrmViewer/model.ts#L425-L436) meng-update emote, mixer, lalu VRM.

### Pemetaan yang disarankan — belum diterapkan oleh audit

Ambil **kontrak controller kecil + open-eye handoff dan one-shot/restore**, bukan stack chat/TTS/provider Amica. Implementasi CTRL dapat menggunakan model arbitration AIRI yang lebih halus untuk memenuhi tujuan yang sama, bukan memasang dua blink controller. Tambahkan gesture sementara yang restore ke state locomotion aktif (bukan selalu idle), serta capability list expression per-model untuk creator.

**Jangan salin mentah:** `playEmotion()` memakai `setTimeout` tanpa pembatalan pada pergantian cepat/unmount; `registerExpression()` memodifikasi array global `emotionNames` sehingga dedup perlu ditangani. Listener `finished` tidak memeriksa action pemicu; concurrency memerlukan filter `event.action`/token dan cleanup. [modifyAnimationPosition():312–365](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/vrmViewer/model.ts#L312-L365) memutasi clip dengan heuristic nama/weight, jangan dipakai sebagai retargeting umum.

Dua batas tambahan berdasarkan pembacaan source: [loadMixamoAnimation.ts:25–30](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/lib/VRMAnimation/loadMixamoAnimation.ts#L25-L30) saat ini menetapkan `hipsPositionScale = 0` (jadi bukan contoh retarget translasi yang siap pakai). [ProceduralAnimation.update():15–39](https://github.com/semperai/amica/blob/ca2415c77d20ec41dd4fcf917dbb0e97961ddf08/src/features/proceduralAnimation/proceduralAnimation.ts#L15-L39) menimpa rotasi spine/neck/arm/leg secara absolut; tidak cocok ditumpuk pada animasi jalan/duduk CTRL. Tidak ada kebutuhan mengganti avatar authored dengan boneka prosedural.

## Snapshot CTRL dan tindak lanjut kecil bernilai tertinggi

File lokal dibaca ketika worker lain aktif; ini observasi source sesaat, **bukan** hasil build/runtime atau atribusi bahwa kode lokal berasal dari repo di atas:

- `features/plaza/characters/catalog.ts`: sudah ada `CharacterAppearance`, `authoredLooks`, katalog aksesori, `seededAppearance()`, `normalizeAppearance()`, `resolveCharacter()`. Warna rambut/outfit adalah tint; `lookId` memilih paket authored utuh, belum slot rambut/outfit yang independen.
- `appearance.ts` / `accessories.ts`: `applyCharacterAppearance()` memanggil aksesori dan ekspresi. `applyCharacterExpression()` saat dibaca menulis beberapa preset langsung; belum terlihat transisi/ownership seperti AIRI. Aksesori lokal adalah attachment tambahan, bukan pengganti mesh badan.
- `animation.ts`: `HumanoidAnimator` sudah punya mixer, crossfade, state locomotion dan fixed-step; blink sinus deterministik ditulis di loop yang sama sebelum `vrm.update()`. Ini titik hook controller wajah, bukan alasan mengganti keseluruhan animasi.
- `vrm-avatar.tsx`: load/dispose dan pemanggilan appearance sudah terpusat. Jangan mengedit file-file ini paralel dengan worker pemiliknya.

| Prioritas | Tindak lanjut yang disarankan | Landasan dan penerimaan |
| --- | --- | --- |
| P0 — konten nyata | Perluas katalog **aset legal authored** dengan rambut/kostum berbeda geometri atau export utuh tambahan; tampilkan thumbnail/nama dan bedakan tint dari mesh. Tambahkan body compatibility + conflict + provenance. | CharacterStudio manifest/slot. Memilih opsi benar-benar mengubah siluet/mesh, bukan label atau warna saja; skinning dan clipping diuji. Ini kebutuhan konten, tidak terpenuhi oleh audit arsitektur. |
| P1 — wajah | Adapter TS controller emote/blink tunggal; capability filtering, blend dari bobot saat ini, baseline persisten, suppress-mid-blink, neutral terminal dan cleanup. | AIRI algoritme/transisi/test + Amica open-eye handoff/lifecycle. Uji smile→sad→baseline saat blink, pergantian cepat/unmount, model tanpa morph dan avatar berbeda tidak sinkron berkedip. Jangan jalankan dua penulis blink. |
| P1 — random | Pertahankan `seededAppearance()`; draw hanya item legal/compatible dan validasi ulang hasil normalisasi termasuk required slots. | CharacterStudio pengelompokan/model–texture–color dan conflict map, bukan salin `Math.random`/greedy bug. Seed sama menghasilkan ID sama; item konflik/terlarang tidak pernah lolos; save lama tetap terbaca. |
| P2 — gesture | Tambahkan satu one-shot gesture dari motion berizin, memakai token/listener `finished` terfilter dan restore state berjalan/duduk terbaru. Jika impor VRMA, gunakan API Pixiv dan clone clip sebelum reanchor lokal. | Amica one-shot/fade/restore + AIRI local-root anchor. Uji gesture disela jalan/duduk, event dari action lain, model swap dan parent rotation/scale. |

**Status akhir audit:** ketiga repo benar-benar dibaca dan dipetakan dengan bukti source. Tidak ada fitur dari ketiganya yang diklaim telah diintegrasikan oleh pekerjaan audit ini. Implementasi dan bukti visual/runtime harus dilaporkan terpisah oleh worker aplikasi. Tidak mengklaim lisensi aset lokal/upstream telah diverifikasi menyeluruh.

## Implementasi sesudah audit
Pola runtime P1 wajah dan P2 gesture sekarang sudah diterapkan pada shared renderer CTRL, bukan impor seluruh aplikasi upstream. Implementasi, hasil full suite 373 tes, build production, browser desktop/touch, swap model, serta signed Habitat kedua family dicatat terpisah di [avatar-gesture-polish-qa.md](avatar-gesture-polish-qa.md). Status historis audit di atas bukan lagi daftar fitur runtime yang masih belum dikerjakan. Clearance aset dan deployment tetap hal terpisah.
