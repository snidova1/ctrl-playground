# Verifikasi avatar customization

Diverifikasi 2026-10-21 (WSL), repo `/home/celeng/ctrl-cloudflare-staging`. Tidak menjalankan build/browser, commit, deploy, atau mengubah server lama di port 3168.

## Hasil nyata

| Pemeriksaan | Hasil |
| --- | --- |
| Lima file tes awal | **29 PASS, 2 FAIL**; selesai 49,97 detik, bukan timeout |
| Delapan file tes setelah koreksi/cakupan tambahan | **52 PASS, 0 FAIL**, 8/8 file, 70,23 detik, exit 0 |
| `node_modules/.bin/tsc --noEmit` | **PASS**, sebelum dan setelah perubahan, exit 0 |
| ESLint 16 file terkait (perintah di bawah) | **PASS**, exit 0, tanpa diagnostik |
| ESLint seluruh repo | **FAIL**, exit 1: **375 error, 16.579 warning**; tidak dibenahi di luar lingkup |
| Delapan file VRM lokal vs provenance | **PASS**: keberadaan, ukuran, SHA-256, container, budget 20 MiB, embedded license, self-contained |
| Empat file desktop vs unduhan ulang source URL | **PASS**, SHA-256 identik untuk semua sumber |
| Empat pasangan desktop/mobile | **PASS**: manifest meshes, skins, seluruh extensions termasuk metadata/expression identik |

Tes final:

- `habitat.test.ts`: 10 PASS.
- `public-world-profile.test.ts`: 10 PASS.
- `avatar-customization.test.ts`: 11 PASS.
- `vrm-character.test.ts`: 6 PASS.
- `character-binary-cache.test.ts`: 3 PASS.
- `vroid-live-default.test.ts`: 5 PASS.
- `common-ground-lobby.test.ts`: 4 PASS.
- `character-appearance.test.ts`: 3 PASS.

```sh
timeout 120s node_modules/.bin/vitest run \
  tests/unit/character-appearance.test.ts \
  tests/unit/avatar-customization.test.ts \
  tests/unit/public-world-profile.test.ts \
  tests/unit/habitat.test.ts \
  tests/unit/common-ground-lobby.test.ts \
  tests/unit/vroid-live-default.test.ts \
  tests/unit/vrm-character.test.ts \
  tests/unit/character-binary-cache.test.ts --maxWorkers=1

timeout 100s node_modules/.bin/tsc --noEmit

timeout 70s node_modules/.bin/eslint \
  features/plaza/characters/{catalog,accessories,appearance,loader}.ts \
  features/plaza/characters/vrm-avatar.tsx \
  features/habitat/{appearance-controls,character-creator-preview,avatar-studio}.tsx \
  domain/habitat.ts server/habitat/service.ts \
  tests/unit/{avatar-customization,character-appearance,public-world-profile,habitat,common-ground-lobby,vroid-live-default}.test.ts

# Pemeriksaan global; hasilnya gagal, jangan dilaporkan hijau:
timeout 100s node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next
```

Log sesi: `/tmp/avatar-verification-tests.log` (awal), `/tmp/avatar-verification-tests-final.log`, `/tmp/avatar-verification-types-final.log`, `/tmp/avatar-verification-lint-final.log`, `/tmp/avatar-verification-lint-full.log`. Warning SQLite experimental muncul, tidak menggagalkan tes.

## Diagnosis dan perubahan terbatas

- Kegagalan awal `habitat.test.ts`: tes mengunci model male ke signature, padahal randomisasi kini sah memilih `ctrl-anime-male-studio`. Assertion diperbaiki berdasarkan `lookId`, bukan mematikan varian.
- Kegagalan awal `public-world-profile.test.ts`: tes mengharapkan JSON enam field persis; normalisasi kini menambahkan default dekorasi. Ekspektasi eksplisit menggunakan default; field identitas lama tetap sama. Assertion lama lain dalam tes Habitat yang semula belum tercapai juga dikoreksi.
- Tambah `tests/unit/avatar-customization.test.ts`: migrasi save v1 tanpa aksesori kejutan; perbaikan satu field rusak tanpa reroll; 256 seed deterministik berbeda yang mencakup seluruh pilihan dekorasi; validasi allowlist schema; seluruh aksesori menghasilkan mesh pada bone yang benar; reuse/disposal dan rest correction; pergantian expression tanpa akumulasi; tint MToon tidak kumulatif; seluruh varian/quality cocok dengan provenance.
- Tambah tes API sungguhan dengan EOA signature dan SQLite: model studio, semua kategori aksesori, warna dan expression tersimpan/reload/rename identik; public profile tetap tidak membuat Habitat. Semua field dekorasi menolak URL/ID asing. Randomisasi Habitat juga tetap identik setelah rename/reload.
- `catalog.ts`: URL provenance dua studio diperbaiki agar menunjuk file sumber yang tepat, bukan mewarisi tautan HairSample male.
- `public/plaza/characters/anime/LICENSE.md`: lengkapi dua varian studio yang sebelumnya tidak tercantum, bedakan female signature berlisensi VRM Public License dari studio CC0, dan jelaskan keterbatasan atribusi mirror.
- Tidak ditemukan regresi runtime yang memerlukan redesign pada accessories/appearance/loader/VRM renderer. File-file tersebut dibaca dan diuji pada lingkup di atas; bukan klaim sudah lolos visual/browser.

Lint global mencakup error React hooks/ref pada `app/preview/page.tsx`, `features/habitat/mobile-scene.tsx`, stylized environment, worldgacha, serta banyak bundle `public/worlds/neighborhood/app/`. Contoh tiga file pertama yang diperiksa tidak memiliki perubahan Git pada saat audit. Tidak mengubah lint config, bundle, mobile joystick, atau dirty file lain untuk menyembunyikan kegagalan global.

## Aset dan batas klaim

Delapan file yang benar-benar ada dan hash-nya cocok: `female.vrm`, `female-mobile.vrm`, `male.vrm`, `male-mobile.vrm`, `female-studio.vrm`, `female-studio-mobile.vrm`, `male-studio.vrm`, `male-studio-mobile.vrm` di `public/plaza/characters/anime/`.

- Female signature: official pixiv `VRM1_Constraint_Twist_Sample.vrm`, embedded VRM Public License 1.0; everyone, corporate commercial usage, redistribution, modification/redistribution diizinkan.
- Male signature: `HairSample_Male.vrm`; female studio: `HairSample_Female.vrm`; male studio: `Sakurada_Fumiriya.vrm`. Ketiganya dari mirror `madjin/vrm-samples`, embedded CC0/Everyone/commercial Allow. Author embedded ketiganya kosong: kesesuaian mirror dan metadata bukan verifikasi independen kepemilikan uploader.
- URL lengkap, SHA-256 lengkap dan byte count tetap di `provenance.json`; semuanya dicek ulang tanpa menulis ulang binary aset.
- Cakupan nyata saat ini **dua set rambut+kostum authored per gender**, berpasangan, bukan pemilihan mesh rambut dan kostum secara independen. Pilihan wajah adalah expression/morph preset dan tint mata/kulit, bukan katalog bentuk wajah baru. Aksesori adalah geometri tambahan, bukan pengganti tubuh/avatar prosedural.
- Tes aksesori memakai fixture bone Three.js dan expression manager nyata tanpa WebGL. Pemeriksaan manifest/hash bukan pengganti load/render browser. Parent masih perlu build/browser untuk fitting aksesori, tampilan empat model, animasi, mobile joystick, dan perilaku UI; server 3168 belum mencerminkan perubahan ini.
