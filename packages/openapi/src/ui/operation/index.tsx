'use client';
import { type ComponentProps, type FC, Fragment, type ReactNode } from 'react';
import type {
  HttpMethods,
  MediaTypeObject,
  OperationObject,
  PathItemObject,
  RenderContext,
  SecuritySchemeObject,
} from '@/types';
import { UsageTabs } from '@/ui/operation/usage-tabs';
import { Badge, MethodLabel } from '@/ui/components/method-label';
import {
  OperationProvider,
  type OperationResponse,
  useComponents,
  useOpenAPI,
  useOperation,
  useTypeScriptDefinitions,
} from '@/headless';
import { useTranslations } from '@fuma-translate/react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import { RequestTabs } from './request-tabs';
import { cn } from '@/utils/cn';
import { SelectTabs, SelectTabTrigger, SelectTab } from '@fumadocs/api-docs/components/select-tab';
import { Callout } from 'fumadocs-ui/components/callout';
import { AnchorSection } from '@fumadocs/api-docs/auto-anchor/client';
import { Heading } from '@/ui/components/heading';
import { Markdown } from '../components/markdown';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Check, Copy } from 'lucide-react';
import PlaygroundClient, { type PlaygroundClientOptions } from '@/playground/client';
import type { CreateOpenAPIPageOptions } from '..';

export interface OperationPlaygroundOptions extends PlaygroundClientOptions {
  /**
   * @defaultValue true
   */
  enabled?: boolean;

  /**
   * replace the renderer
   */
  render?: (props: {
    path: string;
    method: HttpMethods;
    operation: OperationObject;
    pathItem: PathItemObject;
  }) => ReactNode;
}

/** @deprecated options of `createOpenAPIPage()`, passed by the built-in page */
export interface OperationLegacyOptions {
  ctx: RenderContext;
  content?: CreateOpenAPIPageOptions['content'];
  /** overrides bound to the operation state by the built-in page */
  UsageTabs?: FC;
  ExampleSelector?: FC;
  RequestTabs?: FC;
}

export interface OperationProps {
  type?: 'webhook' | 'operation';
  path: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;

  showTitle?: boolean;
  showDescription?: boolean;
  headingLevel?: number;

  /**
   * Show full response schema instead of only example response & Typescript definitions.
   *
   * @default true
   */
  showResponseSchema?: boolean;
  playground?: OperationPlaygroundOptions;
  /** @deprecated */
  legacy?: OperationLegacyOptions;
}

export function Operation({ type, path, method, operation, pathItem, ...props }: OperationProps) {
  return (
    <OperationProvider
      type={type}
      path={path}
      method={method}
      operation={operation}
      pathItem={pathItem}
    >
      <OperationContent {...props} />
    </OperationProvider>
  );
}

function OperationContent({
  showTitle,
  showDescription,
  headingLevel = 2,
  showResponseSchema = true,
  playground,
  legacy,
}: Omit<OperationProps, 'type' | 'path' | 'method' | 'operation' | 'pathItem'>) {
  const t = useTranslations({ note: 'operation page' });
  const { SchemaUI } = useComponents();
  const { resolve } = useOpenAPI().document;
  const {
    type,
    path,
    method,
    operation,
    pathItem,
    title,
    description,
    requestBody,
    parameters,
    security,
    responses,
    callbacks,
  } = useOperation();
  let headNode: ReactNode = null;
  const descriptionNode = showDescription && description && <Markdown md={description} />;
  let bodyNode: ReactNode = null;
  let authNode: ReactNode = null;
  let responseNode: ReactNode = null;
  let callbacksNode: ReactNode = null;

  if (showTitle) {
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

  if (requestBody) {
    const contentTypes = Object.entries(requestBody.content);
    const items = contentTypes.map(([mediaType]) => ({
      label: <code className="text-xs">{mediaType}</code>,
      value: mediaType,
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
        {requestBody.description && <Markdown md={requestBody.description} />}
        {contentTypes.map(([mediaType, content]) => (
          <SelectTab key={mediaType} anchorSegments={['request-body', mediaType]} value={mediaType}>
            <RequestBodyContentItem
              content={content}
              required={requestBody.required}
              method={method}
            />
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  if (responses.length > 0 && showResponseSchema) {
    responseNode = (
      <>
        <Heading id="response-body" depth={headingLevel}>
          {t('Response Body')}
        </Heading>
        <Accordions type="multiple">
          {responses.map((item) => (
            <ResponseAccordion key={item.status} item={item} />
          ))}
        </Accordions>
      </>
    );
  }

  const parameterNode = parameters.map(({ in: location, items }) => {
    const parameterLabel =
      location === 'path'
        ? t('Path Parameters')
        : location === 'query'
          ? t('Query Parameters')
          : location === 'header'
            ? t('Header Parameters')
            : t('Cookie Parameters');

    return (
      <Fragment key={location}>
        <Heading id={`parameters-${location}`} depth={headingLevel}>
          {parameterLabel}
        </Heading>
        <AnchorSection segments={['parameters', location]}>
          <div className="flex flex-col">
            {items.map((param) => {
              if (param.schema == null) return;
              const schema = resolve(param.schema);

              return (
                <SchemaUI
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

  if (security.length > 0) {
    const items = security.map((requirement, i) => {
      return {
        value: String(i),
        label: (
          <div className="flex flex-col text-xs min-w-0">
            {requirement.map(({ key, scopes }) => (
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
        {security.map((requirement, i) => (
          <SelectTab key={i} value={items[i].value}>
            {requirement.map(
              ({ key, scopes, scheme }) =>
                scheme && <AuthScheme key={key} scheme={scheme} scopes={scopes} />,
            )}
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  if (callbacks.length > 0) {
    callbacksNode = (
      <>
        <Heading id="callbacks" depth={headingLevel}>
          {t('Callbacks')}
        </Heading>
        <Accordions type="multiple">
          {callbacks.map((item, i) => (
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
                    pathItem={item.pathItem}
                    operation={item.operation}
                    showResponseSchema={showResponseSchema}
                    playground={playground}
                    legacy={legacy}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordions>
      </>
    );
  }

  const content: NonNullable<CreateOpenAPIPageOptions['content']> = legacy?.content ?? {};
  let { renderOperationLayout, renderWebhookLayout } = content;

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
    if (playground?.enabled ?? true) {
      const { enabled: _, render, ...options } = playground ?? {};
      apiPlayground = render ? (
        render({ path, method, operation, pathItem })
      ) : (
        <PlaygroundClient
          {...options}
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

    return renderOperationLayout(
      {
        header: headNode,
        description: descriptionNode,
        authSchemes: authNode,
        body: bodyNode,
        callbacks: callbacksNode,
        parameters: parameterNode,
        responses: responseNode,
        apiPlayground,
        apiExample: <UsageTabs legacy={legacy} />,
      },
      {
        path,
        operation,
        method,
        pathItem,
        ctx: legacy!.ctx,
      },
    );
  }

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
    requests: <RequestTabs legacy={legacy} />,
  });
}

function RequestBodyContentItem({
  content,
  required,
  method,
}: {
  method: HttpMethods;
  content: MediaTypeObject;
  required?: boolean;
}) {
  const { SchemaUI } = useComponents();
  const ts = useTypeScriptDefinitions(content.schema, {
    name: 'RequestBody',
    readOnly: false,
    writeOnly: true,
  });

  return (
    <>
      {ts && <CopyTypeScriptPanel name="request body" code={ts} className="my-4 last:mb-0" />}
      {content.schema && (
        <SchemaUI
          client={{
            name: 'body',
            as: 'body',
            required,
          }}
          root={content.schema}
          readOnly={method === 'get'}
          writeOnly={method !== 'get'}
        />
      )}
    </>
  );
}

function ResponseAccordion({ item: { status, response, content } }: { item: OperationResponse }) {
  const contentTypes = Object.entries(content);
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
          {contentTypes.map(([mediaType, media]) => (
            <SelectTab key={mediaType} value={mediaType} anchorSegments={[mediaType]}>
              <ResponseAccordionItem item={media} />
            </SelectTab>
          ))}
        </AccordionContent>
      </SelectTabs>
    </AccordionItem>
  );
}

function ResponseAccordionItem({ item: { schema } }: { item: MediaTypeObject }) {
  const { SchemaUI } = useComponents();
  const ts = useTypeScriptDefinitions(schema, {
    name: 'ResponseBody',
    readOnly: true,
    writeOnly: false,
  });

  return (
    <>
      {ts && <CopyTypeScriptPanel name="response body" code={ts} className="mb-2" />}
      {schema && (
        <SchemaUI
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
            variant: 'secondary',
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
