import type { MDXComponents } from 'mdx/types';
import type { TableOfContents } from 'fumadocs-core/toc';
import type { FC } from 'react';
import jsxRuntimeDefault from 'react/jsx-runtime';

export type MdxContent = FC<{ components?: MDXComponents }>;

interface Options {
  scope?: Record<string, unknown>;
  baseUrl?: string | URL;
  jsxRuntime?: unknown;
}

const AsyncFunction: new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(executeMdx).constructor;

export async function executeMdx(compiled: string, options: Options = {}) {
  const { opts: scopeOpts, ...scope } = options.scope ?? {};
  const fullScope = {
    opts: {
      ...(scopeOpts as object),
      ...(options.jsxRuntime ?? jsxRuntimeDefault),
      baseUrl: options.baseUrl,
    },
    ...scope,
  };

  const hydrateFn = new AsyncFunction(...Object.keys(fullScope), compiled);
  return (await hydrateFn.apply(hydrateFn, Object.values(fullScope))) as {
    default: MdxContent;
    toc?: TableOfContents;
  };
}

export function executeMdxSync(compiled: string, options: Options = {}) {
  const { opts: scopeOpts, ...scope } = options.scope ?? {};
  const fullScope = {
    opts: {
      ...(scopeOpts as object),
      ...(options.jsxRuntime ?? jsxRuntimeDefault),
      baseUrl: options.baseUrl,
    },
    ...scope,
  };

  const hydrateFn = new Function(...Object.keys(fullScope), compiled);

  return hydrateFn.apply(hydrateFn, Object.values(fullScope)) as {
    default: MdxContent;
    toc?: TableOfContents;
  };
}
