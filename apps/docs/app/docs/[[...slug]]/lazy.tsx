'use client';

import dynamic from 'next/dynamic';

export const OpenAPIPageLazy = dynamic(() =>
  import('@/components/api-page').then((mod) => mod.OpenAPIPage),
);
