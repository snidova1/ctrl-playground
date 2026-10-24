'use client';

import {useCallback, useEffect, useRef, useState, type PointerEvent} from 'react';
import {analogInput, type AnalogAxes} from './analog-input';

const neutral = {x: 0, z: 0, thumbX: 0, thumbY: 0};

export default function AnalogStick({onMove}: {onMove: (axes: AnalogAxes) => void}) {
  const [stick, setStick] = useState(neutral);
  const callback = useRef(onMove);
  const active = useRef<{id: number; x: number; y: number; element: HTMLDivElement} | null>(null);
  // Keep lifecycle cleanup independent of parent callback identity / presence updates.
  useEffect(() => { callback.current = onMove; }, [onMove]);

  const reset = useCallback(() => {
    const pointer = active.current;
    active.current = null;
    setStick(neutral);
    callback.current({x: 0, z: 0});
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

  function move(event: PointerEvent<HTMLDivElement>) {
    const pointer = active.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const next = analogInput(event.clientX - pointer.x, event.clientY - pointer.y);
    setStick(next);
    callback.current({x: next.x, z: next.z});
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    if (active.current?.id !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    reset();
  }

  return <div className='hb-analog-stick' role='group' aria-label='Analog movement control'
    data-axis-x={stick.x} data-axis-z={stick.z}
    onPointerDown={event => {
      // Only the owning pointer can move or release this stick; other fingers may run/jump.
      if (active.current || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const element = event.currentTarget, bounds = element.getBoundingClientRect();
      try { element.setPointerCapture(event.pointerId); } catch { return; }
      active.current = {id: event.pointerId, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, element};
      move(event);
    }}
    onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    onContextMenu={event => event.preventDefault()}>
    <span className='hb-analog-thumb' aria-hidden='true' style={{transform: `translate(${stick.thumbX}px, ${stick.thumbY}px)`}} />
  </div>;
}
