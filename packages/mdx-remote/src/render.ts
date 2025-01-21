import { type MDXComponents } from 'mdx/types';
import type { TableOfContents } from 'fumadocs-core/server';
import type { FC } from 'react';

export type MdxContent = FC<{ components?: MDXComponents }>;

export async function executeMdx(compiled: string, scope: object) {
  let jsxRuntime;

  if (process.env.NODE_ENV === 'production') {
    jsxRuntime = await import('react/jsx-runtime');
  } else {
    jsxRuntime = await import('react/jsx-dev-runtime');
  }

  const fullScope = {
    opts: jsxRuntime,
    ...scope,
  };
  const keys = Object.keys(fullScope);
  const values = Object.values(fullScope);

  const hydrateFn = Reflect.construct(Function, keys.concat(compiled));

  return hydrateFn.apply(hydrateFn, values) as {
    default: MdxContent;
    toc?: TableOfContents;
  };
}
