'use client';
import { type ComponentProps, Fragment, type ReactNode, useMemo } from 'react';
import type {
  ChannelObject,
  CorrelationIDObject,
  MessageObject,
  OperationReplyObject,
  SecuritySchemeObject,
  ServerObject,
} from '@/types';
import { MessageExamples } from '@/ui/operation/message-examples';
import { ActionLabel } from '@/ui/components/badge';
import { useTranslations } from '@fuma-translate/react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import { cn } from '@/utils/cn';
import { SelectTabs, SelectTabTrigger, SelectTab } from '@fumadocs/api-docs/components/select-tab';
import { AnchorSection } from '@fumadocs/api-docs/auto-anchor/client';
import { Heading } from '@/ui/components/heading';
import { Markdown } from '../components/markdown';
import { ServerProvider, useRenderContext, useServerContext } from '../contexts/api';
import {
  getMessageDisplayName,
  getOperationDisplayName,
  getOperationMessages,
  resolveMultiFormatSchema,
} from '@/utils/schema';
import { MailIcon } from 'lucide-react';
import { applyMessageTraits, applyOperationTraits } from '@/utils/traits';
import { AccordionBindings } from '../bindings/accordion-bindings';
import { ServerSelect } from '../components/server-select';

export function Operation({
  id,
  action,
  showTitle,
  showDescription,
  headingLevel = 2,
}: {
  id: string;
  action: 'send' | 'receive';
  showTitle?: boolean;
  showDescription?: boolean;
  headingLevel?: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const {
    schema: { dereferenced, resolve },
  } = ctx;
  const operation = useMemo(() => {
    const operation = resolve(dereferenced.operations?.[id]);
    if (!operation) throw new Error(`[Fumadocs AsyncAPI] Operation not found in schema: ${id}`);

    return applyOperationTraits(operation, resolve);
  }, [dereferenced, resolve, id]);
  const channel = resolve(operation.channel);

  const descriptionNode = showDescription && operation.description && (
    <Markdown md={operation.description} />
  );

  let headNode: ReactNode = null;
  if (showTitle) {
    const title = getOperationDisplayName(id, operation);

    headNode = (
      <div className="flex gap-2 items-center justify-between">
        <Heading id={title} depth={headingLevel} className="my-0!">
          {title}
        </Heading>
        <ActionLabel className="text-xs">{action}</ActionLabel>
      </div>
    );
    headingLevel++;
  }

  const channelNode = <ChannelSection channel={channel} />;
  const parametersNode = channel.parameters ? (
    <ParametersSection parameters={channel.parameters} headingLevel={headingLevel} />
  ) : null;

  const messages = getOperationMessages(operation, resolve);
  const messagesNode = messages.length > 0 && (
    <>
      <Heading id="messages" depth={headingLevel} className="mt-10">
        {t('Messages')}
      </Heading>
      <Accordions type="multiple">
        {messages.map((item, index) => {
          const message = resolve(item);
          const id = message.name ?? `message-${index}`;

          return (
            <AccordionItem key={id} value={id} anchorSegments={['messages', id]}>
              <AccordionHeader>
                <AccordionTrigger className="inline-flex items-center gap-2 font-mono">
                  <MailIcon className="text-fd-muted-foreground size-3.5" />
                  {getMessageDisplayName(item, ctx, index)}
                  {message.contentType && (
                    <span className="ms-auto text-fd-muted-foreground font-normal text-xs">
                      {message.contentType}
                    </span>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
                <MessageSection message={message} headingLevel={headingLevel + 1} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordions>
    </>
  );

  const replyNode = operation.reply && (
    <ReplySection reply={resolve(operation.reply)} headingLevel={headingLevel} />
  );
  const bindingsNode = operation.bindings && (
    <>
      <Heading id="binding" depth={headingLevel}>
        {t('Bindings')}
      </Heading>
      <AccordionBindings
        bindings={resolve(operation.bindings)}
        level="operation"
        variant="default"
      />
    </>
  );

  const { server, servers } = useServerContext();
  const serverSchema = server ? servers[server.id] : undefined;
  const securitySchemes = operation.security ?? serverSchema?.security;
  let authNode: ReactNode = null;

  if (securitySchemes && securitySchemes.length > 0) {
    const items = securitySchemes.map((item, i) => {
      const scheme = resolve(item);
      return {
        value: String(i),
        label: <code className="text-xs truncate">{scheme.name || scheme.type}</code>,
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
        {securitySchemes.map((item, i) => {
          const scheme = resolve(item);
          return (
            <SelectTab key={i} value={items[i].value}>
              <AuthScheme scheme={scheme} scopes={scheme.scopes ?? []} />
            </SelectTab>
          );
        })}
      </SelectTabs>
    );
  }

  let { renderOperationLayout } = ctx.content ?? {};

  renderOperationLayout ??= (slots) => {
    return (
      <div>
        {slots.header}
        {slots.description}
        {slots.server}
        {slots.channel}
        {slots.authSchemes}
        {slots.parameters}
        {slots.messages}
        {slots.reply}
        {slots.bindings}
      </div>
    );
  };

  let content = renderOperationLayout(
    {
      header: headNode,
      description: descriptionNode,
      server: <ServerSection />,
      channel: channelNode,
      authSchemes: authNode,
      parameters: parametersNode,
      messages: messagesNode,
      reply: replyNode,
      bindings: bindingsNode,
    },
    {
      operation,
      action,
      ctx,
    },
  );

  if (channel.servers) {
    // `servers` of channels are Reference Objects, resolved values are referentially
    // stable in the magic proxy, we can match them against `servers` of document
    const servers = channel.servers.map((server) => resolve(server));
    const filteredServers: Record<string, ServerObject> = {};

    for (const [k, v] of Object.entries(dereferenced.servers ?? {})) {
      if (servers.includes(resolve(v))) filteredServers[k] = resolve(v);
    }

    content = <ServerProvider servers={filteredServers}>{content}</ServerProvider>;
  }

  return content;
}

function ServerSection() {
  const { resolve } = useRenderContext().schema;
  const { servers, server } = useServerContext();
  const serverSchema = server ? servers[server.id] : undefined;
  const hasServers = Object.keys(servers).length > 0;

  if (!hasServers && !serverSchema?.bindings) return;

  return (
    <div className="rounded-lg border bg-fd-card text-sm text-fd-card-foreground overflow-hidden shadow-sm not-prose mb-4">
      <ServerSelect className="w-full border-b" />
      {serverSchema?.bindings && (
        <AccordionBindings
          bindings={resolve(serverSchema.bindings)}
          level="server"
          variant="sm"
          accordionsProps={{ className: 'rounded-none border-none' }}
        />
      )}
    </div>
  );
}

function ChannelSection({ channel }: { channel: ChannelObject }) {
  const t = useTranslations({ note: 'asyncapi channel section' });
  const { resolve } = useRenderContext().schema;

  if (!channel.address && !channel.summary && !channel.title && !channel.bindings) return;

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 px-3 py-2 bg-fd-card text-sm text-fd-card-foreground rounded-lg border shadow-sm not-prose">
      {channel.title && <p className="font-medium col-span-2">{channel.title}</p>}
      {channel.address && (
        <>
          <p className="font-medium text-fd-muted-foreground">{t('Address')}</p>
          <code>{channel.address}</code>
        </>
      )}
      {channel.summary && (
        <>
          <p className="font-medium text-fd-muted-foreground">{t('Description')}</p>
          <p>{channel.summary}</p>
        </>
      )}
      {channel.bindings && (
        <AccordionBindings
          bindings={resolve(channel.bindings)}
          level="channel"
          variant="sm"
          accordionsProps={{
            className: 'col-span-2 mt-1 -mx-3 -mb-2 border-b-0 border-x-0 rounded-t-none',
          }}
        />
      )}
    </div>
  );
}

function ParametersSection({
  parameters,
  headingLevel,
}: {
  parameters: NonNullable<ChannelObject['parameters']>;
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const entries = Object.entries(parameters);
  if (entries.length === 0) return null;

  return (
    <>
      <Heading id="parameters" depth={headingLevel} className="mt-10">
        {t('Parameters')}
      </Heading>
      <AnchorSection segments={['parameters']}>
        <div className="flex flex-col">
          {entries.map(([name, item]) => {
            const param = ctx.schema.resolve(item);

            return (
              <ctx.SchemaUI
                key={name}
                client={{
                  name,
                  required: false,
                }}
                root={{
                  type: 'string',
                  description: param.description,
                  enum: param.enum,
                  default: param.default,
                }}
              />
            );
          })}
        </div>
      </AnchorSection>
    </>
  );
}

function MessageSection({
  message: _message,
  headingLevel,
}: {
  message: MessageObject;
  headingLevel: number;
}) {
  const t = useTranslations();
  const ctx = useRenderContext();
  const { resolve } = ctx.schema;
  const message = useMemo(() => applyMessageTraits(_message, resolve), [_message, resolve]);
  const headers = resolveMultiFormatSchema(resolve(message.headers));
  const payload = resolveMultiFormatSchema(resolve(message.payload));

  return (
    <>
      <div className="bg-fd-card text-fd-card-foreground border rounded-xl px-5 py-4 mb-2 prose-no-margin shadow-sm">
        {message.description && <Markdown md={message.description} />}
        {headers && (
          <>
            <Heading id="headers" depth={headingLevel}>
              {t('Headers')}
            </Heading>
            <ctx.SchemaUI client={{ name: 'headers' }} root={headers as never} />
          </>
        )}
        {payload && (
          <>
            <Heading id="payload" depth={headingLevel}>
              {t('Payload')}
            </Heading>
            <ctx.SchemaUI client={{ name: 'payload', as: 'body' }} root={payload as never} />
          </>
        )}
        {message.correlationId && (
          <CorrelationIdSection correlationId={resolve(message.correlationId)} />
        )}
        {message.bindings && (
          <>
            <Heading id="binding" depth={headingLevel}>
              {t('Bindings')}
            </Heading>
            <AccordionBindings bindings={resolve(message.bindings)} level="message" variant="sm" />
          </>
        )}
      </div>
      <div className="mb-2">
        <MessageExamples message={message} headingLevel={headingLevel} />
      </div>
    </>
  );
}

function ReplySection({
  reply,
  headingLevel,
}: {
  reply: OperationReplyObject;
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const { resolve } = ctx.schema;
  const address = resolve(reply.address);

  return (
    <>
      <Heading id="reply" depth={headingLevel} className="mt-10">
        {t('Reply')}
      </Heading>
      <div className="border rounded-xl p-3 not-prose text-sm flex flex-col gap-3">
        {address && (
          <p>
            Address: <code>{address.location}</code>
            {address.description && (
              <span className="text-fd-muted-foreground"> — {address.description}</span>
            )}
          </p>
        )}
        {reply.messages?.map((item, index) => {
          const message = resolve(item);
          const payload = resolveMultiFormatSchema(resolve(message.payload));
          return (
            <Fragment key={index}>
              <p className="font-medium">{message.title || message.name || `Reply ${index + 1}`}</p>
              {payload && (
                <ctx.SchemaUI client={{ name: 'reply-payload' }} root={payload as never} />
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}

function CorrelationIdSection({ correlationId }: { correlationId: CorrelationIDObject }) {
  const t = useTranslations({ note: 'operation page' });

  return (
    <div className="text-sm not-prose mt-3">
      <p className="font-medium">{t('Correlation ID')}</p>
      <p>
        Location: <code>{correlationId.location}</code>
      </p>
      {correlationId.description && (
        <p className="text-fd-muted-foreground">{correlationId.description}</p>
      )}
    </div>
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
        scopes={scopes}
      >
        {scheme.description && <Markdown md={scheme.description} />}
      </AuthProperty>
    );
  }

  if (scheme.type === 'apiKey' || scheme.type === 'httpApiKey') {
    return (
      <AuthProperty name={scheme.name!} type="<token>" scopes={scopes}>
        {scheme.description && <Markdown md={scheme.description} />}
        {scheme.in && (
          <p>
            {t('In')}: <code>{scheme.in}</code>
          </p>
        )}
      </AuthProperty>
    );
  }

  if (scheme.type === 'openIdConnect') {
    return (
      <AuthProperty name={t('OpenID Connect')} type="<token>" scopes={scopes}>
        {scheme.description && <Markdown md={scheme.description} />}
      </AuthProperty>
    );
  }

  return (
    <AuthProperty name={scheme.type} type="<credentials>" scopes={scopes}>
      {scheme.description && <Markdown md={scheme.description} />}
    </AuthProperty>
  );
}

function AuthProperty({
  name,
  type,
  scopes = [],
  className,
  ...props
}: ComponentProps<'div'> & {
  name: ReactNode;
  type: ReactNode;
  scopes?: string[];
}) {
  const t = useTranslations({ note: 'security scheme' });

  return (
    <div className={cn('text-sm border-t my-4 first:border-t-0', className)}>
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary">{name}</span>
        <span className="text-sm font-mono text-fd-muted-foreground">{type}</span>
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
