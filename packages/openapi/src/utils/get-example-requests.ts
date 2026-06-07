import { encodeRequestData } from '@/requests/media/encode';
import type { RawRequestData, RequestData } from '@/requests/types';
import type {
  HttpMethods,
  OperationObject,
  ParameterObject,
  PathItemObject,
  RenderContext,
  RequestBodyObject,
} from '@/types';
import { getPreferredType, pickExample } from '@/utils/schema';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { sample } from '@fumadocs/api-docs/schema/sample';

export interface ExampleRequestItem {
  id: string;
  name: string;
  description?: string;
  data: RawRequestData;
  encoded: RequestData;
}

export function getExampleRequests({
  path,
  method,
  ctx,
  operation,
  pathItem,
}: {
  path: string;
  pathItem: NoReference<PathItemObject>;
  method: HttpMethods;
  operation: NoReference<OperationObject>;
  ctx: RenderContext;
}): ExampleRequestItem[] {
  const requestBody = operation.requestBody;
  const media = requestBody?.content ? getPreferredType(requestBody.content) : null;
  const bodyOfType = media ? requestBody!.content![media] : null;
  const parameters = [...(operation.parameters ?? []), ...(pathItem.parameters ?? [])];

  if (bodyOfType?.examples) {
    const result: ExampleRequestItem[] = [];

    for (const [key, value] of Object.entries(bodyOfType.examples)) {
      const data = getRequestData({
        path,
        body: operation.requestBody,
        parameters,
        sampleKey: key,
        method,
      });

      result.push({
        id: key,
        name: value.summary || key,
        description: value.description,
        data,
        encoded: encodeRequestData(data, ctx.mediaAdapters, parameters),
      });
    }

    if (result.length > 0) return result;
  }

  const data = getRequestData({ path, body: operation.requestBody, method, parameters });
  return [
    {
      id: '_default',
      name: 'Default',
      description:
        typeof bodyOfType?.schema === 'object' ? bodyOfType.schema.description : undefined,
      data,
      encoded: encodeRequestData(data, ctx.mediaAdapters, parameters),
    },
  ];
}

function getRequestData({
  method,
  path,
  parameters,
  sampleKey,
  body,
}: {
  path: string;
  sampleKey?: string;
  method: HttpMethods;
  parameters: NoReference<ParameterObject>[];
  body?: NoReference<RequestBodyObject>;
}): RawRequestData {
  const result: RawRequestData = {
    path: {},
    cookie: {},
    header: {},
    query: {},
    method: method,
  };

  for (const param of parameters) {
    let value = pickExample(param as never);

    if (value === undefined && param.required) {
      if (param.schema) {
        value = sample(param.schema as object);
      } else if (param.content) {
        const type = getPreferredType(param.content);
        const content = type ? param.content[type] : undefined;
        if (!content || !content.schema)
          throw new Error(
            `Cannot find "${param.name}" parameter info for media type "${type}" in ${path} ${method}`,
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

  if (body?.content) {
    const type = getPreferredType(body.content);
    if (!type) throw new Error(`Cannot find body schema for ${path} ${method}: missing media type`);
    result.bodyMediaType = type as RawRequestData['bodyMediaType'];
    const bodyOfType = body.content[type];

    if (bodyOfType.examples && sampleKey) {
      result.body = bodyOfType.examples[sampleKey].value;
    } else if (bodyOfType.example) {
      result.body = bodyOfType.example;
    } else {
      result.body = sample((bodyOfType?.schema ?? {}) as object, {
        skipReadOnly: method !== 'get',
        skipWriteOnly: method === 'get',
        skipNonRequired: true,
      });
    }
  }

  return result;
}
