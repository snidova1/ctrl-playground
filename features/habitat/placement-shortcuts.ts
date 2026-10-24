export type PlacementShortcut = 'cancel' | 'rotate' | 'place' | null;
/** Never steal shortcuts from a dialog, editor, native control, or another modifier binding. */
export function getPlacementShortcut(event: Pick<KeyboardEvent, 'code' | 'repeat' | 'altKey' | 'ctrlKey' | 'metaKey'>, interactive: boolean, valid: boolean): PlacementShortcut {
  if (interactive || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.code === 'Escape') return 'cancel';
  if (event.code === 'KeyR') return 'rotate';
  if (event.code === 'Enter' && valid) return 'place';
  return null;
}
export function placementHeading(rotation: number): number {
  return ((Math.round(rotation * 180 / Math.PI) % 360) + 360) % 360;
}
