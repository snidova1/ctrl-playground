import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {AnimationClip,QuaternionKeyframeTrack} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils,type VRM} from '@pixiv/three-vrm';
import {validateVrmBuffer} from '@/features/plaza/characters/loader';
import {advanceJump,createCharacterMotion,characterBudgets} from '@/features/plaza/characters/catalog';
import {retargetHumanoid} from '@/features/plaza/characters/retarget';
import {HumanoidAnimator,type CharacterState} from '@/features/plaza/characters/animation';

function glb(manifest:unknown):ArrayBuffer {
  const json=new TextEncoder().encode(JSON.stringify(manifest)),length=Math.ceil(json.length/4)*4;
  const buffer=new ArrayBuffer(20+length),view=new DataView(buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);
  view.setUint32(12,length,true);view.setUint32(16,0x4e4f534a,true);
  new Uint8Array(buffer,20).fill(32);new Uint8Array(buffer,20,json.length).set(json);return buffer;
}
function bytes(path:string){const b=readFileSync(path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
function rigFixture(version:'0'|'1') {
  const nodes:Array<{name:string;translation:number[];children:number[]}>=[];
  const bones:Record<string,{node:number}>={};
  function bone(name:string,parent:string|undefined,position:number[]){const node=nodes.length;bones[name]={node};nodes.push({name,translation:position,children:[]});if(parent)nodes[bones[parent].node].children.push(node);}
  bone('hips',undefined,[0,1,0]);bone('spine','hips',[0,.2,0]);bone('chest','spine',[0,.2,0]);bone('neck','chest',[0,.15,0]);bone('head','neck',[0,.15,0]);
  for(const [side,sign] of [['left',1],['right',-1]] as const){bone(side+'UpperArm','chest',[sign*.2,.1,0]);bone(side+'LowerArm',side+'UpperArm',[sign*.3,0,0]);bone(side+'Hand',side+'LowerArm',[sign*.25,0,0]);bone(side+'UpperLeg','hips',[sign*.1,-.1,0]);bone(side+'LowerLeg',side+'UpperLeg',[0,-.4,0]);bone(side+'Foot',side+'LowerLeg',[0,-.4,0]);}
  const extension=version==='1'
    ? {VRMC_vrm:{specVersion:'1.0',meta:{name:'CTRL test rig',authors:['CTRL'],licenseUrl:'https://vrm.dev/licenses/1.0/'},humanoid:{humanBones:bones}}}
    : {VRM:{specVersion:'0.0',meta:{title:'CTRL test rig',author:'CTRL',licenseName:'CC0'},humanoid:{humanBones:Object.entries(bones).map(([bone,{node}])=>({bone,node,useDefaultValues:true}))}}};
  return glb({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes,extensionsUsed:Object.keys(extension),extensions:extension});
}
async function vrmRig(version:'0'|'1'){
  const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
  const model=await loader.parseAsync(rigFixture(version),'');const vrm=model.userData.vrm as VRM;
  VRMUtils.rotateVRM0(vrm);vrm.scene.updateMatrixWorld(true);return vrm;
}

describe('reviewed VRM boundary',()=>{
  it('accepts bundled exports and both VRM container generations',()=>{
    for(const quality of ['desktop','mobile'])expect(()=>validateVrmBuffer(bytes(`public/plaza/characters/victoria-${quality}.vrm`))).not.toThrow();
    for(const v of ['0','1'] as const)expect(()=>validateVrmBuffer(rigFixture(v))).not.toThrow();
  });
  it('rejects external resources, generic glTF, oversized and truncated input before loading',()=>{
    for(const resources of [{images:[{uri:'https://external.invalid/face.png'}]},{buffers:[{uri:'file:///secrets'}]}])expect(()=>validateVrmBuffer(glb({extensions:{VRMC_vrm:{}},...resources}))).toThrow('self-contained');
    expect(()=>validateVrmBuffer(glb({asset:{version:'2.0'}}))).toThrow('VRM humanoid');
    expect(()=>validateVrmBuffer(new ArrayBuffer(characterBudgets.maxAssetBytes+1))).toThrow('budget');
    expect(()=>validateVrmBuffer(rigFixture('1').slice(0,45))).toThrow('container');
  });
});

describe('retargeting into real three-vrm humanoids',()=>{
  it.each(['0','1'] as const)('loads VRM %s and retargets without changing the source, root drift or invalid quaternions',async version=>{
    const source=await new GLTFLoader().parseAsync(bytes('public/plaza/characters/humanoid-motions.glb'),'');
    const before=source.animations.map(a=>a.tracks.map(t=>Array.from(t.values)));
    const vrm=await vrmRig(version),clips=retargetHumanoid(source,vrm);
    expect(clips).toHaveLength(10);expect(source.animations.map(a=>a.tracks.map(t=>Array.from(t.values)))).toEqual(before);
    for(const c of clips){expect(c.tracks.length).toBeGreaterThan(10);for(const t of c.tracks){if(t instanceof QuaternionKeyframeTrack){for(let i=0;i<t.values.length;i+=4)expect(Math.hypot(...t.values.slice(i,i+4))).toBeCloseTo(1,5);}else if(!['SitDown','Seated'].includes(c.name)){for(let i=0;i<t.values.length;i+=3){expect(t.values[i]).toBe(0);expect(t.values[i+2]).toBe(0);}}}}
  });
});

describe('character motion and state ownership',()=>{
  it('clamps pause deltas, prevents mid-air restart and lands at zero without moving world pose',()=>{
    const motion=createCharacterMotion();advanceJump(motion,10,true,false,0);expect(motion.jumpTime).toBe(.05);
    advanceJump(motion,.05,true,false,50);expect(motion.jumpTime).toBe(.1);
    for(let i=0;i<18;i++)advanceJump(motion,.05,false,false,100+i*50);
    expect(motion).toMatchObject({airborne:false,height:0});expect(motion.landedAt).toBeGreaterThan(0);
    advanceJump(motion,.02,true,false,1000);advanceJump(motion,.02,false,true,1020);expect(motion).toMatchObject({airborne:false,height:0,jumpTime:0});
  });
  it('runs all states, prioritizes seats/jumps and bounds work after tab suspension',async()=>{
    const vrm=await vrmRig('1'),states:CharacterState[]=['Idle','Walk','Run','JumpStart','JumpLoop','Land','SitDown','Seated','Interact','Victory'];
    const runtime=new HumanoidAnimator({vrm,clips:states.map(n=>new AnimationClip(n,.3,[])),scale:1,floor:0,toonMaterialCount:0});
    const motion=createCharacterMotion(),input={moving:false,sitting:false,celebrate:false,interactedAt:-Infinity,motion};
    runtime.update(1/60,input,10000);expect(runtime.state).toBe('Idle');
    input.moving=true;runtime.update(1/60,input,10000);expect(runtime.state).toBe('Walk');motion.running=true;runtime.update(1/60,input,10000);expect(runtime.state).toBe('Run');
    motion.airborne=true;motion.jumpTime=.05;runtime.update(1/60,input,10000);expect(runtime.state).toBe('JumpStart');motion.jumpTime=.3;runtime.update(1/60,input,10000);expect(runtime.state).toBe('JumpLoop');
    motion.airborne=false;motion.landedAt=10000;runtime.update(1/60,input,10050);expect(runtime.state).toBe('Land');
    input.sitting=true;for(let i=0;i<30;i++)runtime.update(1/60,input,10200+i*16);expect(runtime.state).toBe('Seated');
    input.sitting=false;input.moving=false;input.interactedAt=11000;runtime.update(1/60,input,11050);expect(runtime.state).toBe('Interact');input.celebrate=true;runtime.update(1/60,input,11060);expect(runtime.state).toBe('Victory');
    const before=runtime.mixer.time;runtime.update(20,input,12000);expect(runtime.mixer.time-before).toBeLessThanOrEqual(.051);runtime.dispose();
  });
});
