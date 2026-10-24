'use client';
import { useCallback, useEffect, useRef } from 'react';
import { THEMES, type ThemeId } from './data';
import { Drum, turnDrum } from './drum';
import type { InkTable } from './presets';
import { STEP } from './rope';
import { createSprings, settleSprings, stepSprings } from './spring';

export interface DialProps {
  table: InkTable;
  /** the theme shown, the drum turns to it */
  shown: ThemeId;
  onPreview: (theme: ThemeId | null) => void;
  onPin: (theme: ThemeId) => void;
}

interface DialEngine {
  turnTo: (index: number) => void;
  destroy: () => void;
}

/** a turn of the drum to the nearest equivalent of `index`, it never spins the long way */
function nearest(turn: number, index: number) {
  const n = THEMES.length;
  const delta = ((((index - turn) % n) + n * 1.5) % n) - n / 2;
  return turn + delta;
}

function wrap(turn: number) {
  const n = THEMES.length;
  return ((Math.round(turn) % n) + n) % n;
}

/**
 * The drum turns on a spring to the theme shown. Drag it with a mouse and it follows, the face at
 * the front previewing its theme; it snaps on release, with the throw, and pins the theme.
 */
function createDial(
  element: HTMLElement,
  initial: number,
  onPreview: (theme: ThemeId | null) => void,
  onPin: (theme: ThemeId) => void,
): DialEngine {
  const drum = element.querySelector<HTMLElement>('[data-drum]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const turn = createSprings(1, initial);
  let face = 44;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let drag: {
    id: number;
    y: number;
    turn: number;
    moved: boolean;
    v: number;
    t: number;
    /** a finger taps a face, it never turns the drum: its drag scrolls the page */
    touch: boolean;
  } | null = null;

  function draw() {
    turnDrum(drum, turn.value[0], face);
  }

  function frame(now: number) {
    raf = 0;
    const dt = last === 0 ? STEP : Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;
    let energy = 0;
    while (acc >= STEP) {
      acc -= STEP;
      energy = stepSprings(turn, STEP, 210, 21);
    }
    draw();
    if (energy > 1e-4 && !drag) raf = requestAnimationFrame(frame);
    else last = acc = 0;
  }

  function schedule() {
    if (reduce.matches) {
      settleSprings(turn);
      draw();
      return;
    }
    if (raf === 0) raf = requestAnimationFrame(frame);
  }

  function themeOf(event: PointerEvent): ThemeId | null {
    const face = (event.target as HTMLElement).closest<HTMLElement>('[data-face]');
    return (face?.dataset.face as ThemeId | undefined) ?? null;
  }

  function onOver(event: PointerEvent) {
    if (drag) return;
    const theme = themeOf(event);
    if (theme) onPreview(theme);
  }

  function onDown(event: PointerEvent) {
    if (event.button !== 0) return;
    face = Number.parseFloat(getComputedStyle(element).getPropertyValue('--face')) || face;
    const touch = event.pointerType === 'touch';
    drag = {
      id: event.pointerId,
      y: event.clientY,
      turn: turn.value[0],
      moved: false,
      v: 0,
      t: event.timeStamp,
      touch,
    };
    if (!touch) element.setPointerCapture(event.pointerId);
  }

  function onMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < 4) return;
    drag.moved = true;
    if (drag.touch) return;
    const next = drag.turn - dy / face;
    const dt = Math.max(1, event.timeStamp - drag.t);
    drag.v = (next - turn.value[0]) / (dt / 1000);
    drag.t = event.timeStamp;
    turn.value[0] = turn.target[0] = next;
    turn.velocity[0] = 0;
    draw();
    onPreview(THEMES[wrap(next)]);
  }

  function onUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved, v, touch } = drag;
    drag = null;
    if (!touch) element.releasePointerCapture(event.pointerId);
    if (!moved) {
      const theme = themeOf(event);
      if (theme) onPin(theme);
      return;
    }
    if (touch) return;
    // the throw carries it on a little before it snaps
    const target = Math.round(turn.value[0] + Math.max(-3, Math.min(3, v * 0.12)));
    turn.target[0] = target;
    turn.velocity[0] = v;
    schedule();
    onPin(THEMES[wrap(target)]);
  }

  /** the page took the gesture: no tap, no throw */
  function onCancel(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.touch) element.releasePointerCapture(event.pointerId);
    drag = null;
    turn.target[0] = Math.round(turn.value[0]);
    schedule();
  }

  function onLeave() {
    if (!drag) onPreview(null);
  }

  element.addEventListener('pointerover', onOver);
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onCancel);
  element.addEventListener('pointerleave', onLeave);

  return {
    turnTo(index) {
      if (drag) return;
      face = Number.parseFloat(getComputedStyle(element).getPropertyValue('--face')) || face;
      turn.target[0] = nearest(turn.value[0], index);
      schedule();
    },
    destroy() {
      cancelAnimationFrame(raf);
      element.removeEventListener('pointerover', onOver);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onCancel);
      element.removeEventListener('pointerleave', onLeave);
    },
  };
}

/** the presets on a drum: hover a face to preview it, click to pin, drag to turn */
export function Dial({ table, shown, onPreview, onPin }: DialProps) {
  const engine = useRef<DialEngine | null>(null);
  const handlers = useRef({ onPreview, onPin });
  useEffect(() => {
    handlers.current = { onPreview, onPin };
  });
  const ref = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const instance = createDial(
      element,
      0,
      (theme) => handlers.current.onPreview(theme),
      (theme) => handlers.current.onPin(theme),
    );
    engine.current = instance;
    return () => {
      instance.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.turnTo(THEMES.indexOf(shown));
  }, [shown]);

  return (
    <div className="flex flex-col justify-center gap-3">
      <div
        ref={ref}
        aria-hidden
        className="cursor-grab select-none [--face:36px] active:cursor-grabbing xl:[--face:44px]"
      >
        <Drum table={table} />
      </div>
      <code className="font-mono text-xs text-lp-ink-2">
        @import &apos;fumadocs-ui/css/<span className="text-lp-ink">{shown}</span>.css&apos;;
      </code>
    </div>
  );
}
