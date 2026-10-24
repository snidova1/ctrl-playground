import {describe,it,expect,vi} from 'vitest';
import {Group} from 'three';
import {VRMExpression,VRMExpressionManager,type VRM} from '@pixiv/three-vrm';
import {CharacterExpressionController} from '@/features/plaza/characters/expression-controller';
import {syncGestureExpression} from '@/features/plaza/characters/gesture-expression';
function fixture(names=['happy','relaxed','sad','angry','blink']){
 const manager=new VRMExpressionManager();for(const name of names)manager.registerExpression(new VRMExpression(name));
 const vrm={scene:new Group(),expressionManager:manager} as unknown as VRM;vrm.scene.userData.ctrlExpression='sad';
 const controller=new CharacterExpressionController(vrm,{seed:1});
 const advance=()=>{for(let i=0;i<40;i++)controller.update(.01);};
 const value=(name:string)=>manager.getValue(name)??0;
 return {vrm,controller,advance,value};
}
describe('gesture mood shares AIRI/Amica face arbitration',()=>{
 it('uses a temporary happy cheer and restores the latest creator baseline on completion',()=>{
  const f=fixture();let previous=syncGestureExpression(f.controller,null,'victory');f.advance();
  expect(f.value('happy')).toBe(.55);expect(f.value('sad')).toBe(0);expect(f.vrm.scene.userData.ctrlExpression).toBe('sad');
  f.vrm.scene.userData.ctrlExpression='angry';f.advance();expect(f.value('happy')).toBe(.55);
  previous=syncGestureExpression(f.controller,previous,null);f.advance();
  expect(previous).toBeNull();expect(f.value('angry')).toBe(.45);expect(f.value('happy')).toBe(0);f.controller.dispose();
 });
 it('replaces cheer with a wave mood, then cancels without leaving eye or expression weights stuck',()=>{
  const f=fixture();syncGestureExpression(f.controller,null,'victory');f.advance();
  syncGestureExpression(f.controller,'victory','interact');f.advance();expect(f.value('relaxed')).toBe(.65);expect(f.value('happy')).toBe(0);
  syncGestureExpression(f.controller,'interact',null);f.advance();expect(f.value('sad')).toBe(.65);expect(f.value('relaxed')).toBe(0);f.controller.dispose();
 });
 it('does not restart the same gesture mood on every render frame',()=>{
  const f=fixture();const set=vi.spyOn(f.controller,'setExpression');syncGestureExpression(f.controller,null,'victory');
  for(let i=0;i<60;i++)syncGestureExpression(f.controller,'victory','victory');
  expect(set).toHaveBeenCalledOnce();f.advance();expect(f.value('happy')).toBe(.55);f.controller.dispose();
 });
 it('falls back to the saved baseline if a new gesture has no supported morph',()=>{
  const f=fixture(['happy','sad','blink']);syncGestureExpression(f.controller,null,'victory');f.advance();
  syncGestureExpression(f.controller,'victory','interact');f.advance();expect(f.value('happy')).toBe(0);expect(f.value('sad')).toBe(.65);f.controller.dispose();
 });
 it('does not introduce a second VRM update or timer and is inert after controller disposal',()=>{
  const f=fixture();f.controller.dispose();const set=vi.spyOn(f.vrm.expressionManager!,'setValue');
  syncGestureExpression(f.controller,null,'victory');f.controller.update(1);expect(set).not.toHaveBeenCalled();
 });
});
