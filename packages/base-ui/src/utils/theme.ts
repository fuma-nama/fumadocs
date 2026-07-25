'use client';
import { flushSync } from 'react-dom';

/**
 * Update the theme, wrapped in a view transition when supported.
 */
export function changeTheme(setTheme: (theme: string) => void, theme: string) {
  if (document?.startViewTransition) {
    document.startViewTransition(() => flushSync(() => setTheme(theme)));
  } else {
    setTheme(theme);
  }
}

/**
 * Whether the event should be ignored because the user is interacting with an editable element,
 * or an opened dialog (e.g. the search dialog).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;

  return target.closest('[role="dialog"]') !== null;
}
