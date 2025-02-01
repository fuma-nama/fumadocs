import type { MethodInformation, RenderContext } from '@/types';
import dynamic from 'next/dynamic';

const Client = dynamic(() => import('./client'));

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
