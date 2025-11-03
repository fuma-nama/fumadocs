'use client';
import { type ComponentType, lazy } from 'react';
import type { JSX } from 'react/jsx-runtime';

// Waku wraps all export functions of a "use client" file in `React.lazy`, but `lazy(lazy(() => ...))` causes error.
// we wrap another layer of component such that it is valid
// TODO: perhaps we can remove it once Waku migrated to vite-rsc
function wrap<Props>(V: ComponentType<Props>) {
  return function wrapper(props: Props) {
    return <V {...(props as Props & JSX.IntrinsicAttributes)} />;
  };
}

export const ClientLazy = wrap(lazy(() => import('@/playground/client')));
