'use client';
import { type ComponentProps, Fragment, useMemo, type ReactNode } from 'react';
import type {
  ChannelObject,
  MessageObject,
  OperationObject,
  MultiFormatSchemaObject,
  OperationReplyObject,
  ParameterObject,
  SecuritySchemeObject,
  ServerObject,
} from '@/types';
import { UsageTabs } from '@/ui/operation/usage-tabs';
import { ActionLabel } from '@/ui/components/method-label';
import { useTranslations } from '@fuma-translate/react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import { cn } from '@/utils/cn';
import { getExampleMessages } from '../../utils/get-example-messages';
import { SelectTabs, SelectTabTrigger, SelectTab } from '@fumadocs/api-docs/components/select-tab';
import { AnchorSection } from '@fumadocs/api-docs/auto-anchor/client';
import { Heading } from '@/ui/components/heading';
import { Markdown } from '../components/markdown';
import { ServerProvider, useRenderContext } from '../contexts/api';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { getChannelAddress, getOperationDisplayName, resolveSchema } from '@/utils/operation';
import { ClientCodeBlock } from '../components/codeblock';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';

export function Operation({
  id,
  action,
  operation,
  channel,
  messages,
  reply,
  showTitle,
  showDescription,
  headingLevel = 2,
}: {
  id: string;
  action: 'send' | 'receive';
  operation: NoReference<OperationObject>;
  channel: NoReference<ChannelObject>;
  messages: NoReference<MessageObject>[];
  reply?: NoReference<OperationReplyObject>;
  showTitle?: boolean;
  showDescription?: boolean;
  headingLevel?: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const {
    schema: { dereferenced },
  } = ctx;

  const operationDescription = operation.description ?? channel.description;
  const descriptionNode = showDescription && operationDescription && (
    <Markdown md={operationDescription} />
  );

  const exampleMessages = useMemo(() => getExampleMessages({ messages }), [messages]);

  let headNode: ReactNode = null;
  if (showTitle) {
    const title = getOperationDisplayName(id, operation, channel);

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

  const channelNode = <ChannelSection channel={channel} headingLevel={headingLevel} />;

  const parametersNode = channel.parameters ? (
    <ParametersSection parameters={channel.parameters} headingLevel={headingLevel} />
  ) : null;

  const messagesNode = <MessagesSection messages={messages} headingLevel={headingLevel} />;

  const replyNode = reply ? <ReplySection reply={reply} headingLevel={headingLevel} /> : null;

  const bindingsNode = (
    <>
      <BindingsSection
        bindings={operation.bindings}
        id="operation-bindings"
        headingLevel={headingLevel}
      />
      <BindingsSection
        bindings={channel.bindings}
        id="channel-bindings"
        headingLevel={headingLevel}
        title={t('Channel')}
      />
    </>
  );

  const traits =
    operation.traits
      ?.map((trait) => dereferenceShallow(trait, dereferenced))
      .filter((trait): trait is NoReference<import('@/types/asyncapi-3').OperationTraitObject> =>
        Boolean(trait),
      ) ?? [];
  const traitsNode =
    traits.length > 0 ? <TraitsSection traits={traits} headingLevel={headingLevel} /> : null;

  const securitySchemes = (operation.security ?? [])
    .map((scheme) => dereferenceShallow(scheme, dereferenced))
    .filter((scheme): scheme is SecuritySchemeObject => Boolean(scheme));
  let authNode: ReactNode = null;

  if (securitySchemes.length > 0) {
    const items = securitySchemes.map((scheme, i) => ({
      value: String(i),
      label: <code className="text-xs truncate">{scheme.name || scheme.type}</code>,
    }));

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
        {securitySchemes.map((scheme, i) => (
          <SelectTab key={i} value={items[i].value}>
            <AuthScheme scheme={scheme} scopes={scheme.scopes ?? []} />
          </SelectTab>
        ))}
      </SelectTabs>
    );
  }

  let { renderOperationLayout } = ctx.content ?? {};

  renderOperationLayout ??= (slots) => {
    return (
      <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
        <div className="min-w-0 flex-1">
          {slots.header}
          {slots.description}
          {slots.channel}
          {slots.authSchemes}
          {slots.parameters}
          {slots.messages}
          {slots.reply}
          {slots.traits}
          {slots.bindings}
        </div>
        <div className="@4xl:sticky @4xl:top-[calc(var(--fd-docs-row-1,2rem)+1rem)] @4xl:w-[400px]">
          {slots.messageExamples}
        </div>
      </div>
    );
  };

  let content = renderOperationLayout(
    {
      header: headNode,
      description: descriptionNode,
      channel: channelNode,
      authSchemes: authNode,
      parameters: parametersNode,
      messages: messagesNode,
      reply: replyNode,
      traits: traitsNode,
      bindings: bindingsNode,
      messageExamples: <UsageTabs examples={exampleMessages} />,
    },
    {
      operation,
      action,
      channel,
      ctx,
    },
  );

  const servers = (operation as { servers?: ServerObject[] }).servers ?? channel.servers;
  if (servers && servers.length > 0) {
    content = <ServerProvider servers={servers as ServerObject[]}>{content}</ServerProvider>;
  }

  return content;
}

function ChannelSection({
  channel,
  headingLevel,
}: {
  channel: NoReference<ChannelObject>;
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const address = getChannelAddress(channel);
  if (!address && !channel.summary && !channel.title) return null;

  return (
    <>
      <Heading id="channel" depth={headingLevel} className="mt-10">
        {t('Channel')}
      </Heading>
      <div className="not-prose text-sm border rounded-xl p-3 flex flex-col gap-2">
        {channel.title && <p className="font-medium">{channel.title}</p>}
        {channel.summary && <p className="text-fd-muted-foreground">{channel.summary}</p>}
        {address && (
          <p>
            {t('Address')}: <code>{address}</code>
          </p>
        )}
      </div>
    </>
  );
}

function ParametersSection({
  parameters,
  headingLevel,
}: {
  parameters: Record<string, NoReference<ParameterObject>>;
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
          {entries.map(([name, param]) => (
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
          ))}
        </div>
      </AnchorSection>
    </>
  );
}

function MessagesSection({
  messages,
  headingLevel,
}: {
  messages: NoReference<MessageObject>[];
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  if (messages.length === 0) return null;

  return (
    <>
      <Heading id="messages" depth={headingLevel} className="mt-10">
        {t('Messages')}
      </Heading>
      <Accordions type="multiple">
        {messages.map((message, index) => {
          const name = message.name || message.title || `message-${index + 1}`;
          const headers = resolveSchema(message.headers as MultiFormatSchemaObject);
          const payload =
            message.payload ?? resolveSchema(message.payload as MultiFormatSchemaObject);

          return (
            <AccordionItem key={name} value={name} anchorSegments={['messages', name]}>
              <AccordionHeader>
                <AccordionTrigger>{message.title || name}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent className="ps-4.5 pe-3 border rounded-xl">
                {message.description && <Markdown md={message.description} />}
                {message.contentType && (
                  <p className="text-xs text-fd-muted-foreground not-prose">
                    Content-Type: <code>{message.contentType}</code>
                  </p>
                )}
                {headers && (
                  <>
                    <Heading id={`${name}-headers`} depth={headingLevel + 1}>
                      {t('Headers')}
                    </Heading>
                    <ctx.SchemaUI client={{ name: 'headers' }} root={headers as never} />
                  </>
                )}
                {payload && (
                  <>
                    <Heading id={`${name}-payload`} depth={headingLevel + 1}>
                      {t('Payload')}
                    </Heading>
                    <ctx.SchemaUI
                      client={{ name: 'payload', as: 'body' }}
                      root={payload as never}
                    />
                  </>
                )}
                {message.correlationId && (
                  <CorrelationIdSection correlationId={message.correlationId} />
                )}
                <BindingsSection
                  bindings={message.bindings}
                  id={`${name}-bindings`}
                  headingLevel={headingLevel + 1}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordions>
    </>
  );
}

function ReplySection({
  reply,
  headingLevel,
}: {
  reply: NoReference<OperationReplyObject>;
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();

  return (
    <>
      <Heading id="reply" depth={headingLevel} className="mt-10">
        {t('Reply')}
      </Heading>
      <div className="border rounded-xl p-3 not-prose text-sm flex flex-col gap-3">
        {reply.address && (
          <p>
            Address: <code>{reply.address.location}</code>
            {reply.address.description && (
              <span className="text-fd-muted-foreground"> — {reply.address.description}</span>
            )}
          </p>
        )}
        {reply.messages?.map((messageRef, index) => {
          const message = dereferenceShallow(messageRef, ctx.schema.dereferenced);
          if (!message) return null;
          const payload = message.payload ?? resolveSchema(message.payload as never);
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

function TraitsSection({
  traits,
  headingLevel,
}: {
  traits: NoReference<import('@/types/asyncapi-3').OperationTraitObject>[];
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });

  return (
    <>
      <Heading id="traits" depth={headingLevel} className="mt-10">
        {t('Traits')}
      </Heading>
      <Accordions type="multiple">
        {traits.map((trait, index) => (
          <AccordionItem key={index} value={String(index)}>
            <AccordionHeader>
              <AccordionTrigger>
                {trait.title || trait.summary || `Trait ${index + 1}`}
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              {trait.description && <Markdown md={trait.description} />}
              <BindingsSection
                bindings={trait.bindings}
                id={`trait-${index}-bindings`}
                headingLevel={headingLevel + 1}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordions>
    </>
  );
}

function BindingsSection({
  bindings,
  id,
  headingLevel,
  title,
}: {
  bindings?: Record<string, unknown>;
  id: string;
  headingLevel: number;
  title?: ReactNode;
}) {
  const t = useTranslations({ note: 'operation page' });
  if (!bindings) return null;
  const entries = Object.entries(bindings).filter(([, value]) => value);
  if (entries.length === 0) return null;

  return (
    <>
      <Heading id={id} depth={headingLevel}>
        {title ?? t('Bindings')}
      </Heading>
      <Accordions type="multiple">
        {entries.map(([protocol, binding]) => (
          <AccordionItem key={protocol} value={protocol}>
            <AccordionHeader>
              <AccordionTrigger>{protocol}</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>
              <ClientCodeBlock lang="json" code={JSON.stringify(binding, null, 2)} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordions>
    </>
  );
}

function CorrelationIdSection({
  correlationId,
}: {
  correlationId: NoReference<import('@/types/asyncapi-3').CorrelationIDObject>;
}) {
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
