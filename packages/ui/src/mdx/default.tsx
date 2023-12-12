import type { HTMLAttributes } from 'react';
import serverComponents from '@/internal/mdx-server';

const { Pre } = await import('@/internal/mdx-client');

const defaultMdxComponents = {
  pre: (p: HTMLAttributes<HTMLPreElement>) => <Pre {...p} />,
  ...serverComponents,
};

export { defaultMdxComponents as default };
