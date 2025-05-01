import { Fragment, type ReactElement, type ReactNode } from 'react';
import type {
  CallbackObject,
  MethodInformation,
  OperationObject,
  RenderContext,
  SecurityRequirementObject,
} from '@/types';
import {
  getPreferredType,
  type NoReference,
  type ResolvedSchema,
} from '@/utils/schema';
import { getSecurities, getSecurityPrefix } from '@/utils/get-security';
import { idToTitle } from '@/utils/id-to-title';
import { Markdown } from '../markdown';
import { heading } from '../heading';
import { Schema } from '../schema';
import { createMethod } from '@/server/create-method';
import { methodKeys } from '@/build-routes';
import {
  APIExample,
  APIExampleProvider,
  getAPIExamples,
} from '@/render/operation/api-example';
import { MethodLabel } from '@/ui/components/method-label';
import { type RequestData, supportedMediaTypes } from '@/requests/_shared';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { CopyResponseTypeScript } from '@/ui/client';

export interface CodeSample {
  lang: string;
  label: string;
  source?:
    | string
    | ((url: string, data: RequestData) => string | undefined)
    | false;
}

const ParamTypes = {
  path: 'Path Parameters',
  query: 'Query Parameters',
  header: 'Header Parameters',
  cookie: 'Cookie Parameters',
};

export function Operation({
  type = 'operation',
  path,
  method,
  ctx,
  hasHead,
  headingLevel = 2,
}: {
  type?: 'webhook' | 'operation';
  path: string;
  method: MethodInformation;
  ctx: RenderContext;

  hasHead?: boolean;
  headingLevel?: number;
}): ReactElement {
  const body = method.requestBody;
  let headNode: ReactNode = null;
  let bodyNode: ReactNode = null;
  let responseNode: ReactNode = null;
  let callbacksNode: ReactNode = null;

  if (hasHead) {
    const title =
      method.summary ??
      (method.operationId ? idToTitle(method.operationId) : path);

    headNode = (
      <>
        {heading(headingLevel, title, ctx)}
        {method.description ? <Markdown text={method.description} /> : null}
      </>
    );
    headingLevel++;
  }

  if (body) {
    const type = getPreferredType(body.content);
    if (
      !type ||
      !supportedMediaTypes.includes(
        String(type) as (typeof supportedMediaTypes)[number],
      )
    )
      throw new Error(
        `No supported media type for body content: ${path}, received: ${type}`,
      );

    bodyNode = (
      <>
        {heading(headingLevel, 'Request Body', ctx)}
        <div className="mb-4 p-3 bg-fd-card rounded-xl border flex flex-row items-center justify-between gap-2">
          <code>{type}</code>
          <span className="text-xs">
            {body.required ? 'Required' : 'Optional'}
          </span>
        </div>
        {body.description ? <Markdown text={body.description} /> : null}
        <Schema
          name="body"
          schema={(body.content[type].schema ?? {}) as ResolvedSchema}
          required={body.required}
          ctx={{
            readOnly: method.method === 'GET',
            writeOnly: method.method !== 'GET',
            render: ctx,
          }}
        />
      </>
    );
  }

  if (method.responses && ctx.showResponseSchema !== false) {
    const statuses = Object.keys(method.responses);

    responseNode = (
      <>
        {heading(headingLevel, 'Response Body', ctx)}

        <Tabs
          items={statuses}
          groupId="fumadocs_openapi_responses"
          className="bg-transparent"
        >
          {statuses.map((status) => (
            <ResponseTab
              key={status}
              status={status}
              operation={method}
              ctx={ctx}
            />
          ))}
        </Tabs>
      </>
    );
  }

  const parameterNode = Object.entries(ParamTypes).map(([type, title]) => {
    const params = method.parameters?.filter((param) => param.in === type);
    if (!params || params.length === 0) return;

    return (
      <Fragment key={type}>
        {heading(headingLevel, title, ctx)}
        <div className="flex flex-col gap-4">
          {params.map((param) => (
            <Schema
              key={param.name}
              name={param.name}
              schema={
                {
                  ...param.schema,
                  description: param.description ?? param.schema?.description,
                  deprecated:
                    (param.deprecated ?? false) ||
                    (param.schema?.deprecated ?? false),
                } as ResolvedSchema
              }
              parseObject={false}
              required={param.required}
              ctx={{
                readOnly: method.method === 'GET',
                writeOnly: method.method !== 'GET',
                render: ctx,
              }}
            />
          ))}
        </div>
      </Fragment>
    );
  });

  if (method.callbacks) {
    callbacksNode = (
      <>
        {heading(headingLevel, 'Webhooks', ctx)}
        {Object.entries(method.callbacks).map(([name, callback]) => (
          <WebhookCallback
            key={name}
            callback={callback}
            ctx={ctx}
            headingLevel={headingLevel}
          />
        ))}
      </>
    );
  }

  const security = (
    method.security ??
    ctx.schema.document.security ??
    []
  ).filter((v) => Object.keys(v).length > 0);

  const info = (
    <ctx.renderer.APIInfo head={headNode} method={method.method} route={path}>
      {type === 'operation' ? (
        ctx.disablePlayground ? (
          <div className="flex flex-row items-center gap-2.5 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
            <MethodLabel className="text-xs">{method.method}</MethodLabel>
            <code className="flex-1 overflow-auto text-nowrap text-[13px] text-fd-muted-foreground">
              {path}
            </code>
          </div>
        ) : (
          <ctx.renderer.APIPlayground path={path} method={method} ctx={ctx} />
        )
      ) : null}
      {security.length > 0 ? (
        <>
          {heading(headingLevel, 'Authorization', ctx)}
          <AuthSection requirements={security} ctx={ctx} />
        </>
      ) : null}
      {bodyNode}
      {parameterNode}
      {responseNode}
      {callbacksNode}
    </ctx.renderer.APIInfo>
  );

  if (type === 'operation') {
    const examples = getAPIExamples(path, method, ctx);

    return (
      <ctx.renderer.API>
        <APIExampleProvider route={path} examples={examples} method={method}>
          {info}
          <APIExample examples={examples} method={method} ctx={ctx} />
        </APIExampleProvider>
      </ctx.renderer.API>
    );
  } else {
    return info;
  }
}

async function ResponseTab({
  status,
  operation,
  ctx,
}: {
  status: string;
  operation: MethodInformation;
  ctx: RenderContext;
}) {
  const response = operation.responses![status];
  const { generateTypeScriptSchema, schema } = ctx;
  const mediaType = response.content
    ? getPreferredType(response.content)
    : null;
  const responseOfType = mediaType ? response.content?.[mediaType] : null;

  const description =
    responseOfType?.schema?.description ?? response.description ?? '';

  let ts: string | undefined;
  if (generateTypeScriptSchema) {
    ts = await generateTypeScriptSchema(operation, status);
  } else if (generateTypeScriptSchema === undefined && responseOfType?.schema) {
    ts = await getTypescriptSchema(
      responseOfType?.schema,
      schema.dereferenceMap,
    );
  }

  return (
    <Tab value={status}>
      <Markdown text={description} />
      {ts && <CopyResponseTypeScript code={ts} />}
      {responseOfType?.schema && (
        <Schema
          name="response"
          schema={responseOfType.schema as ResolvedSchema}
          required
          ctx={{
            render: ctx,
            writeOnly: false,
            readOnly: true,
          }}
        />
      )}
    </Tab>
  );
}

function WebhookCallback({
  callback,
  ctx,
  headingLevel,
}: {
  callback: CallbackObject;
  ctx: RenderContext;
  headingLevel: number;
}) {
  return Object.entries(callback).map(([path, pathItem]) => {
    const pathNodes = methodKeys.map((method) => {
      const operation = pathItem[method];
      if (!operation) return null;

      return (
        <Operation
          key={method}
          type="webhook"
          hasHead
          path={path}
          headingLevel={headingLevel + 1}
          method={createMethod(
            method,
            pathItem,
            operation as NoReference<OperationObject>,
          )}
          ctx={ctx}
        />
      );
    });

    return <Fragment key={path}>{pathNodes}</Fragment>;
  });
}

function AuthSection({
  ctx: {
    schema: { document },
    renderer,
  },
  requirements,
}: {
  requirements: SecurityRequirementObject[];
  ctx: RenderContext;
}) {
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

      if (schema.type === 'http' || schema.type === 'oauth2') {
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
