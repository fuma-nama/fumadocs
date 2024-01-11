import { sample } from 'openapi-sampler';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { MethodInformation } from '@/types';
import { getPreferredMedia, noRef } from '@/utils';

export interface Endpoint {
  url: string;
  method: string;
  body?: unknown;
  responses: Record<string, unknown>;
  parameters: Parameter[];
}

interface Parameter {
  name: string;
  in: string;
  value: unknown;
}

export function createEndpoint(
  path: string,
  method: MethodInformation,
  baseUrl = 'https://example.com',
): Endpoint {
  const params: Parameter[] = [];
  const responses: Record<string, unknown> = {};

  const url = new URL(path, baseUrl).toString();

  for (const param of method.parameters) {
    const schema =
      param.schema ?? getPreferredMedia(param.content ?? {})?.schema;

    if (!schema) continue;

    params.push({
      name: param.name,
      in: param.in,
      value: generateSample(method.method, noRef(schema)),
    });
  }

  const body = noRef(method.requestBody)?.content ?? {};
  const bodySchema = noRef(getPreferredMedia(body)?.schema);

  for (const [code, value] of Object.entries(method.responses)) {
    const mediaTypes = noRef(value).content ?? {};
    const responseSchema = getPreferredMedia(mediaTypes)?.schema;

    if (!responseSchema) continue;

    responses[code] = generateSample(method.method, noRef(responseSchema));
  }

  return {
    url,
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
