import { type ComponentProps, Fragment, use, useMemo, type ReactNode } from 'react';
import type {
  CallbackObject,
  MediaTypeObject,
  MethodInformation,
  RenderContext,
  SecuritySchemeObject,
  ServerObject,
} from '@/types';
import { createMethod, methodKeys, type NoReference } from '@/utils/schema';
import { idToTitle } from '@/utils/id-to-title';
import { Schema } from '../schema';
import { UsageTabs } from '@/ui/operation/usage-tabs';
import { Badge, MethodLabel } from '@/ui/components/method-label';
import { CopyTypeScriptPanel, OperationProvider } from './client';
import { I18nLabel } from '@/ui/client/i18n';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';
import { isMediaTypeSupported } from '@/requests/media/adapter';
import { APIPlayground } from '@/playground';
import { RequestTabs } from './request-tabs';
import { cn } from '@/utils/cn';
import { getExampleRequests } from './get-example-requests';
import { SelectTabs, SelectTabTrigger, SelectTab } from '../components/server-tab';

const paramTypeKeys = ['path', 'query', 'header', 'cookie'] as const;

export function Operation({
  type = 'operation',
  path,
  method,
  ctx,
  showTitle,
  showDescription,
  headingLevel = 2,
}: {
  type?: 'webhook' | 'operation';
  path: string;
  method: MethodInformation;
  ctx: RenderContext;

  showTitle?: boolean;
  showDescription?: boolean;
  headingLevel?: number;
}) {
  const {
    schema: { dereferenced },
  } = ctx;
  const body = method.requestBody;
  let headNode: ReactNode = null;
  const descriptionNode =
    showDescription && method.description && ctx.renderMarkdown(method.description);
  let bodyNode: ReactNode = null;
  let authNode: ReactNode = null;
  let responseNode: ReactNode = null;
  let callbacksNode: ReactNode = null;
  const exampleRequests = useMemo(() => getExampleRequests(path, method, ctx), [ctx, method, path]);

  if (showTitle) {
    const title = method.summary || (method.operationId ? idToTitle(method.operationId) : path);

    headNode = ctx.renderHeading(headingLevel, title);
    headingLevel++;
  }

  const contentTypes = body?.content ? Object.entries(body.content) : null;

  if (body && contentTypes && contentTypes.length > 0) {
    const items = contentTypes.map(([key]) => ({
      label: <code className="text-xs">{key}</code>,
      value: key,
    }));

    bodyNode = (
      <SelectTabs defaultValue={items[0].value}>
        <div className="flex gap-2 items-center justify-between mt-10">
          {ctx.renderHeading(headingLevel, <I18nLabel label="titleRequestBody" />, {
            id: 'request-body',
            className: 'my-0!',
          })}
          {contentTypes.length > 1 ? (
            <SelectTabTrigger items={items} className="font-medium" />
          ) : (
            <p className="text-fd-muted-foreground not-prose">{items[0].label}</p>
          )}
        </div>
        {body.description && ctx.renderMarkdown(body.description)}
        {contentTypes.map(([type, content]) => {
          if (!isMediaTypeSupported(type, ctx.mediaAdapters)) {
            throw new Error(`Media type ${type} is not supported (in ${path})`);
          }

          return (
            <SelectTab key={type} value={type}>
              <RequestBodyContentItem content={content} method={method} ctx={ctx} />
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
        {ctx.renderHeading(headingLevel, <I18nLabel label="titleResponseBody" />, {
          id: 'response-body',
        })}

        <Accordions type="multiple">
          {statuses.map((status) => (
            <ResponseAccordion key={status} status={status} operation={method} ctx={ctx} />
          ))}
        </Accordions>
      </>
    );
  }

  const parameterNode = paramTypeKeys.map((type) => {
    const params = method.parameters?.filter((param) => param.in === type);
    if (!params || params.length === 0) return;

    return (
      <Fragment key={type}>
        {ctx.renderHeading(headingLevel, <I18nLabel label={`${type}Parameters`} />, {
          id: `parameters-${type}`,
        })}
        <div className="flex flex-col">
          {params.map(
            (param) =>
              param.schema != null && (
                <Schema
                  key={param.name}
                  client={{
                    name: param.name!,
                    required: param.required,
                  }}
                  root={
                    typeof param.schema === 'object'
                      ? {
                          ...param.schema,
                          description: param.description ?? param.schema?.description,
                          deprecated:
                            (param.deprecated ?? false) || (param.schema?.deprecated ?? false),
                        }
                      : param.schema
                  }
                  readOnly={method.method === 'GET'}
                  writeOnly={method.method !== 'GET'}
                  ctx={ctx}
                />
              ),
          )}
        </div>
      </Fragment>
    );
  });

  const securities = (method.security ?? dereferenced.security ?? []).filter(
    (v) => Object.keys(v).length > 0,
  );

  if (type === 'operation' && securities.length > 0) {
    const securitySchemes = dereferenced.components?.securitySchemes;
    const items = securities.map((security, i) => {
      return {
        value: String(i),
        label: (
          <div className="flex flex-col text-xs min-w-0">
            {Object.entries(security).map(([key, scopes]) => (
              <code key={key} className="truncate">
                <span className="font-medium">{key}</span>{' '}
                {scopes.length > 0 && (
                  <span className="text-fd-muted-foreground">{scopes.join(', ')}</span>
                )}
              </code>
            ))}
          </div>
        ),
      };
    });

    authNode = (
      <SelectTabs defaultValue={items[0].value}>
        <div className="flex items-start justify-between gap-2 mt-10">
          {ctx.renderHeading(headingLevel, <I18nLabel label="authorization" />, {
            id: 'authorization',
            className: 'my-0!',
          })}
          {items.length > 1 ? (
            <SelectTabTrigger items={items} />
          ) : (
            <div className="not-prose">{items[0].label}</div>
          )}
        </div>
        {securities.map((security, i) => (
          <SelectTab key={i} value={items[i].value}>
            {Object.entries(security).map(([key, scopes]) => {
              const scheme = securitySchemes?.[key];
              if (!scheme) return;

              return <AuthScheme key={key} scheme={scheme} scopes={scopes} ctx={ctx} />;
            })}
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  const callbacks = method.callbacks ? Object.entries(method.callbacks) : null;
  if (callbacks && callbacks.length > 0) {
    const items = callbacks.map(([key]) => ({
      label: <code className="text-xs">{key}</code>,
      value: key,
    }));

    callbacksNode = (
      <SelectTabs defaultValue={items[0].value}>
        <div className="flex justify-between gap-2 items-end mt-10">
          {ctx.renderHeading(headingLevel, <I18nLabel label="titleCallbacks" />, {
            id: 'callbacks',
            className: 'my-0!',
          })}
          {callbacks.length > 1 ? (
            <SelectTabTrigger items={items} className="font-medium" />
          ) : (
            <p className="text-fd-muted-foreground not-prose">{items[0].label}</p>
          )}
        </div>
        {callbacks.map(([name, callback]) => (
          <SelectTab key={name} value={name}>
            <WebhookCallback callback={callback} ctx={ctx} headingLevel={headingLevel} />
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  let { renderOperationLayout, renderWebhookLayout } = ctx.content ?? {};

  if (type === 'operation') {
    renderOperationLayout ??= (slots) => {
      return (
        <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
          <div className="min-w-0 flex-1">
            {slots.header}
            {slots.apiPlayground}
            {slots.description}
            {slots.authSchemes}
            {slots.parameters}
            {slots.body}
            {slots.responses}
            {slots.callbacks}
          </div>
          <div className="@4xl:sticky @4xl:top-[calc(var(--fd-docs-row-1,2rem)+1rem)] @4xl:w-[400px]">
            {slots.apiExample}
          </div>
        </div>
      );
    };

    const playgroundEnabled = ctx.playground?.enabled ?? true;
    let content = renderOperationLayout(
      {
        header: headNode,
        description: descriptionNode,
        authSchemes: authNode,
        body: bodyNode,
        callbacks: callbacksNode,
        parameters: parameterNode,
        responses: responseNode,
        apiPlayground: playgroundEnabled ? (
          <APIPlayground path={path} method={method} ctx={ctx} />
        ) : (
          <div className="flex flex-row items-center gap-2.5 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
            <MethodLabel className="text-xs">{method.method}</MethodLabel>
            <code className="flex-1 overflow-auto text-nowrap text-[0.8125rem] text-fd-muted-foreground">
              {path}
            </code>
          </div>
        ),
        apiExample: <UsageTabs method={method} ctx={ctx} />,
      },
      ctx,
      method,
    );

    content = (
      <OperationProvider
        defaultExampleId={method['x-exclusiveCodeSample'] ?? method['x-selectedCodeSample']}
        route={path}
        examples={exampleRequests}
      >
        {content}
      </OperationProvider>
    );
    if (method.servers) {
      content = (
        <ctx.clientBoundary.ServerProvider servers={method.servers as ServerObject[]}>
          {content}
        </ctx.clientBoundary.ServerProvider>
      );
    }

    return content;
  } else {
    renderWebhookLayout ??= (slots) => (
      <div className="flex flex-col-reverse gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
        <div className="min-w-0 flex-1">
          {slots.header}
          {slots.description}
          {slots.authSchemes}
          {slots.parameters}
          {slots.body}
          {slots.responses}
          {slots.callbacks}
        </div>
        <div className="@4xl:sticky @4xl:top-[calc(var(--fd-docs-row-1,2rem)+1rem)] @4xl:w-[400px]">
          {slots.requests}
        </div>
      </div>
    );
    return renderWebhookLayout({
      header: headNode,
      description: descriptionNode,
      authSchemes: authNode,
      body: bodyNode,
      callbacks: callbacksNode,
      parameters: parameterNode,
      responses: responseNode,
      requests: <RequestTabs examples={exampleRequests} path={path} operation={method} ctx={ctx} />,
    });
  }
}

function RequestBodyContentItem({
  content,
  method,
  ctx,
}: {
  content: NoReference<MediaTypeObject>;
  method: MethodInformation;
  ctx: RenderContext;
}) {
  let ts = useMemo(() => {
    if (!content.schema || !ctx.generateTypeScriptDefinitions) return;
    return ctx.generateTypeScriptDefinitions(content.schema, {
      operation: method,
      readOnly: false,
      writeOnly: true,
      ...ctx,
    });
  }, [content.schema, ctx, method]);
  if (ts instanceof Promise) ts = use(ts);

  return (
    <>
      {ts && <CopyTypeScriptPanel name="request body" code={ts} className="mt-4" />}
      {content.schema && (
        <Schema
          client={{
            name: 'body',
            as: 'body',
            required: method.requestBody?.required,
          }}
          root={content.schema}
          readOnly={method.method === 'GET'}
          writeOnly={method.method !== 'GET'}
          ctx={ctx}
        />
      )}
    </>
  );
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
  const contentTypes = response.content ? Object.entries(response.content) : [];
  let wrapper = (children: ReactNode) => children;
  let selectorNode: ReactNode = null;

  if (contentTypes.length > 0) {
    const items = contentTypes.map(([key]) => ({
      label: <code className="text-xs">{key}</code>,
      value: key,
    }));

    selectorNode =
      items.length === 1 ? (
        <p className="text-fd-muted-foreground not-prose">{items[0].label}</p>
      ) : (
        <SelectTabTrigger items={items} />
      );
    wrapper = (children) => <SelectTabs defaultValue={items[0].value}>{children}</SelectTabs>;
  }

  return wrapper(
    <AccordionItem value={status}>
      <AccordionHeader>
        <AccordionTrigger className="font-mono">{status}</AccordionTrigger>
        {selectorNode}
      </AccordionHeader>
      <AccordionContent className="ps-4.5">
        {response.description && (
          <div className="prose-no-margin mb-2">{ctx.renderMarkdown(response.description)}</div>
        )}
        {contentTypes.map(([type, item]) => (
          <SelectTab key={type} value={type} className="mb-2">
            <RepsonseAccordionItem
              type={type}
              status={status}
              item={item}
              operation={operation}
              ctx={ctx}
            />
          </SelectTab>
        ))}
      </AccordionContent>
    </AccordionItem>,
  );
}

function RepsonseAccordionItem({
  type,
  status,
  operation,
  item: { schema },
  ctx,
}: {
  type: string;
  status: string;
  operation: MethodInformation;
  item: NoReference<MediaTypeObject>;
  ctx: RenderContext;
}) {
  let ts = useMemo(() => {
    if (!schema || !ctx.generateTypeScriptDefinitions) return;
    return ctx.generateTypeScriptDefinitions(schema, {
      readOnly: true,
      writeOnly: false,
      operation,
      _internal_legacy: {
        statusCode: status,
        contentType: type,
      },
      ...ctx,
    });
  }, [ctx, operation, schema, status, type]);
  // assume it is on server component when returned async
  if (ts instanceof Promise) ts = use(ts);

  return (
    <>
      {ts && <CopyTypeScriptPanel name="response body" code={ts} />}
      {schema && (
        <div className="border px-3 py-2 rounded-lg">
          <Schema
            client={{
              name: 'response',
              as: 'body',
            }}
            root={schema}
            readOnly
            ctx={ctx}
          />
        </div>
      )}
    </>
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
  return (
    <Accordions type="single" collapsible>
      {Object.entries(callback).map(([path, pathItem]) => {
        const pathNodes = methodKeys.map((method) => {
          const operation = pathItem[method];
          if (!operation) return null;

          return (
            <div key={method} className="border p-3 my-2 @container prose-no-margin rounded-lg">
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
  scheme,
  scopes,
  ctx,
}: {
  scheme: SecuritySchemeObject;
  scopes: string[];
  ctx: RenderContext;
}) {
  if (scheme.type === 'http' || scheme.type === 'oauth2') {
    return (
      <AuthProperty
        name={<I18nLabel label="authorization" />}
        type={
          scheme.type === 'http' && scheme.scheme === 'basic' ? (
            <I18nLabel label="authBasicTokenExample" />
          ) : (
            <I18nLabel label="authBearerTokenExample" />
          )
        }
        deprecated={scheme.deprecated}
        scopes={scopes}
      >
        {scheme.description && ctx.renderMarkdown(scheme.description)}
        <p>
          <I18nLabel label="authTokenIn" />: <code>header</code>
        </p>
      </AuthProperty>
    );
  }

  if (scheme.type === 'apiKey') {
    return (
      <AuthProperty
        name={scheme.name!}
        type="<token>"
        deprecated={scheme.deprecated}
        scopes={scopes}
      >
        {scheme.description && ctx.renderMarkdown(scheme.description)}
        <p>
          <I18nLabel label="authTokenIn" />: <code>{scheme.in}</code>
        </p>
      </AuthProperty>
    );
  }

  if (scheme.type === 'openIdConnect') {
    return (
      <AuthProperty
        name={<I18nLabel label="openIdConnect" />}
        type="<token>"
        deprecated={scheme.deprecated}
        scopes={scopes}
      >
        {scheme.description && ctx.renderMarkdown(scheme.description)}
      </AuthProperty>
    );
  }
}

function AuthProperty({
  name,
  type,
  deprecated = false,
  scopes = [],
  className,
  ...props
}: ComponentProps<'div'> & {
  name: ReactNode;
  type: ReactNode;
  deprecated?: boolean;
  scopes?: string[];
}) {
  return (
    <div className={cn('text-sm border-t my-4 first:border-t-0', className)}>
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary">{name}</span>
        <span className="text-sm font-mono text-fd-muted-foreground">{type}</span>
        {deprecated && (
          <Badge color="red" className="text-xs">
            <I18nLabel label="deprecated" />
          </Badge>
        )}
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">
        {props.children}
        {scopes.length > 0 && (
          <p>
            <I18nLabel label="authScope" />: <code>{scopes.join(', ')}</code>
          </p>
        )}
      </div>
    </div>
  );
}
