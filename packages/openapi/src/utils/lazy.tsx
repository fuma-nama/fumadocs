import { type ComponentType, lazy } from 'react';

// Waku wraps all export functions of a "use client" file in `React.lazy`, but `lazy(lazy(() => ...))` causes error.
// we wrap another layer of component such that it is valid
// TODO: perhaps we can remove it once Waku migrated to vite-rsc
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- type infer
export function wrapLazy<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): T {
  const V = lazy(load);

  return function wrapper(props) {
    return <V {...props} />;
  } as T;
}
