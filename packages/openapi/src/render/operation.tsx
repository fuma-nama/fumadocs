import { Fragment, type ReactElement, type ReactNode } from 'react';
import { generateSample, type EndpointSample } from '@/utils/generate-sample';
import type {
  CallbackObject,
  MethodInformation,
  OperationObject,
  RenderContext,
  SecurityRequirementObject,
} from '@/types';
import { getPreferredType, type NoReference } from '@/utils/schema';
import { getSecurities, getSecurityPrefix } from '@/utils/get-security';
import { idToTitle } from '@/utils/id-to-title';
import { Markdown } from './markdown';
import { heading } from './heading';
import { Schema } from './schema';
import { createMethod } from '@/server/create-method';
import { methodKeys } from '@/build-routes';
import { APIExample } from '@/render/operation/api-example';
import { MethodLabel } from '@/ui/components/method-label';

export interface CodeSample {
  lang: string;
  label: string;
  source:
    | string
    | ((endpoint: EndpointSample, exampleKey: string) => string | undefined)
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
  const security = method.security ?? ctx.schema.document.security;
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
        {method.description ? (
          <Markdown key="description" text={method.description} />
        ) : null}
      </>
    );
    headingLevel++;
  }

  if (body) {
    const type = getPreferredType(body.content);
    if (!type)
      throw new Error(`No supported media type for body content: ${path}`);

    bodyNode = (
      <>
        {heading(headingLevel, 'Request Body', ctx)}
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
      </>
    );
  }

  if (method.responses && ctx.showResponseSchema) {
    responseNode = (
      <>
        {heading(headingLevel, 'Response Body', ctx)}

        {Object.entries(method.responses).map(([status, response]) => {
          if (!response.content) return;

          const mediaType = getPreferredType(response.content);
          if (!mediaType) return null;

          const content = response.content[mediaType];
          if (!content.schema) return null;

          return (
            <Fragment key={status}>
              {heading(headingLevel + 1, status, ctx)}
              <Markdown text={response.description} />

              <Schema
                name="response"
                schema={content.schema}
                ctx={{
                  render: ctx,
                  writeOnly: false,
                  readOnly: true,
                  required: true,
                }}
              />
            </Fragment>
          );
        })}
      </>
    );
  }

  const endpoint = generateSample(path, method, ctx);

  const parameterNode = Object.entries(ParamTypes).map(([type, title]) => {
    const params = endpoint.parameters.filter(
      (param) => param.in === type && !param.isAuthOnly,
    );
    if (params.length === 0) return;

    return (
      <Fragment key={type}>
        {heading(headingLevel, title, ctx)}
        <div className="flex flex-col gap-4">
          {params.map((param) => (
            <Schema
              key={param.name}
              name={param.name}
              schema={{
                ...param.schema,
                description: param.description ?? param.schema?.description,
                deprecated:
                  (param.deprecated ?? false) ||
                  (param.schema?.deprecated ?? false),
              }}
              ctx={{
                parseObject: false,
                readOnly: method.method === 'GET',
                writeOnly: method.method !== 'GET',
                required: param.required ?? false,
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
      {security && Object.keys(security).length > 0 ? (
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
    return (
      <ctx.renderer.API>
        {info}
        <APIExample method={method} endpoint={endpoint} ctx={ctx} />
      </ctx.renderer.API>
    );
  } else {
    return info;
  }
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
