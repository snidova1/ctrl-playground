import {seeded} from './rng';

/**
 * Town time. One in-game day lasts 48 real minutes so every visit sees a moving
 * sky, while daily quests, gifts and foraging reset on the real UTC date.
 */
export const GAME_DAY_MS = 48 * 60_000;
/** Bugs, birds and forage nodes reshuffle every window. */
export const SPAWN_WINDOW_MS = 6 * 60_000;

export type DayPhase = 'morning' | 'day' | 'evening' | 'night';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'breezy';

export function townHour(now: number): number {
  // Offset so a fresh epoch starts in the morning.
  const progress = ((now + GAME_DAY_MS * 0.27) % GAME_DAY_MS) / GAME_DAY_MS;
  return progress * 24;
}

export function dayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export function isNight(hour: number) {
  return hour >= 20 || hour < 5;
}

export function realDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function gameDayIndex(now: number) {
  return Math.floor((now + GAME_DAY_MS * 0.27) / GAME_DAY_MS);
}

export function weatherAt(now: number): Weather {
  const roll = seeded('weather', gameDayIndex(now))();
  if (roll < 0.5) return 'sunny';
  if (roll < 0.72) return 'breezy';
  if (roll < 0.88) return 'cloudy';
  return 'rain';
}

export function spawnWindow(now: number) {
  return Math.floor(now / SPAWN_WINDOW_MS);
}

export function formatHour(hour: number) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m - (m % 10)).padStart(2, '0')}`;
}
