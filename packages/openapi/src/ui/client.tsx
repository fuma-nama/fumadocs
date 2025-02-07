'use client';
import dynamic from 'next/dynamic';

export const APIPlayground = dynamic(() =>
  import('./playground').then((mod) => mod.APIPlayground),
);

export const Samples = dynamic(() =>
  import('./sample-select').then((mod) => mod.Samples),
);

export const Sample = dynamic(() =>
  import('./sample-select').then((mod) => mod.Sample),
);

export { useSchemaContext } from './contexts/schema';
