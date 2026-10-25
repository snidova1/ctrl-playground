'use client';
import {useSyncExternalStore} from 'react';

/** Tiny observable store; avoids pulling in a state library for the HUD. */
export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch: Partial<T> | ((s: T) => Partial<T>)) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = {...state, ...next};
      listeners.forEach(l => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
export type Store<T extends object> = ReturnType<typeof createStore<T>>;

export function useStore<T extends object, S>(store: Store<T>, selector: (s: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}
