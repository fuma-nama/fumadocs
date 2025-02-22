import dynamic from 'next/dynamic';

export const Client = dynamic(() =>
  import('./client').then((mod) => mod.Client),
);
