'use client';
import type { CreateOpenAPIPageOptions } from '@/ui';
import { lazy } from 'react';

const Client = lazy(() => import('./client'));

/**
 * Enable Scalar for API playgrounds by wrapping your options inside.
 *
 * Requires `@scalar/api-client-react` to be installed, it imports the styles automatically.
 */
export function withScalar(options: CreateOpenAPIPageOptions = {}): CreateOpenAPIPageOptions {
  return {
    ...options,
    playground: {
      ...options.playground,
      provider(props) {
        return props.children;
      },
      render({ method, path, ctx }) {
        return <Client method={method} path={path} spec={ctx.schema.bundled} />;
      },
    },
  };
}
