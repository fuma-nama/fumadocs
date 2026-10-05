import { useEffect, useEffectEvent } from 'react';

/**
 * Listen to `keydown` on window, skipping keys that are already handled or composing text.
 */
export function useHotKey(
  onKeyDown: (e: KeyboardEvent) => void,
  {
    enabled = true,
    ignoreTyping = false,
  }: {
    enabled?: boolean;
    /** ignore it while typing in an editable element (e.g. `<input />`), or when a dialog is opened */
    ignoreTyping?: boolean;
  } = {},
) {
  const listener = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
    if (ignoreTyping && isTypingTarget(e.target)) return;
    onKeyDown(e);
  });

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;

  return target.closest('[role="dialog"]') !== null;
}
