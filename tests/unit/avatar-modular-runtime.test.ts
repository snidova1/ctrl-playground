import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AnimationClip,Bone,BoxGeometry,Group,Mesh,QuaternionKeyframeTrack,VectorKeyframeTrack,type Material} from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MToonMaterial,VRM,VRMExpression,VRMExpressionManager,VRMHumanoid,type VRMHumanBones,type VRMHumanBoneName} from '@pixiv/three-vrm';
import {attachNativeModularPart,clearModularParts,getModularRuntime,loadModularParts,modularSlots,resetModularSprings,updateModularParts} from '@/features/plaza/characters/modular-runtime';
import {HumanoidAnimator} from '@/features/plaza/characters/animation';
import {characterBudgets,previewCharacter} from '@/features/plaza/characters/catalog';
import {defaultModularAppearance,modularFamilies,modularPart,modularSelectionKey} from '@/features/plaza/characters/modular-catalog';
import {disposeVrm,loadCharacter,validateVrmBuffer,type LoadedCharacter} from '@/features/plaza/characters/loader';

const mocks=vi.hoisted(()=>({binary:vi.fn(),hair:vi.fn(),wardrobe:vi.fn(),retarget:vi.fn()}));
vi.mock('@/features/plaza/characters/binary-cache',()=>({createCharacterBinaryCache:()=>mocks.binary}));
vi.mock('@/features/plaza/characters/hair-loader',()=>({loadCharacterHair:mocks.hair}));
vi.mock('@/features/plaza/characters/wardrobe',()=>({loadCharacterWardrobe:mocks.wardrobe,clearCharacterWardrobe:vi.fn()}));
vi.mock('@/features/plaza/characters/retarget',()=>({retargetHumanoid:mocks.retarget}));

const states=['Idle','Walk','Run','JumpStart','JumpLoop','Land','SitDown','Seated','Interact','Victory'];
function clips(){return states.map(name=>new AnimationClip(name,1,[]));}
function fixture(names=['happy','blink','aa']){
  const scene=new Group(),raw:Record<string,Bone>={};
  const structure:Array<[VRMHumanBoneName,VRMHumanBoneName|undefined,number,number]>=[
    ['hips',undefined,0,1],['spine','hips',0,.2],['chest','spine',0,.2],['neck','chest',0,.1],['head','neck',0,.15],
    ['leftUpperArm','chest',.2,.05],['leftLowerArm','leftUpperArm',.25,0],['leftHand','leftLowerArm',.2,0],
    ['rightUpperArm','chest',-.2,.05],['rightLowerArm','rightUpperArm',-.25,0],['rightHand','rightLowerArm',-.2,0],
    ['leftUpperLeg','hips',.1,-.1],['leftLowerLeg','leftUpperLeg',0,-.4],['leftFoot','leftLowerLeg',0,-.4],
    ['rightUpperLeg','hips',-.1,-.1],['rightLowerLeg','rightUpperLeg',0,-.4],['rightFoot','rightLowerLeg',0,-.4],
  ];
  const bones:Record<string,{node:Bone}>={};
  for(const [name,parent,x,y] of structure){const node=new Bone();node.name=name;node.position.set(x,y,0);(parent?raw[parent]:scene).add(node);raw[name]=node;bones[name]={node};}
  scene.updateMatrixWorld(true);
  const humanoid=new VRMHumanoid(bones as unknown as VRMHumanBones);scene.add(humanoid.normalizedHumanBonesRoot);
  const expressionManager=new VRMExpressionManager();for(const name of names)expressionManager.registerExpression(new VRMExpression(name));
  const material=new MToonMaterial(),geometry=new BoxGeometry(.5,1.8,.3),mesh=new Mesh<BoxGeometry,Material|Material[]>(geometry,material);mesh.position.y=.9;scene.add(mesh);
  const meta={metaVersion:'1' as const,name:'Original metadata',authors:['Source artist'],licenseUrl:'https://example.test'};
  const vrm=new VRM({scene,humanoid,expressionManager,meta});
  const update=vi.spyOn(vrm,'update');
  return {vrm,raw,material,geometry,mesh,update};
}
function parsed(vrm:VRM):GLTF{return {scene:vrm.scene,userData:{vrm}} as unknown as GLTF;}
function loaded(vrm:VRM):LoadedCharacter{return {vrm,clips:clips(),scale:1,floor:0,toonMaterialCount:1};}
function buffer(external=false){
  const text=new TextEncoder().encode(JSON.stringify({asset:{version:'2.0'},extensions:{VRMC_vrm:{}},...(external?{images:[{uri:'https://example.test/external.png'}]}:{})}));
  const length=Math.ceil(text.length/4)*4,data=new ArrayBuffer(20+length),view=new DataView(data);
  [0x46546c67,2,data.byteLength,length,0x4e4f534a].forEach((n,i)=>view.setUint32(i*4,n,true));
  const bytes=new Uint8Array(data,20);bytes.fill(32);bytes.set(text);return data;
}
const selection=defaultModularAppearance('drophunter');
const definition={...previewCharacter,id:'ctrl-modular-drophunter',assets:{high:modularPart('drophunter','body','drophunter','high'),low:modularPart('drophunter','body','drophunter','low')}};
beforeEach(()=>{mocks.binary.mockReset().mockResolvedValue(buffer());mocks.hair.mockReset();mocks.wardrobe.mockReset().mockResolvedValue({status:'source'});mocks.retarget.mockReset().mockReturnValue(clips());});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('native modular rig runtime',()=>{
  it('namespaces every donor node, retaining all humanoid node identities and original metadata',()=>{
    const base=fixture(),donor=fixture(),meta=donor.vrm.meta;
    const normalized=donor.vrm.humanoid.getNormalizedBoneNode('hips')!,original=normalized.name;
    attachNativeModularPart(base.vrm,donor.vrm,'drophunter','hair','ponytail');
    expect(donor.vrm.scene.parent).toBe(base.vrm.scene);expect(donor.vrm.meta).toBe(meta);
    expect(donor.vrm.humanoid.getNormalizedBoneNode('hips')).toBe(normalized);expect(donor.vrm.humanoid.getRawBoneNode('hips')).toBe(donor.raw.hips);
    expect(normalized.name).not.toBe(original);expect(normalized.userData.ctrlModularOriginalName).toBe(original);
    donor.vrm.scene.traverse(node=>expect(node.name).toMatch(/^ctrl_modular_drophunter_hair_/));
    expect(base.vrm.humanoid.getNormalizedBoneNode('hips')!.name).toBe(original);
    expect(base.vrm.scene.userData.ctrlAvatarModularParts).toEqual(['hair/ponytail']);
    clearModularParts(base.vrm);disposeVrm(base.vrm);
  });

  it('copies mixer-authored translation and raised arms to all five native rigs after mixer, once per fixed step',()=>{
    const base=fixture(),parts=modularSlots.map(()=>fixture());
    parts.forEach((part,i)=>attachNativeModularPart(base.vrm,part.vrm,'drophunter',modularSlots[i],'native'));
    const hips=base.vrm.humanoid.getNormalizedBoneNode('hips')!,arm=base.vrm.humanoid.getNormalizedBoneNode('leftUpperArm')!;
    const walk=new AnimationClip('Walk',1,[new VectorKeyframeTrack(`${hips.name}.position`,[0,1],[0,1,0,.2,1.3,.1]),new QuaternionKeyframeTrack(`${arm.name}.quaternion`,[0,1],[0,0,0,1,0,0,Math.sin(.6),Math.cos(.6)])]);
    const character=loaded(base.vrm);character.clips=character.clips.map(clip=>clip.name==='Walk'?walk:clip);
    const animator=new HumanoidAnimator(character);
    expect(base.update).toHaveBeenCalledTimes(1);parts.forEach(part=>expect(part.update).toHaveBeenCalledTimes(1));
    const order:string[]=[];
    const mix=animator.mixer.update.bind(animator.mixer);vi.spyOn(animator.mixer,'update').mockImplementation(dt=>{order.push('mixer');return mix(dt);});
    // Restore the original before wrapping spies to keep the real VRM rig update.
    base.update.mockRestore();const realBase=base.vrm.update.bind(base.vrm);const baseSpy=vi.spyOn(base.vrm,'update').mockImplementation(dt=>{order.push('base');realBase(dt);});
    const partSpies=parts.map((part,i)=>{part.update.mockRestore();const real=part.vrm.update.bind(part.vrm);return vi.spyOn(part.vrm,'update').mockImplementation(dt=>{order.push(`part${i}`);expect(part.vrm.humanoid.getNormalizedBoneNode('hips')!.position.toArray()).toEqual(hips.position.toArray());expect(part.vrm.humanoid.getNormalizedBoneNode('leftUpperArm')!.quaternion.toArray()).toEqual(arm.quaternion.toArray());real(dt);});});
    const input={moving:true,sitting:false,celebrate:false,interactedAt:-10000};
    animator.update(characterBudgets.fixedStep,input,10000);
    expect(order).toEqual(['mixer','base','part0','part1','part2','part3','part4']);expect(baseSpy).toHaveBeenCalledTimes(1);partSpies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
    for(let i=0;i<30;i++)animator.update(characterBudgets.fixedStep,input,10000);
    expect(hips.position.y).toBeGreaterThan(1);expect(Math.abs(arm.quaternion.z)).toBeGreaterThan(.05);
    for(const part of parts){expect(part.raw.hips.position.toArray()).toEqual(base.raw.hips.position.toArray());expect(part.raw.leftUpperArm.quaternion.toArray()).toEqual(base.raw.leftUpperArm.quaternion.toArray());}
    const count=baseSpy.mock.calls.length;animator.dispose();animator.update(.05,input,10000);expect(baseSpy).toHaveBeenCalledTimes(count);disposeVrm(base.vrm);
  });

  it('mirrors supported face and blink weights case-insensitively without owning unrelated channels or timers',()=>{
    const base=fixture(['happy','blink','aa']),part=fixture(['Happy','blink','custom']);
    attachNativeModularPart(base.vrm,part.vrm,'drophunter','eyes','regulareyes');
    base.vrm.expressionManager!.setValue('happy',.55);base.vrm.expressionManager!.setValue('blink',.8);part.vrm.expressionManager!.setValue('custom',.3);
    updateModularParts(base.vrm,1/60);
    expect(part.vrm.expressionManager!.getValue('Happy')).toBe(.55);expect(part.vrm.expressionManager!.getValue('blink')).toBe(.8);expect(part.vrm.expressionManager!.getValue('custom')).toBe(.3);
    base.vrm.expressionManager!.setValue('blink',0);updateModularParts(base.vrm,1/60);expect(part.vrm.expressionManager!.getValue('blink')).toBe(0);
    expect(part.update).toHaveBeenCalledTimes(2);disposeVrm(base.vrm);
  });

  it('disposes donor resources exactly once and leaves base ownership with the caller',()=>{
    const base=fixture(),part=fixture();const baseDispose=vi.spyOn(base.geometry,'dispose'),partDispose=vi.spyOn(part.geometry,'dispose'),materialDispose=vi.spyOn(part.material,'dispose');
    attachNativeModularPart(base.vrm,part.vrm,'drophunter','top','hoodie');clearModularParts(base.vrm);clearModularParts(base.vrm);
    expect(part.vrm.scene.parent).toBeNull();expect(partDispose).toHaveBeenCalledTimes(1);expect(materialDispose).toHaveBeenCalledTimes(1);expect(baseDispose).not.toHaveBeenCalled();expect(getModularRuntime(base.vrm)).toBeUndefined();
    disposeVrm(base.vrm);expect(baseDispose).toHaveBeenCalledTimes(1);expect(partDispose).toHaveBeenCalledTimes(1);
  });

  it('rejects cross-family and duplicate slots without taking donor ownership',()=>{
    const base=fixture(),a=fixture(),b=fixture();attachNativeModularPart(base.vrm,a.vrm,'drophunter','hair','ponytail');
    expect(()=>attachNativeModularPart(base.vrm,b.vrm,'neurohacker','top','shirt')).toThrow('native body family');
    expect(()=>attachNativeModularPart(base.vrm,b.vrm,'drophunter','hair','short')).toThrow('Duplicate modular slot');expect(b.vrm.scene.parent).toBeNull();disposeVrm(base.vrm);disposeVrm(b.vrm);
  });

  it('resets all native springs after a suspended frame, with no second base update',()=>{
    const base=fixture(),part=fixture();attachNativeModularPart(base.vrm,part.vrm,'drophunter','hair','ponytail');
    const baseReset=vi.fn(),partReset=vi.fn();Object.defineProperty(base.vrm,'springBoneManager',{value:{reset:baseReset,update:vi.fn()}});Object.defineProperty(part.vrm,'springBoneManager',{value:{reset:partReset,update:vi.fn()}});
    // Reset hook is also used on first renderer frame.
    resetModularSprings(base.vrm);expect(partReset).toHaveBeenCalledTimes(1);partReset.mockClear();
    const animator=new HumanoidAnimator(loaded(base.vrm));base.update.mockClear();part.update.mockClear();
    animator.update(.4,{moving:false,sitting:false,celebrate:false,interactedAt:-10000},10000);
    expect(baseReset).toHaveBeenCalledTimes(1);expect(partReset).toHaveBeenCalledTimes(1);expect(base.update).toHaveBeenCalledTimes(3);expect(part.update).toHaveBeenCalledTimes(3);
    animator.dispose();disposeVrm(base.vrm);
  });
});

describe('modular loading and transactional ownership',()=>{
  it.each(modularFamilies.flatMap(family=>(['high','low'] as const).map(quality=>({family,quality}))))('exercises real prepared $family/$quality VRMs and shared motion clips without a renderer',async({family,quality})=>{
    // Only image decoding is substituted: actual local GLBs, geometry, native rigs,
    // metadata, VRM plugins, retargeting, mixer and expression/spring updates execute.
    vi.stubGlobal('self',globalThis);vi.stubGlobal('createImageBitmap',async()=>({width:1,height:1,close(){}}));
    mocks.binary.mockImplementation(async(url:string)=>{const bytes=readFileSync(`public${url}`);return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);});
    const actual=await vi.importActual<typeof import('@/features/plaza/characters/retarget')>('@/features/plaza/characters/retarget');mocks.retarget.mockImplementation(actual.retargetHumanoid);
    const native=defaultModularAppearance(family),body={...definition,id:`ctrl-modular-${family}`,assets:{high:modularPart(family,'body',family,'high'),low:modularPart(family,'body',family,'low')}};
    const character=await loadCharacter(body,quality,undefined,'mtoon','source','source',native);
    const runtime=getModularRuntime(character.vrm)!;expect(runtime.parts).toHaveLength(5);expect(character.clips).toHaveLength(10);expect(runtime.family).toBe(family);
    const baseUpdate=vi.spyOn(character.vrm,'update'),partUpdates=runtime.parts.map(part=>vi.spyOn(part.vrm,'update'));
    const meta=character.vrm.meta,animator=new HumanoidAnimator(character);expect(baseUpdate).toHaveBeenCalledTimes(1);
    const input={moving:true,sitting:false,celebrate:false,interactedAt:-Infinity};
    for(let frame=0;frame<30;frame++)animator.update(characterBudgets.fixedStep,input,10000);
    expect(animator.state).toBe('Walk');expect(baseUpdate).toHaveBeenCalledTimes(31);partUpdates.forEach(update=>expect(update).toHaveBeenCalledTimes(31));
    for(const part of runtime.parts){
      expect(part.vrm.scene.parent).toBe(character.vrm.scene);expect(part.vrm.meta?.metaVersion).toBe('1');
      for(const name of Object.keys(character.vrm.humanoid.normalizedHumanBones) as VRMHumanBoneName[]){
        const source=character.vrm.humanoid.getNormalizedBoneNode(name),target=part.vrm.humanoid.getNormalizedBoneNode(name);if(!source||!target)continue;
        expect(target.position.toArray()).toEqual(source.position.toArray());expect(target.quaternion.toArray()).toEqual(source.quaternion.toArray());expect(target.quaternion.toArray().every(Number.isFinite)).toBe(true);
      }
    }
    input.moving=false;input.sitting=true;for(let frame=0;frame<90;frame++)animator.update(characterBudgets.fixedStep,input,11000+frame*17);
    expect(animator.state).toBe('Seated');expect(character.vrm.meta).toBe(meta);animator.dispose();disposeVrm(character.vrm);expect(getModularRuntime(character.vrm)).toBeUndefined();
  });

  it('loads exactly the five catalog-native high quality layers, preserving source colors and body identity',async()=>{
    const base=fixture(),parts=modularSlots.map(()=>fixture());const parse=vi.spyOn(GLTFLoader.prototype,'parseAsync');for(const part of parts)parse.mockResolvedValueOnce(parsed(part.vrm));
    const colors=parts.map(part=>part.material.color.clone());await loadModularParts(base.vrm,definition.id,selection,'high',validateVrmBuffer);
    expect(mocks.binary).toHaveBeenCalledTimes(5);expect(getModularRuntime(base.vrm)!.parts.map(part=>part.slot)).toEqual(modularSlots);expect(getModularRuntime(base.vrm)!.family).toBe('drophunter');
    expect(mocks.binary.mock.calls.map(([url])=>url)).toEqual([modularPart('drophunter','eyes','regulareyes','high'),...(['hair','top','bottom','shoes'] as const).map(slot=>modularPart('drophunter',slot,selection[slot],'high'))]);
    parts.forEach((part,i)=>{expect(part.material.color).toEqual(colors[i]);expect(part.vrm.scene.parent).toBe(base.vrm.scene);});disposeVrm(base.vrm);
  });

  it('prunes low-quality outlines/springs without darkening the original native material',async()=>{
    const base=fixture(),parts=modularSlots.map(()=>fixture());const parse=vi.spyOn(GLTFLoader.prototype,'parseAsync');
    for(const part of parts){
      const outline=new MToonMaterial();outline.isOutline=true;part.mesh.material=[part.material,outline];part.geometry.clearGroups();part.geometry.addGroup(0,3,0);part.geometry.addGroup(3,3,1);
      const joint={bone:{name:'hair'},settings:{dragForce:0,stiffness:0}};Object.defineProperty(part.vrm,'springBoneManager',{value:{joints:new Set([joint]),deleteJoint:vi.fn(),reset:vi.fn(),update:vi.fn()}});parse.mockResolvedValueOnce(parsed(part.vrm));
    }
    const color=parts[0].material.color.clone();await loadModularParts(base.vrm,definition.id,selection,'low',validateVrmBuffer);
    for(const part of parts){expect(part.material.color).toEqual(color);expect(part.geometry.groups).toEqual([{start:0,count:3,materialIndex:0}]);expect(part.material.outlineWidthMode).toBe('none');expect(part.vrm.springBoneManager!.deleteJoint).toHaveBeenCalledTimes(1);}
    expect(mocks.binary.mock.calls.every(([url])=>url.endsWith('-mobile.vrm'))).toBe(true);disposeVrm(base.vrm);
  });

  it('aborts before any fetch for invalid family or an already aborted signal',async()=>{
    const base=fixture();await expect(loadModularParts(base.vrm,'ctrl-modular-neurohacker',selection,'high',validateVrmBuffer)).rejects.toThrow('native body family');
    const abort=new AbortController();abort.abort();await expect(loadModularParts(base.vrm,definition.id,selection,'high',validateVrmBuffer,abort.signal)).rejects.toMatchObject({name:'AbortError'});expect(mocks.binary).not.toHaveBeenCalled();disposeVrm(base.vrm);
  });

  it('rejects external resources before parsing',async()=>{
    const base=fixture();mocks.binary.mockResolvedValue(buffer(true));const parse=vi.spyOn(GLTFLoader.prototype,'parseAsync');
    await expect(loadModularParts(base.vrm,definition.id,selection,'high',validateVrmBuffer)).rejects.toThrow('self-contained');expect(parse).not.toHaveBeenCalled();disposeVrm(base.vrm);
  });

  it('cleans both attached and just-parsed donors when cancellation lands during a non-abortable parse',async()=>{
    const base=fixture(),first=fixture(),pending=fixture(),abort=new AbortController();const firstDispose=vi.spyOn(first.geometry,'dispose'),pendingDispose=vi.spyOn(pending.geometry,'dispose'),baseDispose=vi.spyOn(base.geometry,'dispose');
    vi.spyOn(GLTFLoader.prototype,'parseAsync').mockResolvedValueOnce(parsed(first.vrm)).mockImplementationOnce(async()=>{abort.abort();return parsed(pending.vrm);});
    await expect(loadModularParts(base.vrm,definition.id,selection,'high',validateVrmBuffer,abort.signal)).rejects.toMatchObject({name:'AbortError'});
    expect(firstDispose).toHaveBeenCalledTimes(1);expect(pendingDispose).toHaveBeenCalledTimes(1);expect(baseDispose).not.toHaveBeenCalled();expect(getModularRuntime(base.vrm)).toBeUndefined();expect(first.vrm.scene.parent).toBeNull();expect(pending.vrm.scene.parent).toBeNull();disposeVrm(base.vrm);
  });

  it('rolls back already attached native parts on a later parse failure',async()=>{
    const base=fixture(),part=fixture(),dispose=vi.spyOn(part.geometry,'dispose');vi.spyOn(GLTFLoader.prototype,'parseAsync').mockResolvedValueOnce(parsed(part.vrm)).mockRejectedValueOnce(new Error('Broken native export'));
    await expect(loadModularParts(base.vrm,definition.id,selection,'high',validateVrmBuffer)).rejects.toThrow('Broken native export');expect(dispose).toHaveBeenCalledTimes(1);expect(getModularRuntime(base.vrm)).toBeUndefined();disposeVrm(base.vrm);
  });

  it('shared loader skips both legacy donor paths and preserves native source shading even if liltoon was requested',async()=>{
    const base=fixture(),parts=modularSlots.map(()=>fixture()),parse=vi.spyOn(GLTFLoader.prototype,'parseAsync');
    parse.mockResolvedValueOnce(parsed(base.vrm)).mockResolvedValueOnce({scene:new Group()} as GLTF);for(const part of parts)parse.mockResolvedValueOnce(parsed(part.vrm));
    const color=base.material.color.clone();const character=await loadCharacter(definition,'high',undefined,'liltoon','vroid-short','source',selection);
    expect(character.vrm).toBe(base.vrm);expect(character.vrm.scene.children).toContain(parts[0].vrm.scene);expect(mocks.hair).not.toHaveBeenCalled();expect(mocks.wardrobe).not.toHaveBeenCalled();expect(base.material.color).toEqual(color);expect(character.toonMaterialCount).toBe(6);expect(character.scale).toBeCloseTo(definition.height/1.8);disposeVrm(character.vrm);
  });

  it('legacy loader still uses authored hair and wardrobe without modular scene hooks',async()=>{
    const base=fixture(),parse=vi.spyOn(GLTFLoader.prototype,'parseAsync');parse.mockResolvedValueOnce(parsed(base.vrm)).mockResolvedValueOnce({scene:new Group()} as GLTF);
    const character=await loadCharacter(previewCharacter,'high',undefined,'mtoon','vroid-short');expect(mocks.hair).toHaveBeenCalledWith(base.vrm,previewCharacter.id,'high','vroid-short',undefined);expect(mocks.wardrobe).toHaveBeenCalledTimes(1);expect(getModularRuntime(character.vrm)).toBeUndefined();disposeVrm(character.vrm);
  });

  it('rejects modular bodies without matching selection before fetching',async()=>{
    await expect(loadCharacter(definition,'high')).rejects.toThrow('native family selection');await expect(loadCharacter(definition,'high',undefined,'mtoon','source','source',defaultModularAppearance('neurohacker'))).rejects.toThrow('native family selection');expect(mocks.binary).not.toHaveBeenCalled();
  });

  it('keys avatar remount and loader effect on the full modular selection and lets modular appearance override definition',()=>{
    const source=readFileSync(new URL('../../features/plaza/characters/vrm-avatar.tsx',import.meta.url),'utf8');
    expect(modularSelectionKey(selection)).not.toBe(modularSelectionKey({...selection,hair:'bob'}));expect(source).toContain('appearance.modular||appearance.lookId');expect(source).toContain('${modularSelectionKey(appearance.modular)}');expect(source).toContain('const modularKey=modularSelectionKey(props.appearance.modular)');expect(source).toContain('modularKey,attempt]');expect(source).toContain('data.ctrlAvatarModularFamily=');expect(source).toContain('data.ctrlAvatarModularParts=');
  });
});
