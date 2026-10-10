import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, renameSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditBuildAssets } from '../../scripts/qa/check-build-assets.mjs';

function glb(animations = ['open']) {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, animations: animations.map(name => ({ name })) }));
  const padding = (4 - json.length % 4) % 4;
  const chunk = Buffer.concat([json, Buffer.alloc(padding, 0x20)]);
  const header = Buffer.alloc(20);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + chunk.length, 8);
  header.writeUInt32LE(chunk.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, chunk]);
}

function webp(width = 120, height = 100) {
  const data = Buffer.alloc(30);
  data.write('RIFF', 0);
  data.writeUInt32LE(22, 4);
  data.write('WEBPVP8X', 8);
  data.writeUInt32LE(10, 16);
  data.writeUIntLE(width - 1, 24, 3);
  data.writeUIntLE(height - 1, 27, 3);
  return data;
}

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ctrl-assets-'));
  const target = path.join(root, 'public/plaza/build-kit/mini-kit');
  mkdirSync(path.join(target, 'thumbs'), { recursive: true });
  mkdirSync(path.join(root, 'features/plaza'), { recursive: true });
  const modelPath = path.join(target, 'tree.glb');
  const thumbPath = path.join(target, 'thumbs/tree.webp');
  const model = glb();
  writeFileSync(modelPath, model);
  writeFileSync(thumbPath, webp());
  writeFileSync(path.join(target, 'License.txt'), 'Creative Commons Zero (CC0)');
  const entry = { id: 'mini-kit/tree', name: 'Tree', category: 'nature', url: '/plaza/build-kit/mini-kit/tree.glb', thumbnailUrl: '/plaza/build-kit/mini-kit/thumbs/tree.webp', bounds: [1, 2, 1], center: [0, 1, 0], groundOffset: 0, collision: 'solid', sourcePack: 'mini-kit', bytes: model.length, animationClips: ['open'] };
  const catalogPath = path.join(root, 'features/plaza/build-assets.ts');
  const store = item => writeFileSync(catalogPath, "export const BUILD_ASSET_CATEGORIES = ['nature'] as const;\nexport const BUILD_ASSETS: readonly BuildAsset[] = [\n" + JSON.stringify(item) + '\n];\n');
  store(entry);
  writeFileSync(path.join(root, 'public/plaza/build-kit/provenance.json'), JSON.stringify({ license: 'CC0-1.0', assetCount: 1, packs: [{ pack: 'mini-kit', category: 'nature', count: 1, archiveSha256: 'a'.repeat(64), source: 'https://kenney.nl/assets/mini-kit' }] }));
  return { root, target, modelPath, thumbPath, entry, store, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function withFixture(fn) {
  const item = fixture();
  try { fn(item); } finally { item.cleanup(); }
}

test('baseline audit checks real files and produces deterministic counters', () => withFixture(f => {
  const report = auditBuildAssets(f.root);
  assert.deepEqual(report.errors, []);
  assert.equal(report.ok, true);
  assert.equal(report.assets, 1);
  assert.equal(report.models, 1);
  assert.equal(report.thumbnails, 1);
  assert.equal(report.packs['mini-kit'].count, 1);
}));

test('detects a missing thumbnail and a stray unlisted model', () => withFixture(f => {
  rmSync(f.thumbPath);
  writeFileSync(path.join(f.target, 'rogue.glb'), glb());
  const errors = auditBuildAssets(f.root).errors.join('\n');
  assert.match(errors, /Missing thumbnail/);
  assert.match(errors, /Unlisted model\/thumbnail/);
}));

test('detects metadata byte tampering and duplicate identifiers', () => withFixture(f => {
  const entry = { ...f.entry, bytes: 1 };
  f.store(entry);
  assert.match(auditBuildAssets(f.root).errors.join('\n'), /Catalog GLB byte mismatch/);
  const sourcePath = path.join(f.root, 'features/plaza/build-assets.ts');
  writeFileSync(sourcePath, readFileSync(sourcePath, 'utf8').replace('\n];', ',\n' + JSON.stringify(entry) + '\n];'));
  assert.match(auditBuildAssets(f.root).errors.join('\n'), /Duplicate asset ID/);
}));

test('blocks a remote or path-traversing model URL', () => withFixture(f => {
  f.store({ ...f.entry, url: 'https://untrusted.example/model.glb' });
  assert.match(auditBuildAssets(f.root).errors.join('\n'), /Invalid local asset paths/);
}));

test('detects corrupted GLB and animation metadata disagreement', () => withFixture(f => {
  writeFileSync(f.modelPath, Buffer.from('not a model'));
  let errors = auditBuildAssets(f.root).errors.join('\n');
  assert.match(errors, /Invalid GLB/);
  writeFileSync(f.modelPath, glb(['close']));
  errors = auditBuildAssets(f.root).errors.join('\n');
  assert.match(errors, /Animation clip metadata mismatch/);
}));

test('detects thumbnails with too-large dimensions and oversized binary assets', () => withFixture(f => {
  writeFileSync(f.thumbPath, webp(161, 100));
  let errors = auditBuildAssets(f.root).errors.join('\n');
  assert.match(errors, /exceeds thumbnail dimensions/);
  const tight = { maxModelBytes: 10, maxThumbnailBytes: 10, maxCombinedKitBytes: 10, maxMobileVrmBytes: 10, maxDesktopVrmBytes: 10, maxThumbnailEdge: 160 };
  errors = auditBuildAssets(f.root, tight).errors.join('\n');
  assert.match(errors, /Oversized model/);
  assert.match(errors, /Oversized thumbnail/);
  assert.match(errors, /Combined kit exceeds budget/);
}));

test('detects provenance count mismatch and a missing license', () => withFixture(f => {
  rmSync(path.join(f.target, 'License.txt'));
  const provenancePath = path.join(f.root, 'public/plaza/build-kit/provenance.json');
  const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
  provenance.packs[0].count = 3;
  writeFileSync(provenancePath, JSON.stringify(provenance));
  const errors = auditBuildAssets(f.root).errors.join('\n');
  assert.match(errors, /Missing\/empty pack license/);
  assert.match(errors, /Pack count mismatch/);
}));

test('accepts authentic Kenney mixed-case and underscore asset names', () => withFixture(f => {
  const name = 'treeVariant_A';
  renameSync(f.modelPath, path.join(f.target, name + '.glb'));
  renameSync(f.thumbPath, path.join(f.target, 'thumbs', name + '.webp'));
  f.store({ ...f.entry, id: 'mini-kit/' + name, url: '/plaza/build-kit/mini-kit/' + name + '.glb', thumbnailUrl: '/plaza/build-kit/mini-kit/thumbs/' + name + '.webp' });
  assert.equal(auditBuildAssets(f.root).ok, true);
}));
