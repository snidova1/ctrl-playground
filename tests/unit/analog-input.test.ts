import {describe, expect, it} from 'vitest';
import {analogInput, ANALOG_DEADZONE, ANALOG_TRAVEL} from '@/features/habitat/analog-input';

describe('Habitat radial analog input', () => {
  it('rests at zero and suppresses small movements in a radial deadzone', () => {
    expect(analogInput(0, 0)).toEqual({x: 0, z: 0, thumbX: 0, thumbY: 0});
    for (const [dx, dy] of [[1, 1], [0, -3], [-3, 0]]) {
      expect(analogInput(dx, dy)).toMatchObject({x: expect.closeTo(0), z: expect.closeTo(0)});
    }
    const edge = ANALOG_TRAVEL * ANALOG_DEADZONE;
    expect(analogInput(edge, 0).x).toBeCloseTo(0);
    expect(analogInput(edge + 0.01, 0).x).toBeGreaterThan(0);
    expect(analogInput(edge + 0.01, 0).x).toBeLessThan(0.001);
  });

  it('preserves partial strength instead of snapping to digital directions', () => {
    const {x, z} = analogInput(ANALOG_TRAVEL * 0.56, 0);
    expect(x).toBeCloseTo(0.5);
    expect(z).toBe(0);
    expect(analogInput(0, -ANALOG_TRAVEL).z).toBe(-1);
    expect(analogInput(-ANALOG_TRAVEL, 0).x).toBe(-1);
    expect(analogInput(0, ANALOG_TRAVEL).z).toBe(1);
  });

  it('clamps diagonal speed and thumb displacement while preserving 360-degree direction', () => {
    for (let degrees = 0; degrees < 360; degrees += 7) {
      const angle = degrees * Math.PI / 180;
      const dx = Math.cos(angle) * 200, dy = Math.sin(angle) * 200;
      const {x, z, thumbX, thumbY} = analogInput(dx, dy);
      expect(Math.hypot(x, z)).toBeCloseTo(1);
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(1 + Number.EPSILON);
      expect(Math.hypot(thumbX, thumbY)).toBeCloseTo(ANALOG_TRAVEL);
      expect(x).toBeCloseTo(Math.cos(angle));
      expect(z).toBeCloseTo(Math.sin(angle));
    }
  });

  it('rejects non-finite pointer coordinates without poisoning movement', () => {
    for (const [dx, dy] of [[NaN, 0], [Infinity, 1], [0, -Infinity]]) {
      expect(analogInput(dx, dy)).toEqual({x: 0, z: 0, thumbX: 0, thumbY: 0});
    }
  });
});
