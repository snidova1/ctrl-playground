import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import {Group,Mesh,BoxGeometry,Quaternion} from 'three';
import {MToonMaterial,VRMExpression,VRMExpressionManager,type VRM,type VRMHumanBoneName} from '@pixiv/three-vrm';
import {characterProfileInputSchema} from '@/domain/habitat';
import {GUEST_STORAGE_KEY,loadGuestIdentity} from '@/features/common-ground/guest';
import {applyCharacterAppearance} from '@/features/plaza/characters/appearance';
import {applyCharacterAccessories,applyCharacterExpression,clearCharacterAccessories} from '@/features/plaza/characters/accessories';
import {availableAuthoredLooks,decorationCatalog,decorationDefaults,defaultAppearance,isCharacterAppearance,normalizeAppearance,resolveCharacter,seededAppearance,type DecorationKey} from '@/features/plaza/characters/catalog';
import {validateVrmBuffer} from '@/features/plaza/characters/loader';

function fixture(){
 const scene=new Group(),bones=new Map<VRMHumanBoneName,Group>();
 for(const name of ['head','neck','chest'] as const){const bone=new Group();scene.add(bone);bones.set(name,bone);}
 const expressionManager=new VRMExpressionManager();
 for(const {id} of decorationCatalog.expressionId)expressionManager.registerExpression(new VRMExpression(id));
 const vrm={scene,humanoid:{getNormalizedBoneNode:(name:VRMHumanBoneName)=>bones.get(name)??null},expressionManager} as unknown as VRM;
 return {vrm,bones,scene};
}
const roots=(scene:Group)=>{const found:Group[]=[];scene.traverse(object=>{if(object instanceof Group&&object.userData.ctrlAccessory)found.push(object);});return found;};

describe('expanded appearance compatibility and diversity',()=>{
 it('migrates six-field saves without changing identity or adding surprise accessories',()=>{
  const legacy={version:1,gender:'male',variantId:'clay',hairId:'ink',eyeId:'jade',skinId:'deep'} as const;
  expect(isCharacterAppearance(legacy)).toBe(true);
  expect(normalizeAppearance(legacy,'male','original')).toEqual({...decorationDefaults,...legacy});
  const saved={...legacy,...decorationDefaults,lookId:'alternate',headwearId:'bow',expressionId:'happy'} as const;
  expect(normalizeAppearance(saved,'male','original')).toEqual({...saved,lookId:'original'});
  expect(normalizeAppearance({...saved,eyewearId:'bad'},'male','original')).toEqual({...saved,lookId:'original',eyewearId:'none'});
 });
 it('covers every catalog choice across deterministic seeds without rerolling saved identity',()=>{
  const appearances=Array.from({length:256},(_,index)=>seededAppearance(`guest:${index}`,'female'));
  expect(new Set(appearances.map(a=>JSON.stringify(a))).size).toBe(256);
  for(const [key,items] of Object.entries(decorationCatalog)){
   // New complete presets are explicitly selectable, not injected into old seeds.
   const seededItems=key==='lookId'?items.filter(item=>item.id==='original'||item.id==='alternate'):items;
   expect(new Set(appearances.map(a=>a[key as DecorationKey]))).toEqual(new Set(seededItems.map(item=>item.id)));
  }
  for(const [index,a] of appearances.entries()){
   expect(isCharacterAppearance(a)).toBe(true);
   expect(seededAppearance(`guest:${index}`,'female')).toEqual(a);
   expect(normalizeAppearance(JSON.parse(JSON.stringify(a)),'female','original')).toEqual(a);
  }
 });
 it('accepts every allowlisted decoration and rejects unknown IDs at both boundaries',()=>{
  for(const [key,items] of Object.entries(decorationCatalog)){
   for(const item of items){
    const appearance={...defaultAppearance,[key]:item.id};
    expect(isCharacterAppearance(appearance)).toBe(true);
    expect(characterProfileInputSchema.safeParse({name:'Resident',character:'female',appearance}).success).toBe(true);
   }
   const appearance={...defaultAppearance,[key]:'https://evil.invalid/asset.vrm'};
   expect(isCharacterAppearance(appearance)).toBe(false);
   expect(characterProfileInputSchema.safeParse({name:'Resident',character:'female',appearance}).success).toBe(false);
  }
 });
 it('retires pendant without changing any other appearance field or accepting unknown neckwear',()=>{
  for(const gender of ['female','male'] as const){
   const legacy={...defaultAppearance,gender,variantId:'clay',hairId:'silver',eyeId:'jade',skinId:'deep',headwearId:'beret',eyewearId:'round',earringId:'drops',neckwearId:'pendant',backwearId:'satchel',expressionId:'happy',accessoryColorId:'plum'} as const;
   const expected={...legacy,neckwearId:'none'};
   expect(isCharacterAppearance(legacy)).toBe(true); // explicit persisted-ID compatibility only
   expect(normalizeAppearance(legacy,gender,'original')).toEqual(expected);
   expect(characterProfileInputSchema.parse({name:'Legacy Resident',character:gender,appearance:legacy}).appearance).toEqual(expected);
   expect(legacy.neckwearId).toBe('pendant'); // migration must not mutate source state
   for(const neckwearId of ['unknown','Pendant','https://evil.invalid/pendant.vrm']){
    expect(isCharacterAppearance({...legacy,neckwearId})).toBe(false);
    expect(characterProfileInputSchema.safeParse({name:'Resident',character:gender,appearance:{...legacy,neckwearId}}).success).toBe(false);
   }
  }
  expect(decorationCatalog.neckwearId.map(item=>item.id)).toEqual(['none','scarf','bowtie']);
 });
 it('keeps existing pendant guest identity instead of silently rerolling the resident',()=>{
  const stored={version:1,id:'saved-resident',appearance:{...defaultAppearance,hairId:'silver',neckwearId:'pendant',backwearId:'wings'}} as const;
  const storage={getItem:vi.fn(key=>key===GUEST_STORAGE_KEY?JSON.stringify(stored):null),setItem:vi.fn()},newId=vi.fn(()=> 'must-not-reroll');
  const loaded=loadGuestIdentity(storage,newId);
  expect(loaded).toEqual(stored);
  expect(newId).not.toHaveBeenCalled();expect(storage.setItem).not.toHaveBeenCalled();
  expect(normalizeAppearance(loaded.appearance,'female','original')).toEqual({...stored.appearance,neckwearId:'none'});
 });
 it('uses deterministic sparse accessory density with every style still reachable for either gender',()=>{
  const slots=['headwearId','eyewearId','earringId','neckwearId','backwearId'] as const;
  for(const gender of ['female','male'] as const){
   const appearances=Array.from({length:1024},(_,i)=>seededAppearance(`density:${i}`,gender));
   const counts=appearances.map(a=>slots.filter(key=>a[key]!=='none').length);
   expect(counts.filter(n=>n===0).length).toBeGreaterThan(30);
   expect(counts.filter(n=>n<=2).length).toBeGreaterThan(650);
   expect(counts.filter(n=>n===5).length).toBeLessThan(30);
   for(const slot of slots){
    const occupied=appearances.filter(a=>a[slot]!=='none').length;
    expect(occupied).toBeGreaterThan(150);expect(occupied).toBeLessThan(600);
    expect(new Set(appearances.map(a=>a[slot]))).toEqual(new Set(decorationCatalog[slot].map(item=>item.id)));
   }
   for(const [i,a] of appearances.entries()){
    expect(a.neckwearId).not.toBe('pendant');
    expect(seededAppearance(`density:${i}`,gender)).toEqual(a);
    expect(normalizeAppearance(a,gender,'original')).toEqual(a);
   }
  }
 });
});

describe('real accessory geometry and expression lifecycle (without WebGL)',()=>{
 it('replaces a live scarf with legacy pendant as none, preserving unrelated accessories and reusing that normalized loadout',()=>{
  const {vrm,scene,bones}=fixture();
  applyCharacterAccessories(vrm,{...defaultAppearance,headwearId:'beret',neckwearId:'scarf'});
  const oldNeck=roots(scene).find(root=>root.parent===bones.get('neck'))!;
  const geometry=vi.spyOn((oldNeck.children[0] as Mesh).geometry,'dispose');
  applyCharacterAccessories(vrm,{...defaultAppearance,headwearId:'beret',neckwearId:'pendant'});
  expect(oldNeck.parent).toBeNull();expect(geometry).toHaveBeenCalledTimes(1);
  const remaining=roots(scene);
  expect(remaining).toHaveLength(1);expect(remaining[0].parent).toBe(bones.get('head'));
  const count=scene.userData.ctrlAccessoryCount;
  applyCharacterAccessories(vrm,{...defaultAppearance,headwearId:'beret',neckwearId:'none'});
  expect(roots(scene)).toEqual(remaining);expect(scene.userData.ctrlAccessoryCount).toBe(count);
  clearCharacterAccessories(vrm);
 });
 it('creates geometry for every selectable accessory, attached to the expected bone',()=>{
  const {vrm,scene,bones}=fixture();
  const keys=['headwearId','eyewearId','earringId','neckwearId','backwearId'] as const;
  for(const key of keys)for(const {id} of decorationCatalog[key]){
   applyCharacterAccessories(vrm,{...defaultAppearance,[key]:id});
   const selected=roots(scene);
   if(id==='none'){expect(selected).toHaveLength(0);continue;}
   expect(selected).toHaveLength(1);
   expect(selected[0].parent).toBe(bones.get(key==='backwearId'?'chest':key==='neckwearId'?'neck':'head'));
   expect(selected[0].children.some(child=>child instanceof Mesh)).toBe(true);
   expect(vrm.scene.userData.ctrlAccessoryCount).toBeGreaterThan(0);
  }
  clearCharacterAccessories(vrm);expect(roots(scene)).toHaveLength(0);
 });
 it('reuses accessories for palette/expression edits and disposes replaced geometry once',()=>{
  const {vrm,scene,bones}=fixture();
  bones.get('head')!.rotation.y=.7;
  const look={...defaultAppearance,headwearId:'beret'} as const;
  applyCharacterAccessories(vrm,look);
  const initial=roots(scene)[0],correction=initial.quaternion.clone();
  const first=initial.children[0] as Mesh;
  const geometry=vi.spyOn(first.geometry,'dispose');
  const material=vi.spyOn(Array.isArray(first.material)?first.material[0]:first.material,'dispose');
  applyCharacterAccessories(vrm,{...look,hairId:'ink',expressionId:'happy'});
  expect(roots(scene)[0]).toBe(initial);
  bones.get('head')!.rotation.y=1.1;
  applyCharacterAccessories(vrm,{...look,accessoryColorId:'rose'});
  expect(initial.parent).toBeNull();expect(geometry).toHaveBeenCalledTimes(1);expect(material).toHaveBeenCalledTimes(1);
  expect(roots(scene)[0].quaternion.angleTo(correction)).toBeCloseTo(0);
  expect(correction.angleTo(new Quaternion())).toBeGreaterThan(0);
  clearCharacterAccessories(vrm);clearCharacterAccessories(vrm);
  expect(geometry).toHaveBeenCalledTimes(1);expect(roots(scene)).toHaveLength(0);
 });
 it('switches authored expressions without accumulating weights',()=>{
  const {vrm}=fixture();
  for(const {id} of decorationCatalog.expressionId){
   applyCharacterExpression(vrm,{...defaultAppearance,expressionId:id});
   for(const {id:other} of decorationCatalog.expressionId){
    expect(vrm.expressionManager!.getValue(other)).toBe(other===id&&id!=='neutral'?(id==='happy'?.55:id==='angry'?.45:.65):0);
   }
  }
 });
 it('restores original MToon colors after repeated edits without cumulative tinting',()=>{
  const {vrm,scene}=fixture(),material=new MToonMaterial();material.name='Hair_00_HAIR';
  const base=material.color.clone();scene.add(new Mesh(new BoxGeometry(),material));
  applyCharacterAppearance(vrm,{...defaultAppearance,hairId:'ink'});const tinted=material.color.clone();
  applyCharacterAppearance(vrm,{...defaultAppearance,hairId:'ink'});expect(material.color).toEqual(tinted);
  applyCharacterAppearance(vrm,defaultAppearance);expect(material.color).toEqual(base);
 });
});

interface ModelDocument {meshes:unknown[];skins:unknown[];extensions:Record<string,{meta:unknown}>}
const provenance=JSON.parse(readFileSync('public/plaza/characters/anime/provenance.json','utf8')) as {models:Array<{gender:string;embeddedLicense:unknown;files:Record<string,{file:string;bytes:number;sha256:string}>}>};
provenance.models.push(...JSON.parse(readFileSync('public/plaza/characters/airi-reference/provenance.json','utf8')).models);
describe('all authored look assets and recorded provenance',()=>{
 for(const gender of ['female','male'] as const)for(const {id:lookId} of availableAuthoredLooks(gender)){
  it(`${gender}/${lookId} ships both real VRMs matching hashes, licenses, rigs and geometry`,()=>{
   const definition=resolveCharacter({...defaultAppearance,gender,lookId});
   const assetKey=lookId==='airi'?'airi-a':lookId==='airi-b'?'airi-b':`${gender}${lookId==='alternate'?'-studio':''}`;
   expect(definition.id).toBe(`ctrl-anime-${assetKey}`);
   const record=provenance.models.find(item=>item.gender===assetKey)!;
   const documents:ModelDocument[]=[];
   for(const quality of ['high','low'] as const){
    const data=readFileSync(`public${definition.assets[quality]}`),saved=record.files[quality];
    expect(definition.assets[quality].endsWith(`/${saved.file}`)).toBe(true);
    expect(data.length).toBe(saved.bytes);expect(createHash('sha256').update(data).digest('hex')).toBe(saved.sha256);
    validateVrmBuffer(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
    const document=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString()) as ModelDocument;
    expect((document.extensions.VRMC_vrm??document.extensions.VRM).meta).toEqual(record.embeddedLicense);
    expect(document.meshes.length).toBeGreaterThan(0);expect(document.skins.length).toBeGreaterThan(0);documents.push(document);
   }
   expect(documents[0].meshes).toEqual(documents[1].meshes);
   expect(documents[0].skins).toEqual(documents[1].skins);
   expect(documents[0].extensions).toEqual(documents[1].extensions);
  });
 }
});
