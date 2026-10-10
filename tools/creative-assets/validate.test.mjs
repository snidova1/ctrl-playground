import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRepo,validateCreativeAssets,validateUpstreamEvidence,extractLiveCatalogIds,loadJSON} from './validate.mjs';
import {readFileSync} from 'node:fs';
const input=()=>['creative-assets/sources.json','creative-assets/customization-contract.json','creative-assets/world-presets.json'].map(f=>structuredClone(loadJSON(f)));
const catalog=extractLiveCatalogIds(readFileSync('features/plaza/build-assets.ts','utf8'));
test('registry uses actual 991 Kenney models and three ready scene seeds',()=>{const info=validateRepo();assert.equal(info.existingModels,991);assert.ok(info.sources>=38);assert.equal(info.templates,3);});
test('VRM avatars never inherit a blanket CC0 permission',()=>{const [r,c,p]=input();r.sources.find(s=>s.category==='user-avatar').rightsReview='source-license-file-needed';assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/VRM requires per-avatar permission/);});
test('Mixamo raw files may not be mirrored as an unreviewed asset pack',()=>{const [r,c,p]=input();r.sources.find(s=>s.sourceKind==='account-gated').rightsReview='source-license-file-needed';assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/Do not redistribute/);});
test('Quaternius 2026 policy review cannot be skipped',()=>{const [r,c,p]=input();r.sources[0].rightsReview='source-license-file-needed';assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/QAL 2026/);});
test('unapproved remote GLB in template rejected',()=>{const [r,c,p]=input();p.templates[0].objects[0].assetId='https://evil.example/object.glb';assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/Unknown current CTRL catalog model/);});
test('VRM direct modular rig swap forbidden',()=>{const [r,c,p]=input();c.avatarFamilies[0].canUseQuaterniusPartsDirectly=true;assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/Cannot attach Quaternius/);});
test('out-of-bounds world object rejected',()=>{const [r,c,p]=input();p.templates[0].objects[0].x=30;assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/Coordinate out of bounds/);});
test('duplicate source IDs rejected',()=>{const [r,c,p]=input();r.sources.push({...r.sources[0]});assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/duplicate IDs/);});

test('six official CC0 KayKit license files pinned to immutable hashes',()=>{const [r]=input();const e=loadJSON('creative-assets/upstream-license-evidence.json');assert.equal(validateUpstreamEvidence(e,r),6);});
test('tampered upstream license receipt is rejected',()=>{const [r]=input();const e=loadJSON('creative-assets/upstream-license-evidence.json');e.upstreams[0].licenseBlobSha='not-verified';assert.throws(()=>validateUpstreamEvidence(e,r),/commit and blob SHA/);});
test('audio and VFX pack coverage cannot disappear',()=>{const [r,c,p]=input();r.sources=r.sources.filter(s=>s.category!=='audio');assert.throws(()=>validateCreativeAssets(r,c,p,catalog),/Missing audio/);});
