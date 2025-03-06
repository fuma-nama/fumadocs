import type { MethodInformation, RenderContext } from '@/types';
import type { NoReference } from '@/utils/schema';
import { sample } from 'openapi-sampler';
import { getPreferredType, type ParsedSchema } from '@/utils/schema';
import { getSecurities, getSecurityPrefix } from '@/utils/get-security';
import type { RequestData } from '@/ui/contexts/code-example';

export function getRequestData(
  path: string,
  method: NoReference<MethodInformation>,
  sampleKey: string | null,
  { schema: { document } }: RenderContext,
): RequestData {
  const result: RequestData = {
    path: {},
    cookie: {},
    header: {},
    query: {},
    method: method.method,
  };

  for (const param of method.parameters ?? []) {
    let schema = param.schema;
    let value;

    if (!schema && param.content) {
      const type = getPreferredType(param.content);

      const content = type ? param.content[type] : undefined;
      if (!content)
        throw new Error(
          `Cannot find parameter schema for ${param.name} in ${path} ${method.method}`,
        );

      schema = content.schema;
      value = content.example ?? param.example ?? sample(schema as object);
    } else {
      value = param.example ?? sample(schema as object);
    }

    if (param.in === 'cookie') {
      result.cookie[param.name] = value;
    } else if (param.in === 'header') {
      result.header[param.name] = value;
    } else if (param.in === 'query') {
      result.query[param.name] = value;
    } else if (param.in === 'path') {
      result.path[param.name] = value;
    }
  }

  const requirements = method.security ?? document.security;
  if (requirements && requirements.length > 0) {
    for (const security of getSecurities(requirements[0], document)) {
      const prefix = getSecurityPrefix(security);
      const name = security.type === 'apiKey' ? security.name : 'Authorization';

      result.header[name] = prefix ? `${prefix} <token>` : '<token>';
    }
  }

  if (method.requestBody) {
    const body = method.requestBody.content;
    const type = getPreferredType(body);
    if (!type)
      throw new Error(
        `Cannot find body schema for ${path} ${method.method}: missing media type`,
      );
    result.bodyMediaType = type as RequestData['bodyMediaType'];
    const bodyOfType = body[type];

    if (bodyOfType.examples && sampleKey) {
      result.body = bodyOfType.examples[sampleKey].value;
    } else if (bodyOfType.example) {
      result.body = bodyOfType.example;
    } else {
      result.body = generateBody(method.method, bodyOfType?.schema ?? {});
    }
  }

  return result;
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
