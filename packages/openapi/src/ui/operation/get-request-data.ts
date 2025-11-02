import type { MethodInformation, RenderContext } from '@/types';
import type { ResolvedSchema } from '@/utils/schema';
import { getPreferredType } from '@/utils/schema';
import { sample } from 'openapi-sampler';
import type { RawRequestData } from '@/requests/types';

export function getRequestData(
  path: string,
  method: MethodInformation,
  sampleKey: string | null,
  _ctx: RenderContext,
): RawRequestData {
  const result: RawRequestData = {
    path: {},
    cookie: {},
    header: {},
    query: {},
    method: method.method,
  };

  for (const param of method.parameters ?? []) {
    let schema = param.schema;
    let value: unknown | undefined;

    if (!schema && param.content) {
      const type = getPreferredType(param.content);

      const content = type ? param.content[type] : undefined;
      if (!content || !content.schema)
        throw new Error(
          `Cannot find parameter schema for ${param.name} in ${path} ${method.method}`,
        );

      schema = content.schema;
      value = content.example ?? param.example;
    } else {
      value = param.example;
    }

    if (param.required) {
      value ??= sample(schema as object);
    } else if (value === undefined) {
      continue;
    }

    switch (param.in) {
      case 'cookie':
        result.cookie[param.name] = value;
        break;
      case 'header':
        result.header[param.name] = value;
        break;
      case 'query':
        result.query[param.name] = value;
        break;
      default:
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
    result.bodyMediaType = type as RawRequestData['bodyMediaType'];
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
    skipNonRequired: true,
  });
}
