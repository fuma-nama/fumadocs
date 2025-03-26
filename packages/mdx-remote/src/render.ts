import { type MDXComponents } from 'mdx/types';
import type { TableOfContents } from 'fumadocs-core/server';
import type { FC } from 'react';
import jsxRuntimeDefault from 'react/jsx-runtime';

export type MdxContent = FC<{ components?: MDXComponents }>;

export async function executeMdx(
  compiled: string,
  scope: object,
  baseUrl?: string | URL,
) {
  let jsxRuntime;

  if (process.env.NODE_ENV === 'production') {
    jsxRuntime = jsxRuntimeDefault;
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

export function executeMdxSync(
  compiled: string,
  options: {
    scope?: Record<string, unknown>;
    baseUrl?: string | URL;
    jsxRuntime?: unknown;
  } = {},
) {
  const fullScope = {
    ...options.scope,
    opts: {
      ...(options.scope?.opts as object),
      ...(options.jsxRuntime ?? jsxRuntimeDefault),
      baseUrl: options.baseUrl,
    },
  };

  const values = Object.values(fullScope);
  const params = Object.keys(fullScope);
  params.push(`return (() => { ${compiled} })()`);
  const hydrateFn = new Function(...params);

  return hydrateFn.apply(hydrateFn, values) as {
    default: MdxContent;
    toc?: TableOfContents;
  };
}
