'use client';

import type { HTMLAttributes } from 'react';
import { Pre } from '@/internal/mdx-client';
import serverComponents from '@/internal/mdx-server';

const defaultMdxComponents = {
  pre: (p: HTMLAttributes<HTMLPreElement>) => <Pre {...p} />,
  ...serverComponents,
};

export { defaultMdxComponents as default };
