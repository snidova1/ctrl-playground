#!/usr/bin/env node
/**
 * One-command install of a LICENSED, finished local VRM, not a modular avatar.
 *
 * Example:
 * node scripts/ingest-character-vrm.mjs --id booth-akane \
 *  --file /path/to/Akane.vrm --name Akane --gender female \
 *  --creator minto-akayama --license CC0 --source-url https://booth.pm/en/items/8861598 \
 *  --height 1.75 --rights-confirmed
 *
 * This command never downloads from a login-gated store, never modifies the
 * underlying rig, and never sells any character. It validates a self-contained
 * VRM file, records hashes and credits, installs one local model, and wires
 * it automatically into the CTRL whole-character selector/server allowlist.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';

const projectRoot=resolve(import.meta.dirname,'..');
const options=new Map();
for(let i=2;i<process.argv.length;i++){
 const arg=process.argv[i];
 if(!arg.startsWith('--'))throw new Error('Unexpected argument: '+arg);
 if(arg==='--rights-confirmed'){options.set('rights-confirmed','yes');continue;}
 const value=process.argv[++i];
 if(!value||value.startsWith('--'))throw new Error('Missing value for '+arg);
 options.set(arg.slice(2),value);
}
function need(key){const v=options.get(key);if(!v)throw new Error('Missing required --'+key);return v;}
const id=need('id'),file=resolve(need('file')),name=need('name'),gender=need('gender'),creator=need('creator'),license=need('license'),sourceUrl=need('source-url'),height=Number(need('height'));
if(!/^[a-z][a-z0-9-]{2,60}$/.test(id))throw new Error('Invalid character ID');
if(!['male','female'].includes(gender))throw new Error('Gender must be male or female for current CTRL profile schema');
if(!['CC0','CC-BY','CC-BY-4.0'].includes(license))throw new Error('License must be validated for public commercial WebGL use');
if(!/^https:\/\//.test(sourceUrl))throw new Error('HTTPS provenance URL required');
if(!Number.isFinite(height)||height<.7||height>2.5)throw new Error('Invalid target height');
if(options.get('rights-confirmed')!=='yes')throw new Error('Use --rights-confirmed ONLY after checking exact asset redistribution and in-browser commercial rights');
if(!existsSync(file))throw new Error('Local source VRM does not exist: '+file);

const rosterPath=join(projectRoot,'features/plaza/characters/requested-sources.ts');
const requested=readFileSync(rosterPath,'utf8');
if(!requested.includes("id:'"+id+"'"))throw new Error('Character ID is not one of the requested 16 source models');

const data=readFileSync(file);
const MAX=20*1024*1024;
if(data.length>MAX||data.length<28)throw new Error('VRM exceeds CTRL 20 MiB compressed browser budget (optimize first)');
if(data.toString('utf8',0,4)!=='glTF'||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length||data.toString('utf8',16,20)!=='JSON')throw new Error('Not a GLB/VRM 2.0 container');
const jsonLen=data.readUInt32LE(12);
if(jsonLen>data.length-20)throw new Error('Invalid GLB JSON chunk');
const raw=data.toString('utf8',20,20+jsonLen).trim();
const gltf=JSON.parse(raw);
if(!gltf.extensions?.VRM&&!gltf.extensions?.VRMC_vrm)throw new Error('No VRM humanoid extension');
if([...(gltf.images??[]),...(gltf.buffers??[])].some(o=>o.uri!==undefined))throw new Error('Embedded textures/buffers required; external URI blocked');
const sha256=createHash('sha256').update(data).digest('hex');
const modelUrl='/plaza/characters/'+id+'-'+sha256.slice(0,12)+'.vrm';
const target=join(projectRoot,'public'+modelUrl);
const manifestPath=join(projectRoot,'features/plaza/characters/ready-character-assets.ts');
const original=readFileSync(manifestPath,'utf8');
const marker='export const INSTALLED_CHARACTER_ASSETS: ReadonlyArray<InstalledCharacterAsset> = ';
const index=original.indexOf(marker);
if(index===-1)throw new Error('Installed manifest marker missing');
const tail=original.slice(index+marker.length);
const end=tail.indexOf(';');
if(end<0)throw new Error('Installed manifest terminator missing');
const entries=JSON.parse(tail.slice(0,end).trim());
const already=entries.find(x=>x.id===id);
if(already&&already.sha256!==sha256)throw new Error('Character ID already uses different bytes. Use a new ID/version after review');
if(already){console.log(id+' already installed ('+sha256+').');process.exit(0);}
entries.push({id,name,gender,height,sourceUrl,license,creator,modelUrl,sha256});
entries.sort((a,b)=>a.id.localeCompare(b.id));
const revised=original.slice(0,index+marker.length)+JSON.stringify(entries,null,2)+original.slice(index+marker.length+end);
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target+'.tmp',data);
renameSync(target+'.tmp',target);
writeFileSync(manifestPath+'.tmp',revised);
renameSync(manifestPath+'.tmp',manifestPath);
console.log('Installed playable full avatar:',id);
console.log('Local VRM:',relative(projectRoot,target),'size:',data.length,'sha256:',sha256);
console.log('Manifest:',relative(projectRoot,manifestPath));
console.log('Next: inspect model in CTRL real WebGL (idle/walk/sit/dance) and run test/typecheck/build.');
