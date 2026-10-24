import {readFileSync} from 'node:fs';
import {afterEach, describe, expect, it, vi} from 'vitest';

const flag = 'NEXT_PUBLIC_CTRL_MODULAR_COLLECTIONS';
const genders = ['female', 'male'] as const;

// The flag is evaluated at module load: never statically import the catalog here.
async function loadCatalog(value: string | undefined) {
  vi.stubEnv(flag, value);
  vi.resetModules();
  return import('../../features/plaza/characters/catalog');
}

afterEach(() => {
  // Restore the original value (including an originally absent environment key).
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('hosted avatar release gating', () => {
  it.each([undefined, 'enabled', '', 'false'])('enables the local modular collection for env=%s', async value => {
    const catalog = await loadCatalog(value);
    expect(catalog.modularCollectionEnabled).toBe(true);
  });

  it('re-evaluates process.env after resetting modules instead of caching another release mode', async () => {
    const enabled = await loadCatalog(undefined);
    const disabled = await loadCatalog('disabled');
    const enabledAgain = await loadCatalog(undefined);
    expect(enabled.modularCollectionEnabled).toBe(true);
    expect(disabled.modularCollectionEnabled).toBe(false);
    expect(enabledAgain.modularCollectionEnabled).toBe(true);
    expect(disabled).not.toBe(enabled);
    expect(enabledAgain).not.toBe(disabled);
  });

  it('preserves the default native identities and historical v1 source fallback when unset', async () => {
    const catalog = await loadCatalog(undefined);
    expect(catalog.defaultAppearance.lookId).toBe('original');
    expect(catalog.defaultAppearance.modular).toBeUndefined();
    expect(catalog.resolveCharacter(catalog.defaultAppearance)).toBe(catalog.previewCharacter);
    expect(catalog.normalizeAppearance(catalog.defaultAppearance, 'female', 'original')).toEqual(catalog.defaultAppearance);
    expect(catalog.resolveCharacter(catalog.newCharacterAppearance('female'))).toBe(catalog.airiCharacter);
    expect(catalog.newCharacterAppearance('male').modular?.family).toBe('neurohacker');
    for (const gender of genders) {
      const family = gender === 'female' ? 'drophunter' : 'neurohacker';
      for (const appearance of [catalog.newModularAppearance(gender), catalog.seededModularAppearance('existing-native', gender)]) {
        expect(appearance.modular?.family).toBe(family);
        expect(catalog.isCharacterAppearance(appearance)).toBe(true);
        expect(catalog.resolveCharacter(appearance).id).toBe(`ctrl-modular-${family}`);
        expect(catalog.normalizeAppearance(JSON.parse(JSON.stringify(appearance)), gender, 'original')).toEqual(appearance);
      }
    }
  });

  it('defaults new hosted females to complete A, including the old modular creation entry point', async () => {
    const catalog = await loadCatalog('disabled');
    expect(catalog.modularCollectionEnabled).toBe(false);
    for (const appearance of [
      catalog.newCharacterAppearance('female'),
      catalog.newModularAppearance('female'),
      catalog.seededNewCharacterAppearance('fresh-hosted-female', 'female'),
    ]) {
      expect(appearance).toEqual({...catalog.defaultAppearance, gender: 'female', lookId: 'airi', wardrobeId: 'source'});
      expect(appearance.modular).toBeUndefined();
      expect(catalog.isCharacterAppearance(appearance)).toBe(true);
      expect(catalog.resolveCharacter(appearance)).toBe(catalog.airiCharacter);
      expect(catalog.resolveCharacter(appearance).assets).toEqual({
        high: '/plaza/characters/airi-reference/avatar-sample-a.vrm',
        low: '/plaza/characters/airi-reference/avatar-sample-a-mobile.vrm',
      });
    }
  });

  it('defaults new hosted males to the legacy source male without modular parts', async () => {
    const catalog = await loadCatalog('disabled');
    for (const appearance of [catalog.newCharacterAppearance('male'), catalog.newModularAppearance('male')]) {
      expect(appearance).toEqual({...catalog.defaultAppearance, gender: 'male'});
      expect(appearance.modular).toBeUndefined();
      expect(catalog.isCharacterAppearance(appearance)).toBe(true);
      expect(catalog.resolveCharacter(appearance)).toBe(catalog.maleCharacter);
      expect(catalog.resolveCharacter(appearance).assets).toEqual({
        high: '/plaza/characters/anime/male.vrm',
        low: '/plaza/characters/anime/male-mobile.vrm',
      });
    }
  });

  it.each(genders)('never seeds modular parts for a hosted %s and remains deterministic', async gender => {
    const catalog = await loadCatalog('disabled');
    const femaleLooks = new Set<string>();
    for (let i = 0; i < 32; i++) {
      const seed = `hosted-release-${i}`;
      const appearance = catalog.seededModularAppearance(seed, gender);
      expect(appearance).toEqual(catalog.seededModularAppearance(seed, gender));
      expect(appearance.gender).toBe(gender);
      expect(appearance.modular).toBeUndefined();
      expect(catalog.seededNewCharacterAppearance(seed, gender).modular).toBeUndefined();
      expect(catalog.isCharacterAppearance(appearance)).toBe(true);
      const character = catalog.resolveCharacter(appearance);
      for (const asset of Object.values(character.assets)) expect(asset).not.toContain('/modular/');
      if (gender === 'female') {
        expect(['airi', 'airi-b']).toContain(appearance.lookId);
        expect([catalog.airiCharacter, catalog.airiCharacterB]).toContain(character);
        expect(appearance.wardrobeId).toBe('source');
        femaleLooks.add(appearance.lookId!);
      } else {
        expect(appearance).toEqual(catalog.seededAppearance(seed, gender));
        expect(character).toBe(catalog.maleCharacter);
      }
    }
    if (gender === 'female') expect([...femaleLooks].sort()).toEqual(['airi', 'airi-b']);
  });

  it.each(genders)('keeps saved %s modular identities unchanged even when hosted creation is disabled', async gender => {
    const local = await loadCatalog(undefined);
    const {modularOptions} = await import('../../features/plaza/characters/modular-catalog');
    const source = local.seededModularAppearance(`saved-${gender}`, gender);
    const family = source.modular!.family;
    const saved = JSON.parse(JSON.stringify({
      ...source,
      variantId: 'clay', hairId: 'silver', eyeId: 'jade', skinId: 'warm',
      headwearId: 'beret', eyewearId: 'round', earringId: 'stars',
      neckwearId: 'scarf', backwearId: 'satchel', expressionId: 'relaxed', accessoryColorId: 'plum',
      modular: {
        ...source.modular!,
        outer: modularOptions(family, 'outer')[0].id,
        accessory: modularOptions(family, 'accessory')[0].id,
      },
    }));
    const before = JSON.stringify(saved);
    Object.freeze(saved.modular);
    Object.freeze(saved);
    expect(local.isCharacterAppearance(saved)).toBe(true);

    const hosted = await loadCatalog('disabled');
    expect(hosted.modularCollectionEnabled).toBe(false);
    expect(hosted.newModularAppearance(gender).modular).toBeUndefined();
    expect(hosted.isCharacterAppearance(saved)).toBe(true);
    // Compare the entire identity, not just the family: no rerolls or stripped slots.
    const normalized = hosted.normalizeAppearance(saved, gender, 'original');
    expect(normalized).toEqual(saved);
    expect(hosted.normalizeAppearance(JSON.parse(before), gender, 'original')).toEqual(saved);
    expect(hosted.normalizeAppearance(normalized, gender, 'original')).toEqual(saved);
    expect(JSON.stringify(saved)).toBe(before);
    expect(hosted.resolveCharacter(normalized).id).toBe(`ctrl-modular-${family}`);
    expect(hosted.resolveCharacter(normalized).assets).toEqual(local.resolveCharacter(saved).assets);
  });

  it('excludes only the local modular asset bank, leaving complete AIRI reference models publishable', () => {
    const patterns = readFileSync(new URL('../../public/.assetsignore', import.meta.url), 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    // An exact release allowlist also rejects broader globs that could hide AIRI.
    expect(patterns).toEqual(['/plaza/characters/modular/']);
    expect(patterns.some(pattern => pattern.includes('airi-reference'))).toBe(false);
  });
});
