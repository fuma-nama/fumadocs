'use client';
import dynamic from 'next/dynamic';

export const Samples = dynamic(() =>
  import('./sample-select').then((mod) => mod.Samples),
);

export const Sample = dynamic(() =>
  import('./sample-select').then((mod) => mod.Sample),
);

// for compatibility
export { Client as APIPlayground } from '@/playground/client.lazy';
