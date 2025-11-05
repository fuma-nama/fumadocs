import type { MethodInformation, RenderContext } from '@/types';
import type { CreateAPIPageOptions } from '@/ui';
import { lazy } from 'react';

const Client = lazy(() => import('./client'));

export function APIPlayground({
  path,
  method,
  ctx,
}: {
  path: string;
  method: MethodInformation;
  ctx: RenderContext;
}) {
  return (
    <Client method={method.method} path={path} spec={ctx.schema.bundled} />
  );
}

/**
 * Enable Scalar for API playgrounds by wrapping your options inside.
 */
export function withScalar(
  options: CreateAPIPageOptions = {},
): CreateAPIPageOptions {
  return {
    ...options,
    playground: {
      ...options.playground,
      render(props) {
        return <APIPlayground {...props} />;
      },
    },
  };
}
