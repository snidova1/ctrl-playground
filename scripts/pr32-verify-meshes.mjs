/**
 * Verify the checked-in CC0 meshes offline. CI must not download or write
 * to the PR branch during a pull_request event. GitHub bot-written PR heads
 * can require approval instead of running acceptance tests.
 */
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve('public/assets/pr32');
const expected=['bakery','cottage-house','farmhouse','flower-shop','garden-shed',
 'log-cabin','cafe','willow-tree','oak-tree','cherry-blossom-tree','bush','daisy-patch'];
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
if(manifest.license!=='CC0-1.0'||!Array.isArray(manifest.models))
 throw Error('Missing explicit provenance manifest');
const slugs=manifest.models.map(m=>m.slug);
if(slugs.length!==expected.length||new Set(slugs).size!==expected.length||
 expected.some(x=>!slugs.includes(x)))throw Error('Incomplete or mismatched 12-model CC0 asset pack');
let totalBytes=0;
for(const entry of manifest.models){
 if(entry.license!=='CC0-1.0'||entry.aiContent!==false
  ||entry.origin!=='procedural'||entry.file!==entry.slug+'.glb'
  ||!/^https:\/\/grab3d\.com\//.test(entry.source)
  ||!/^https:\/\/grab3d\.com\//.test(entry.download)){
  throw Error('Model provenance mismatch: '+entry.slug);
 }
 const assetPath=path.join(root,entry.file);
 const fileStat=await stat(assetPath);
 if(fileStat.size!==entry.bytes||fileStat.size<32)throw Error('GLB size mismatch '+entry.slug);
 const bytes=await readFile(assetPath);
 if(bytes.toString('ascii',0,4)!=='glTF')throw Error('GLB magic mismatch '+entry.slug);
 const version=bytes.readUInt32LE(4),declaredSize=bytes.readUInt32LE(8);
 if(version!==2||declaredSize!==bytes.length)throw Error('GLB header invalid '+entry.slug);
 const sha=createHash('sha256').update(bytes).digest('hex');
 if(sha!==entry.sha256)throw Error('GLB sha256 changed: '+entry.slug);
 totalBytes+=bytes.length;
}
console.log('Verified',expected.length,'CC0 GLBs, bytes=',totalBytes,
 'offline, immutable, with provenance and SHA256.');
