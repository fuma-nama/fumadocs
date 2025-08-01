import type { MethodInformation, RenderContext } from '@/types';
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
    <Client method={method.method} path={path} spec={ctx.schema.downloaded} />
  );
}
