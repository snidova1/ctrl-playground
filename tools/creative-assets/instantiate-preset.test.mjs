import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparePreset} from './instantiate-preset.mjs';
import {loadJSON} from './validate.mjs';
import {randomUUID} from 'node:crypto';
const data=()=>loadJSON('creative-assets/world-presets.json');
const uuid='550e8400-e29b-41d4-a716-';
const generate=()=>{let i=1000;return()=>uuid+String(i++).padStart(12,'0');};
test('all three presets produce valid unique IDs and no writes',()=>{
 const world=data();
 for(const preset of world.templates){
  const prepared=preparePreset({presets:world,presetId:preset.id,newId:generate()});
  assert.equal(prepared.templateObjectCount,preset.objects.length);
  assert.equal(new Set(prepared.objects.map(x=>x.id)).size,preset.objects.length);
  assert.ok(prepared.serverWritePerformed===false&&prepared.requiresServerAuthorization);
 }
});
test('the same template can be cloned twice without ID collisions',()=>{
 const world=data(),first=preparePreset({presets:world,presetId:'sage-courtyard',newId:generate()});
 const second=preparePreset({presets:world,presetId:'sage-courtyard',existing:first.objects,newId:()=>randomUUID()});
 assert.equal(new Set(second.objects.map(x=>x.id)).size,second.objects.length);
});
test('existing world never silently replaced',()=>{
 const world=data(),existing=[{id:randomUUID(),assetId:'building-kit/floor',name:'Base',x:0,y:0,z:0,rotation:0,scale:1,behavior:'decoration',target:''}];
 assert.throws(()=>preparePreset({presets:world,presetId:'cozy-studio',existing,mode:'replace'}),/explicit user confirmation/);
 assert.equal(preparePreset({presets:world,presetId:'cozy-studio',existing,mode:'replace',confirmedReplace:true,newId:generate()}).objects.length,7);
});
test('unexpected external/overflow/unknown template is rejected',()=>{
 const world=data();
 assert.throws(()=>preparePreset({presets:world,presetId:'https://evil.example/glb'}),/Unknown approved template/);
 assert.throws(()=>preparePreset({presets:world,presetId:'sage-courtyard',existing:Array.from({length:120},(_,i)=>({id:String(i)}))}),/maximum 120/);
 assert.throws(()=>preparePreset({presets:world,presetId:'sage-courtyard',newId:()=>uuid+'000000000100'}),/duplicate/);
});
