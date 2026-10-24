'use client';
/* eslint-disable @next/next/no-img-element -- Local catalog thumbnail, not a network image. */
import {useEffect,useRef} from 'react';
import {getBuildAsset} from '@/features/plaza/build-assets';
import type {WorldObject} from './types';
import {getFurniturePlacementBounds,type PlacementPreview} from './furniture-placement';
import {getPlacementShortcut,placementHeading} from './placement-shortcuts';
import './furniture-placement.css';
export default function FurniturePlacementControls({object,preview,onPlace,onRotate,onCancel}:{object:WorldObject;preview:PlacementPreview|null;onPlace:()=>void;onRotate:()=>void;onCancel:()=>void}){
 const callbacks=useRef({onRotate,onCancel,onPlace,valid:!!preview?.valid});callbacks.current={onRotate,onCancel,onPlace,valid:!!preview?.valid};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{
  const interactive=e.target instanceof Element&&!!e.target.closest('input,textarea,select,button,a,[contenteditable="true"],[role="dialog"]');
  const action=getPlacementShortcut(e,interactive,callbacks.current.valid);
  if(!action)return;e.preventDefault();
  if(action==='cancel')callbacks.current.onCancel();
  if(action==='rotate')callbacks.current.onRotate();
  if(action==='place')callbacks.current.onPlace();
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const asset=getBuildAsset(object.assetId),bounds=getFurniturePlacementBounds(object).map(value=>(value*object.scale).toFixed(2));
 const heading=placementHeading(object.rotation);
 return <section className={`hb-placement${preview?.valid?' is-valid':' is-invalid'}`} aria-label='Posisikan perabot' data-placement-valid={!!preview?.valid} data-placement-x={preview?.object.x} data-placement-z={preview?.object.z} data-placement-id={object.id}>
  <div className='hb-placement-caption'>
   {asset&&<img className='hb-placement-thumbnail' src={asset.thumbnailUrl} width={48} height={48} alt=''/ >}
   <div className='hb-placement-piece'><span className='hb-placement-eyebrow'>ARRANGE YOUR HABITAT</span><strong>{object.name}</strong><span className='hb-placement-measures'>{bounds[0]} × {bounds[2]} m <i aria-hidden='true'>·</i> {heading}°</span></div>
   <span className='hb-placement-instructions'>Geser kamera untuk membidik · analog untuk berjalan</span>
  </div>
  <div className='hb-placement-reticle' aria-hidden='true'><i/></div>
  <output className='hb-placement-status' role='status'><span className='hb-placement-status-mark' aria-hidden='true'>{preview?.valid?'✓':'◇'}</span>{preview?.reason??'Arahkan kamera ke lantai…'}</output>
  <div className='hb-placement-actions'><button type='button' aria-label='Putar perabot' onClick={onRotate}><span aria-hidden='true'>↻</span> Putar<kbd>R</kbd></button><button type='button' aria-label='Batalkan penempatan' onClick={onCancel}>Batal<kbd>Esc</kbd></button><button type='button' className='hb-placement-confirm' aria-label='Pasang perabot' disabled={!preview?.valid} onClick={onPlace}>Pasang <span aria-hidden='true'>✓</span><kbd>↵</kbd></button></div>
 </section>;
}
