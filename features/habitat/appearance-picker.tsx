'use client';
/* eslint-disable @next/next/no-img-element -- Local WebP captures of the actual shared avatar renderer. */

import type {CSSProperties, ReactNode} from 'react';
import {
  availableAuthoredLooks, availableHairStyles, decorationCatalog, decorationDefaults,
  eyeVariants, hairVariants, modularCollectionEnabled, newModularAppearance,
  normalizeAppearance, outfitVariants, resolveCharacter, skinVariants,
  type CharacterAppearance, type DecorationKey,
} from '@/features/plaza/characters/catalog';
import {airiLookPresets} from '@/features/plaza/characters/airi-look-presets';
import {
  modularFamilies, modularFamilyLabels, modularOptions, type ModularAppearance,
} from '@/features/plaza/characters/modular-catalog';
import {availableWardrobeStyles} from '@/features/plaza/characters/wardrobe-catalog';
import {
  accessoryStyles, applyAccessoryStyle, clearAvatarAccessories, matchesAccessoryStyle,
} from '@/features/plaza/characters/accessory-styles';
import {lookThumbnail,styleThumbnail,presetThumbnail} from './appearance-thumbnails';
import './appearance-picker.css';

type Section = 'looks' | 'hair' | 'outfit' | 'details';
type Choice = {id: string; name: string};
const accessoryLabels: Partial<Record<DecorationKey, string>> = {
  headwearId: 'Headwear', eyewearId: 'Eyewear', earringId: 'Earrings',
  neckwearId: 'Neckwear', backwearId: 'Carry & back', accessoryColorId: 'Accessory color',
};
const presetDetails: Record<typeof airiLookPresets[number]['id'], string> = {
  'a-cozy': 'Original bob · cardigan & shorts',
  'a-evening': 'Chin-length bob · lace tank & shorts',
  'a-sage': 'Long bob · sleeveless cardigan · sage tint',
  'b-street': 'Original long hair · varsity layers',
  'b-off-duty': 'Loose long hair · graphic top · clay tint',
  'b-slate': 'Short back · varsity vest · slate tint',
};

function Check({active}: {active: boolean}) {
  return <span className='ctrl-picker-check' aria-hidden='true'>{active ? '✓' : ''}</span>;
}

/** Deliberately illustrative, not model thumbnails. Geometry still comes from the catalog. */
function HairDrawing({id, look = 'original', gender = 'female'}: {id: string; look?: string; gender?: CharacterAppearance['gender']}) {
  const style = id === 'source' ? (gender === 'male' ? 'short' : look === 'airi' ? 'bob' : look === 'airi-b' ? 'long-ribbon' : look === 'alternate' ? 'short' : 'long') : id;
  const long = /long|straight|loose|ponytail|twin|layered/.test(style);
  const short = /short|chin/.test(style);
  const bob = /bob/.test(style);
  const tail = /tail|layered/.test(style);
  return <svg viewBox='0 0 100 110' fill='none' aria-hidden='true' focusable='false'>
    <path d='M14 107c3-21 15-29 36-29s33 8 36 29' className='ctrl-picker-drawing-cloth'/>
    <path d={long ? 'M28 38C25 6 76 7 73 39l9 54-28-4-35 5Z' : bob ? 'M25 39C23 6 79 6 76 40l2 29-55 1Z' : 'M26 42C21 8 78 7 75 43l-7 18H30Z'} className='ctrl-picker-drawing-hair'/>
    {tail && <path d='M26 36C9 27 10 67 18 86l15-12M74 36c17-9 16 31 8 50L67 74' className='ctrl-picker-drawing-hair'/>}
    <path d='M43 69v14q7 9 14 0V69' className='ctrl-picker-drawing-face'/>
    <path d='M32 39c0-22 36-22 36 0v16c0 25-36 25-36 0Z' className='ctrl-picker-drawing-face'/>
    <path d={short ? 'M27 39 32 23l27-5 17 22-18-8-8 10-4-12-13 14Z' : 'M28 39q0-25 22-25 26 1 23 30L56 32l-9 12-3-13-13 18Z'} className='ctrl-picker-drawing-hair'/>
    <path d='M39 53h2m18 0h2M47 64q3 2 6 0' className='ctrl-picker-drawing-line'/>
    {/ribbon/.test(style) && <path d='m70 25-10-7v15l10-5 10 5V18Z' className='ctrl-picker-drawing-cloth'/>}
    {bob && <path d='m29 46-2 17m43-17 3 17' className='ctrl-picker-drawing-line'/>}
    {/straight/.test(style) && <path d='M25 48v37m50-37v37' className='ctrl-picker-drawing-line'/>}
    {/loose/.test(style) && <path d='M25 48q-7 17 0 36m50-36q7 17 0 36' className='ctrl-picker-drawing-line'/>}
  </svg>;
}

function ApparelDrawing({id}: {id: string}) {
  const shoes = /shoe|sneaker|boot/.test(id);
  const bottom = /pants|skirt|shorts|bottom/.test(id) && !/inner|vest|source/.test(id);
  const tank = /inner|tank/.test(id);
  const vest = /vest/.test(id);
  return <svg viewBox='0 0 100 110' fill='none' aria-hidden='true' focusable='false'>
    <path d='M20 100h60' className='ctrl-picker-drawing-line ctrl-picker-drawing-ground'/>
    {id === 'none' ? <><circle cx='50' cy='52' r='28' className='ctrl-picker-drawing-line'/><path d='m31 71 38-38' className='ctrl-picker-drawing-line'/></> : shoes ? <>
      <path d='m20 37 24 1 1 23 13 9v14H15V67ZM53 30h22l1 25 12 10v14H59V61Z' className='ctrl-picker-drawing-cloth'/><path d='M18 76h37M62 71h22M29 58l10 3m-10 4 11 2m26-15 8 3' className='ctrl-picker-drawing-line'/>
    </> : bottom ? <>
      <path d={/skirt/.test(id) ? 'M29 23h42l13 65H16Z' : 'M26 22h48l6 67H55l-5-43-5 43H20Z'} className='ctrl-picker-drawing-cloth'/><path d='M28 31h44M50 24v17' className='ctrl-picker-drawing-line'/>
    </> : <>
      <path d={tank || vest ? 'M32 23h10q8 14 16 0h10l5 65H27Z' : 'm31 23 11-5q8 12 16 0l11 5 20 29-17 12-5-11 5 35H28l5-35-5 11-17-12Z'} className='ctrl-picker-drawing-cloth'/>
      <path d='m42 20 8 14 8-14M50 35v51M31 76h12m14 0h12' className='ctrl-picker-drawing-line'/>
      {tank && <path d='M35 26q15 35 30 0' className='ctrl-picker-drawing-line'/>}
      {vest && <path d='M34 27v35m32-35v35M31 82h38' className='ctrl-picker-drawing-line'/>}
      {/hood|source/.test(id) && <path d='M36 22q14-20 28 0M39 61h22v13H39Z' className='ctrl-picker-drawing-line'/>}
    </>}
  </svg>;
}

function LookDrawing({look, hair = 'source', outfit = 'source', tint = '#a7c5b3', hairTint, gender = 'female'}: {look: string; hair?: string; outfit?: string; tint?: string; hairTint?: string; gender?: CharacterAppearance['gender']}) {
  return <span className='ctrl-picker-look-drawing' style={{'--picker-cloth': tint, ...(hairTint && hairTint !== '#ffffff' ? {'--picker-hair': hairTint} : {})} as CSSProperties}>
    <span className='ctrl-picker-motif' aria-hidden='true'>✦</span>
    <span className='ctrl-picker-look-hair'><HairDrawing id={hair} look={look} gender={look === 'modular:neurohacker' ? 'male' : look === 'modular:drophunter' ? 'female' : gender}/></span>
    <span className='ctrl-picker-look-outfit'><ApparelDrawing id={outfit === 'source' ? (look === 'airi' ? 'cardigan' : look === 'airi-b' ? 'varsity' : 'hoodie') : outfit}/></span>
  </span>;
}

function ChoiceCard({label, detail, active, onClick, children}: {label: string; detail?: string; active: boolean; onClick: () => void; children: ReactNode}) {
  return <button type='button' className='ctrl-picker-card' aria-label={label} aria-pressed={active} onClick={onClick}>
    <Check active={active}/><span className='ctrl-picker-card-art'>{children}</span>
    <span className='ctrl-picker-card-name'>{label}</span>{detail && <small>{detail}</small>}
  </button>;
}

function CompactSelect({label, value, options, onChange}: {label: string; value: string; options: readonly Choice[]; onChange: (value: string) => void}) {
  return <label className='ctrl-picker-select'><span>{label}</span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{options.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>;
}

function Swatches({label, options, value, onChange}: {label: string; options: readonly {id: string; name: string; tint: string}[]; value: string; onChange: (id: string) => void}) {
  return <fieldset className='ctrl-picker-swatches'><legend>{label}</legend><div>{options.map(item => <button key={item.id} type='button' aria-label={`${label}: ${item.name}`} aria-pressed={item.id === value} title={item.name} onClick={() => onChange(item.id)}>
    <span className='ctrl-picker-swatch' style={{backgroundColor: item.tint}}><Check active={item.id === value}/></span><span>{item.name}</span>
  </button>)}</div></fieldset>;
}

export default function AppearancePicker({appearance, onChange, section}: {
  appearance: CharacterAppearance;
  onChange: (a: CharacterAppearance) => void;
  section: 'looks' | 'hair' | 'outfit' | 'details';
}) {
  const selected = normalizeAppearance(appearance, appearance.gender, appearance.variantId);
  const native = selected.modular;
  const complete = !native && selected.gender === 'female' && (selected.lookId === 'airi' || selected.lookId === 'airi-b');
  // Normalize EVERY edit: switching a base must never leave donor hair/garments attached.
  const emit = (next: CharacterAppearance) => onChange(normalizeAppearance(next, next.gender, next.variantId));
  const update = (key: keyof CharacterAppearance, value: string) => emit({...selected, [key]: value});
  const pickModel = (value: string) => {
    if (value.startsWith('modular:')) {
      if (modularCollectionEnabled && modularFamilies.some(f => value === `modular:${f}`)) {
        emit(newModularAppearance(value === 'modular:drophunter' ? 'female' : 'male'));
      }
    } else if (value === 'airi' || value === 'airi-b') {
      emit({...selected, ...decorationDefaults, gender: 'female', modular: undefined, lookId: value,
        variantId: 'original', hairId: 'source', hairStyleId: 'source', wardrobeId: 'source', eyeId: 'source', skinId: 'source'});
    } else if (availableAuthoredLooks(selected.gender).some(item => item.id === value)) {
      emit({...selected, modular: undefined, lookId: value as CharacterAppearance['lookId']});
    }
  };
  const part = (slot: Exclude<keyof ModularAppearance, 'family'>, value: string) => {
    if (native) emit({...selected, modular: {...native, [slot]: value}});
  };
  const models: Choice[] = [
    ...availableAuthoredLooks(selected.gender),
    ...(modularCollectionEnabled ? modularFamilies.map(f => ({id: `modular:${f}`, name: modularFamilyLabels[f]})) : []),
  ];
  const currentModel = native ? `modular:${native.family}` : selected.lookId ?? 'original';
  const hairstyles = native ? modularOptions(native.family, 'hair') : availableHairStyles(selected.gender, selected.lookId);
  const garments = availableWardrobeStyles(resolveCharacter(selected).id);
  const slotPicker = (slot: 'top' | 'bottom' | 'shoes' | 'outer' | 'accessory', label: string) => {
    if (!native) return null;
    const options = [...(slot === 'outer' || slot === 'accessory' ? [{id: 'none', name: 'None'}] : []), ...modularOptions(native.family, slot)];
    return <div className='ctrl-picker-block' key={slot}>
      <CompactSelect label={label} value={native[slot] ?? 'none'} options={options} onChange={id => part(slot, id)}/>
      <div className='ctrl-picker-grid ctrl-picker-grid-small'>{options.map(item => <ChoiceCard key={item.id} label={item.name} active={(native[slot] ?? 'none') === item.id} onClick={() => part(slot, item.id)}><ApparelDrawing id={item.id}/></ChoiceCard>)}</div>
    </div>;
  };
  const sectionTitles: Record<Section, string> = {looks: 'Find your everyday look', hair: 'A little change of hair', outfit: 'Something to feel at home in', details: 'The little things that make you, you'};

  return <div className='ctrl-appearance-picker' data-section={section}>
    <header className='ctrl-picker-heading'><h3>{sectionTitles[section]}</h3>{section !== 'details' && <p>{complete?'Actual character previews · try a style to make it yours.':'Style illustrations · see your character in the live preview.'}</p>}</header>
    {section === 'looks' && <>
      <section className='ctrl-picker-block' aria-label='Base character'>
        <CompactSelect label='Body & outfit model' value={currentModel} options={models.some(m => m.id === currentModel) ? models : [{id: currentModel, name: 'Saved collection'}, ...models]} onChange={pickModel}/>
        <div className='ctrl-picker-grid'>{models.map(item => <ChoiceCard key={item.id} label={item.name} detail={item.id.startsWith('modular:') ? 'Mix native separates' : item.id === 'airi' ? 'Bob · cardigan · shorts' : item.id === 'airi-b' ? 'Long hair · varsity layers' : 'Authored hair & outfit'} active={currentModel === item.id} onClick={() => pickModel(item.id)}>{lookThumbnail(item.id)?<img className='ctrl-picker-photo' src={lookThumbnail(item.id)} alt='' width={300} height={360} loading='lazy' decoding='async'/>:<LookDrawing look={item.id} gender={selected.gender}/>}</ChoiceCard>)}</div>
      </section>
      {complete && <section className='ctrl-picker-block' aria-label='Coordinated looks'><h4>A ready-to-wear mood</h4><div className='ctrl-picker-grid ctrl-picker-presets'>{airiLookPresets.map(preset => {
        const active = selected.lookId === preset.lookId && (selected.hairStyleId ?? 'source') === preset.hairStyleId && (selected.wardrobeId ?? 'source') === preset.wardrobeId && selected.variantId === preset.variantId && selected.hairId === preset.hairId;
        return <button key={preset.id} type='button' className='ctrl-picker-card' aria-label={`Apply ${preset.name}`} aria-pressed={active} onClick={() => emit({...selected, lookId: preset.lookId, hairStyleId: preset.hairStyleId, wardrobeId: preset.wardrobeId, hairId: preset.hairId, variantId: preset.variantId, modular: undefined})}>
          <Check active={active}/><span className='ctrl-picker-card-art'><img className='ctrl-picker-photo' src={presetThumbnail(preset.id)} alt='' width={300} height={360} loading='lazy' decoding='async'/></span><span className='ctrl-picker-card-name'>{preset.name}</span><small>{presetDetails[preset.id]}</small>
        </button>;
      })}</div></section>}
    </>}
    {section === 'hair' && <>
      <section className='ctrl-picker-block' aria-label='Hair shape'>
        <CompactSelect label='Hairstyle' value={native?.hair ?? selected.hairStyleId ?? 'source'} options={hairstyles} onChange={id => native ? part('hair', id) : update('hairStyleId', id)}/>
        <div className='ctrl-picker-grid ctrl-picker-grid-small'>{hairstyles.map(item => <ChoiceCard key={item.id} label={item.name} active={(native?.hair ?? selected.hairStyleId ?? 'source') === item.id} onClick={() => native ? part('hair', item.id) : update('hairStyleId', item.id)}>{styleThumbnail('hair',selected.lookId,item.id)?<img className='ctrl-picker-photo ctrl-picker-hair-photo' src={styleThumbnail('hair',selected.lookId,item.id)} alt='' width={300} height={360} loading='lazy' decoding='async'/>:<HairDrawing id={item.id} look={selected.lookId} gender={selected.gender}/>}</ChoiceCard>)}</div>
      </section>
      <Swatches label='Hair tint' options={hairVariants} value={selected.hairId} onChange={id => update('hairId', id)}/>
    </>}
    {section === 'outfit' && <>
      {native ? <>{slotPicker('top', 'Top')}{slotPicker('bottom', 'Bottom')}{slotPicker('shoes', 'Shoes')}{slotPicker('outer', 'Outer layer')}</> : <section className='ctrl-picker-block' aria-label='Compatible garments'>
        <CompactSelect label='Costume' value={selected.wardrobeId ?? 'source'} options={garments} onChange={id => update('wardrobeId', id)}/>
        <div className='ctrl-picker-grid ctrl-picker-grid-small'>{garments.map(item => <ChoiceCard key={item.id} label={item.name} active={(selected.wardrobeId ?? 'source') === item.id} onClick={() => update('wardrobeId', item.id)}>{styleThumbnail('outfit',selected.lookId,item.id)?<img className='ctrl-picker-photo' src={styleThumbnail('outfit',selected.lookId,item.id)} alt='' width={300} height={360} loading='lazy' decoding='async'/>:<ApparelDrawing id={item.id === 'source' ? selected.lookId === 'airi' ? 'cardigan' : selected.lookId === 'airi-b' ? 'varsity' : 'hoodie' : item.id}/>}</ChoiceCard>)}</div>
      </section>}
      <Swatches label='Clothing tint' options={outfitVariants.map(v => ({...v, tint: v.clothTint}))} value={selected.variantId} onChange={id => update('variantId', id)}/>
    </>}
    {section === 'details' && <>
      <section className='ctrl-picker-block' aria-label='Expression'>
        <CompactSelect label='Expression' value={selected.expressionId ?? 'neutral'} options={decorationCatalog.expressionId} onChange={id => update('expressionId', id)}/>
      </section>
      <Swatches label='Eye tint' options={eyeVariants} value={selected.eyeId} onChange={id => update('eyeId', id)}/>
      <Swatches label='Skin tint' options={skinVariants} value={selected.skinId} onChange={id => update('skinId', id)}/>
      {!complete && <details className='ctrl-picker-accessories'><summary>Accessories <span>Optional finishing touches</span></summary>
        <div className='ctrl-picker-block'><button className='ctrl-picker-clear' type='button' onClick={() => emit({...clearAvatarAccessories(selected), ...(native ? {modular: {...native, accessory: 'none'}} : {})})}>Clear accessories</button>
          <div className='ctrl-picker-accessory-styles' role='group' aria-label='Accessory style presets'>{accessoryStyles.map(style => <button type='button' key={style.id} aria-pressed={matchesAccessoryStyle(selected, style.id)} onClick={() => emit(applyAccessoryStyle(selected, style.id))}><Check active={matchesAccessoryStyle(selected, style.id)}/><strong>{style.name}</strong><small>{style.detail}</small></button>)}</div>
          <div className='ctrl-picker-accessory-fields'>{(Object.keys(accessoryLabels) as DecorationKey[]).map(key => <CompactSelect key={key} label={accessoryLabels[key]!} value={selected[key] ?? decorationDefaults[key]} options={decorationCatalog[key]} onChange={id => update(key, id)}/>)}</div>
        </div>{slotPicker('accessory', 'Native accessory')}
      </details>}
    </>}
  </div>;
}
