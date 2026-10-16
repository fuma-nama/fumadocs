'use client';
import type { ComponentProps } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { useOperation } from '@/operation';
import { useAsyncAPI } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { getUrlParts, isUrlProtocol, resolveServerUrl } from '@/utils/server-url';
import type { ChannelObject } from '@/types';
import { DirectionBadge } from '@/ui/components/direction';
import { ServerSelect } from '@/ui/components/server-select';
import { useBindings } from '@/ui/bindings';
import { cn } from '@/utils/cn';

/** a channel address, its parameters highlighted */
export function Address({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center whitespace-pre text-fd-foreground', className)}>
      {value.split(/(\{[^}]*\}|\/)/).map((part, i) => {
        if (i % 2 === 0) return part;
        if (part === '/')
          return (
            <span key={i} className="text-fd-muted-foreground">
              /
            </span>
          );

        return (
          <span key={i} className="rounded-md bg-fd-primary/10 px-1 text-fd-primary">
            {part}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The channel address of the operation and which way its messages go, the server below.
 */
export function ConnectionBar({ children, className, ...props }: ComponentProps<'div'>) {
  const t = useTranslations({ note: 'message direction' });
  const { action, channel } = useOperation();
  const { info } = useAsyncAPI().doc.dereferenced;
  const { servers, server } = useServer();
  const schema = server ? servers[server.id] : undefined;
  let path = channel.address;
  let base: string | undefined;

  if (schema && isUrlProtocol(schema.protocol) && path) {
    [base, path] = getUrlParts(schema, server!.variables, path);
    path ||= '/';
  } else if (schema) {
    base = resolveServerUrl(schema, server!.variables);
  }

  return (
    <div
      {...props}
      className={cn(
        'not-prose @container overflow-hidden rounded-xl border bg-fd-card text-sm text-fd-card-foreground',
        className,
      )}
    >
      <div className="flex min-h-11 flex-wrap items-center gap-x-1.5 p-1.5 ps-3.5">
        <DirectionBadge
          action={action}
          title={
            action === 'send'
              ? t('{app} sends these messages to you', { variables: { app: info.title } })
              : t('You send these messages to {app}', { variables: { app: info.title } })
          }
          className="me-1.5"
        />
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center overflow-x-auto font-mono text-[0.8125rem] [scrollbar-width:none]',
            // narrow bars give the address its own line under the actions
            children && '@max-lg:order-last @max-lg:basis-full @max-lg:pt-1.5 @max-lg:pb-1',
          )}
        >
          {schema && !isUrlProtocol(schema.protocol) && path && (
            <AddressLabel protocol={schema.protocol} channel={channel} />
          )}
          {path && <Address value={path} />}
        </div>
        {children && <div className="ms-auto flex shrink-0">{children}</div>}
      </div>
      {base && <ServerRow url={base} />}
    </div>
  );
}

function ServerRow({ url }: { url: string }) {
  const t = useTranslations({ note: 'channel address' });

  return (
    <div className="flex h-9 items-center gap-1 border-t ps-3.5 pe-1.5 text-[0.8125rem]">
      <span className="shrink-0 text-xs text-fd-muted-foreground">{t('Server')}</span>
      <ServerSelect label={url} className="font-mono" />
    </div>
  );
}

/** what the address is in brokers, like a topic or queue */
function AddressLabel({ protocol, channel }: { protocol: string; channel: ChannelObject }) {
  const t = useTranslations({ note: 'channel address' });
  const amqp = useBindings(channel.bindings).get('amqp');
  let label: string | undefined;

  switch (protocol) {
    case 'kafka':
    case 'kafka-secure':
    case 'mqtt':
    case 'mqtts':
    case 'secure-mqtt':
    case 'googlepubsub':
    case 'pulsar':
    case 'sns':
    case 'solace':
    case 'mercure':
    case 'ros2':
      label = t('Topic');
      break;
    case 'amqp':
    case 'amqps':
      label = amqp?.is === 'queue' ? t('Queue') : t('Routing Key');
      break;
    case 'sqs':
      label = t('Queue');
      break;
    case 'nats':
      label = t('Subject');
      break;
    case 'redis':
      label = t('Channel');
      break;
    case 'ibmmq':
    case 'jms':
    case 'stomp':
    case 'stomps':
    case 'anypointmq':
      label = t('Destination');
  }

  if (!label) return null;
  return (
    <span className="me-1.5 shrink-0 font-sans text-xs text-fd-muted-foreground">{label}</span>
  );
}
