'use client';

import { type ComponentType, lazy } from 'react';

// the boundary between server & lazy client components

export const ApiProvider = wrapLazy(() =>
  import('@/ui/contexts/api').then((mod) => ({ default: mod.ApiProvider })),
);

export const ServerProvider = wrapLazy(() =>
  import('@/ui/contexts/api').then((mod) => ({ default: mod.ServerProvider })),
);

export const UsageTabsSelector = wrapLazy(() =>
  import('@/ui/operation/usage-tabs/client').then((mod) => ({ default: mod.UsageTabsSelector })),
);

export const UsageTab = wrapLazy(() =>
  import('@/ui/operation/usage-tabs/client').then((mod) => ({ default: mod.UsageTab })),
);

export const SchemaUI = wrapLazy(() =>
  import('@/ui/schema/client').then((mod) => ({ default: mod.SchemaUI })),
);

export const PlaygroundClient = wrapLazy(() => import('@/playground/client'));

// Waku wraps all export functions of a "use client" file in `React.lazy`, but `lazy(lazy(() => ...))` causes error.
// we wrap another layer of component such that it is valid
// TODO: perhaps we can remove it once Waku migrated to vite-rsc
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- type infer
function wrapLazy<T extends ComponentType<any>>(load: () => Promise<{ default: T }>): T {
  const V = lazy(load);

  return function wrapper(props) {
    return <V {...props} />;
  } as T;
}
