'use client';
import {
  type ComponentProps,
  type ComponentType,
  lazy,
  type LazyExoticComponent,
} from 'react';

// Waku wraps all export functions of a "use client" file in `React.lazy`, but `lazy(lazy(() => ...))` causes error.
// we wrap another layer of component such that it is valid
// TODO: perhaps we can remove it once Waku migrated to vite-rsc
function wrap<C extends LazyExoticComponent<ComponentType<any>>>(V: C) {
  return function wrapper(props: ComponentProps<C>) {
    return <V {...props} />;
  };
}

export const CodeExampleProvider = wrap(
  lazy(() =>
    import('./contexts/code-example').then((mod) => ({
      default: mod.CodeExampleProvider,
    })),
  ),
);

export const CodeExample = wrap(
  lazy(() =>
    import('./contexts/code-example').then((mod) => ({
      default: mod.CodeExample,
    })),
  ),
);

export const CodeExampleSelector = wrap(
  lazy(() =>
    import('./contexts/code-example').then((mod) => ({
      default: mod.CodeExampleSelector,
    })),
  ),
);

export const ClientLazy = wrap(lazy(() => import('@/playground/client')));

export const ApiProvider = wrap(
  lazy(() =>
    import('./contexts/api').then((mod) => ({ default: mod.ApiProvider })),
  ),
);
