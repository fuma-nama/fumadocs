import { type ComponentProps, Fragment, type ReactNode } from 'react';
import type {
  CallbackObject,
  MethodInformation,
  RenderContext,
  SecuritySchemeObject,
} from '@/types';
import {
  createMethod,
  methodKeys,
  type NoReference,
  type ResolvedSchema,
} from '@/utils/schema';
import { idToTitle } from '@/utils/id-to-title';
import { Schema } from '../schema';
import { APIExample, getAPIExamples } from '@/ui/operation/example-panel';
import { MethodLabel } from '@/ui/components/method-label';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import {
  CopyResponseTypeScript,
  SelectTab,
  SelectTabs,
  SelectTabTrigger,
} from './client';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';
import { isMediaTypeSupported } from '@/requests/media/adapter';
import { cn } from 'fumadocs-ui/utils/cn';
import { APIPlayground } from '@/playground';
import { OperationProviderLazy } from '../contexts/operation.lazy';

const ParamTypes = {
  path: 'Path Parameters',
  query: 'Query Parameters',
  header: 'Header Parameters',
  cookie: 'Cookie Parameters',
};

export async function Operation({
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
}) {
  const {
    schema: { dereferenced },
  } = ctx;
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
        {ctx.renderHeading(headingLevel, title)}
        {method.description && ctx.renderMarkdown(method.description)}
      </>
    );
    headingLevel++;
  }

  const contentTypes = body ? Object.entries(body.content) : null;

  if (body && contentTypes && contentTypes.length > 0) {
    bodyNode = (
      <SelectTabs defaultValue={contentTypes[0][0]}>
        <div className="flex gap-2 items-end justify-between">
          {ctx.renderHeading(headingLevel, 'Request Body')}
          <SelectTabTrigger
            items={contentTypes.map((v) => v[0])}
            className="mb-4"
          />
        </div>
        {body.description && ctx.renderMarkdown(body.description)}
        {contentTypes.map(([type, content]) => {
          if (!isMediaTypeSupported(type, ctx.mediaAdapters)) {
            throw new Error(`Media type ${type} is not supported (in ${path})`);
          }

          return (
            <SelectTab key={type} value={type}>
              <Schema
                name="body"
                as="body"
                root={(content.schema ?? {}) as ResolvedSchema}
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
        {ctx.renderHeading(headingLevel, 'Response Body')}

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
        {ctx.renderHeading(headingLevel, title)}
        <div className="flex flex-col">
          {params.map((param) => (
            <Schema
              key={param.name}
              name={param.name}
              root={
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

  const securities = (method.security ?? dereferenced.security ?? []).filter(
    (v) => Object.keys(v).length > 0,
  );

  if (type === 'operation' && securities.length > 0) {
    const securitySchemes = dereferenced.components?.securitySchemes;
    const names = securities.map((security) =>
      Object.keys(security).join(' & '),
    );

    authNode = (
      <SelectTabs defaultValue={names[0]}>
        <div className="flex items-end justify-between gap-2">
          {ctx.renderHeading(headingLevel, 'Authorization')}
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
          {ctx.renderHeading(headingLevel, 'Callbacks')}
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

  let { renderOperationLayout, renderWebhookLayout } = ctx.content ?? {};
  if (type === 'operation') {
    renderOperationLayout ??= (slots) => {
      return (
        <div
          className="flex flex-col gap-x-6 gap-y-4 xl:flex-row xl:items-start"
          style={
            {
              '--fd-api-info-top':
                'calc(12px + var(--fd-nav-height) + var(--fd-banner-height) + var(--fd-tocnav-height, 0px))',
            } as object
          }
        >
          <div className="min-w-0 flex-1">
            {slots.header}
            {slots.apiPlayground}
            {slots.authSchemes}
            {slots.paremeters}
            {slots.body}
            {slots.responses}
            {slots.callbacks}
          </div>
          {slots.apiExample}
        </div>
      );
    };

    const playgroundEnabled = ctx.playground?.enabled ?? true;
    const content = await renderOperationLayout(
      {
        header: headNode,
        authSchemes: authNode,
        body: bodyNode,
        callbacks: callbacksNode,
        paremeters: parameterNode,
        responses: responseNode,
        apiPlayground: playgroundEnabled ? (
          <APIPlayground path={path} method={method} ctx={ctx} />
        ) : (
          <div className="flex flex-row items-center gap-2.5 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
            <MethodLabel className="text-xs">{method.method}</MethodLabel>
            <code className="flex-1 overflow-auto text-nowrap text-[13px] text-fd-muted-foreground">
              {path}
            </code>
          </div>
        ),
        apiExample: <APIExample method={method} ctx={ctx} />,
      },
      ctx,
      method,
    );

    return (
      <OperationProviderLazy
        defaultExampleId={
          method['x-exclusiveCodeSample'] ?? method['x-selectedCodeSample']
        }
        route={path}
        examples={getAPIExamples(path, method, ctx)}
      >
        {content}
      </OperationProviderLazy>
    );
  } else {
    renderWebhookLayout ??= (slots) => (
      <div>
        {slots.header}
        {slots.authSchemes}
        {slots.paremeters}
        {slots.body}
        {slots.responses}
        {slots.callbacks}
      </div>
    );
    return renderWebhookLayout({
      header: headNode,
      authSchemes: authNode,
      body: bodyNode,
      callbacks: callbacksNode,
      paremeters: parameterNode,
      responses: responseNode,
    });
  }
}

async function ResponseAccordion({
  status,
  operation,
  ctx,
}: {
  status: string;
  operation: MethodInformation;
  ctx: RenderContext;
}) {
  const response = operation.responses![status];
  const { generateTypeScriptSchema } = ctx;
  const contentTypes = response.content ? Object.entries(response.content) : [];

  return (
    <SelectTabs defaultValue={contentTypes.at(0)?.[0]}>
      <AccordionHeader>
        <AccordionTrigger className="font-mono">{status}</AccordionTrigger>
        {contentTypes.length > 1 && (
          <SelectTabTrigger items={contentTypes.map((v) => v[0])} />
        )}
        {contentTypes.length === 1 && (
          <p className="text-[13px] text-fd-muted-foreground">
            {contentTypes[0][0]}
          </p>
        )}
      </AccordionHeader>

      <AccordionContent className="ps-4.5">
        {response.description && (
          <div className="prose-no-margin">
            {ctx.renderMarkdown(response.description)}
          </div>
        )}
        {contentTypes?.map(async ([type, resType]) => {
          const schema = resType.schema;
          let ts: string | undefined;

          if (generateTypeScriptSchema) {
            ts = await generateTypeScriptSchema(operation, status);
          } else if (generateTypeScriptSchema === undefined && schema) {
            ts = await getTypescriptSchema(schema, ctx);
          }

          return (
            <SelectTab key={type} value={type} className="my-2">
              {ts && <CopyResponseTypeScript code={ts} />}
              {schema && (
                <div className="border px-3 py-2 rounded-lg">
                  <Schema
                    name="response"
                    root={schema as ResolvedSchema}
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
  callback: NoReference<CallbackObject>;
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
  ctx,
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
      <AuthProperty
        name="Authorization"
        type={
          schema.type === 'http' && schema.scheme === 'basic'
            ? `Basic <token>`
            : 'Bearer <token>'
        }
      >
        {schema.description && ctx.renderMarkdown(schema.description)}
        <p>
          In: <code>header</code>
        </p>
        {scopeElement}
      </AuthProperty>
    );
  }

  if (schema.type === 'apiKey') {
    return (
      <AuthProperty name={schema.name} type="<token>">
        {schema.description && ctx.renderMarkdown(schema.description)}
        <p>
          In: <code>{schema.in}</code>
          {scopeElement}
        </p>
      </AuthProperty>
    );
  }

  if (schema.type === 'openIdConnect') {
    return (
      <AuthProperty name="OpenID Connect" type="<token>">
        {schema.description && ctx.renderMarkdown(schema.description)}
        {scopeElement}
      </AuthProperty>
    );
  }
}

function AuthProperty({
  name,
  type,
  ...props
}: ComponentProps<'div'> & {
  name: string;
  type: string;
}) {
  return (
    <div
      className={cn('text-sm border-t py-4 first:border-t-0', props.className)}
    >
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary">{name}</span>
        <span className="text-sm font-mono text-fd-muted-foreground">
          {type}
        </span>
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">
        {props.children}
      </div>
    </div>
  );
}
