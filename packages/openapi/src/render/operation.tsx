import { Fragment, type ReactElement, type ReactNode } from 'react';
import { generateSample, type EndpointSample } from '@/schema/sample';
import * as CURL from '@/requests/curl';
import * as JS from '@/requests/javascript';
import * as Go from '@/requests/go';
import * as Python from '@/requests/python';
import {
  type MethodInformation,
  type RenderContext,
  type SecurityRequirementObject,
} from '@/types';
import { getPreferredType } from '@/utils/schema';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { getSecurities, getSecurityPrefix } from '@/utils/get-security';
import { Playground } from '@/render/playground';
import { idToTitle } from '@/utils/id-to-title';
import { type ResponseTypeProps } from '@/render/renderer';
import { Markdown } from './markdown';
import { heading } from './heading';
import { Schema } from './schema';

interface CustomProperty {
  'x-codeSamples'?: CodeSample[];
}

export interface CodeSample {
  lang: string;
  label: string;
  source: string | ((endpoint: EndpointSample) => string | undefined) | false;
}

interface CodeSampleCompiled {
  lang: string;
  label: string;
  source: string;
}

export function Operation({
  baseUrls,
  path,
  method,
  ctx,
  hasHead,
}: {
  baseUrls: string[];
  path: string;
  method: MethodInformation;
  ctx: RenderContext;
  hasHead?: boolean;
}): ReactElement {
  let level = 2;
  const body = method.requestBody;
  const security = method.security ?? ctx.document.security;
  const info: ReactNode[] = [];

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

    if (method.description) {
      info.push(<Markdown key="description" text={method.description} />);
    }
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
        {heading(level, 'Request Body', ctx)}
        <div className="mb-8 flex flex-row items-center justify-between gap-2">
          <code>{type}</code>
          <span>{body.required ? 'Required' : 'Optional'}</span>
        </div>
        {body.description ? <Markdown text={body.description} /> : null}
        <Schema
          name="body"
          schema={body.content[type].schema ?? {}}
          ctx={{
            readOnly: method.method === 'GET',
            writeOnly: method.method !== 'GET',
            required: body.required ?? false,
            render: ctx,
            allowFile: type === 'multipart/form-data',
          }}
        />
      </Fragment>,
    );
  }

  const parameterGroups = new Map<string, ReactNode[]>();
  const endpoint = generateSample(path, method, ctx);

  for (const param of method.parameters ?? []) {
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
        }}
      />,
    );
    parameterGroups.set(groupName, group);
  }

  for (const [group, parameters] of Array.from(parameterGroups.entries())) {
    info.push(heading(level, group, ctx), ...parameters);
  }

  return (
    <ctx.renderer.API>
      <ctx.renderer.APIInfo
        method={method.method}
        route={path}
        baseUrls={baseUrls}
      >
        {info}
      </ctx.renderer.APIInfo>
      <APIExample method={method} endpoint={endpoint} ctx={ctx} />
    </ctx.renderer.API>
  );
}

const defaultSamples: CodeSample[] = [
  {
    label: 'cURL',
    source: CURL.getSampleRequest,
    lang: 'bash',
  },
  {
    label: 'JavaScript',
    source: JS.getSampleRequest,
    lang: 'js',
  },
  {
    label: 'Go',
    source: Go.getSampleRequest,
    lang: 'go',
  },
  {
    label: 'Python',
    source: Python.getSampleRequest,
    lang: 'python',
  },
];

async function APIExample({
  method,
  endpoint,
  ctx,
}: {
  method: MethodInformation;
  endpoint: EndpointSample;
  ctx: RenderContext;
}) {
  const renderer = ctx.renderer;
  const children: ReactNode[] = [];

  const samples = dedupe([
    ...defaultSamples,
    ...(ctx.generateCodeSamples ? await ctx.generateCodeSamples(endpoint) : []),
    ...((method as CustomProperty)['x-codeSamples'] ?? []),
  ]).flatMap<CodeSampleCompiled>((sample) => {
    if (sample.source === false) return [];

    const result =
      typeof sample.source === 'function'
        ? sample.source(endpoint)
        : sample.source;
    if (result === undefined) return [];

    return {
      ...sample,
      source: result,
    };
  });

  if (samples.length > 0) {
    children.push(
      <renderer.Requests key="requests" items={samples.map((s) => s.label)}>
        {samples.map((s) => (
          <renderer.Request
            key={s.label}
            name={s.label}
            code={s.source}
            language={s.lang}
          />
        ))}
      </renderer.Requests>,
    );
  }

  children.push(
    <ResponseTabs
      key="responses"
      operation={method}
      ctx={ctx}
      endpoint={endpoint}
    />,
  );

  return <renderer.APIExample>{children}</renderer.APIExample>;
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
  requirements: SecurityRequirementObject[];
  ctx: RenderContext;
}): ReactNode {
  let id = 0;
  const info: ReactNode[] = [];

  for (const requirement of requirements) {
    for (const schema of getSecurities(requirement, document)) {
      const prefix = getSecurityPrefix(schema);
      const scopeElement =
        schema.scopes.length > 0 ? (
          <p>
            Scope: <code>{schema.scopes.join(', ')}</code>
          </p>
        ) : null;

      if (schema.type === 'http') {
        info.push(
          <renderer.Property
            key={id++}
            name="Authorization"
            type={prefix ? `${prefix} <token>` : '<token>'}
            required
          >
            {schema.description ? <Markdown text={schema.description} /> : null}
            <p>
              In: <code>header</code>
              {scopeElement}
            </p>
          </renderer.Property>,
        );
      }

      if (schema.type === 'oauth2') {
        info.push(
          <renderer.Property
            key={id++}
            name="Authorization"
            type={prefix ? `${prefix} <token>` : '<token>'}
            required
          >
            {schema.description ? <Markdown text={schema.description} /> : null}
            <p>
              In: <code>header</code>
            </p>
            {scopeElement}
          </renderer.Property>,
        );
      }

      if (schema.type === 'apiKey') {
        info.push(
          <renderer.Property key={id++} name={schema.name} type="<token>">
            {schema.description ? <Markdown text={schema.description} /> : null}
            <p>
              In: <code>{schema.in}</code>
              {scopeElement}
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
            {scopeElement}
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
  ctx: { renderer, generateTypeScriptSchema, dereferenceMap },
}: {
  endpoint: EndpointSample;
  operation: MethodInformation;
  ctx: RenderContext;
}): Promise<ReactElement | null> {
  const items: string[] = [];
  const children: ReactNode[] = [];

  if (!operation.responses) return null;
  for (const code of Object.keys(operation.responses)) {
    const types: ResponseTypeProps[] = [];
    let description = operation.responses[code].description;

    if (!description && code in endpoint.responses)
      description = endpoint.responses[code].schema.description ?? '';

    if (code in endpoint.responses) {
      types.push({
        lang: 'json',
        label: 'Response',
        code: JSON.stringify(endpoint.responses[code].sample, null, 2),
      });
    }

    let ts: string | undefined;
    if (generateTypeScriptSchema) {
      ts = await generateTypeScriptSchema(endpoint, code);
    } else if (generateTypeScriptSchema === undefined) {
      ts = await getTypescriptSchema(endpoint, code, dereferenceMap);
    }

    if (ts) {
      types.push({
        code: ts,
        lang: 'ts',
        label: 'TypeScript',
      });
    }

    items.push(code);
    children.push(
      <renderer.Response key={code} value={code}>
        <Markdown text={description} />
        {types.length > 0 ? (
          <renderer.ResponseTypes>
            {types.map((type) => (
              <renderer.ResponseType key={type.lang} {...type} />
            ))}
          </renderer.ResponseTypes>
        ) : null}
      </renderer.Response>,
    );
  }

  if (items.length === 0) return null;

  return <renderer.Responses items={items}>{children}</renderer.Responses>;
}
