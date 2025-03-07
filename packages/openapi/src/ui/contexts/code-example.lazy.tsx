'use client';
import dynamic from 'next/dynamic';

export const CodeExampleProvider = dynamic(() =>
  import('./code-example').then((mod) => mod.CodeExampleProvider),
);
export const CodeExample = dynamic(() =>
  import('./code-example').then((mod) => mod.CodeExample),
);
export const CodeExampleSelector = dynamic(() =>
  import('./code-example').then((mod) => mod.CodeExampleSelector),
);
