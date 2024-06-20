import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { createEndpoint, type Endpoint } from '@/endpoint';
import { getExampleResponse } from '@/utils/generate-response';
import * as CURL from '@/requests/curl';
import * as JS from '@/requests/javascript';
import { type MethodInformation, type RenderContext } from '@/types';
import { noRef, getPreferredMedia } from '@/utils/schema';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { heading, p } from './element';
import { schemaElement } from './schema';

export async function renderOperation(
  path: string,
  method: MethodInformation,
  ctx: RenderContext,
  noTitle = false,
): Promise<string> {
  let level = 2;
  const body = noRef(method.requestBody);
  const security = method.security ?? ctx.document.security;
  const info: string[] = [];
  const example: string[] = [];

  const title = method.summary ?? method.operationId;
  if (title && !noTitle) info.push(heading(level++, title));
  if (method.description) info.push(p(method.description));

  if (security) {
    info.push(heading(level, 'Authorization'));
    info.push(getAuthSection(security, ctx));
  }

  if (body) {
    const bodySchema = getPreferredMedia(body.content)?.schema;
    if (!bodySchema) throw new Error();

    info.push(
      heading(level, `Request Body ${!body.required ? '(Optional)' : ''}`),
      p(body.description),
      schemaElement('body', noRef(bodySchema), {
        parseObject: true,
        readOnly: method.method === 'GET',
        writeOnly: method.method !== 'GET',
        required: body.required ?? false,
        render: ctx,
      }),
    );
  }

  const parameterGroups = new Map<string, string[]>();
  const endpoint = createEndpoint(path, method, ctx.baseUrl);

  for (const param of method.parameters) {
    const schema = noRef(
      param.schema ?? getPreferredMedia(param.content ?? {})?.schema,
    );

    if (!schema) continue;

    const content = schemaElement(
      param.name,
      {
        ...schema,
        description: param.description ?? schema.description,
        deprecated: (param.deprecated ?? false) || (schema.deprecated ?? false),
      },
      {
        parseObject: false,
        readOnly: method.method === 'GET',
        writeOnly: method.method !== 'GET',
        required: param.required ?? false,
        render: ctx,
      },
    );

    const groupName =
      {
        path: 'Path Parameters',
        query: 'Query Parameters',
        header: 'Header Parameters',
        cookie: 'Cookie Parameters',
      }[param.in] ?? 'Other Parameters';

    const group = parameterGroups.get(groupName) ?? [];
    group.push(content);
    parameterGroups.set(groupName, group);
  }

  for (const [group, parameters] of Array.from(parameterGroups.entries())) {
    info.push(heading(level, group), ...parameters);
  }

  info.push(getResponseTable(method));

  example.push(
    ctx.renderer.Requests(
      ['cURL', 'JavaScript'],
      [
        ctx.renderer.Request({
          name: 'cURL',
          code: CURL.getSampleRequest(endpoint),
          language: 'bash',
        }),
        ctx.renderer.Request({
          name: 'JavaScript',
          code: JS.getSampleRequest(endpoint),
          language: 'js',
        }),
      ],
    ),
  );

  example.push(await getResponseTabs(endpoint, method, ctx));

  return ctx.renderer.API([
    ctx.renderer.APIInfo({ method: method.method, route: path }, info),
    ctx.renderer.APIExample(example),
  ]);
}

function getAuthSection(
  requirements: OpenAPI.SecurityRequirementObject[],
  { document, renderer }: RenderContext,
): string {
  const info: string[] = [];

  const schemas = document.components?.securitySchemes ?? {};
  for (const requirement of requirements) {
    if (info.length > 0) info.push(`---`);

    for (const [name, scopes] of Object.entries(requirement)) {
      if (!(name in schemas)) continue;
      const schema = noRef(schemas[name]);

      if (schema.type === 'http') {
        info.push(
          renderer.Property(
            {
              name: 'Authorization',
              type:
                {
                  basic: 'Basic <token>',
                  bearer: 'Bearer <token>',
                }[schema.scheme] ?? '<token>',
              required: true,
            },
            [p(schema.description), `In: \`header\``],
          ),
        );
      }

      if (schema.type === 'oauth2') {
        info.push(
          renderer.Property(
            {
              name: 'Authorization',
              type: 'Bearer <token>',
              required: true,
            },
            [
              p(schema.description),
              `In: \`header\``,
              `Scope: \`${scopes.length > 0 ? scopes.join(', ') : 'none'}\``,
            ],
          ),
        );
      }

      if (schema.type === 'apiKey') {
        info.push(
          renderer.Property(
            {
              name: schema.name,
              type: '<token>',
              required: true,
            },
            [p(schema.description), `In: \`${schema.in}\``],
          ),
        );
      }
      if (schema.type === 'openIdConnect') {
        info.push(
          renderer.Property(
            {
              name: 'OpenID Connect',
              type: '<token>',
              required: true,
            },
            [p(schema.description)],
          ),
        );
      }
    }
  }

  return info.join('\n\n');
}

function getResponseTable(operation: OpenAPI.OperationObject): string {
  const table: string[] = [];
  table.push(`| Status code | Description |`);
  table.push(`| ----------- | ----------- |`);

  Object.entries(operation.responses).forEach(([code, value]) => {
    table.push(`| \`${code}\` | ${noRef(value).description} |`);
  });

  return table.join('\n');
}

async function getResponseTabs(
  endpoint: Endpoint,
  operation: OpenAPI.OperationObject,
  { renderer }: RenderContext,
): Promise<string> {
  const items: string[] = [];
  const child: string[] = [];

  for (const code of Object.keys(operation.responses)) {
    const example = getExampleResponse(endpoint, code);
    const ts = await getTypescriptSchema(endpoint, code);

    const description =
      code in endpoint.responses
        ? endpoint.responses[code].schema.description
        : undefined;

    if (example && ts) {
      items.push(code);

      child.push(
        renderer.Response({ value: code }, [
          p(description),
          renderer.ResponseTypes([
            renderer.ExampleResponse(example),
            renderer.TypeScriptResponse(ts),
          ]),
        ]),
      );
    }
  }

  if (items.length === 0) return '';

  return renderer.Responses(
    {
      items,
    },
    child,
  );
}
