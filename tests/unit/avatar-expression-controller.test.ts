import {describe,expect,it,vi} from 'vitest';
import {AnimationClip,Group} from 'three';
import {VRMExpression,VRMExpressionManager,type VRM} from '@pixiv/three-vrm';
import {CharacterExpressionController} from '@/features/plaza/characters/expression-controller';
import {HumanoidAnimator} from '@/features/plaza/characters/animation';
import {applyCharacterExpression} from '@/features/plaza/characters/accessories';
import {characterBudgets,defaultAppearance} from '@/features/plaza/characters/catalog';
import type {LoadedCharacter} from '@/features/plaza/characters/loader';

function fixture(names=['neutral','happy','sad','angry','relaxed','blink','blinkLeft','blinkRight','aa','custom']){
  const expressionManager=new VRMExpressionManager();
  for(const name of names)expressionManager.registerExpression(new VRMExpression(name));
  const vrm={scene:new Group(),expressionManager,update:vi.fn(),springBoneManager:{reset:vi.fn()}} as unknown as VRM;
  const value=(name:string)=>expressionManager.getValue(name)??0;
  const appearance=(expressionId:typeof defaultAppearance.expressionId)=>applyCharacterExpression(vrm,{...defaultAppearance,expressionId});
  return {vrm,expressionManager,value,appearance};
}
function advance(controller:CharacterExpressionController,seconds:number){
  for(let left=seconds;left>1e-9;left-=.01)controller.update(Math.min(.01,left));
}
function duringBlink(controller:CharacterExpressionController,value:(name:string)=>number){
  for(let i=0;i<700;i++){
    controller.update(.01);
    if(value('blink')>.6)return;
  }
  throw new Error('Seeded blink never started');
}
function loaded(vrm:VRM):LoadedCharacter{
  return {vrm,clips:['Idle','Walk','Run','JumpStart','JumpLoop','Land','SitDown','Seated','Interact','Victory'].map(name=>new AnimationClip(name,1,[])),scale:1,floor:0,toonMaterialCount:0};
}

// Real three-vrm managers, no renderer, wall-clock timers or downloaded models.
describe('single-owner expression lifecycle',()=>{
  it('blends rapid happy → sad → neutral from the rendered weights and writes exact terminal zero',()=>{
    const {vrm,value,expressionManager}=fixture();
    expressionManager.setValue('aa',.42);expressionManager.setValue('custom',.31);
    const controller=new CharacterExpressionController(vrm,{seed:1});
    controller.setExpression('happy');advance(controller,.08);
    const happy=value('happy');expect(happy).toBeGreaterThan(0);expect(happy).toBeLessThan(.55);
    controller.setExpression('sad');controller.update(0);
    expect(value('happy')).toBe(happy);expect(value('sad')).toBe(0);
    advance(controller,.07);expect(value('sad')).toBeGreaterThan(0);expect(value('happy')).toBeLessThan(happy);
    controller.setExpression('neutral');advance(controller,.3);
    for(const name of ['neutral','happy','sad','angry','relaxed'])expect(value(name)).toBe(0);
    advance(controller,.5);expect(value('happy')).toBe(0);expect(value('sad')).toBe(0);
    expect(value('aa')).toBe(.42);expect(value('custom')).toBe(.31);
  });

  it('turns legacy appearance writes into a smooth persistent baseline, even on reapply',()=>{
    const {vrm,value,appearance}=fixture();appearance('happy');
    const controller=new CharacterExpressionController(vrm,{seed:1});controller.update(0);
    expect(value('happy')).toBe(.55);
    appearance('sad'); // Legacy setter writes weights AND ctrlExpression; no renderer update yet.
    controller.update(0);expect(value('happy')).toBe(.55);expect(value('sad')).toBe(0);
    advance(controller,.1);const sad=value('sad');expect(sad).toBeGreaterThan(0);expect(sad).toBeLessThan(.65);
    appearance('sad');controller.update(0);expect(value('sad')).toBe(sad);
    advance(controller,.2);expect(value('sad')).toBe(.65);expect(value('happy')).toBe(0);
    appearance('neutral');advance(controller,.3);expect(value('sad')).toBe(0);expect(value('neutral')).toBe(0);
  });

  it('restores the latest creator baseline after a replaceable temporary emote, never a stale reset',()=>{
    const {vrm,value,appearance}=fixture();appearance('happy');
    const controller=new CharacterExpressionController(vrm,{seed:2});
    controller.setExpression('sad',undefined,.4);advance(controller,.25);expect(value('sad')).toBe(.65);
    appearance('angry');controller.update(0);expect(value('sad')).toBe(.65);expect(value('angry')).toBe(0);
    controller.setExpression('relaxed',undefined,.5);advance(controller,.25);
    expect(value('relaxed')).toBe(.65);expect(value('sad')).toBe(0);
    advance(controller,.15);expect(value('relaxed')).toBe(.65); // Old sad deadline cannot reset relaxed.
    advance(controller,.4);expect(value('angry')).toBe(.45);expect(value('relaxed')).toBe(0);
    controller.setExpression('happy');advance(controller,.25);controller.resetExpression();advance(controller,.25);
    expect(value('angry')).toBe(.45);expect(value('happy')).toBe(0);
  });

  it('filters absent morphs, resolves case-insensitive supported names and leaves other channels alone',()=>{
    const {vrm,value,expressionManager}=fixture(['Happy','blinkLeft','blinkRight','aa']);
    expressionManager.setValue('aa',.6);
    const write=vi.spyOn(expressionManager,'setValue');
    const controller=new CharacterExpressionController(vrm,{seed:3});
    expect(controller.availableExpressions).toEqual(['neutral','happy']);
    expect(controller.setExpression('think')).toBe(false);expect(controller.setExpression('sad')).toBe(false);
    expect(controller.setExpression('HAPPY',2)).toBe(true);advance(controller,.3);expect(value('Happy')).toBe(1);
    expect(value('aa')).toBe(.6);
    expect(write.mock.calls.every(([name])=>['Happy','blinkLeft','blinkRight'].includes(name))).toBe(true);
    controller.setExpression('neutral');advance(controller,.3);expect(value('Happy')).toBe(0);
    const bare={scene:new Group()} as unknown as VRM;
    const absent=new CharacterExpressionController(bare);expect(absent.setExpression('sad')).toBe(false);
    expect(()=>{absent.update(.1);absent.dispose();}).not.toThrow();
  });

  it('ignores invalid deltas and clamps non-finite intensity without poisoning weights',()=>{
    const {vrm,value}=fixture();const controller=new CharacterExpressionController(vrm,{seed:4});
    controller.setExpression('sad',Infinity);advance(controller,.3);expect(value('sad')).toBe(0);
    controller.setExpression('sad',-2);advance(controller,.3);expect(value('sad')).toBe(0);
    controller.setExpression('sad',.4);advance(controller,.05);const before=value('sad');
    for(const dt of [NaN,Infinity,-1])controller.update(dt);
    expect(value('sad')).toBe(before);advance(controller,.3);expect(value('sad')).toBe(.4);
  });

  it('fades to neutral when an appearance requests a missing morph instead of manufacturing it',()=>{
    const {vrm,value,appearance}=fixture(['happy','blink']);appearance('happy');
    const controller=new CharacterExpressionController(vrm,{seed:1});
    appearance('sad');controller.update(0);expect(value('happy')).toBe(.55);
    advance(controller,.3);expect(value('happy')).toBe(0);expect(vrm.expressionManager!.getExpression('sad')).toBeNull();
  });

  it('clears only owned channels, cancels pending restore, and is inert after idempotent dispose',()=>{
    const {vrm,value,expressionManager}=fixture();expressionManager.setValue('aa',.7);
    const controller=new CharacterExpressionController(vrm,{seed:5});controller.setExpression('happy',1,.5);advance(controller,.3);
    controller.dispose();expect(value('happy')).toBe(0);expect(value('blink')).toBe(0);expect(value('aa')).toBe(.7);
    const write=vi.spyOn(expressionManager,'setValue');
    controller.dispose();controller.update(10);controller.resetExpression();expect(controller.setExpression('sad')).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
});

describe('blink arbitration and open-eye handoff',()=>{
  it('keeps the open-eye handoff even when expression blending is configured as instantaneous',()=>{
    const {vrm,value}=fixture();const controller=new CharacterExpressionController(vrm,{seed:7,blendDuration:0});
    duringBlink(controller,value);controller.setExpression('happy');controller.update(.01);
    expect(value('blink')).toBeGreaterThan(0);expect(value('happy')).toBe(0);
    advance(controller,.06);expect(value('blink')).toBe(0);expect(value('happy')).toBe(.55);
  });

  it('opens an in-flight blink before fading happy in, then stays suppressed while happy owns the eyes',()=>{
    const {vrm,value}=fixture();const controller=new CharacterExpressionController(vrm,{seed:7});
    duringBlink(controller,value);const blink=value('blink');
    controller.setExpression('happy');controller.update(.01);
    expect(value('blink')).toBeLessThan(blink);expect(value('happy')).toBe(0);
    advance(controller,.35);expect(value('happy')).toBe(.55);expect(value('blink')).toBe(0);
    for(let i=0;i<1000;i++){controller.update(.01);expect(value('blink')).toBe(0);}
  });

  it('does not resume halfway through a suppressed cycle when suppression is released',()=>{
    const {vrm,value}=fixture();const controller=new CharacterExpressionController(vrm,{seed:7,blendDuration:.01});
    duringBlink(controller,value);controller.setExpression('happy');advance(controller,.07);
    expect(value('blink')).toBe(0);expect(value('happy')).toBe(.55);
    controller.setExpression('neutral');advance(controller,.02);expect(value('happy')).toBe(0);
    for(let i=0;i<4;i++){controller.update(.01);expect(value('blink')).toBe(0);}
    // It must eventually blink again: suppression is scoped, not a stuck global flag.
    duringBlink(controller,value);expect(value('blink')).toBeGreaterThan(.6);
  });

  it('honors model blink-override metadata but does not suppress every non-neutral expression',()=>{
    const {vrm,value,expressionManager}=fixture();expressionManager.getExpression('angry')!.overrideBlink='block';
    const controller=new CharacterExpressionController(vrm,{seed:8});controller.setExpression('angry');advance(controller,.3);
    for(let i=0;i<700;i++){controller.update(.01);expect(value('blink')).toBe(0);}
    controller.setExpression('sad');advance(controller,.3);duringBlink(controller,value);expect(value('sad')).toBe(.65);
  });

  it('supports independent left/right blink morphs when a combined blink is absent',()=>{
    const {vrm,value}=fixture(['blinkLeft','blinkRight']);const controller=new CharacterExpressionController(vrm,{seed:9});
    let seen=false;
    for(let i=0;i<700;i++){controller.update(.01);expect(value('blinkLeft')).toBe(value('blinkRight'));seen ||= value('blinkLeft')>.5;}
    expect(seen).toBe(true);controller.dispose();expect(value('blinkLeft')).toBe(0);expect(value('blinkRight')).toBe(0);
  });

  it('replays identical seeds deterministically, while distinct avatars do not blink in lockstep',()=>{
    const a=fixture(),b=fixture(),replay=fixture();
    const ca=new CharacterExpressionController(a.vrm,{seed:11}),cb=new CharacterExpressionController(b.vrm,{seed:12}),cr=new CharacterExpressionController(replay.vrm,{seed:11});
    let different=0;
    for(let i=0;i<1400;i++){
      ca.update(.01);cb.update(.01);cr.update(.01);
      expect(a.value('blink')).toBe(replay.value('blink'));
      if(a.value('blink')!==b.value('blink'))different++;
    }
    expect(different).toBeGreaterThan(20);
  });
});

describe('HumanoidAnimator expression integration',()=>{
  it('uses one expression/blink controller after the mixer and exactly one VRM update per fixed step',()=>{
    const {vrm,value,appearance}=fixture();appearance('happy');const animator=new HumanoidAnimator(loaded(vrm));
    expect(value('happy')).toBe(.55);expect(vrm.update).toHaveBeenCalledTimes(1); // Existing constructor update(0).
    const order:string[]=[];
    vi.spyOn(animator.mixer,'update').mockImplementation(()=>{order.push('mixer');return animator.mixer;});
    const expressionUpdate=animator.expressions.update.bind(animator.expressions);
    vi.spyOn(animator.expressions,'update').mockImplementation(dt=>{order.push('expression');expressionUpdate(dt);});
    vi.mocked(vrm.update).mockImplementation(()=>{order.push('vrm');});vi.mocked(vrm.update).mockClear();
    const input={moving:true,sitting:false,celebrate:false,interactedAt:-10000};
    appearance('sad');animator.update(characterBudgets.fixedStep,input,10000);
    expect(order).toEqual(['mixer','expression','vrm']);expect(vrm.update).toHaveBeenCalledTimes(1);
    expect(value('happy')).toBeGreaterThan(0);expect(value('sad')).toBeLessThan(.65);expect(animator.state).toBe('Walk');
    for(let i=0;i<30;i++)animator.update(characterBudgets.fixedStep,input,10000);
    expect(value('happy')).toBe(0);expect(value('sad')).toBe(.65);
    animator.dispose();expect(value('sad')).toBe(0);expect(value('blink')).toBe(0);
    const calls=vi.mocked(vrm.update).mock.calls.length;animator.update(.05,input,10000);expect(vrm.update).toHaveBeenCalledTimes(calls);
  });

  it('seeds default blink timing per scene instance, not the shared model or global elapsed time',()=>{
    const a=fixture(),b=fixture();const aa=new HumanoidAnimator(loaded(a.vrm)),ab=new HumanoidAnimator(loaded(b.vrm));
    const input={moving:false,sitting:false,celebrate:false,interactedAt:-10000};let different=false;
    for(let i=0;i<800;i++){
      aa.update(characterBudgets.fixedStep,input,10000);ab.update(characterBudgets.fixedStep,input,10000);
      different ||= a.value('blink')!==b.value('blink');
    }
    expect(different).toBe(true);aa.dispose();ab.dispose();
  });
});
