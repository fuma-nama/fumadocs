'use client';
import { type ComponentProps, Fragment, type ReactNode } from 'react';
import type { ChannelObject, CorrelationIDObject, SecuritySchemeObject } from '@/types';
import { MessageExamples } from '@/ui/operation/message-examples';
import { ActionLabel } from '@/ui/components/badge';
import { SchemaUI } from '@/ui/components/schema';
import { useTranslations } from '@fuma-translate/react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from 'shared-api/components/accordion';
import { cn } from '@/utils/cn';
import { SelectTabs, SelectTabTrigger, SelectTab } from 'shared-api/components/select-tab';
import { AnchorSection } from 'shared-api/auto-anchor/client';
import { Heading } from '@/ui/components/heading';
import { Markdown } from '../components/markdown';
import { useAsyncAPI, useRenderContext } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import type { PageOperationProps } from '@/operation';
import {
  type OperationMessage,
  type OperationParameter,
  type OperationReply,
  OperationProvider,
  useOperation,
  useOperationSecurity,
} from '@/operation';
import { MailIcon } from 'lucide-react';
import { AccordionBindings } from '../bindings/accordion-bindings';
import { ServerSelect } from '../components/server-select';

export function Operation({ id, action, ...props }: PageOperationProps) {
  return (
    <OperationProvider id={id} action={action}>
      <OperationContent {...props} />
    </OperationProvider>
  );
}

function OperationContent({
  showTitle,
  showDescription,
}: Omit<PageOperationProps, 'id' | 'action'>) {
  const t = useTranslations({ note: 'operation page' });
  const { resolve } = useAsyncAPI().doc;
  const ctx = useRenderContext();
  const { operation, action, channel, title, description, parameters, messages, reply } =
    useOperation();
  const securitySchemes = useOperationSecurity();
  let headingLevel = 2;

  const descriptionNode = showDescription && description && <Markdown md={description} />;

  let headNode: ReactNode = null;
  if (showTitle) {
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
  const parametersNode = parameters.length > 0 && (
    <ParametersSection parameters={parameters} headingLevel={headingLevel} />
  );

  const messagesNode = messages.length > 0 && (
    <>
      <Heading id="messages" depth={headingLevel} className="mt-10">
        {t('Messages')}
      </Heading>
      <Accordions type="multiple">
        {messages.map((item) => (
          <AccordionItem key={item.id} value={item.id} anchorSegments={['messages', item.id]}>
            <AccordionHeader>
              <AccordionTrigger className="inline-flex items-center gap-2 font-mono">
                <MailIcon className="text-fd-muted-foreground size-3.5" />
                {item.name}
                {item.message.contentType && (
                  <span className="ms-auto text-fd-muted-foreground font-normal text-xs">
                    {item.message.contentType}
                  </span>
                )}
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
              <MessageSection item={item} headingLevel={headingLevel + 1} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordions>
    </>
  );

  const replyNode = reply && <ReplySection reply={reply} headingLevel={headingLevel} />;
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

  if (ctx.content?.renderOperationLayout)
    return ctx.content.renderOperationLayout(
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
      { operation, action, ctx },
    );

  return (
    <div>
      {headNode}
      {descriptionNode}
      <ServerSection />
      {channelNode}
      {authNode}
      {parametersNode}
      {messagesNode}
      {replyNode}
      {bindingsNode}
    </div>
  );
}

function ServerSection() {
  const { resolve } = useAsyncAPI().doc;
  const { servers, server } = useServer();
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
  const { resolve } = useAsyncAPI().doc;

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
  parameters: OperationParameter[];
  headingLevel: number;
}) {
  const t = useTranslations({ note: 'operation page' });

  return (
    <>
      <Heading id="parameters" depth={headingLevel} className="mt-10">
        {t('Parameters')}
      </Heading>
      <AnchorSection segments={['parameters']}>
        <div className="flex flex-col">
          {parameters.map((item) => (
            <SchemaUI
              key={item.name}
              client={{
                name: item.name,
                required: false,
              }}
              root={item.schema}
            />
          ))}
        </div>
      </AnchorSection>
    </>
  );
}

function MessageSection({
  item: { message, headers, payload, examples },
  headingLevel,
}: {
  item: OperationMessage;
  headingLevel: number;
}) {
  const t = useTranslations();
  const { resolve } = useAsyncAPI().doc;

  return (
    <>
      <div className="bg-fd-card text-fd-card-foreground border rounded-xl px-5 py-4 mb-2 prose-no-margin shadow-sm">
        {message.description && <Markdown md={message.description} />}
        {headers && (
          <>
            <Heading id="headers" depth={headingLevel}>
              {t('Headers')}
            </Heading>
            <SchemaUI client={{ name: 'headers' }} root={headers as never} />
          </>
        )}
        {payload && (
          <>
            <Heading id="payload" depth={headingLevel}>
              {t('Payload')}
            </Heading>
            <SchemaUI client={{ name: 'payload', as: 'body' }} root={payload as never} />
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
        <MessageExamples examples={examples} headingLevel={headingLevel} />
      </div>
    </>
  );
}

function ReplySection({ reply, headingLevel }: { reply: OperationReply; headingLevel: number }) {
  const t = useTranslations({ note: 'operation page' });

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
        {reply.messages.map((item, index) => (
          <Fragment key={index}>
            <p className="font-medium">{item.title}</p>
            {item.payload && (
              <SchemaUI client={{ name: 'reply-payload' }} root={item.payload as never} />
            )}
          </Fragment>
        ))}
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
