import { type MDXComponents } from 'mdx/types';
import type { TableOfContents } from 'fumadocs-core/server';
import type { FC } from 'react';

export type MdxContent = FC<{ components?: MDXComponents }>;

export async function executeMdx(
  compiled: string,
  scope: object,
  baseUrl?: string | URL,
) {
  let jsxRuntime;

  if (process.env.NODE_ENV === 'production') {
    jsxRuntime = await import('react/jsx-runtime');
  } else {
    jsxRuntime = await import('react/jsx-dev-runtime');
  }

  const fullScope = {
    opts: {
      ...jsxRuntime,
      baseUrl,
    },
    ...scope,
  };

  const values = Object.values(fullScope);
  const params = Object.keys(fullScope);
  params.push(`return (async () => { ${compiled} })()`);
  const hydrateFn = new Function(...params);

  return (await hydrateFn.apply(hydrateFn, values)) as {
    default: MdxContent;
    toc?: TableOfContents;
  };
}
