# Donor rambut authored CC0 (bukan avatar lengkap)

- `cc0-shino-long`: rambut panjang Sendagaya Shino; 16.750 triangle, 49 mesh runtime.
- `cc0-shibu-bob`: bob Sendagaya Shibu; 19.934 triangle, 47 mesh runtime.
- Keduanya lulus CPU pada `ctrl-anime-female-studio` dan `ctrl-anime-male`, high/low. Jangan aktifkan pada female signature.
- URL: `/plaza/characters/hairstyles/<id>.vrm`; low: `<id>-mobile.vrm`.
- High: Shino 1.830.000 byte, Shibu 2.025.884 byte. Low: 1.384.608 / 1.545.656 byte. Tekstur maksimum 512 / 256 px.

## Wiring oleh parent

Tambahkan kedua ID ke katalog/persistensi dan allowlist target di registry. Loader perlu menerima URL/path donor dari direktori **hairstyles**, bukan selalu membentuk path anime. Kedua target memakai donor yang sama; tidak membutuhkan offset manual, fit dihitung oleh `authoredFaceBounds` + `attachAuthoredHair` yang ada. Pertahankan guard scale .85–1.18 dan namespace runtime `CTRLHairDonor::` pada SEMUA node, termasuk normalized bones hasil VRMLoaderPlugin. Jangan menjalankan humanoid/spring animation donor. Normalized bones tidak tersedia dalam file sebelum plugin membentuknya.

Fit scale high/low sama:

| ID | female-studio XYZ | male XYZ |
|---|---|---|
| cc0-shino-long | .9954854,.9954859,.9954850 | 1.0288635,1.0475972,1.0067922 |
| cc0-shibu-bob | 1.0119250,1.0000005,1.0068850 | 1.0458543,1.0523481,1.0183217 |

`cpu-fit-results.json` berisi shift/bounds presisi. Calibration face asli dipertahankan hanya untuk fitting; attachment production mengeluarkannya dari scene hidup. Body/kostum/mata tidak dipublikasikan. 60 triangle seam scalp berbobot neck dipangkas per donor; tidak me-reweight rambut ke target. Duplicate influences source lama digabung dan dinormalisasi; rest transforms, joint hierarchy, humanoid metadata, inverse binds, posisi dan UV tetap source.

## Bukti dan reproduksi

`provenance.json`: SHA-256 sumber dicocokkan dengan metadata lokal `scripts/assets/cc0-costumes/<source>/provenance.json`; embedded CC0 / Everyone / commercial Allow diverifikasi. URL artikel lisensi resmi dan mirror disimpan.

```sh
python3 scripts/assets/prepare-authored-hairstyles.py
node scripts/assets/validate-authored-hairstyles.mjs
node node_modules/vitest/vitest.mjs run tests/unit/avatar-cc0-authored-hairstyles.test.ts tests/unit/avatar-hairstyles.test.ts --reporter=verbose
python3 scripts/assets/preview-authored-hairstyles.py
```

Hasil aktual: **2 files, 16 tests passed**, termasuk 8 kasus donor baru; head rotation, fit bounds, referensi geometry/UV/weights/binds, face/body tidak masuk donor render, AnimationMixer arm tetap mengikat target bukan donor. Khronos: **4/4 VRM 0 error**, 51–53 warning legacy/unused nodes (lihat `gltf-validation.json`). Validator memerlukan package `gltf-validator` di `GLTF_VALIDATOR_DIR`, default cache `/tmp/ctrl-costume-candidates/validator`. Preparation memakai cache source asli dari provenance; numpy/Pillow diperlukan.

`authored-geometry-contact.jpg` adalah raster CPU source triangles/UV, bukan screenshot browser atau bukti collision badan. Material toon source mempertahankan warna shader; preview CPU tidak mengevaluasi MToon. Rambut panjang mengikuti head secara statis sesuai kontrak pipeline; collision bahu dalam animasi ekstrem belum diverifikasi. Tidak ada build/browser/server/commit/deploy atau perubahan file integrasi.
