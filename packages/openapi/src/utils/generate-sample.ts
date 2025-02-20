import { sample } from 'openapi-sampler';
import type { MethodInformation, RenderContext } from '@/types';
import {
  getPreferredType,
  type ParsedSchema,
  type NoReference,
} from '@/utils/schema';
import { getSecurities, getSecurityPrefix } from '@/utils/get-security';
import type { OpenAPIV3_1 } from 'openapi-types';

export type Samples = {
  [key in '_default' | (string & {})]?: {
    value?: unknown;
    description?: string;
    summary?: string;
    externalValue?: string;
  };
};

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
    samples: Samples;
  };
  responses: Record<string, ResponseSample>;
  parameters: ParameterSample[];
}

interface ResponseSample {
  mediaType: string;
  samples: Samples;
  schema: ParsedSchema;
}

interface ParameterSample extends NoReference<OpenAPIV3_1.ParameterObject> {
  sample: unknown;
  isAuthOnly: boolean;
}

export function generateSample(
  path: string,
  method: MethodInformation,
  { baseUrl, schema: { document } }: RenderContext,
): EndpointSample {
  const params: ParameterSample[] = [];
  const responses: EndpointSample['responses'] = {};

  for (const param of method.parameters ?? []) {
    let schema = param.schema,
      value;

    if (!schema && param.content) {
      const key = getPreferredType(param.content);

      const content = key ? param.content[key] : undefined;
      if (!content)
        throw new Error(
          `Cannot find parameter schema for ${param.name} in ${path} ${method.method}`,
        );

      schema = content.schema;
      value = content.example ?? param.example ?? sample(schema as object);
    } else {
      value = param.example ?? sample(schema as object);
    }

    if (schema?.type && param.schema?.type === value) {
      // if no example is defined make sure its visible that there is still a placeholder, equal to auth <token>
      value = `<${value}>`;
    }

    params.push({
      ...param,
      sample: value,
      isAuthOnly: false,
    });
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
        isAuthOnly: true,
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
      samples: body[type].examples
        ? body[type].examples
        : {
            _default: {
              value: body[type].example ?? generateBody(method.method, schema),
            },
          },
    };
  }

  for (const [code, response] of Object.entries(method.responses ?? {})) {
    const content = response.content;
    if (!content) continue;

    const mediaType = getPreferredType(content) as string;
    if (!mediaType) continue;

    const responseSchema = content[mediaType].schema;
    if (!responseSchema) continue;

    const examples = content[mediaType].examples ?? content.examples;
    const example = content[mediaType].example ?? content.example;
    responses[code] = {
      mediaType,
      samples: examples
        ? examples
        : {
            _default: example ?? generateBody(method.method, responseSchema),
          },
      schema: responseSchema,
    };
  }

  let pathWithParameters = path;
  const queryParams = new URLSearchParams();

  for (const param of params) {
    if (param.in === 'query')
      queryParams.append(param.name, String(param.sample));

    if (param.in === 'path')
      pathWithParameters = pathWithParameters.replace(
        `{${param.name}}`,
        String(param.sample),
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
