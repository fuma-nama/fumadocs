import { sample } from 'openapi-sampler';
import type { MethodInformation, RenderContext } from '@/types';
import {
  getPreferredType,
  type ParsedSchema,
  type NoReference,
} from '@/utils/schema';
import { getSecurities, getSecurityPrefix } from '@/utils/get-security';

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
    schema: ParsedSchema;
    mediaType: string;
    sample: unknown;
  };
  responses: Record<string, ResponseSample>;
  parameters: ParameterSample[];
}

interface ResponseSample {
  mediaType: string;
  sample: unknown;
  schema: ParsedSchema;
}

interface ParameterSample {
  name: string;
  in: string;
  schema: ParsedSchema;
  sample: unknown;
}

export function generateSample(
  path: string,
  method: MethodInformation,
  { baseUrl, schema: { document } }: RenderContext,
): EndpointSample {
  const params: ParameterSample[] = [];
  const responses: EndpointSample['responses'] = {};

  for (const param of method.parameters ?? []) {
    if (param.schema) {
      let value = param.example ?? sample(param.schema as object);
      if (param.schema.type && param.schema.type === value) {
        // if no example is defined make sure its visible that there is still a placeholder, equal to auth <token>
        value = `<${value}>`;
      }
      params.push({
        name: param.name,
        in: param.in,
        schema: param.schema,
        sample: value,
      });
    } else if (param.content) {
      const key = getPreferredType(param.content);
      const content = key ? param.content[key] : undefined;

      if (!key || !content)
        throw new Error(
          `Cannot find parameter schema for ${param.name} in ${path} ${method.method}`,
        );

      params.push({
        name: param.name,
        in: param.in,
        schema: content.schema ?? {},
        sample:
          content.example ?? param.example ?? sample(content.schema as object),
      });
    }
  }

  const requirements = method.security ?? document.security;
  if (requirements && requirements.length > 0) {
    for (const security of getSecurities(requirements[0], document)) {
      const prefix = getSecurityPrefix(security);

      params.push({
        name: security.type === 'apiKey' ? security.name : 'Authorization',
        schema: {
          type: 'string',
        },
        sample: prefix ? `${prefix} <token>` : '<token>',
        in: 'header',
      });
    }
  }

  let bodyOutput: EndpointSample['body'];
  if (method.requestBody) {
    const body = method.requestBody.content;
    const type = getPreferredType(body);
    if (!type)
      throw new Error(
        `Cannot find body schema for ${path} ${method.method}: missing media type`,
      );
    const schema = (type ? body[type].schema : undefined) ?? {};

    bodyOutput = {
      schema,
      mediaType: type as string,
      sample: body[type].example ?? generateBody(method.method, schema),
    };
  }

  for (const [code, response] of Object.entries(method.responses ?? {})) {
    const content = response.content;
    if (!content) continue;

    const mediaType = getPreferredType(content) as string;
    if (!mediaType) continue;

    const responseSchema = content[mediaType].schema;
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
    let value = generateBody(method.method, param.schema);
    if (param.schema.type && param.schema.type === value) {
      // if no example is defined make sure its visible that there is still a placeholder, equal to auth <token>
      value = `<${value}>`;
    }
    if (param.in === 'query') queryParams.append(param.name, String(value));

    if (param.in === 'path')
      pathWithParameters = pathWithParameters.replace(
        `{${param.name}}`,
        String(value),
      );
  }

  if (queryParams.size > 0)
    pathWithParameters = `${pathWithParameters}?${queryParams.toString()}`;

  return {
    url: `${baseUrl}${pathWithParameters}`,
    body: bodyOutput,
    responses,
    method: method.method,
    parameters: params,
  };
}

function generateBody(
  method: string,
  schema: NoReference<ParsedSchema>,
): unknown {
  return sample(schema as object, {
    skipReadOnly: method !== 'GET',
    skipWriteOnly: method === 'GET',
  });
}
