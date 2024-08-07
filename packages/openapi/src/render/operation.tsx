import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import { generateSample, type EndpointSample } from '@/schema/sample';
import * as CURL from '@/requests/curl';
import * as JS from '@/requests/javascript';
import * as Go from '@/requests/go';
import { type MethodInformation, type RenderContext } from '@/types';
import { noRef, getPreferredType } from '@/utils/schema';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { getScheme } from '@/utils/get-security';
import { Playground } from '@/render/playground';
import { idToTitle } from '@/utils/id-to-title';
import { Markdown } from './element';
import { heading } from './heading';
import { Schema } from './schema';

interface CustomProperty {
  'x-codeSamples'?: CodeSample[];
}

export interface CodeSample {
  lang: string;
  label: string;
  source: string;
}

export async function Operation({
  path,
  method,
  ctx,
  hasHead,
}: {
  path: string;
  method: MethodInformation;
  ctx: RenderContext;
  hasHead?: boolean;
}): Promise<ReactElement> {
  let level = 2;
  const body = noRef(method.requestBody);
  const security = method.security ?? ctx.document.security;
  const info: ReactNode[] = [];
  const example: ReactNode[] = [];

  if (hasHead) {
    info.push(
      heading(
        level,
        method.summary ??
          (method.operationId ? idToTitle(method.operationId) : path),
        ctx,
      ),
    );
    level++;

    if (method.description)
      info.push(<Markdown key="description" text={method.description} />);
  }

  info.push(
    <Playground key="playground" path={path} method={method} ctx={ctx} />,
  );

  if (security) {
    info.push(heading(level, 'Authorization', ctx));
    info.push(<AuthSection key="auth" requirements={security} ctx={ctx} />);
  }

  if (body) {
    const type = getPreferredType(body.content);
    if (!type)
      throw new Error(`No supported media type for body content: ${path}`);

    info.push(
      <Fragment key="body">
        {heading(
          level,
          `Request Body ${!body.required ? '(Optional)' : ''}`,
          ctx,
        )}
        {body.description ? <Markdown text={body.description} /> : null}
        <Schema
          name="body"
          schema={noRef(body.content[type].schema ?? {})}
          ctx={{
            parseObject: true,
            readOnly: method.method === 'GET',
            writeOnly: method.method !== 'GET',
            required: body.required ?? false,
            render: ctx,
            allowFile: type === 'multipart/form-data',
            stack: [],
          }}
        />
      </Fragment>,
    );
  }

  const parameterGroups = new Map<string, ReactNode[]>();
  const endpoint = generateSample(path, method, ctx.baseUrl);

  for (const param of method.parameters) {
    const pInfo = endpoint.parameters.find(
      (item) => item.name === param.name && item.in === param.in,
    );
    if (!pInfo) continue;
    const schema = pInfo.schema;
    const groupName =
      {
        path: 'Path Parameters',
        query: 'Query Parameters',
        header: 'Header Parameters',
        cookie: 'Cookie Parameters',
      }[param.in] ?? 'Other Parameters';

    const group = parameterGroups.get(groupName) ?? [];
    group.push(
      <Schema
        key={param.name}
        name={param.name}
        schema={{
          ...schema,
          description: param.description ?? schema.description,
          deprecated:
            (param.deprecated ?? false) || (schema.deprecated ?? false),
        }}
        ctx={{
          parseObject: false,
          readOnly: method.method === 'GET',
          writeOnly: method.method !== 'GET',
          required: param.required ?? false,
          render: ctx,
          allowFile: false,
          stack: [],
        }}
      />,
    );
    parameterGroups.set(groupName, group);
  }

  for (const [group, parameters] of Array.from(parameterGroups.entries())) {
    info.push(heading(level, group, ctx), ...parameters);
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
    <ctx.renderer.Requests key="requests" items={samples.map((s) => s.label)}>
      {samples.map((s) => (
        <ctx.renderer.Request
          key={s.label}
          name={s.label}
          code={s.source}
          language={s.lang}
        />
      ))}
    </ctx.renderer.Requests>,
  );

  example.push(
    <ResponseTabs
      key="responses"
      operation={method}
      ctx={ctx}
      endpoint={endpoint}
    />,
  );

  return (
    <ctx.renderer.API>
      <ctx.renderer.APIInfo method={method.method} route={path}>
        {info}
      </ctx.renderer.APIInfo>
      <ctx.renderer.APIExample>{example}</ctx.renderer.APIExample>
    </ctx.renderer.API>
  );
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

function AuthSection({
  ctx: { document, renderer },
  requirements,
}: {
  requirements: OpenAPI.SecurityRequirementObject[];
  ctx: RenderContext;
}): ReactNode {
  let id = 0;
  const info: ReactNode[] = [];

  for (const requirement of requirements) {
    if (info.length > 0) info.push(`---`);

    for (const schema of getScheme(requirement, document)) {
      if (schema.type === 'http') {
        info.push(
          <renderer.Property
            key={id++}
            name="Authorization"
            type={
              {
                basic: 'Basic <token>',
                bearer: 'Bearer <token>',
              }[schema.scheme] ?? '<token>'
            }
          >
            {schema.description ? <Markdown text={schema.description} /> : null}
            <p>
              In: <code>header</code>
            </p>
          </renderer.Property>,
        );
      }

      if (schema.type === 'oauth2') {
        info.push(
          <renderer.Property
            key={id++}
            name="Authorization"
            type="Bearer <token>"
            required
          >
            {schema.description ? <Markdown text={schema.description} /> : null}
            <p>
              In: <code>header</code>
            </p>
            <p>
              Scope:{' '}
              <code>
                {schema.scopes.length > 0 ? schema.scopes.join(', ') : 'none'}
              </code>
            </p>
          </renderer.Property>,
        );
      }

      if (schema.type === 'apiKey') {
        info.push(
          <renderer.Property key={id++} name={schema.name} type="<token>">
            {schema.description ? <Markdown text={schema.description} /> : null}
            <p>
              In: <code>{schema.in}</code>
            </p>
          </renderer.Property>,
        );
      }
      if (schema.type === 'openIdConnect') {
        info.push(
          <renderer.Property
            key={id++}
            name="OpenID Connect"
            type="<token>"
            required
          >
            {schema.description ? <Markdown text={schema.description} /> : null}
          </renderer.Property>,
        );
      }
    }
  }

  return info;
}

async function ResponseTabs({
  endpoint,
  operation,
  ctx: { renderer, generateTypeScriptSchema },
}: {
  endpoint: EndpointSample;
  operation: OpenAPI.OperationObject;
  ctx: RenderContext;
}): Promise<ReactElement | null> {
  const items: string[] = [];
  const children: ReactNode[] = [];

  for (const code of Object.keys(operation.responses)) {
    const tabs: ReactNode[] = [];

    if (code in endpoint.responses) {
      tabs.push(
        <renderer.ResponseType
          key="json"
          lang="json"
          label="Response"
          code={JSON.stringify(endpoint.responses[code].sample, null, 2)}
        />,
      );
    }

    let ts: string | undefined;
    if (generateTypeScriptSchema) {
      ts = await generateTypeScriptSchema(endpoint, code);
    } else if (generateTypeScriptSchema === undefined) {
      ts = await getTypescriptSchema(endpoint, code);
    }

    if (ts)
      tabs.push(
        <renderer.ResponseType
          key="ts"
          lang="ts"
          label="TypeScript"
          code={ts}
        />,
      );

    let description = noRef(operation.responses[code]).description;

    if (!description && code in endpoint.responses)
      description = endpoint.responses[code].schema.description ?? '';

    items.push(code);
    children.push(
      <renderer.Response key={code} value={code}>
        <Markdown text={description} />
        {tabs.length > 0 ? (
          <renderer.ResponseTypes>{tabs}</renderer.ResponseTypes>
        ) : null}
      </renderer.Response>,
    );
  }

  if (items.length === 0) return null;

  return <renderer.Responses items={items}>{children}</renderer.Responses>;
}
