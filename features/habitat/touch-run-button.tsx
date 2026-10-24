'use client';

import {useCallback, useEffect, useRef, useState, type PointerEvent} from 'react';

/** Pointer hold for touch; native keyboard / assistive clicks toggle running. */
export default function TouchRunButton({onRun, className}: {onRun: (running: boolean) => void; className?: string}) {
  const [pressed, setPressed] = useState(false);
  const running = useRef(false), callback = useRef(onRun);
  const active = useRef<{id: number; element: HTMLButtonElement} | null>(null);
  useEffect(() => { callback.current = onRun; }, [onRun]);

  const reset = useCallback(() => {
    const pointer = active.current;
    active.current = null;
    running.current = false;
    setPressed(false);
    callback.current(false);
    if (pointer?.element.hasPointerCapture(pointer.id)) pointer.element.releasePointerCapture(pointer.id);
  }, []);

  useEffect(() => {
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', visibility);
      reset();
    };
  }, [reset]);

  function end(event: PointerEvent<HTMLButtonElement>) {
    if (active.current?.id !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    reset();
  }

  return <button type='button' className={className} data-game-control='true'
    aria-label='Run — hold to run, or use keyboard to toggle' aria-pressed={pressed}
    onPointerDown={event => {
      if (active.current || event.button !== 0) return;
      event.preventDefault(); // Keep gameplay focus; do not start page scroll or camera orbit.
      event.stopPropagation();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { return; }
      active.current = {id: event.pointerId, element: event.currentTarget};
      running.current = true;
      setPressed(true);
      callback.current(true);
    }}
    onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    onClick={event => {
      // Pointer clicks follow a hold/release and must not latch Run back on.
      if (event.detail !== 0 || active.current) return;
      running.current = !running.current;
      setPressed(running.current);
      callback.current(running.current);
    }}
    onKeyDown={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }}
    onBlur={reset} onContextMenu={event => event.preventDefault()}>
    <strong>Run</strong><small>Hold to run</small>
  </button>;
}
