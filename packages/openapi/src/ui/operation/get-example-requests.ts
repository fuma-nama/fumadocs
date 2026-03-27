import { encodeRequestData } from '@/requests/media/encode';
import type { RawRequestData, RequestData } from '@/requests/types';
import type { MethodInformation, RenderContext } from '@/types';
import { type NoReference, getPreferredType, pickExample } from '@/utils/schema';
import { sample } from 'openapi-sampler';

export interface ExampleRequestItem {
  id: string;
  name: string;
  description?: string;
  data: RawRequestData;
  encoded: RequestData;
}

export function getExampleRequests(
  path: string,
  operation: NoReference<MethodInformation>,
  ctx: RenderContext,
): ExampleRequestItem[] {
  const requestBody = operation.requestBody;
  const media = requestBody?.content ? getPreferredType(requestBody.content) : null;
  const bodyOfType = media ? requestBody!.content![media] : null;

  if (bodyOfType?.examples) {
    const result: ExampleRequestItem[] = [];

    for (const [key, value] of Object.entries(bodyOfType.examples)) {
      const data = getRequestData(path, operation, key, ctx);

      result.push({
        id: key,
        name: value.summary || key,
        description: value.description,
        data,
        encoded: encodeRequestData(data, ctx.mediaAdapters, operation.parameters ?? []),
      });
    }

    if (result.length > 0) return result;
  }

  const data = getRequestData(path, operation, null, ctx);
  return [
    {
      id: '_default',
      name: 'Default',
      description:
        typeof bodyOfType?.schema === 'object' ? bodyOfType.schema.description : undefined,
      data,
      encoded: encodeRequestData(data, ctx.mediaAdapters, operation.parameters ?? []),
    },
  ];
}

function getRequestData(
  path: string,
  method: NoReference<MethodInformation>,
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
    let value = pickExample(param as never);

    if (value === undefined && param.required) {
      if (param.schema) {
        value = sample(param.schema as object);
      } else if (param.content) {
        const type = getPreferredType(param.content);
        const content = type ? param.content[type] : undefined;
        if (!content || !content.schema)
          throw new Error(
            `Cannot find "${param.name}" parameter info for media type "${type}" in ${path} ${method.method}`,
          );

        value = sample(content.schema as object);
      }
    }

    switch (param.in) {
      case 'cookie':
        result.cookie[param.name!] = value;
        break;
      case 'header':
        result.header[param.name!] = value;
        break;
      case 'query':
        result.query[param.name!] = value;
        break;
      default:
        result.path[param.name!] = value;
    }
  }

  if (method.requestBody?.content) {
    const body = method.requestBody.content;
    const type = getPreferredType(body);
    if (!type)
      throw new Error(`Cannot find body schema for ${path} ${method.method}: missing media type`);
    result.bodyMediaType = type as RawRequestData['bodyMediaType'];
    const bodyOfType = body[type];

    if (bodyOfType.examples && sampleKey) {
      result.body = bodyOfType.examples[sampleKey].value;
    } else if (bodyOfType.example) {
      result.body = bodyOfType.example;
    } else {
      result.body = sample((bodyOfType?.schema ?? {}) as object, {
        skipReadOnly: method.method !== 'GET',
        skipWriteOnly: method.method === 'GET',
        skipNonRequired: true,
      });
    }
  }

  return result;
}
