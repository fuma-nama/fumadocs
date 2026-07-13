'use client';
import { type ComponentProps, Fragment, use, useMemo, type ReactNode } from 'react';
import type {
  HttpMethods,
  MediaTypeObject,
  OperationObject,
  PathItemObject,
  SecuritySchemeObject,
  ServerObject,
} from '@/types';
import { methodKeys } from '@/utils/schema';
import { idToTitle } from '@fumadocs/api-docs/utils/id-to-title';
import { UsageTabs } from '@/ui/operation/usage-tabs';
import { Badge, MethodLabel } from '@/ui/components/method-label';
import { OperationProvider } from './context';
import { useTranslations } from '@fuma-translate/react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import { isMediaTypeSupported } from '@/requests/media/adapter';
import { RequestTabs } from './request-tabs';
import { cn } from '@/utils/cn';
import { getExampleRequests } from '../../utils/get-example-requests';
import { SelectTabs, SelectTabTrigger, SelectTab } from '@fumadocs/api-docs/components/select-tab';
import { Callout } from 'fumadocs-ui/components/callout';
import { AnchorSection } from '@fumadocs/api-docs/auto-anchor/client';
import { Heading } from '@/ui/components/heading';
import { Markdown } from '../components/markdown';
import { ServerProvider, useRenderContext } from '../contexts/api';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Check, Copy } from 'lucide-react';
import PlaygroundClient from '@/playground/client';

const paramTypeKeys = ['path', 'query', 'header', 'cookie'] as const;

export function Operation({
  type = 'operation',
  path,
  operation,
  pathItem,
  method,
  showTitle,
  showDescription,
  headingLevel = 2,
}: {
  type?: 'webhook' | 'operation';
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;

  showTitle?: boolean;
  showDescription?: boolean;
  headingLevel?: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const {
    schema: { dereferenced, resolve },
  } = ctx;
  const body = resolve(operation.requestBody);
  let headNode: ReactNode = null;
  const operationDescription = operation.description ?? pathItem.description;
  const descriptionNode = showDescription && operationDescription && (
    <Markdown md={operationDescription} />
  );
  let bodyNode: ReactNode = null;
  let authNode: ReactNode = null;
  let responseNode: ReactNode = null;
  let callbacksNode: ReactNode = null;
  const exampleRequests = useMemo(
    () => getExampleRequests({ path, operation, method, pathItem, ctx }),
    [ctx, operation, method, pathItem, path],
  );

  if (showTitle) {
    const title =
      operation.summary ||
      pathItem.summary ||
      (operation.operationId ? idToTitle(operation.operationId) : path);

    headNode = (
      <div className="flex gap-2 items-center justify-between">
        <Heading id={title} depth={headingLevel} className="my-0!">
          {title}
        </Heading>
        {operation.deprecated && (
          <Badge color="yellow" className="text-xs not-prose">
            {t('Deprecated')}
          </Badge>
        )}
      </div>
    );
    headingLevel++;
  } else if (operation.deprecated) {
    headNode = <Callout type="warn" title={t('Deprecated')} className="mt-0!" />;
  }

  const contentTypes = body?.content ? Object.entries(body.content) : null;
  if (contentTypes && contentTypes.length > 0) {
    const items = contentTypes.map(([type]) => ({
      label: <code className="text-xs">{type}</code>,
      value: type,
    }));

    bodyNode = (
      <SelectTabs defaultValue={items[0].value}>
        <div className="flex gap-2 items-center justify-between mt-10">
          <Heading id="request-body" depth={headingLevel} className="my-0!">
            {t('Request Body')}
          </Heading>
          {contentTypes.length > 1 ? (
            <SelectTabTrigger items={items} className="font-medium" />
          ) : (
            <p className="text-fd-muted-foreground not-prose">{items[0].label}</p>
          )}
        </div>
        {body?.description && <Markdown md={body.description} />}
        {contentTypes.map(([type, content]) => {
          if (!isMediaTypeSupported(type, ctx.mediaAdapters)) {
            throw new Error(`Media type ${type} is not supported (in ${path})`);
          }

          return (
            <SelectTab key={type} anchorSegments={['request-body', type]} value={type}>
              <RequestBodyContentItem
                content={resolve(content)}
                operation={operation}
                method={method}
              />
            </SelectTab>
          );
        })}
      </SelectTabs>
    );
  }

  if (operation.responses && ctx.showResponseSchema !== false) {
    const statuses = Object.keys(operation.responses);

    responseNode = (
      <>
        <Heading id="response-body" depth={headingLevel}>
          {t('Response Body')}
        </Heading>
        <Accordions type="multiple">
          {statuses.map((status) => (
            <ResponseAccordion key={status} status={status} operation={operation} />
          ))}
        </Accordions>
      </>
    );
  }

  const parameters = [...(operation.parameters ?? []), ...(pathItem.parameters ?? [])].map(
    (param) => resolve(param),
  );
  const parameterNode = paramTypeKeys.map((type) => {
    const params = parameters.filter((param) => param.in === type);
    if (!params || params.length === 0) return;

    const parameterLabel =
      type === 'path'
        ? t('Path Parameters')
        : type === 'query'
          ? t('Query Parameters')
          : type === 'header'
            ? t('Header Parameters')
            : t('Cookie Parameters');

    return (
      <Fragment key={type}>
        <Heading id={`parameters-${type}`} depth={headingLevel}>
          {parameterLabel}
        </Heading>
        <AnchorSection segments={['parameters', type]}>
          <div className="flex flex-col">
            {params.map((param) => {
              if (param.schema == null) return;
              const schema = resolve(param.schema);

              return (
                <ctx.SchemaUI
                  key={param.name}
                  client={{
                    name: param.name!,
                    required: param.required,
                  }}
                  root={
                    typeof schema === 'object'
                      ? {
                          ...schema,
                          description: param.description ?? schema.description,
                          deprecated: (param.deprecated ?? false) || (schema.deprecated ?? false),
                        }
                      : schema
                  }
                  readOnly={method === 'get'}
                  writeOnly={method !== 'get'}
                />
              );
            })}
          </div>
        </AnchorSection>
      </Fragment>
    );
  });

  const securities = (operation.security ?? dereferenced.security ?? []).filter(
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
          <Heading id="authorization" depth={headingLevel} className="my-0!">
            {t('Authorization')}
          </Heading>
          {items.length > 1 ? (
            <SelectTabTrigger items={items} />
          ) : (
            <div className="not-prose">{items[0].label}</div>
          )}
        </div>
        {securities.map((security, i) => (
          <SelectTab key={i} value={items[i].value}>
            {Object.entries(security).map(([key, scopes]) => {
              const scheme = resolve(securitySchemes?.[key]);
              if (!scheme) return;

              return <AuthScheme key={key} scheme={scheme} scopes={scopes} />;
            })}
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  const webhookCallbacks: {
    name: string;
    path: string;
    method: HttpMethods;
    callback: PathItemObject;
    operation: OperationObject;
  }[] = [];
  for (const [name, item] of Object.entries(operation.callbacks ?? {})) {
    const callbacks = resolve(item);

    for (const [path, pathItem] of Object.entries(callbacks)) {
      const callback = resolve(pathItem);

      for (const method of methodKeys) {
        if (!callback[method]) continue;
        webhookCallbacks.push({ name, path, method, callback, operation: callback[method] });
      }
    }
  }

  if (webhookCallbacks.length > 0) {
    callbacksNode = (
      <>
        <Heading id="callbacks" depth={headingLevel}>
          {t('Callbacks')}
        </Heading>
        <Accordions type="multiple">
          {webhookCallbacks.map((item, i) => (
            <AccordionItem
              key={i}
              value={`${item.name}\0${item.path}\0${item.method}`}
              anchorSegments={['callbacks', item.name, item.path, item.method]}
            >
              <AccordionHeader>
                <AccordionTrigger className="gap-3">
                  <div>
                    <p className="font-mono mb-2">{item.name}</p>

                    <div className="flex items-center gap-2 text-xs">
                      <MethodLabel>{item.method}</MethodLabel>
                      <code className="text-fd-muted-foreground">{item.path}</code>
                    </div>
                  </div>
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>
                <div className="border p-3 mb-2 @container prose-no-margin rounded-2xl">
                  <Operation
                    type="webhook"
                    path={path}
                    headingLevel={headingLevel + 1}
                    method={item.method}
                    pathItem={item.callback}
                    operation={item.operation}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordions>
      </>
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

    let apiPlayground: ReactNode;
    if (ctx.playground?.enabled ?? true) {
      apiPlayground = ctx.playground?.render ? (
        ctx.playground.render({ path, method, operation, pathItem, ctx })
      ) : (
        <PlaygroundClient
          operation={operation}
          pathItem={pathItem}
          route={path}
          method={method}
          writeOnly
          readOnly={false}
        />
      );
    } else {
      apiPlayground = (
        <div className="flex flex-row items-center gap-2.5 p-3 rounded-xl border bg-fd-card text-fd-card-foreground not-prose">
          <MethodLabel className="text-xs">{method}</MethodLabel>
          <code
            className={cn(
              'flex-1 overflow-auto text-nowrap text-[0.8125rem] text-fd-muted-foreground',
              operation.deprecated && 'line-through',
            )}
          >
            {path}
          </code>
        </div>
      );
    }

    let content = renderOperationLayout(
      {
        header: headNode,
        description: descriptionNode,
        authSchemes: authNode,
        body: bodyNode,
        callbacks: callbacksNode,
        parameters: parameterNode,
        responses: responseNode,
        apiPlayground,
        apiExample: <UsageTabs method={method} operation={operation} pathItem={pathItem} />,
      },
      {
        operation,
        method,
        pathItem,
        ctx,
      },
    );

    content = (
      <OperationProvider
        defaultExampleId={operation['x-exclusiveCodeSample'] ?? operation['x-selectedCodeSample']}
        route={path}
        examples={exampleRequests}
      >
        {content}
      </OperationProvider>
    );
    if (operation.servers || pathItem.servers) {
      content = (
        <ServerProvider servers={(operation.servers ?? pathItem.servers) as ServerObject[]}>
          {content}
        </ServerProvider>
      );
    }

    return content;
  } else {
    renderWebhookLayout ??= (slots) => (
      <div className="flex flex-col-reverse gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
        <div className="min-w-0 flex-1 prose-no-margin">
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
      requests: (
        <RequestTabs
          examples={exampleRequests}
          path={path}
          method={method}
          pathItem={pathItem}
          operation={operation}
        />
      ),
    });
  }
}

function RequestBodyContentItem({
  content,
  method,
  operation,
}: {
  method: HttpMethods;
  content: MediaTypeObject;
  operation: OperationObject;
}) {
  const ctx = useRenderContext();
  let ts = useMemo(() => {
    if (!content.schema || !ctx.generateTypeScriptDefinitions) return;
    return ctx.generateTypeScriptDefinitions(content.schema, {
      name: 'RequestBody',
      readOnly: false,
      writeOnly: true,
      ctx,
    });
  }, [content.schema, ctx]);
  if (ts instanceof Promise) ts = use(ts);

  return (
    <>
      {ts && <CopyTypeScriptPanel name="request body" code={ts} className="my-4 last:mb-0" />}
      {content.schema && (
        <ctx.SchemaUI
          client={{
            name: 'body',
            as: 'body',
            required: ctx.schema.resolve(operation.requestBody)?.required,
          }}
          root={content.schema}
          readOnly={method === 'get'}
          writeOnly={method !== 'get'}
        />
      )}
    </>
  );
}

function ResponseAccordion({ status, operation }: { status: string; operation: OperationObject }) {
  const { schema } = useRenderContext();
  const response = schema.resolve(operation.responses![status]);
  const contentTypes = response.content ? Object.entries(response.content) : [];
  const items = contentTypes.map(([key]) => ({
    label: <code className="text-xs">{key}</code>,
    value: key,
  }));

  return (
    <AccordionItem
      value={status}
      anchorSegments={['response', status]}
      className="data-[open]:border-b-0"
    >
      <SelectTabs defaultValue={items[0]?.value}>
        <AccordionHeader>
          <AccordionTrigger className="font-mono">{status}</AccordionTrigger>
          {items.length === 1 ? (
            <p className="text-fd-muted-foreground not-prose py-2">{items[0].label}</p>
          ) : (
            items.length > 0 && <SelectTabTrigger items={items} className="my-1.5 py-1" />
          )}
        </AccordionHeader>
        <AccordionContent className="ps-4.5 pe-3 border rounded-xl">
          {response.description && (
            <div className="prose-no-margin mt-3 mb-2">
              <Markdown md={response.description} />
            </div>
          )}
          {contentTypes.map(([type, item]) => (
            <SelectTab key={type} value={type} anchorSegments={[type]}>
              <RepsonseAccordionItem item={schema.resolve(item)} />
            </SelectTab>
          ))}
        </AccordionContent>
      </SelectTabs>
    </AccordionItem>
  );
}

function RepsonseAccordionItem({ item: { schema } }: { item: MediaTypeObject }) {
  const ctx = useRenderContext();
  let ts = useMemo(() => {
    if (!schema || !ctx.generateTypeScriptDefinitions) return;
    return ctx.generateTypeScriptDefinitions(schema, {
      name: 'ResponseBody',
      readOnly: true,
      writeOnly: false,
      ctx,
    });
  }, [ctx, schema]);
  // assume it is on server component when returned async
  if (ts instanceof Promise) ts = use(ts);

  return (
    <>
      {ts && <CopyTypeScriptPanel name="response body" code={ts} className="mb-2" />}
      {schema && (
        <ctx.SchemaUI
          client={{
            name: 'response',
            as: 'body',
          }}
          root={schema}
          readOnly
        />
      )}
    </>
  );
}

function AuthScheme({ scheme, scopes }: { scheme: SecuritySchemeObject; scopes: string[] }) {
  const t = useTranslations({ note: 'security scheme' });

  if (scheme.type === 'http' || scheme.type === 'oauth2') {
    return (
      <AuthProperty
        name={t('Authorization')}
        type={
          scheme.type === 'http' && scheme.scheme === 'basic'
            ? t('Basic <token>')
            : t('Bearer <token>')
        }
        deprecated={scheme.deprecated}
        scopes={scopes}
      >
        {scheme.description && <Markdown md={scheme.description} />}
        <p>
          {t('In')}: <code>header</code>
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
        {scheme.description && <Markdown md={scheme.description} />}
        <p>
          {t('In')}: <code>{scheme.in}</code>
        </p>
      </AuthProperty>
    );
  }

  if (scheme.type === 'openIdConnect') {
    return (
      <AuthProperty
        name={t('OpenID Connect')}
        type="<token>"
        deprecated={scheme.deprecated}
        scopes={scopes}
      >
        {scheme.description && <Markdown md={scheme.description} />}
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
  const t = useTranslations({ note: 'security scheme' });

  return (
    <div className={cn('text-sm border-t my-4 first:border-t-0', className)}>
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary">{name}</span>
        <span className="text-sm font-mono text-fd-muted-foreground">{type}</span>
        {deprecated && (
          <Badge color="red" className="text-xs">
            {t('Deprecated')}
          </Badge>
        )}
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">
        {props.children}
        {scopes.length > 0 && (
          <p>
            {t('Scope')}: <code>{scopes.join(', ')}</code>
          </p>
        )}
      </div>
    </div>
  );
}

function CopyTypeScriptPanel({
  name,
  code,
  className,
}: {
  code: string;
  name: 'response body' | 'request body';
  className?: string;
}) {
  const [isChecked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(code);
  });
  const t = useTranslations({ note: 'TypeScript definitions' });
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 bg-fd-card text-fd-card-foreground border rounded-xl p-3 not-prose',
        className,
      )}
    >
      <div>
        <p className="font-medium text-sm mb-2">{t('TypeScript Definitions')}</p>
        <p className="text-xs text-fd-muted-foreground">
          {t('Use the {name} type in TypeScript.', {
            variables: {
              name,
            },
          })}
        </p>
      </div>
      <button
        onClick={onCopy}
        className={cn(
          buttonVariants({
            color: 'secondary',
            className: 'p-2 gap-2',
            size: 'sm',
          }),
        )}
      >
        {isChecked ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {t('Copy')}
      </button>
    </div>
  );
}
