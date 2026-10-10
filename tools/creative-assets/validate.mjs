#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const kinds=new Set(['official-github','publisher-download','api-catalog','permission-gated','account-gated','reference-code']);
const reviews=new Set(['source-license-file-needed','quaternius-2026-license-check','per-avatar-rights','no-raw-redistribution','source-code-only']);
const rigs=new Set(['none','vroid-vrm','quaternius-universal','quaternius-legacy','kaykit','kenney-characters','mixamo']);
const categories=new Set(['avatar-base','outfit','animation','npc-character','world-kit','environment-light','material','ui','user-avatar','reference','audio','vfx']);
const check=(good,message)=>{if(!good)throw Error(message);};
const urlOK=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const unique=rows=>new Set(rows.map(x=>x.id)).size===rows.length;
export const loadJSON=relative=>JSON.parse(readFileSync(path.join(ROOT,relative),'utf8'));
export const extractLiveCatalogIds=contents=>new Set([...contents.matchAll(/^\{"id":"([^"]+)"/gm)].map(m=>m[1]));
export function validateCreativeAssets(registry,custom,presets,catalog){
  check(registry.schemaVersion===1&&Array.isArray(registry.sources)&&registry.sources.length>=35&&unique(registry.sources),'Registry count or duplicate IDs');
  for(const group of ['avatar-base','outfit','animation','npc-character','world-kit','user-avatar','audio','vfx'])check(registry.sources.some(s=>s.category===group),'Missing '+group);
  for(const s of registry.sources){
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id)&&typeof s.title==='string'&&s.title.length>=5,'Bad ID/title '+s.id);
    check(categories.has(s.category)&&kinds.has(s.sourceKind)&&rigs.has(s.rig),'Bad group/source/rig '+s.id);
    check(urlOK(s.sourceUrl)&&urlOK(s.licenseUrl),'Source and license evidence must use HTTPS '+s.id);
    check(reviews.has(s.rightsReview),'Manual license review required '+s.id);
    check(Array.isArray(s.formats)&&s.formats.length>0,'Missing format '+s.id);
    check(Number.isInteger(s.priority)&&s.priority>=1&&s.priority<=3,'Bad priority '+s.id);
    check(s.downloaded===false&&s.ingested===false,'Discovery must not claim asset inclusion '+s.id);
    check(typeof s.notes==='string'&&s.notes.length>=26,'Missing integration notes '+s.id);
    if(s.id.startsWith('quaternius-'))check(s.rightsReview==='quaternius-2026-license-check','QAL 2026 license review required '+s.id);
    if(s.category==='user-avatar')check(s.rightsReview==='per-avatar-rights','VRM requires per-avatar permission');
    if(s.sourceKind==='account-gated')check(s.rightsReview==='no-raw-redistribution','Do not redistribute Mixamo raw assets');
    if(s.sourceKind==='reference-code')check(s.rightsReview==='source-code-only','Code and asset licenses differ');
  }
  check(custom.schemaVersion===1&&Array.isArray(custom.avatarFamilies)&&Array.isArray(custom.slots)&&unique(custom.slots)&&unique(custom.avatarFamilies),'Bad character customizer configuration');
  const primary=custom.avatarFamilies.filter(f=>f.role==='primary-approved');
  check(primary.length===1&&primary[0].id==='vroid-vrm','Astra VRM must stay primary');
  check(primary[0].canUseQuaterniusPartsDirectly===false,'Cannot attach Quaternius rigged clothes directly to VRM');
  for(const name of ['base','hair','top','bottom','outer','shoes','headwear','hand'])check(custom.slots.some(s=>s.id===name),'Missing wardrobe slot '+name);
  for(const slot of custom.slots)check(Number.isInteger(slot.maxEquipped)&&slot.maxEquipped>0&&slot.maxEquipped<=2,'Too many items in slot');
  check(custom.publication.defaultStatus==='unavailable-until-reviewed'&&custom.publication.neverAllowUnknownExternalUrls===true,'Unknown external models must not be loadable');
  check(presets.schemaVersion===1&&Array.isArray(presets.templates)&&presets.templates.length>=3&&unique(presets.templates),'Invalid world templates');
  for(const preset of presets.templates){
    check(preset.objects.length>=5&&preset.objects.length<=120&&unique(preset.objects),'Bad object count / duplicate IDs '+preset.id);
    for(const o of preset.objects){
      check(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(o.id),'Invalid object UUID '+preset.id);
      check(catalog.has(o.assetId),'Unknown current CTRL catalog model '+o.assetId);
      check(typeof o.name==='string'&&o.name.length>0&&o.name.length<=60,'Invalid object name');
      for(const [axis,min,max] of [['x',-14,14],['y',0,8],['z',-8,12],['rotation',-100,100],['scale',.25,4]]){
        check(Number.isFinite(o[axis])&&o[axis]>=min&&o[axis]<=max,'Coordinate out of bounds '+axis+' '+preset.id);
      }
      check(['solid','decoration'].includes(o.behavior)&&o.target==='','Unsupported game behavior in scene seed');
    }
  }
  return {sources:registry.sources.length,templates:presets.templates.length,worldObjects:presets.templates.reduce((n,t)=>n+t.objects.length,0)};
}

export function validateUpstreamEvidence(evidence,registry){
 check(evidence.schemaVersion===1&&Array.isArray(evidence.upstreams)&&evidence.upstreams.length>=6&&unique(evidence.upstreams.map(x=>({...x,id:x.sourceId}))), 'Missing or duplicate official CC0 license evidence');
 const sources=new Map(registry.sources.map(x=>[x.id,x]));
 for(const e of evidence.upstreams){
   const s=sources.get(e.sourceId);
   check(s&&s.sourceKind==='official-github'&&s.sourceUrl==='https://github.com/'+e.repository,'Evidence source mismatch '+e.sourceId);
   check(/^[a-f0-9]{40}$/.test(e.sourceCommit)&&/^[a-f0-9]{40}$/.test(e.licenseBlobSha),'License evidence must pin canonical commit and blob SHA');
   check(e.licensePath==='LICENSE.txt'&&e.observedLicense==='CC0-1.0'&&e.status==='license-text-verified','CC0 license text not verified');
   check(e.assetFilesDownloaded===false&&e.binaryHashesVerified===false,'Do not overstate unimported media audit');
 }
 return evidence.upstreams.length;
}

export function validateRepo(){
  const catalog=extractLiveCatalogIds(readFileSync(path.join(ROOT,'features/plaza/build-assets.ts'),'utf8'));
  check(catalog.size>=900,'Live CTRL catalog has changed unexpectedly');
  const registry=loadJSON('creative-assets/sources.json');
  return {...validateCreativeAssets(registry,loadJSON('creative-assets/customization-contract.json'),loadJSON('creative-assets/world-presets.json'),catalog),upstreamLicenses:validateUpstreamEvidence(loadJSON('creative-assets/upstream-license-evidence.json'),registry),existingModels:catalog.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify({status:'PASS',...validateRepo()},null,2));}
  catch(error){console.error('FAIL:',error.message);process.exitCode=1;}
}
