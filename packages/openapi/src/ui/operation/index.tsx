'use client';
import { Fragment, type ReactNode, useState, useSyncExternalStore } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import type { MediaTypeObject, SecuritySchemeObject } from '@/types';
import { UsageTabs } from '@/ui/operation/usage-tabs';
import { MethodLabel } from '@/ui/components/method-label';
import { SchemaUI } from '@/ui/components/schema';
import { Badge } from 'shared-api/components/badge';
import { useOpenAPI, useRenderContext, useTypeScriptDefinitions } from '@/utils/create-page';
import {
  OperationProvider,
  type OperationCallback,
  type OperationResponse,
  type PageOperationProps,
  useOperation,
} from '@/operation';
import { useTranslations } from '@fuma-translate/react';
import { RequestTabs } from './request-tabs';
import { cn } from '@/utils/cn';
import { SelectTabs, SelectTabTrigger, SelectTab } from 'shared-api/components/select-tab';
import { Callout } from 'fumadocs-ui/components/callout';
import { anchorIdStartsWith, anchorSegments } from 'shared-api/auto-anchor';
import { AnchorSection, useAnchorId } from 'shared-api/auto-anchor/client';
import { Heading } from '@/ui/components/heading';
import { Markdown } from '../components/markdown';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Check, ChevronRight, Copy, Plus, X } from 'lucide-react';
import PlaygroundClient from '@/ui/playground/client';
import { EndpointBar } from '@/ui/components/endpoint';
import { Segmented, SegmentedList, SegmentedPanel } from '@/ui/components/segmented';

export interface OperationProps extends PageOperationProps {
  headingLevel?: number;
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
}: Pick<OperationProps, 'showTitle' | 'showDescription' | 'headingLevel'>) {
  const t = useTranslations({ note: 'operation page' });
  const { resolve } = useOpenAPI().doc;
  const ctx = useRenderContext();
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
      label: <code>{mediaType}</code>,
      value: mediaType,
    }));

    bodyNode = (
      <SelectTabs defaultValue={items[0].value}>
        <SectionHeader id="request-body" depth={headingLevel} title={t('Request Body')} />
        {requestBody.description && (
          <div className="mb-3 prose-no-margin text-fd-muted-foreground">
            <Markdown md={requestBody.description} />
          </div>
        )}
        {contentTypes.map(([mediaType, content]) => (
          <SelectTab key={mediaType} anchorSegments={['request-body', mediaType]} value={mediaType}>
            <MediaContent
              schema={content.schema}
              required={requestBody.required}
              selector={<CardSelector items={items} />}
              request
            />
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  if (responses.length > 0 && ctx.showResponseSchema !== false) {
    responseNode = <ResponseSection responses={responses} headingLevel={headingLevel} />;
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
        <SectionHeader id={`parameters-${location}`} depth={headingLevel} title={parameterLabel} />
        <AnchorSection segments={['parameters', location]}>
          <div className="rounded-xl border bg-fd-card px-3">
            {items.map((param) => {
              if (param.schema == null) return;
              const schema = resolve(param.schema);

              return (
                <SchemaUI
                  key={param.name}
                  client={{
                    name: param.name,
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
    const items = security.map((requirement, i) => ({
      value: String(i),
      label: (
        <code className="flex min-w-0 items-center gap-1">
          {requirement.map(({ key, scopes }, j) => (
            <Fragment key={key}>
              {j > 0 && <Plus className="size-3 shrink-0 text-fd-muted-foreground" />}
              <span className="truncate">
                {key}
                {scopes.length > 0 && (
                  <span className="text-fd-muted-foreground"> {scopes.join(', ')}</span>
                )}
              </span>
            </Fragment>
          ))}
        </code>
      ),
    }));

    authNode = (
      <SelectTabs defaultValue={items[0].value}>
        <SectionHeader id="authorization" depth={headingLevel} title={t('Authorization')} />
        <div className="overflow-hidden rounded-xl border bg-fd-card">
          <div className="flex h-9 items-center border-b ps-1.5 pe-1 text-[0.8125rem] not-prose">
            <CardSelector items={items} />
          </div>
          {security.map((requirement, i) => (
            <SelectTab key={i} value={items[i].value} className="px-3">
              {requirement.map(
                ({ key, scopes, scheme }) =>
                  scheme && <AuthScheme key={key} scheme={scheme} scopes={scopes} />,
              )}
            </SelectTab>
          ))}
        </div>
      </SelectTabs>
    );
  }

  if (callbacks.length > 0) {
    callbacksNode = (
      <>
        <SectionHeader id="callbacks" depth={headingLevel} title={t('Callbacks')} />
        <div className="overflow-hidden rounded-xl border bg-fd-card not-prose">
          {callbacks.map((item, i) => (
            <Callback key={i} item={item} path={path} headingLevel={headingLevel + 1} />
          ))}
        </div>
      </>
    );
  }

  if (type === 'operation') {
    const playground = ctx.playground;
    let apiPlayground: ReactNode;
    if (playground?.enabled ?? true) {
      const { enabled: _, render, ...options } = playground ?? {};
      apiPlayground = render ? (
        render({ path, method, operation, pathItem })
      ) : (
        <PlaygroundClient {...options} />
      );
    } else {
      apiPlayground = (
        <EndpointBar method={method} route={path} deprecated={operation.deprecated} />
      );
    }

    const slots = {
      header: headNode,
      description: descriptionNode,
      authSchemes: authNode,
      body: bodyNode,
      callbacks: callbacksNode,
      parameters: parameterNode,
      responses: responseNode,
      apiPlayground,
      apiExample: <UsageTabs />,
    };

    if (ctx.content?.renderOperationLayout)
      return ctx.content.renderOperationLayout(slots, { path, operation, method, pathItem, ctx });

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
  }

  const slots = {
    header: headNode,
    description: descriptionNode,
    authSchemes: authNode,
    body: bodyNode,
    callbacks: callbacksNode,
    parameters: parameterNode,
    responses: responseNode,
    requests: <RequestTabs />,
  };

  if (ctx.content?.renderWebhookLayout) return ctx.content.renderWebhookLayout(slots);

  return (
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
}

function SectionHeader({
  id,
  depth,
  title,
  children,
}: {
  id: string;
  depth: number;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-10 mb-3 first:mt-0">
      <Heading id={id} depth={depth} className="my-0! me-auto">
        {title}
      </Heading>
      {children}
    </div>
  );
}

/** a compact select in the header of cards */
/** selects the variant shown in a card, like the media type, a label when there is only one */
function CardSelector({ items }: { items: { label: ReactNode; value: string }[] }) {
  if (items.length > 1)
    return (
      <SelectTabTrigger
        items={items}
        className="h-7 w-auto gap-1 border-0 bg-transparent px-1.5 py-0 text-[0.8125rem] font-medium hover:bg-fd-accent hover:text-fd-accent-foreground focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset data-popup-open:bg-fd-accent"
      />
    );

  return <span className="min-w-0 px-1.5 font-medium">{items[0].label}</span>;
}

/** the schema of a request body or response in a media type */
function MediaContent({
  schema,
  required,
  selector,
  request = false,
}: {
  schema: MediaTypeObject['schema'];
  required?: boolean;
  selector?: ReactNode;
  request?: boolean;
}) {
  const t = useTranslations({ note: 'TypeScript definitions' });
  const { method } = useOperation();
  const ts = useTypeScriptDefinitions(schema, {
    name: request ? 'RequestBody' : 'ResponseBody',
    readOnly: !request,
    writeOnly: request,
  });
  const [isChecked, onCopy] = useCopyButton(() => {
    if (ts) void navigator.clipboard.writeText(ts);
  });

  return (
    schema && (
      <SchemaUI
        client={{
          name: request ? 'body' : 'response',
          as: 'body',
          required,
          selector,
          actions: ts && (
            <button
              type="button"
              title={t('Use the {name} type in TypeScript.', {
                variables: { name: request ? 'request body' : 'response body' },
              })}
              onClick={onCopy}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                '-my-1 shrink-0 gap-1.5 text-fd-muted-foreground',
              )}
            >
              {isChecked ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              TypeScript
            </button>
          ),
        }}
        root={schema}
        readOnly={!request || method === 'get'}
        writeOnly={request && method !== 'get'}
      />
    )
  );
}

/** the responses as tabs of their status codes */
function ResponseSection({
  responses,
  headingLevel,
}: {
  responses: OperationResponse[];
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const id = useAnchorId(['response']);
  // select the response that the URL links to by default
  const linked = useSyncExternalStore(
    subscribeHash,
    () => {
      const hash = window.location.hash.slice(1);
      return responses.find((item) =>
        anchorIdStartsWith(hash, anchorSegments(`\0${id}`, item.status)),
      )?.status;
    },
    () => undefined,
  );
  const [selected, setSelected] = useState<string>();

  return (
    <Segmented
      value={selected ?? linked ?? responses[0].status}
      onValueChange={setSelected}
      className="mt-10 first:mt-0"
    >
      <SectionHeader id="response-body" depth={headingLevel} title={t('Response Body')}>
        <SegmentedList
          className="max-w-full overflow-x-auto [scrollbar-width:none]"
          items={responses.map((item) => ({
            value: item.status,
            label: <span className="font-mono">{item.status}</span>,
          }))}
        />
      </SectionHeader>
      {responses.map((item) => (
        <SegmentedPanel key={item.status} value={item.status}>
          <AnchorSection segments={['response', item.status]}>
            <ResponseContent item={item} />
          </AnchorSection>
        </SegmentedPanel>
      ))}
    </Segmented>
  );
}

function ResponseContent({ item: { response, content } }: { item: OperationResponse }) {
  const contentTypes = Object.entries(content);
  const items = contentTypes.map(([mediaType]) => ({
    label: <code>{mediaType}</code>,
    value: mediaType,
  }));

  return (
    <SelectTabs defaultValue={items[0]?.value}>
      {response.description && (
        <div className="mb-3 prose-no-margin text-fd-muted-foreground">
          <Markdown md={response.description} />
        </div>
      )}
      {contentTypes.map(([mediaType, media]) => (
        <SelectTab key={mediaType} value={mediaType} anchorSegments={[mediaType]}>
          <MediaContent schema={media.schema} selector={<CardSelector items={items} />} />
        </SelectTab>
      ))}
    </SelectTabs>
  );
}

function AuthScheme({ scheme, scopes }: { scheme: SecuritySchemeObject; scopes: string[] }) {
  const t = useTranslations({ note: 'security scheme' });
  let name: string;
  let type = '<token>';
  let location: string | undefined;

  if (scheme.type === 'http' || scheme.type === 'oauth2') {
    name = t('Authorization');
    type =
      scheme.type === 'http' && scheme.scheme === 'basic'
        ? t('Basic <token>')
        : t('Bearer <token>');
    location = 'header';
  } else if (scheme.type === 'apiKey') {
    name = scheme.name!;
    location = scheme.in;
  } else if (scheme.type === 'openIdConnect') {
    name = t('OpenID Connect');
  } else {
    return null;
  }

  return (
    <div className="border-t py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2 not-prose">
        {location && (
          <span className="rounded-md border bg-fd-secondary px-1.5 font-mono text-xs leading-5 text-fd-muted-foreground">
            {location}
          </span>
        )}
        <code className="text-[0.8125rem] font-medium text-fd-primary">{name}</code>
        <code className="text-xs text-fd-muted-foreground">{type}</code>
        {scheme.deprecated && (
          <Badge color="red" className="text-xs">
            {t('Deprecated')}
          </Badge>
        )}
      </div>
      {(scheme.description || scopes.length > 0) && (
        <div className="mt-1 prose-no-margin text-fd-muted-foreground">
          {scheme.description && <Markdown md={scheme.description} />}
          {scopes.length > 0 && (
            <p>
              {t('Scope')}: <code>{scopes.join(', ')}</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** a callback, its operation opens in a dialog */
function Callback({
  item,
  path,
  headingLevel,
}: {
  item: OperationCallback;
  path: string;
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const segments = ['callbacks', item.name, item.path, item.method];
  const id = useAnchorId(segments);
  // open by default when the URL links to its content
  const linked = useSyncExternalStore(
    subscribeHash,
    () => anchorIdStartsWith(window.location.hash.slice(1), id),
    () => false,
  );
  const [open, setOpen] = useState<boolean>();

  return (
    <Dialog.Root open={open ?? linked} onOpenChange={setOpen}>
      <Dialog.Trigger className="group flex w-full items-center gap-3 border-t px-4 py-3 text-start transition-colors first:border-t-0 hover:bg-fd-accent/40 focus-visible:bg-fd-accent/40 focus-visible:outline-none">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-mono text-[0.8125rem] font-medium">{item.name}</span>
          <span className="flex min-w-0 items-baseline gap-2 text-xs">
            <MethodLabel>{item.method}</MethodLabel>
            <code className="min-w-0 wrap-anywhere text-fd-muted-foreground">{item.path}</code>
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-fd-background text-fd-foreground outline-none transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-opacity sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[min(52rem,calc(100dvh-3rem))] sm:w-[min(64rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:shadow-2xl">
          <div className="flex h-12 shrink-0 items-center gap-2 ps-4 pe-2 sm:ps-5">
            <Dialog.Title className="truncate font-mono text-sm font-medium">
              {item.name}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t('Close')}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'ms-auto shrink-0 text-fd-muted-foreground',
              )}
            >
              <X />
            </Dialog.Close>
          </div>
          <EndpointBar
            method={item.method}
            route={item.path}
            deprecated={item.operation.deprecated}
            className="mx-3 mb-3 shrink-0 sm:mx-4"
          />
          <div className="fd-scroll-container prose min-h-0 flex-1 overflow-y-auto border-t p-5 text-sm @container [--fd-docs-row-1:0px] [--fd-docs-row-3:0px]">
            <AnchorSection segments={segments}>
              <Operation
                type="webhook"
                path={path}
                headingLevel={headingLevel}
                method={item.method}
                pathItem={item.pathItem}
                operation={item.operation}
              />
            </AnchorSection>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
