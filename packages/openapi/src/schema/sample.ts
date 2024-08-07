import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { sample } from 'openapi-sampler';
import type { MethodInformation } from '@/types';
import { toSampleInput, noRef, getPreferredType } from '@/utils/schema';

/**
 * Sample info of endpoint
 */
export interface EndpointSample {
  /**
   * Request URL, including path and query parameters
   */
  url: string;
  method: string;
  body?: {
    schema: OpenAPI.SchemaObject;
    mediaType: string;
    sample: unknown;
  };
  responses: Record<string, ResponseSample>;
  parameters: ParameterSample[];
}

interface ResponseSample {
  mediaType: string;
  sample: unknown;
  schema: OpenAPI.SchemaObject;
}

interface ParameterSample {
  name: string;
  in: string;
  schema: OpenAPI.SchemaObject;
  sample: unknown;
}

export function generateSample(
  path: string,
  method: MethodInformation,
  baseUrl: string,
): EndpointSample {
  const params: ParameterSample[] = [];
  const responses: EndpointSample['responses'] = {};

  for (const param of method.parameters) {
    if (param.schema) {
      params.push({
        name: param.name,
        in: param.in,
        schema: noRef(param.schema),
        sample: param.example ?? sample(param.schema as object),
      });
    } else if (param.content) {
      const key = getPreferredType(param.content);
      const content = key ? param.content[key] : undefined;

      if (!key || !content?.schema)
        throw new Error(
          `Cannot find parameter schema for ${param.name} in ${path} ${method.method}`,
        );

      params.push({
        name: param.name,
        in: param.in,
        schema: noRef(content.schema),
        sample:
          content.example ?? param.example ?? sample(content.schema as object),
      });
    }
  }

  let bodyOutput: EndpointSample['body'];

  if (method.requestBody) {
    const body = noRef(method.requestBody).content;
    const type = getPreferredType(body);
    const schema = type ? noRef(body[type].schema) : undefined;
    if (!type || !schema)
      throw new Error(`Cannot find body schema for ${path} ${method.method}`);

    bodyOutput = {
      schema,
      mediaType: type as string,
      sample: body[type].example ?? generateBody(method.method, schema),
    };
  }

  for (const [code, value] of Object.entries(method.responses)) {
    const content = noRef(value).content;
    if (!content) continue;

    const mediaType = getPreferredType(content) as string;
    if (!mediaType) continue;

    const responseSchema = noRef(content[mediaType].schema);
    if (!responseSchema) continue;

    responses[code] = {
      mediaType,
      sample:
        content[mediaType].example ??
        generateBody(method.method, responseSchema),
      schema: responseSchema,
    };
  }

  let pathWithParameters = path;
  const queryParams = new URLSearchParams();

  for (const param of params) {
    const value = generateBody(method.method, param.schema);
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
    body: bodyOutput,
    responses,
    method: method.method,
    parameters: params,
  };
}

function generateBody(method: string, schema: OpenAPI.SchemaObject): unknown {
  return sample(schema as object, {
    skipReadOnly: method !== 'GET',
    skipWriteOnly: method === 'GET',
  });
}
