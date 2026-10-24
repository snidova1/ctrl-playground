import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import type {PointerEvent, ReactElement} from 'react';
import {Vector3} from 'three';
import {analogInput, ANALOG_TRAVEL} from '@/features/habitat/analog-input';

// Node-only event-handler harness: execute the actual shared components without
// a browser, WebGL, an extra DOM dependency, or a production build.
const hooks = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  cleanups: [] as Array<() => void>,
  states: [] as unknown[],
}));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useRef: <T,>(current:T) => ({current}),
  useState: <T,>(initial:T) => [initial, (value:T) => { hooks.states.push(value); }],
  useCallback: <T,>(callback:T) => callback,
  useEffect: (effect:() => void | (() => void)) => { hooks.effects.push(effect); },
}));
import AnalogStick from '@/features/habitat/analog-stick';
import TouchRunButton from '@/features/habitat/touch-run-button';

type Pointer = PointerEvent<HTMLDivElement & HTMLButtonElement>;
interface Handlers {
  onPointerDown:(event:Pointer)=>void;
  onPointerMove:(event:Pointer)=>void;
  onPointerUp:(event:Pointer)=>void;
  onPointerCancel:(event:Pointer)=>void;
  onLostPointerCapture:(event:Pointer)=>void;
  onBlur:()=>void;
  onClick:(event:{detail:number})=>void;
  onKeyDown:(event:{key:string;repeat:boolean;preventDefault:()=>void})=>void;
  onContextMenu:(event:{preventDefault:()=>void})=>void;
  'aria-pressed':boolean;
  'aria-label':string;
  'data-game-control':string;
}
function mount(element:ReactElement) {
  for (const effect of hooks.effects.splice(0)) {
    const cleanup = effect();
    if (cleanup) hooks.cleanups.push(cleanup);
  }
  return element.props as Handlers;
}
function target() {
  const captured = new Set<number>();
  return {
    getBoundingClientRect:() => ({x:10, y:20, width:120, height:120}),
    setPointerCapture:vi.fn((id:number) => { captured.add(id); }),
    hasPointerCapture:(id:number) => captured.has(id),
    releasePointerCapture:vi.fn((id:number) => { captured.delete(id); }),
  };
}
function pointer(element:ReturnType<typeof target>, id=1, x=70, y=80, button=0):Pointer {
  return {currentTarget:element, pointerId:id, clientX:x, clientY:y, button,
    preventDefault:vi.fn(), stopPropagation:vi.fn()} as unknown as Pointer;
}
const source = (path:string) => readFileSync(new URL(`../../${path}`, import.meta.url),'utf8');
function simulateFrame({touch={x:0,z:0,run:false},held=[],forward=new Vector3(0,0,-1),formFocused=false,playable=true,focused=true,blocked=false}: {
  touch?:{x:number;z:number;run:boolean};held?:string[];forward?:Vector3;formFocused?:boolean;playable?:boolean;focused?:boolean;blocked?:boolean;
} = {}) {
  // Execute the scene's actual frame callback, not a second movement algorithm.
  // Only WebGL/orbit/model/collision boundaries are replaced with lightweight fakes.
  const scene=source('features/common-ground/lobby-scene.tsx');
  const start=scene.indexOf('useFrame(({camera,gl},delta)=>{')+'useFrame('.length;
  const end=scene.indexOf('\n  });',start);
  expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
  const pose={x:0,z:7,angle:0,moving:false},motion={current:{running:false}};
  const frame=runInNewContext(`(${scene.slice(start,end)}\n  })`,{
    pose,motion,controls:{current:null},keys:{current:new Set(held)},input:{current:touch},
    playable,focused:{current:focused},inForm:()=>formFocused,document:{activeElement:null},
    vectors:{forward:new Vector3(),right:new Vector3(),delta:new Vector3()},
    canStand:()=>!blocked,PLAYER_RADIUS:.34,fallback:{current:null},avatarReadyRef:{current:false},
    appearance:{gender:'female',variantId:'test'},presentedFrame:{current:null},
  }) as (state:unknown,delta:number)=>void;
  frame({camera:{getWorldDirection:(target:Vector3)=>target.copy(forward)},gl:{domElement:{setAttribute:()=>{}},info:{render:{frame:0,calls:1}}}},.05);
  return {pose,motion:motion.current,delta:new Vector3(pose.x,0,pose.z-7)};
}
let page:EventTarget & {hidden:boolean};
beforeEach(() => {
  hooks.states.length=0;
  page=Object.assign(new EventTarget(),{hidden:false});
  vi.stubGlobal('window',new EventTarget());
  vi.stubGlobal('document',page);
});
afterEach(() => {
  for (const cleanup of hooks.cleanups.splice(0)) cleanup();
  hooks.effects.length=0;
  vi.unstubAllGlobals();
});

describe('Common Ground shared analog and Run controls', () => {
  it('reuses Habitat analog unchanged and unmounts controls while a modal is open', () => {
    const lobby=source('features/common-ground/lobby.tsx');
    expect(lobby).toContain("import AnalogStick from '@/features/habitat/analog-stick'");
    expect(lobby).toContain('!modal&&!!guest&&<nav');
    expect(lobby).toContain('input.current.x=x;input.current.z=z;');
    expect(lobby).toContain('input.current.run=running;');
    expect(lobby).not.toContain('cg-pad');
    expect(lobby).toContain('playable={!modal&&!!guest}');
    expect(lobby).not.toContain('Enter Common Ground');
    expect(lobby).toContain('loadGuestIdentity(sessionStorage');
    expect(lobby).toContain("if(next==='avatar'&&!verified)");
  });

  it('keeps radial deadzone, proportional travel, finite input rejection and diagonal clamping', () => {
    expect(analogInput(1,1)).toMatchObject({x:0,z:0});
    expect(analogInput(ANALOG_TRAVEL*.56,0).x).toBeCloseTo(.5);
    const diagonal=analogInput(200,-200);
    expect(Math.hypot(diagonal.x,diagonal.z)).toBeCloseTo(1);
    expect(Math.hypot(diagonal.thumbX,diagonal.thumbY)).toBeCloseTo(ANALOG_TRAVEL);
    expect(analogInput(Infinity,0)).toEqual({x:0,z:0,thumbX:0,thumbY:0});
  });

  it('maps stick up/right to camera forward/right even after orbiting', () => {
    const scene=source('features/common-ground/lobby-scene.tsx');
    expect(scene).toContain('camera.getWorldDirection(forward)');
    expect(scene).toContain('right.set(-forward.z,0,forward.x)');
    expect(scene).toContain('right.x*x-forward.x*z');
    expect(scene).toContain('right.z*x-forward.z*z');
    for (const forward of [new Vector3(0,0,-1),new Vector3(-1,0,0),new Vector3(.6,0,.8)]) {
      const right=new Vector3(-forward.z,0,forward.x);
      const up=analogInput(0,-ANALOG_TRAVEL), side=analogInput(ANALOG_TRAVEL,0);
      expect(simulateFrame({forward,touch:{...up,run:false}}).delta.dot(forward)).toBeCloseTo(.15);
      expect(simulateFrame({forward,touch:{...side,run:false}}).delta.dot(right)).toBeCloseTo(.15);
    }
    expect(scene).toContain("held.has('ShiftLeft')||held.has('ShiftRight')");
    expect(scene).toContain("target.closest('[data-game-control=\"true\"]')");
  });

  it('executes the existing speed and motion Run branch for touch and both Shifts', () => {
    const walk=simulateFrame({touch:{x:0,z:-1,run:false}});
    const run=simulateFrame({touch:{x:0,z:-1,run:true}});
    expect(walk.delta.length()).toBeCloseTo(.15);
    expect(run.delta.length()).toBeCloseTo(.25);
    expect(walk.motion.running).toBe(false);
    expect(run.motion.running).toBe(true);
    for(const shift of ['ShiftLeft','ShiftRight']) {
      const keyboard=simulateFrame({held:['KeyW',shift]});
      expect(keyboard.delta.length()).toBeCloseTo(run.delta.length());
      expect(keyboard.motion.running).toBe(true);
    }
    expect(simulateFrame({touch:{x:1,z:1,run:true}}).delta.length()).toBeCloseTo(.25);
    expect(simulateFrame({touch:{x:.5,z:0,run:false}}).delta.length()).toBeCloseTo(.075);
    expect(simulateFrame({touch:{x:0,z:0,run:true}}).motion.running).toBe(false);
    expect(simulateFrame({touch:{x:1,z:0,run:true},blocked:true}).motion.running).toBe(false);
  });

  it('allows fresh touch input after using the header, while modal/blur/form keyboard remain blocked', () => {
    const touch={x:0,z:-1,run:true};
    const header=simulateFrame({touch,formFocused:true});
    expect(header.delta.length()).toBeCloseTo(.25);
    expect(header.motion.running).toBe(true);
    expect(simulateFrame({held:['KeyW','ShiftLeft'],formFocused:true}).pose.moving).toBe(false);
    expect(simulateFrame({touch,playable:false}).pose.moving).toBe(false);
    expect(simulateFrame({touch,focused:false}).pose.moving).toBe(false);
  });

  it('captures one analog pointer, prevents scroll/bubbling, and ignores other fingers', () => {
    const move=vi.fn(),element=target(),props=mount(AnalogStick({onMove:move}));
    const down=pointer(element,1,70,45);
    props.onPointerDown(down);
    expect(down.preventDefault).toHaveBeenCalled();
    expect(down.stopPropagation).toHaveBeenCalled();
    expect(element.setPointerCapture).toHaveBeenCalledWith(1);
    expect(move).toHaveBeenLastCalledWith({x:0,z:-1});
    props.onPointerDown(pointer(element,2,105,80));
    props.onPointerMove(pointer(element,2,105,80));
    props.onPointerUp(pointer(element,2));
    expect(move).toHaveBeenCalledTimes(1);
    props.onPointerMove(pointer(element,1,105,80));
    expect(move).toHaveBeenLastCalledWith({x:1,z:0});
  });

  it.each(['onPointerUp','onPointerCancel','onLostPointerCapture'] as const)('neutralizes analog on %s and releases ownership', end => {
    const move=vi.fn(),element=target(),props=mount(AnalogStick({onMove:move}));
    props.onPointerDown(pointer(element,1,105,80));
    props[end](pointer(element,1));
    expect(move).toHaveBeenLastCalledWith({x:0,z:0});
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1);
    props.onPointerMove(pointer(element,1,105,80));
    expect(move).toHaveBeenCalledTimes(2);
    props.onPointerDown(pointer(element,2,70,45));
    expect(move).toHaveBeenLastCalledWith({x:0,z:-1});
  });

  it.each(['blur','visibilitychange','unmount'])('cleans both inputs and thumb on %s', trigger => {
    const input={x:0,z:0,run:false},stick=target(),run=target();
    const analog=mount(AnalogStick({onMove:axes=>Object.assign(input,axes)}));
    const button=mount(TouchRunButton({onRun:value=>{input.run=value;}}));
    analog.onPointerDown(pointer(stick,1,105,80));
    button.onPointerDown(pointer(run,2));
    expect(input).toEqual({x:1,z:0,run:true});
    if(trigger==='blur')window.dispatchEvent(new Event('blur'));
    else if(trigger==='visibilitychange'){page.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}
    else for(const cleanup of hooks.cleanups.splice(0))cleanup();
    expect(input).toEqual({x:0,z:0,run:false});
    expect(stick.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(run.releasePointerCapture).toHaveBeenCalledWith(2);
    expect(hooks.states).toContainEqual({x:0,z:0,thumbX:0,thumbY:0});
    analog.onPointerMove(pointer(stick,1,105,80));
    expect(input).toEqual({x:0,z:0,run:false});
  });

  it('supports simultaneous steering/run and does not let an unrelated pointer stop Run', () => {
    const input={x:0,z:0,run:false},stick=target(),run=target();
    const analog=mount(AnalogStick({onMove:axes=>Object.assign(input,axes)}));
    const button=mount(TouchRunButton({onRun:value=>{input.run=value;}}));
    analog.onPointerDown(pointer(stick,1,70,45));
    button.onPointerDown(pointer(run,2));
    button.onPointerCancel(pointer(run,3));
    expect(input).toEqual({x:0,z:-1,run:true});
    analog.onPointerUp(pointer(stick,1));
    expect(input).toEqual({x:0,z:0,run:true});
    button.onPointerUp(pointer(run,2));
    button.onClick({detail:1});
    expect(input.run).toBe(false);
  });

  it.each(['onPointerUp','onPointerCancel','onLostPointerCapture'] as const)('resets Run on %s without affecting steering', end => {
    const run=vi.fn(),element=target(),props=mount(TouchRunButton({onRun:run}));
    props.onPointerDown(pointer(element));
    props[end](pointer(element));
    expect(run.mock.calls.map(([value])=>value)).toEqual([true,false]);
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('exposes native accessible keyboard toggle, blocks repeats and resets when focus leaves', () => {
    const run=vi.fn(),props=mount(TouchRunButton({onRun:run}));
    expect(props['aria-pressed']).toBe(false);
    expect(props['aria-label']).toContain('keyboard to toggle');
    expect(props['data-game-control']).toBe('true');
    props.onClick({detail:0});
    props.onClick({detail:0});
    props.onClick({detail:0});
    expect(run.mock.calls.map(([value])=>value)).toEqual([true,false,true]);
    const preventDefault=vi.fn();
    props.onKeyDown({key:' ',repeat:true,preventDefault});
    expect(preventDefault).toHaveBeenCalled();
    props.onBlur();
    expect(run).toHaveBeenLastCalledWith(false);
  });

  it('does not activate either control if pointer capture fails or a mouse secondary button is used', () => {
    const move=vi.fn(),run=vi.fn(),element=target();
    element.setPointerCapture.mockImplementation(()=>{throw new Error('pointer no longer active');});
    const analog=mount(AnalogStick({onMove:move})),button=mount(TouchRunButton({onRun:run}));
    analog.onPointerDown(pointer(element,1,105,80,2));
    button.onPointerDown(pointer(element,2,70,80,2));
    analog.onPointerDown(pointer(element,1,105,80));
    button.onPointerDown(pointer(element,2));
    expect(move).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('scopes mobile controls with safe-area offsets and blocks touch scrolling without intercepting the camera', () => {
    const css=source('features/common-ground/lobby.css');
    expect(css).not.toContain('cg-pad');
    expect(css).toContain('.cg-touch-controls{display:none}');
    expect(css).toContain('@media(pointer:coarse),(max-width:700px)');
    expect(css).toContain('touch-action:none');
    expect(css).toContain('env(safe-area-inset-bottom,0px)');
    expect(css).toContain('.cg-touch-controls>*{pointer-events:auto}');
    expect(css).toContain('z-index:4;pointer-events:none');
  });
});
