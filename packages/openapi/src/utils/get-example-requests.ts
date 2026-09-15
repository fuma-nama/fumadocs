import { encodeRequestData } from '@/requests/media/encode';
import type { RawRequestData, RequestData } from '@/requests/types';
import type { HttpMethods, OperationObject, ParameterObject, RequestBodyObject } from '@/types';
import type { MediaAdapter } from '@/requests/media/adapter';
import { getPreferredType, type ParsedSchema, pickExample } from '@/utils/schema';
import { sample } from '@fumadocs/api-docs/schema/sample';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { getRaw } from '@scalar/json-magic/magic-proxy';

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
  mediaAdapters,
  operation,
  parameters,
}: {
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  /** resolved parameters of the operation */
  parameters: ParameterObject[];
  mediaAdapters: Record<string, MediaAdapter>;
}): ExampleRequestItem[] {
  const requestBody = dereferenceShallow(operation.requestBody);
  const media = requestBody?.content ? getPreferredType(requestBody.content) : null;
  const bodyOfType = media ? dereferenceShallow(requestBody!.content![media]) : null;

  if (bodyOfType?.examples) {
    const result: ExampleRequestItem[] = [];

    for (const [key, item] of Object.entries(bodyOfType.examples)) {
      const { summary, description } = dereferenceShallow(item);
      const data = getRequestData({
        path,
        body: requestBody,
        parameters,
        sampleKey: key,
        method,
      });

      result.push({
        id: key,
        name: summary || key,
        description,
        data,
        encoded: encodeRequestData(data, mediaAdapters, parameters),
      });
    }

    if (result.length > 0) return result;
  }

  const data = getRequestData({ path, body: requestBody, method, parameters });
  const schema = dereferenceShallow(bodyOfType?.schema);
  return [
    {
      id: '_default',
      name: 'Default',
      description: typeof schema === 'object' ? schema.description : undefined,
      data,
      encoded: encodeRequestData(data, mediaAdapters, parameters),
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
  parameters: ParameterObject[];
  body?: RequestBodyObject;
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
        value = sample(param.schema);
      } else if (param.content) {
        const type = getPreferredType(param.content);
        const content = type ? dereferenceShallow(param.content[type]) : undefined;
        if (!content || !content.schema)
          throw new Error(
            `Cannot find "${param.name}" parameter info for media type "${type}" in ${path} ${method}`,
          );

        value = sample(content.schema as ParsedSchema);
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
    const bodyOfType = dereferenceShallow(body.content[type]);

    if (bodyOfType.examples && sampleKey) {
      result.body = getRaw(dereferenceShallow(bodyOfType.examples[sampleKey]).value);
    } else if (bodyOfType.example) {
      result.body = getRaw(bodyOfType.example);
    } else {
      result.body = sample(bodyOfType?.schema ?? {}, {
        skipReadOnly: method !== 'get',
        skipWriteOnly: method === 'get',
        skipNonRequired: true,
      });
    }
  }

  return result;
}
