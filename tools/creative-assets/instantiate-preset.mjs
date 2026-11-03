#!/usr/bin/env node
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadJSON,validateRepo} from './validate.mjs';

/**
 * Pure, permission-free preparation for Astra's existing Habitat save route.
 * Never writes, never fetches, never mutates a server world. Save requires an authenticated
 * wallet/session, owner edit rights, a matching server revision and explicit user approval.
 */
export function preparePreset({presets,presetId,existing=[],mode='append',confirmedReplace=false,newId=randomUUID}){
  if(mode!=='append'&&mode!=='replace')throw Error('Unsupported preset mode.');
  if(!Array.isArray(existing)||existing.length>120)throw Error('Invalid current world layout.');
  if(mode==='replace'&&existing.length>0&&!confirmedReplace)throw Error('Replacing an existing world requires explicit user confirmation.');
  const template=presets.templates.find(t=>t.id===presetId);
  if(!template)throw Error('Unknown approved template ID.');
  const start=mode==='replace'?[]:existing.map(o=>({...o}));
  if(start.length+template.objects.length>120)throw Error('Result exceeds Habitat maximum 120 objects.');
  const taken=new Set(start.map(o=>o.id));
  if(taken.size!==start.length)throw Error('Existing world has duplicate object IDs.');
  const fresh=template.objects.map(original=>{
    const id=newId();
    if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)||taken.has(id))throw Error('Generated object ID invalid or duplicate.');
    taken.add(id);
    return {...original,id};
  });
  return {templateId:presetId,mode,objects:[...start,...fresh],templateObjectCount:fresh.length,requiresServerAuthorization:true,serverWritePerformed:false};
}
export function prepareCurrentPreset(presetId){
  validateRepo();
  return preparePreset({presets:loadJSON('creative-assets/world-presets.json'),presetId,mode:'append',existing:[]});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(!process.argv[2]||process.argv[3])throw Error('Usage: node tools/creative-assets/instantiate-preset.mjs <approved-preset-id>');
    console.log(JSON.stringify(prepareCurrentPreset(process.argv[2]),null,2));
  }catch(error){console.error('Cannot prepare template:',error.message);process.exitCode=1;}
}
