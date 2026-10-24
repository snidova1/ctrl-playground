'use client';
/* eslint-disable @next/next/no-img-element -- Existing local WebP catalog art. */
import {getBuildAsset} from '@/features/plaza/build-assets';
import {getFurniturePlacementBounds} from './furniture-placement';
import {behaviorSchema, type WorldObject} from './types';
import './build-inspector.css';

export interface BuildInspectorProps {
 objects:readonly WorldObject[];
 selectedId:string|null;
 worlds:ReadonlyArray<{id:string;name:string}>;
 onSelect:(id:string|null)=>void;
 onPatch:(values:Partial<WorldObject>)=>void;
 onDuplicate:()=>void;
 onDelete:()=>void;
 onBrowse:()=>void;
 onMove?:()=>void;
}

const TURN_PRESETS = [0, 90, 180, 270] as const;
const SIZE_PRESETS = [
 {value:.5, label:'Small', mark:'S'},
 {value:1, label:'Original', mark:'M'},
 {value:2, label:'Large', mark:'L'},
 {value:3, label:'Grand', mark:'XL'},
] as const;
const BEHAVIOR_HINTS:Record<WorldObject['behavior'],string> = {
 decoration:'A visual detail you can walk through.',
 solid:'Blocks walking through its footprint.',
 seat:'Players can sit here and stand up again.',
 light:'Players can turn this light on or off.',
 door:'Players can open or close this doorway.',
 switch:'Activates another object. Choose its target below.',
 spin:'Rotates while the world is playing.',
 portal:'Takes players to the destination world you choose.',
 checkpoint:'Marks a player’s progress through the course.',
 finish:'Marks the end of the course.',
};
const normalizeTurn = (radians:number) => Math.atan2(Math.sin(radians), Math.cos(radians));
const turnDegrees = (radians:number) => ((Math.round(radians * 180 / Math.PI) % 360) + 360) % 360;

export default function BuildInspector({objects,selectedId,worlds,onSelect,onPatch,onDuplicate,onDelete,onBrowse,onMove}:BuildInspectorProps){
 const chosen=objects.find(object=>object.id===selectedId);
 const asset=chosen?getBuildAsset(chosen.assetId):undefined;
 const bounds=chosen?getFurniturePlacementBounds(chosen):null;
 const degrees=chosen?turnDegrees(chosen.rotation):0;
 const transform=(key:'x'|'y'|'z'|'rotation'|'scale',label:string)=>chosen&&<label key={key} className='hb-build-slider'>
  <span>{label}</span>
  <input aria-label={key} type='range'
   min={key==='scale'?.25:key==='rotation'?-Math.PI:key==='y'?0:key==='z'?-8:-14}
   max={key==='scale'?4:key==='rotation'?Math.PI:key==='y'?8:key==='z'?12:14}
   step={key==='rotation'?.01:.25}
   value={key==='rotation'?normalizeTurn(chosen.rotation):chosen[key]}
   aria-valuetext={key==='rotation'?`${degrees} degrees`:key==='scale'?`${chosen.scale.toFixed(2)} times original`:`${chosen[key].toFixed(2)} meters`}
   onChange={event=>onPatch({[key]:Number(event.target.value)})}/>
  <output>{key==='rotation'?`${degrees}°`:key==='scale'?`${chosen.scale.toFixed(2)}×`:`${chosen[key].toFixed(2)} m`}</output>
 </label>;
 return <aside className='hb-inspector hb-build-inspector' aria-label='Selected object controls'>
  <div className='hb-build-section-heading'><span className='hb-build-eyebrow'>IN YOUR WORLD</span><span>{objects.length} / 120</span></div>
  <select aria-label='Placed objects' value={chosen?.id??''} onChange={event=>onSelect(event.target.value||null)}>
   <option value=''>Placed objects / {objects.length}</option>
   {objects.map(object=><option key={object.id} value={object.id}>{object.name}</option>)}
  </select>
  {chosen?<>
   <div className='hb-build-chosen' key={chosen.id}>
    <div className='hb-inspector-art'>{asset?<img src={asset.thumbnailUrl} width={76} height={76} alt=''/ >:<span className='hb-build-piece-mark' aria-hidden='true'>◇</span>}</div>
    <div><span className='hb-build-eyebrow'>SELECTED PIECE</span><h2>{chosen.name}</h2><span>{asset?.category??'Interactive piece'} · {chosen.behavior}</span></div>
   </div>
   <label className='hb-inspector-name'>Name<input aria-label='Name' value={chosen.name} maxLength={60} onChange={event=>onPatch({name:event.target.value})}/></label>
   <section className='hb-build-transform' aria-label='Turn & size'>
    <div className='hb-inspector-group-heading'><h3>Turn & size</h3><span>{degrees}° · {chosen.scale.toFixed(2)}×</span></div>
    <fieldset className='hb-inspector-presets'><legend>Face a direction</legend>
     <div className='hb-inspector-turns'>{TURN_PRESETS.map(degree=><button key={degree} type='button' aria-label={`Face ${degree} degrees`}
      aria-pressed={Math.abs(normalizeTurn(chosen.rotation-degree*Math.PI/180))<.005}
      onClick={()=>onPatch({rotation:normalizeTurn(degree*Math.PI/180)})}>
      <span className='hb-inspector-direction' style={{transform:`rotate(${-degree}deg)`}} aria-hidden='true'>↑</span><span>{degree}°</span>
     </button>)}</div>
     <div className='hb-inspector-nudges'><button type='button' aria-label='Turn left 45 degrees' onClick={()=>onPatch({rotation:normalizeTurn(chosen.rotation+Math.PI/4)})}>↶ <span>45° left</span></button><button type='button' aria-label='Turn right 45 degrees' onClick={()=>onPatch({rotation:normalizeTurn(chosen.rotation-Math.PI/4)})}><span>45° right</span> ↷</button></div>
    </fieldset>
    <fieldset className='hb-inspector-presets'><legend>Find the right size</legend>
     <div className='hb-inspector-sizes'>{SIZE_PRESETS.map(preset=><button key={preset.value} type='button' aria-label={`${preset.label} size, ${preset.value} times original`}
      aria-pressed={Math.abs(chosen.scale-preset.value)<.001} onClick={()=>onPatch({scale:preset.value})}>
      <span className='hb-inspector-size-mark' data-size={preset.mark} aria-hidden='true'>▰</span><span>{preset.label}</span><small>{preset.value}×</small>
     </button>)}</div>
    </fieldset>
   </section>
   {bounds&&<div className='hb-inspector-measurements' aria-label='Scaled model dimensions'>
    <span className='hb-build-eyebrow'>MODEL SIZE</span>
    <dl>{([{label:'Width',index:0},{label:'Depth',index:2},{label:'Height',index:1}] as const).map(dimension=><div key={dimension.label}><dt>{dimension.label}</dt><dd>{(bounds[dimension.index]*chosen.scale).toFixed(2)} <small>m</small></dd></div>)}</dl>
    <p>At this scale · measured along the piece’s own axes.</p>
   </div>}
   <details className='hb-build-details'><summary>Fine-tune placement <span>↗</span></summary><p>For precise adjustments. Camera placement is available below.</p>{transform('x','Across')}{transform('y','Height')}{transform('z','Depth')}{transform('rotation','Turn')}{transform('scale','Size')}</details>
   <details className='hb-build-details' key={`${chosen.id}-${chosen.behavior}`} open={!['decoration','solid'].includes(chosen.behavior)}>
    <summary>How it behaves <span>↗</span></summary>
    <label>Behavior<select value={chosen.behavior} onChange={event=>onPatch({behavior:event.target.value as WorldObject['behavior'],target:''})}>{behaviorSchema.options.map(behavior=><option key={behavior}>{behavior}</option>)}</select></label>
    <p className='hb-inspector-behavior-hint'>{BEHAVIOR_HINTS[chosen.behavior]}</p>
    {chosen.behavior==='switch'&&<label>Target<select value={chosen.target} onChange={event=>onPatch({target:event.target.value})}><option value=''>Select object</option>{objects.filter(object=>object.id!==chosen.id).map(object=><option key={object.id} value={object.id}>{object.name}</option>)}</select></label>}
    {chosen.behavior==='portal'&&<label>Destination<select value={chosen.target} onChange={event=>onPatch({target:event.target.value})}><option value=''>Select world</option>{worlds.map(world=><option key={world.id} value={world.id}>{world.name}</option>)}</select></label>}
   </details>
   <div className='hb-build-object-actions'>
    {onMove&&<button type='button' className='hb-build-camera-move' onClick={onMove}>Posisikan lewat kamera</button>}
    <button type='button' disabled={objects.length>=120} title={objects.length>=120?'World is full (120 pieces)':'Create another copy of this piece'} onClick={onDuplicate}>Duplicate</button>
    <button type='button' className='hb-build-delete' title='Remove this piece; use Undo in the workshop to restore it' onClick={onDelete}>Delete</button>
   </div>
  </>:<div className='hb-build-inspector-empty'><span aria-hidden='true'>↖</span><h2>A place for your next idea.</h2><p>Choose a piece from your world to arrange it, or find something lovely on the shelf.</p><button type='button' onClick={onBrowse}>Browse pieces</button></div>}
 </aside>;
}
