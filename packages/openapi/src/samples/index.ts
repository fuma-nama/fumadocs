import { sample } from 'openapi-sampler';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { MethodInformation } from '@/types';
import { getPreferredMedia, getValue, noRef } from '@/utils';

export interface Endpoint {
  /**
   * URL, including path and query parameters
   */
  url: string;
  method: string;
  body?: unknown;
  responses: Record<string, Response>;
  parameters: Parameter[];
}

interface Response {
  schema: OpenAPI.SchemaObject;
}

interface Parameter {
  name: string;
  in: string;
  schema: OpenAPI.SchemaObject;
}

export function createEndpoint(
  path: string,
  method: MethodInformation,
  baseUrl = 'https://example.com',
): Endpoint {
  const params: Parameter[] = [];
  const responses: Endpoint['responses'] = {};

  for (const param of method.parameters) {
    const schema = noRef(
      param.schema ?? getPreferredMedia(param.content ?? {})?.schema,
    );

    if (!schema) continue;

    params.push({
      name: param.name,
      in: param.in,
      schema,
    });
  }

  const body = noRef(method.requestBody)?.content ?? {};
  const bodySchema = noRef(getPreferredMedia(body)?.schema);

  for (const [code, value] of Object.entries(method.responses)) {
    const mediaTypes = noRef(value).content ?? {};
    const responseSchema = noRef(getPreferredMedia(mediaTypes)?.schema);

    if (!responseSchema) continue;

    responses[code] = {
      schema: responseSchema,
    };
  }

  let pathWithParameters = path;
  const queryParams = new URLSearchParams();

  for (const param of params) {
    const value = generateSample(method.method, param.schema);
    if (param.in === 'query') queryParams.append(param.name, getValue(value));

    if (param.in === 'path')
      pathWithParameters = pathWithParameters.replace(
        `{${param.name}}`,
        getValue(value),
      );
  }

  return {
    url: new URL(pathWithParameters, baseUrl).toString(),
    body: bodySchema ? generateSample(method.method, bodySchema) : undefined,
    responses,
    method: method.method,
    parameters: params,
  };
}

export function generateSample(
  method: string,
  schema: OpenAPI.SchemaObject,
): unknown {
  return sample(schema as object, {
    skipReadOnly: method !== 'GET',
    skipWriteOnly: method === 'GET',
  });
}
