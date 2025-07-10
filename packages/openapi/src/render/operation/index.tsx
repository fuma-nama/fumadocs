import { Fragment, type ReactElement, type ReactNode } from 'react';
import type {
  CallbackObject,
  MethodInformation,
  RenderContext,
  SecuritySchemeObject,
} from '@/types';
import { type ResolvedSchema } from '@/utils/schema';
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
import { type SampleGenerator } from '@/requests/_shared';

import { CopyResponseTypeScript } from '@/ui/client';
import { SelectTab, SelectTabs, SelectTabTrigger } from '@/ui/select-tabs';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';

export interface CodeSample {
  lang: string;
  label?: string;
  source?: string | SampleGenerator | false;
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
  let authNode: ReactNode = null;
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

  const contentTypes = body ? Object.entries(body.content) : null;

  if (body && contentTypes && contentTypes.length > 0) {
    bodyNode = (
      <SelectTabs defaultValue={contentTypes[0][0]}>
        <div className="flex gap-2 items-end justify-between">
          {heading(headingLevel, 'Request Body', ctx)}
          <SelectTabTrigger
            items={contentTypes.map((v) => v[0])}
            className="mb-4"
          />
        </div>
        {body.description && <Markdown text={body.description} />}
        {contentTypes.map(([type, content]) => {
          if (!(type in ctx.mediaAdapters)) {
            throw new Error(`Media type ${type} is not supported (in ${path})`);
          }

          return (
            <SelectTab key={type} value={type}>
              <Schema
                name="body"
                as="body"
                schema={(content.schema ?? {}) as ResolvedSchema}
                required={body.required}
                readOnly={method.method === 'GET'}
                writeOnly={method.method !== 'GET'}
                ctx={ctx}
              />
            </SelectTab>
          );
        })}
      </SelectTabs>
    );
  }

  if (method.responses && ctx.showResponseSchema !== false) {
    const statuses = Object.keys(method.responses);

    responseNode = (
      <>
        {heading(headingLevel, 'Response Body', ctx)}

        <Accordions type="multiple">
          {statuses.map((status) => (
            <AccordionItem key={status} value={status}>
              <ResponseAccordion status={status} operation={method} ctx={ctx} />
            </AccordionItem>
          ))}
        </Accordions>
      </>
    );
  }

  const parameterNode = Object.entries(ParamTypes).map(([type, title]) => {
    const params = method.parameters?.filter((param) => param.in === type);
    if (!params || params.length === 0) return;

    return (
      <Fragment key={type}>
        {heading(headingLevel, title, ctx)}
        <div className="flex flex-col">
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
              required={param.required}
              readOnly={method.method === 'GET'}
              writeOnly={method.method !== 'GET'}
              ctx={ctx}
            />
          ))}
        </div>
      </Fragment>
    );
  });

  const securities = (
    method.security ??
    ctx.schema.document.security ??
    []
  ).filter((v) => Object.keys(v).length > 0);

  if (type === 'operation' && securities.length > 0) {
    const securitySchemes = ctx.schema.document.components?.securitySchemes;
    const names = securities.map((security) =>
      Object.keys(security).join(' & '),
    );

    authNode = (
      <SelectTabs defaultValue={names[0]}>
        <div className="flex items-end justify-between gap-2">
          {heading(headingLevel, 'Authorization', ctx)}
          <SelectTabTrigger items={names} className="mb-4" />
        </div>
        {securities.map((security, i) => (
          <SelectTab key={i} value={names[i]}>
            {Object.entries(security).map(([key, scopes]) => {
              const scheme = securitySchemes?.[key];
              if (!scheme) return;

              return (
                <AuthScheme
                  key={key}
                  scheme={scheme}
                  scopes={scopes}
                  ctx={ctx}
                />
              );
            })}
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  if (method.callbacks) {
    const callbacks = Object.entries(method.callbacks);

    callbacksNode = (
      <SelectTabs defaultValue={callbacks[0][0]}>
        <div className="flex justify-between gap-2 items-end">
          {heading(headingLevel, 'Callbacks', ctx)}
          <SelectTabTrigger
            items={callbacks.map((v) => v[0])}
            className="mb-4"
          />
        </div>
        {callbacks.map(([name, callback]) => (
          <SelectTab key={name} value={name}>
            <WebhookCallback
              callback={callback}
              ctx={ctx}
              headingLevel={headingLevel}
            />
          </SelectTab>
        ))}
      </SelectTabs>
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
      {authNode}
      {parameterNode}
      {bodyNode}
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

function ResponseAccordion({
  status,
  operation,
  ctx,
}: {
  status: string;
  operation: MethodInformation;
  ctx: RenderContext;
}) {
  const response = operation.responses![status];
  const {
    generateTypeScriptSchema,
    schema: { dereferenceMap },
  } = ctx;
  const contentTypes = response.content
    ? Object.entries(response.content)
    : null;

  return (
    <SelectTabs defaultValue={contentTypes?.[0][0]}>
      <AccordionHeader>
        <AccordionTrigger className="font-mono">{status}</AccordionTrigger>
        {contentTypes && (
          <SelectTabTrigger items={contentTypes.map((v) => v[0])} />
        )}
      </AccordionHeader>

      <AccordionContent>
        {response.description && (
          <div className="prose-no-margin">
            <Markdown text={response.description} />
          </div>
        )}
        {contentTypes?.map(async ([type, resType]) => {
          const schema = resType.schema;
          let ts: string | undefined;

          if (generateTypeScriptSchema) {
            ts = await generateTypeScriptSchema(operation, status);
          }

          return (
            <SelectTab key={type} value={type} className="mt-2">
              {ts && <CopyResponseTypeScript code={ts} />}
              {schema && (
                <div className="border px-3 rounded-lg my-2 overflow-auto max-h-[400px]">
                  <Schema
                    name="response"
                    schema={schema as ResolvedSchema}
                    as="body"
                    readOnly
                    ctx={ctx}
                  />
                </div>
              )}
            </SelectTab>
          );
        })}
      </AccordionContent>
    </SelectTabs>
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
  const pathItems = Object.entries(callback);

  return (
    <Accordions type="single" collapsible>
      {pathItems.map(([path, pathItem]) => {
        const pathNodes = methodKeys.map((method) => {
          const operation = pathItem[method];
          if (!operation) return null;

          return (
            <div
              key={method}
              className="border p-3 my-2 prose-no-margin rounded-lg"
            >
              <Operation
                type="webhook"
                path={path}
                headingLevel={headingLevel + 1}
                method={createMethod(method, pathItem, operation)}
                ctx={ctx}
              />
            </div>
          );
        });

        return (
          <AccordionItem key={path} value={path}>
            <AccordionHeader>
              <AccordionTrigger className="font-mono">{path}</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>{pathNodes}</AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordions>
  );
}

function AuthScheme({
  scheme: schema,
  scopes,
  ctx: { renderer },
}: {
  scheme: SecuritySchemeObject;
  scopes: string[];
  ctx: RenderContext;
}) {
  const scopeElement =
    scopes.length > 0 ? (
      <p>
        Scope: <code>{scopes.join(', ')}</code>
      </p>
    ) : null;

  if (schema.type === 'http' || schema.type === 'oauth2') {
    return (
      <renderer.Property
        name="Authorization"
        type={
          schema.type === 'http' && schema.scheme === 'basic'
            ? `Basic <token>`
            : 'Bearer <token>'
        }
        required
      >
        {schema.description && <Markdown text={schema.description} />}
        <p>
          In: <code>header</code>
        </p>
        {scopeElement}
      </renderer.Property>
    );
  }

  if (schema.type === 'apiKey') {
    return (
      <renderer.Property name={schema.name} type="<token>">
        {schema.description && <Markdown text={schema.description} />}
        <p>
          In: <code>{schema.in}</code>
          {scopeElement}
        </p>
      </renderer.Property>
    );
  }

  if (schema.type === 'openIdConnect') {
    return (
      <renderer.Property name="OpenID Connect" type="<token>" required>
        {schema.description && <Markdown text={schema.description} />}
        {scopeElement}
      </renderer.Property>
    );
  }
}
