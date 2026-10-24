export const ANALOG_TRAVEL = 35;
export const ANALOG_DEADZONE = 0.12;

export interface AnalogAxes {x: number; z: number;}
export interface AnalogInput extends AnalogAxes {thumbX: number; thumbY: number;}

export function analogInput(dx: number, dy: number): AnalogInput {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return {x: 0, z: 0, thumbX: 0, thumbY: 0};
  const distance = Math.hypot(dx, dy);
  if (!distance) return {x: 0, z: 0, thumbX: 0, thumbY: 0};
  const radius = Math.min(distance / ANALOG_TRAVEL, 1);
  // Radial (not per-axis) deadzone keeps every direction available and ramps smoothly.
  const strength = Math.max(0, (radius - ANALOG_DEADZONE) / (1 - ANALOG_DEADZONE));
  const directionX = dx / distance, directionZ = dy / distance;
  return {
    x: directionX * strength,
    z: directionZ * strength,
    thumbX: directionX * radius * ANALOG_TRAVEL,
    thumbY: directionZ * radius * ANALOG_TRAVEL,
  };
}
