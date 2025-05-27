import type { MethodInformation, RenderContext } from '@/types';
import type { ResolvedSchema } from '@/utils/schema';
import { getPreferredType } from '@/utils/schema';
import { sample } from 'openapi-sampler';
import type { RequestData } from '@/requests/_shared';

export function getRequestData(
  path: string,
  method: MethodInformation,
  sampleKey: string | null,
  _ctx: RenderContext,
): RequestData {
  const result: RequestData = {
    path: {},
    cookie: {},
    header: {},
    query: {},
    method: method.method,
  };

  for (const param of method.parameters ?? []) {
    let schema = param.schema;
    let value;

    if (!schema && param.content) {
      const type = getPreferredType(param.content);

      const content = type ? param.content[type] : undefined;
      if (!content)
        throw new Error(
          `Cannot find parameter schema for ${param.name} in ${path} ${method.method}`,
        );

      schema = content.schema;
      value = content.example ?? param.example ?? sample(schema as object);
    } else {
      value = param.example ?? sample(schema as object);
    }

    if (param.in === 'cookie') {
      result.cookie[param.name] = value;
    } else if (param.in === 'header') {
      result.header[param.name] = value;
    } else if (param.in === 'query') {
      result.query[param.name] = value;
    } else if (param.in === 'path') {
      result.path[param.name] = value;
    }
  }

  if (method.requestBody) {
    const body = method.requestBody.content;
    const type = getPreferredType(body);
    if (!type)
      throw new Error(
        `Cannot find body schema for ${path} ${method.method}: missing media type`,
      );
    result.bodyMediaType = type as RequestData['bodyMediaType'];
    const bodyOfType = body[type];

    if (bodyOfType.examples && sampleKey) {
      result.body = bodyOfType.examples[sampleKey].value;
    } else if (bodyOfType.example) {
      result.body = bodyOfType.example;
    } else {
      result.body = generateBody(
        method.method,
        (bodyOfType?.schema ?? {}) as ResolvedSchema,
      );
    }
  }

  return result;
}

function generateBody(method: string, schema: ResolvedSchema): unknown {
  return sample(schema as object, {
    skipReadOnly: method !== 'GET',
    skipWriteOnly: method === 'GET',
  });
}
