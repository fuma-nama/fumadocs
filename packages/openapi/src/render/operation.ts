import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { createSample, type EndpointSample } from '@/create-sample';
import * as CURL from '@/requests/curl';
import * as JS from '@/requests/javascript';
import * as Go from '@/requests/go';
import { type MethodInformation, type RenderContext } from '@/types';
import { noRef, getPreferredMedia, getPreferredType } from '@/utils/schema';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { getScheme } from '@/utils/get-security';
import { renderPlayground } from '@/render/playground';
import { idToTitle } from '@/utils/id-to-title';
import { heading, p } from './element';
import { schemaElement } from './schema';

interface CustomProperty {
  'x-codeSamples'?: CodeSample[];
}

export interface CodeSample {
  lang: string;
  label: string;
  source: string;
}

export async function renderOperation(
  path: string,
  method: MethodInformation,
  ctx: RenderContext,
  hasHead = true,
): Promise<string> {
  let level = 2;
  const body = noRef(method.requestBody);
  const security = method.security ?? ctx.document.security;
  const info: string[] = [];
  const example: string[] = [];

  if (hasHead) {
    info.push(
      heading(
        level,
        method.summary ??
          (method.operationId ? idToTitle(method.operationId) : path),
      ),
    );
    level++;

    if (method.description) info.push(p(method.description));
  }

  info.push(renderPlayground(path, method, ctx));

  if (security) {
    info.push(heading(level, 'Authorization'));
    info.push(getAuthSection(security, ctx));
  }

  if (body) {
    const type = getPreferredType(body.content);
    if (!type)
      throw new Error(`No supported media type for body content: ${path}`);

    info.push(
      heading(level, `Request Body ${!body.required ? '(Optional)' : ''}`),
      p(body.description),
      schemaElement('body', noRef(body.content[type].schema ?? {}), {
        parseObject: true,
        readOnly: method.method === 'GET',
        writeOnly: method.method !== 'GET',
        required: body.required ?? false,
        render: ctx,
        allowFile: type === 'multipart/form-data',
      }),
    );
  }

  const parameterGroups = new Map<string, string[]>();
  const endpoint = createSample(path, method, ctx.baseUrl);

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
        allowFile: false,
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

  const samples: CodeSample[] = dedupe([
    {
      label: 'cURL',
      source: CURL.getSampleRequest(endpoint),
      lang: 'bash',
    },
    {
      label: 'JavaScript',
      source: JS.getSampleRequest(endpoint),
      lang: 'js',
    },
    {
      label: 'Go',
      source: Go.getSampleRequest(endpoint),
      lang: 'go',
    },
    ...(ctx.generateCodeSamples ? await ctx.generateCodeSamples(endpoint) : []),
    ...((method as CustomProperty)['x-codeSamples'] ?? []),
  ]);

  example.push(
    ctx.renderer.Requests(
      samples.map((s) => s.label),
      samples.map((s) =>
        ctx.renderer.Request({
          name: s.label,
          code: s.source,
          language: s.lang,
        }),
      ),
    ),
  );

  example.push(await getResponseTabs(endpoint, method, ctx));

  return ctx.renderer.API([
    ctx.renderer.APIInfo({ method: method.method, route: path }, info),
    ctx.renderer.APIExample(example),
  ]);
}

/**
 * Remove duplicated labels
 */
function dedupe(samples: CodeSample[]): CodeSample[] {
  const set = new Set<string>();
  const out: CodeSample[] = [];

  for (let i = samples.length - 1; i >= 0; i--) {
    if (set.has(samples[i].label)) continue;

    set.add(samples[i].label);
    out.unshift(samples[i]);
  }
  return out;
}

function getAuthSection(
  requirements: OpenAPI.SecurityRequirementObject[],
  { document, renderer }: RenderContext,
): string {
  const info: string[] = [];

  for (const requirement of requirements) {
    if (info.length > 0) info.push(`---`);

    for (const schema of getScheme(requirement, document)) {
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
              `Scope: \`${schema.scopes.length > 0 ? schema.scopes.join(', ') : 'none'}\``,
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

async function getResponseTabs(
  endpoint: EndpointSample,
  operation: OpenAPI.OperationObject,
  { renderer, generateTypeScriptSchema }: RenderContext,
): Promise<string> {
  const items: string[] = [];
  const child: string[] = [];

  for (const code of Object.keys(operation.responses)) {
    const tabs: string[] = [];

    if (code in endpoint.responses) {
      tabs.push(
        renderer.ExampleResponse(
          JSON.stringify(endpoint.responses[code].sample, null, 2),
        ),
      );
    }

    let ts: string | undefined;
    if (generateTypeScriptSchema) {
      ts = await generateTypeScriptSchema(endpoint, code);
    } else if (generateTypeScriptSchema === undefined) {
      ts = await getTypescriptSchema(endpoint, code);
    }

    if (ts) tabs.push(renderer.TypeScriptResponse(ts));

    let description = noRef(operation.responses[code]).description;

    if (!description && code in endpoint.responses)
      description = endpoint.responses[code].schema.description ?? '';

    items.push(code);
    child.push(
      renderer.Response({ value: code }, [
        p(description),
        ...(tabs.length > 0 ? [renderer.ResponseTypes(tabs)] : []),
      ]),
    );
  }

  if (items.length === 0) return '';

  return renderer.Responses(
    {
      items,
    },
    child,
  );
}
