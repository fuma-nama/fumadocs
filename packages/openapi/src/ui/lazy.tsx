'use client';
import { lazy } from 'react';

export const CodeExampleProvider = lazy(() =>
  import('./contexts/code-example').then((mod) => ({
    default: mod.CodeExampleProvider,
  })),
);
export const CodeExample = lazy(() =>
  import('./contexts/code-example').then((mod) => ({
    default: mod.CodeExample,
  })),
);
export const CodeExampleSelector = lazy(() =>
  import('./contexts/code-example').then((mod) => ({
    default: mod.CodeExampleSelector,
  })),
);

export const ClientLazy = lazy(() => import('@/playground/client'));

export const ApiProvider = lazy(() =>
  import('./contexts/api').then((mod) => ({ default: mod.ApiProvider })),
);
