import {existsSync} from 'node:fs';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createElement, isValidElement, type ReactElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import AppearancePicker from '@/features/habitat/appearance-picker';
import {
  availableAuthoredLooks, availableHairStyles, defaultAppearance, eyeVariants,
  hairVariants, isCharacterAppearance, normalizeAppearance, outfitVariants,
  resolveCharacter, skinVariants, type CharacterAppearance,
} from '@/features/plaza/characters/catalog';
import {airiLookPresets} from '@/features/plaza/characters/airi-look-presets';
import {availableWardrobeStyles} from '@/features/plaza/characters/wardrobe-catalog';
import {defaultModularAppearance, modularOptions} from '@/features/plaza/characters/modular-catalog';

type Section = 'looks' | 'hair' | 'outfit' | 'details';
type Props = {
  children?: ReactNode; onClick?: () => void;
  onChange?: (event: {target: {value: string}}) => void;
  [key: string]: unknown;
};
// Expand real, hook-free visual components and invoke their actual event handlers.
// No DOM/browser dependency, hook mocks, synthetic catalogs or 3D model loading.
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  if (typeof node.type === 'function') {
    const child = (node.type as (props: Props) => ReactNode)(node.props);
    return elements(child);
  }
  return [node, ...elements(node.props.children)];
}
function find(node: ReactNode, predicate: (element: ReactElement<Props>) => boolean) {
  const found = elements(node).find(predicate);
  expect(found).toBeDefined();
  return found!;
}
function button(node: ReactNode, label: string) {
  return find(node, e => e.type === 'button' && e.props['aria-label'] === label);
}
function field(node: ReactNode, label: string) {
  return find(node, e => e.type === 'select' && e.props['aria-label'] === label);
}
function options(node: ReactNode, label: string) {
  return elements(field(node, label)).filter(e => e.type === 'option').map(e => e.props.value);
}
function picker(appearance: CharacterAppearance, section: Section, onChange = vi.fn()) {
  return AppearancePicker({appearance, section, onChange});
}
function airi(lookId: 'airi' | 'airi-b' = 'airi'): CharacterAppearance {
  return {...defaultAppearance, lookId, wardrobeId: 'source'};
}

afterEach(() => {vi.unstubAllEnvs(); vi.resetModules();});

describe('visual shared AppearancePicker', () => {
  it.each(['airi', 'airi-b'] as const)('%s only offers compatible real hair/garments through cards and accessible selects', lookId => {
    const appearance = airi(lookId);
    const hair = picker(appearance, 'hair');
    const styles = availableHairStyles('female', lookId);
    expect(options(hair, 'Hairstyle')).toEqual(styles.map(item => item.id));
    for (const item of styles) {
      const change = vi.fn();
      button(picker(appearance, 'hair', change), item.name).props.onClick!();
      expect(change).toHaveBeenCalledWith({...normalizeAppearance(appearance, 'female', 'original'), hairStyleId: item.id});
      expect(isCharacterAppearance(change.mock.calls[0][0])).toBe(true);
    }
    const garments = availableWardrobeStyles(resolveCharacter(appearance).id);
    expect(options(picker(appearance, 'outfit'), 'Costume')).toEqual(garments.map(item => item.id));
    for (const item of garments) {
      const change = vi.fn();
      button(picker(appearance, 'outfit', change), item.name).props.onClick!();
      expect(change).toHaveBeenCalledWith({...normalizeAppearance(appearance, 'female', 'original'), wardrobeId: item.id});
    }
  });

  it.each(airiLookPresets)('applies $name as a real coordinated look and shows the active checkmark', preset => {
    const appearance = {...airi(), eyeId: 'jade' as const, skinId: 'warm' as const, expressionId: 'relaxed' as const};
    const change = vi.fn();
    button(picker(appearance, 'looks', change), `Apply ${preset.name}`).props.onClick!();
    const next = change.mock.calls[0][0] as CharacterAppearance;
    expect(next).toMatchObject({lookId: preset.lookId, wardrobeId: preset.wardrobeId, hairStyleId: preset.hairStyleId, hairId: preset.hairId, variantId: preset.variantId, eyeId: 'jade', skinId: 'warm', expressionId: 'relaxed'});
    expect(next.modular).toBeUndefined();
    expect(normalizeAppearance(next, next.gender, next.variantId)).toEqual(next);
    expect(isCharacterAppearance(next)).toBe(true);
    const active = button(picker(next, 'looks'), `Apply ${preset.name}`);
    expect(active.props['aria-pressed']).toBe(true);
    expect(elements(active).some(e => e.props.className === 'ctrl-picker-check' && e.props.children === '✓')).toBe(true);
    const image=find(active,e=>e.type==='img');expect(image.props.src).toBe(`/worlds/characters/creator-thumbnails/${preset.id}.webp`);expect(existsSync(new URL(`../../public${image.props.src}`,import.meta.url))).toBe(true);
    expect(elements(active).some(e => e.type === 'small' && typeof e.props.children === 'string')).toBe(true);
  });

  it.each([
    ['hair', 'Hair tint', 'hairId', hairVariants.map(v => ({...v, color: v.tint}))],
    ['outfit', 'Clothing tint', 'variantId', outfitVariants.map(v => ({...v, color: v.clothTint}))],
    ['details', 'Eye tint', 'eyeId', eyeVariants.map(v => ({...v, color: v.tint}))],
    ['details', 'Skin tint', 'skinId', skinVariants.map(v => ({...v, color: v.tint}))],
  ] as const)('%s: %s uses exact catalog swatches and updates only its persisted field', (section, label, key, variants) => {
    const appearance: CharacterAppearance = {...airi('airi-b'), hairStyleId: 'airi-b-short', wardrobeId: 'airi-b-vest', eyeId: 'jade', skinId: 'warm', expressionId: 'happy'};
    const baseline = normalizeAppearance(appearance, 'female', 'original');
    for (const variant of variants) {
      const change = vi.fn();
      const swatchButton = button(picker(appearance, section, change), `${label}: ${variant.name}`);
      const swatch = find(swatchButton, e => e.props.className === 'ctrl-picker-swatch');
      expect(swatch.props.style).toEqual({backgroundColor: variant.color});
      swatchButton.props.onClick!();
      const next = change.mock.calls[0][0] as CharacterAppearance;
      expect(next).toEqual({...baseline, [key]: variant.id});
      expect(button(picker(next, section), `${label}: ${variant.name}`).props['aria-pressed']).toBe(true);
      expect(resolveCharacter(next).id).toBe(resolveCharacter(appearance).id);
    }
  });

  it('switches complete A/B via the existing native-model reset contract', () => {
    const appearance: CharacterAppearance = {...airi(), hairStyleId: 'airi-a-long-bob', wardrobeId: 'airi-a-vest', hairId: 'silver', variantId: 'sage', eyeId: 'jade', skinId: 'deep', expressionId: 'happy'};
    const change = vi.fn();
    field(picker(appearance, 'looks', change), 'Body & outfit model').props.onChange!({target: {value: 'airi-b'}});
    expect(change).toHaveBeenCalledWith({...defaultAppearance, lookId: 'airi-b', wardrobeId: 'source'});
    expect(appearance.hairStyleId).toBe('airi-a-long-bob');
  });

  it('normalizes cross-model native choices after leaving a complete character', () => {
    const change = vi.fn();
    field(picker({...airi(), hairStyleId: 'airi-a-long-bob', wardrobeId: 'airi-a-inner', eyeId: 'jade'}, 'looks', change), 'Body & outfit model').props.onChange!({target: {value: 'alternate'}});
    expect(change.mock.calls[0][0]).toMatchObject({lookId: 'alternate', hairStyleId: 'source', wardrobeId: 'source', eyeId: 'jade'});
  });

  it('repairs damaged/retired save fields on edits without mutating/rerolling the legacy identity on render', () => {
    const appearance = Object.freeze({...defaultAppearance, gender: 'male' as const, lookId: 'alternate' as const, hairStyleId: 'airi-a-short-bob' as const, wardrobeId: 'airi-b-vest' as const, neckwearId: 'pendant' as const, eyeId: 'jade' as const});
    const change = vi.fn();
    const node = picker(appearance, 'hair', change);
    expect(change).not.toHaveBeenCalled();
    expect(field(node, 'Hairstyle').props.value).toBe('source');
    button(node, 'Hair tint: Auburn').props.onClick!();
    expect(change).toHaveBeenCalledWith({...normalizeAppearance(appearance, 'male', 'original'), hairId: 'auburn'});
    expect(change.mock.calls[0][0]).toMatchObject({gender: 'male', lookId: 'original', hairStyleId: 'source', wardrobeId: 'source', neckwearId: 'none', eyeId: 'jade'});
    expect(appearance.neckwearId).toBe('pendant');
  });

  it('preserves the six-field v1 source save and male compatible controls', () => {
    const appearance: CharacterAppearance = {version: 1, gender: 'male', variantId: 'clay', hairId: 'ink', eyeId: 'ocean', skinId: 'rose'};
    const change = vi.fn();
    expect(options(picker(appearance, 'looks'), 'Body & outfit model').filter(id => !String(id).startsWith('modular:'))).toEqual(availableAuthoredLooks('male').map(v => v.id));
    expect(options(picker(appearance, 'hair'), 'Hairstyle')).toEqual(availableHairStyles('male').map(v => v.id));
    expect(options(picker(appearance, 'outfit'), 'Costume')).toEqual(['source']);
    const details = picker(appearance, 'details', change);
    for (const name of ['Headwear', 'Eyewear', 'Earrings', 'Neckwear', 'Carry & back', 'Accessory color', 'Expression']) expect(field(details, name)).toBeDefined();
    field(details, 'Expression').props.onChange!({target: {value: 'happy'}});
    expect(change).toHaveBeenCalledWith({...normalizeAppearance(appearance, 'male', 'clay'), expressionId: 'happy'});
    expect(elements(picker(airi(), 'details')).some(e => e.type === 'details')).toBe(false);
  });

  it('keeps modular parts in their own family, every slot functional, and clears accessories without losing clothes', () => {
    const appearance: CharacterAppearance = {...defaultAppearance, gender: 'male', modular: {...defaultModularAppearance('neurohacker'), accessory: modularOptions('neurohacker', 'accessory')[0].id}, eyewearId: 'round'};
    for (const [section, label, slot] of [['hair', 'Hairstyle', 'hair'], ['outfit', 'Top', 'top'], ['outfit', 'Bottom', 'bottom'], ['outfit', 'Shoes', 'shoes'], ['outfit', 'Outer layer', 'outer'], ['details', 'Native accessory', 'accessory']] as const) {
      const change = vi.fn();
      const node = picker(appearance, section, change);
      const available = modularOptions('neurohacker', slot);
      expect(options(node, label)).toEqual([...(slot === 'outer' || slot === 'accessory' ? ['none'] : []), ...available.map(v => v.id)]);
      const choice = available[available.length - 1];
      field(node, label).props.onChange!({target: {value: choice.id}});
      expect(change.mock.calls[0][0]).toEqual({...normalizeAppearance(appearance, 'male', 'original'), modular: {...appearance.modular, [slot]: choice.id}});
    }
    const change = vi.fn();
    find(picker(appearance, 'details', change), e => e.type === 'button' && e.props.children === 'Clear accessories').props.onClick!();
    expect(change.mock.calls[0][0].modular).toEqual({...appearance.modular, accessory: 'none'});
    expect(change.mock.calls[0][0].eyewearId).toBe('none');
  });

  it('honors disabled modular creation but preserves saved modular controls and identity', async () => {
    vi.stubEnv('NEXT_PUBLIC_CTRL_MODULAR_COLLECTIONS', 'disabled');
    vi.resetModules();
    const {default: HostedPicker} = await import('@/features/habitat/appearance-picker');
    const change = vi.fn();
    const node = HostedPicker({appearance: airi(), section: 'looks', onChange: change});
    expect(options(node, 'Body & outfit model').some(v => String(v).startsWith('modular:'))).toBe(false);
    field(node, 'Body & outfit model').props.onChange!({target: {value: 'modular:neurohacker'}});
    expect(change).not.toHaveBeenCalled();
    const saved: CharacterAppearance = {...defaultAppearance, gender: 'male', modular: defaultModularAppearance('neurohacker')};
    const savedNode = HostedPicker({appearance: saved, section: 'hair', onChange: change});
    button(savedNode, 'Hair tint: Silver').props.onClick!();
    expect(change.mock.calls[0][0].modular).toEqual(saved.modular);
  });

  it('enables licensed modular model choices through the catalog entry point', async () => {
    vi.stubEnv('NEXT_PUBLIC_CTRL_MODULAR_COLLECTIONS', 'enabled');
    vi.resetModules();
    const {default: LocalPicker} = await import('@/features/habitat/appearance-picker');
    const {newModularAppearance} = await import('@/features/plaza/characters/catalog');
    const change = vi.fn();
    const node = LocalPicker({appearance: airi(), section: 'looks', onChange: change});
    expect(options(node, 'Body & outfit model')).toContain('modular:neurohacker');
    field(node, 'Body & outfit model').props.onChange!({target: {value: 'modular:neurohacker'}});
    expect(change.mock.calls[0][0]).toEqual(normalizeAppearance(newModularAppearance('male'), 'male', 'original'));
  });

  it('renders accessible native controls with local actual-model captures and decorative fallbacks', () => {
    for (const [section, name] of [['looks', 'Body &amp; outfit model'], ['hair', 'Hairstyle'], ['outfit', 'Costume'], ['details', 'Expression']] as const) {
      const html = renderToStaticMarkup(createElement(AppearancePicker, {appearance: airi(), section, onChange: vi.fn()}));
      expect(html).toContain(`aria-label="${name}"`);
      expect(html).not.toContain(' hidden');
      for(const image of elements(picker(airi(),section)).filter(e=>e.type==='img')){expect(image.props.alt).toBe('');expect(String(image.props.src)).toMatch(/^\/worlds\/characters\/creator-thumbnails\//);expect(existsSync(new URL(`../../public${image.props.src}`,import.meta.url))).toBe(true);}
      for (const svg of elements(picker(airi(), section)).filter(e => e.type === 'svg')) expect(svg.props['aria-hidden']).toBe('true');
    }
  });
});
