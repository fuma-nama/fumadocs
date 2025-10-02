'use client';
import * as React from 'react';

type UseEffectEvent = <F extends (...params: never[]) => unknown>(
  callback: F,
) => F;

/**
 * Polyfill for React.js 19.2 `useEffectEvent`.
 *
 * @internal Don't use this, could be deleted anytime.
 */
export const useEffectEvent: UseEffectEvent =
  'useEffectEvent' in React
    ? { ...React }.useEffectEvent
    : <F extends (...params: never[]) => unknown>(callback: F) => {
        const ref = React.useRef(callback);
        ref.current = callback;

        return React.useCallback(
          ((...params) => ref.current(...params)) as F,
          [],
        );
      };
