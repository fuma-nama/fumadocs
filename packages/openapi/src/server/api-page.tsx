import type { ReactElement } from 'react';
import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import { Operation } from '@/render/operation';
import type { RenderContext } from '@/types';
import { createMethod } from '@/schema/method';

export interface ApiPageProps {
  /**
   * An array of operation
   */
  operations: { path: string; method: OpenAPI.HttpMethods }[];
  hasHead: boolean;
  ctx: RenderContext;
}

export function APIPage({
  operations,
  ctx,
  hasHead = true,
}: ApiPageProps): ReactElement {
  const schema = ctx.document;

  return (
    <ctx.renderer.Root baseUrl={ctx.baseUrl}>
      {operations.map((item) => {
        const operation = schema.paths[item.path]?.[item.method];
        if (!operation) return null;
        const method = createMethod(item.method, operation);

        return (
          <Operation
            key={`${item.path}:${item.method}`}
            method={method}
            path={item.path}
            ctx={ctx}
            hasHead={hasHead}
          />
        );
      })}
    </ctx.renderer.Root>
  );
}
