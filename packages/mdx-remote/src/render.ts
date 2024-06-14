import React from 'react';
import { type MDXComponents } from 'mdx/types';

export async function renderMDX(
  compiled: string,
  scope: object,
  components?: MDXComponents,
): Promise<React.ReactElement> {
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

  const result = hydrateFn.apply(hydrateFn, values) as {
    default: React.ElementType;
  };
  return React.createElement(result.default, { components });
}
