import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import type { MethodInformation } from '@/types';
import { getPreferredMedia, toSampleInput, noRef } from '@/utils/schema';
import { generateInput } from '@/utils/generate-input';

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
  baseUrl: string,
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
    const value = generateInput(method.method, param.schema);
    if (param.in === 'query')
      queryParams.append(param.name, toSampleInput(value));

    if (param.in === 'path')
      pathWithParameters = pathWithParameters.replace(
        `{${param.name}}`,
        toSampleInput(value),
      );
  }

  if (queryParams.size > 0)
    pathWithParameters = `${pathWithParameters}?${queryParams.toString()}`;

  return {
    url: new URL(`${baseUrl}${pathWithParameters}`).toString(),
    body: bodySchema ? generateInput(method.method, bodySchema) : undefined,
    responses,
    method: method.method,
    parameters: params,
  };
}
