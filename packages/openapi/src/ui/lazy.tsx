'use client';
import dynamic from 'next/dynamic';

export const CodeExampleProvider = dynamic(() =>
  import('./contexts/code-example').then((mod) => mod.CodeExampleProvider),
);
export const CodeExample = dynamic(() =>
  import('./contexts/code-example').then((mod) => mod.CodeExample),
);
export const CodeExampleSelector = dynamic(() =>
  import('./contexts/code-example').then((mod) => mod.CodeExampleSelector),
);

export const ClientLazy = dynamic(() => import('@/playground/client'));

export const ApiProvider = dynamic(() =>
  import('./contexts/api').then((mod) => mod.ApiProvider),
);
