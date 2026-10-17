'use client';
import { memo, useMemo, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Play, Plug, Unplug, X } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { DialogPopup } from 'shared-api/components/dialog';
import { Spinner } from 'shared-api/components/spinner';
import { iconButtonClassName, ViewSwitch } from 'shared-api/components/playground/panels';
import { StatusDot } from 'shared-api/components/playground/log';
import { ParamInput } from 'shared-api/components/playground/param-input';
import { SchemaProvider } from 'shared-api/components/playground/schema';
import { StfProvider } from '@fumari/stf';
import {
  type ConnectionStatus,
  type Playground,
  usePlayground,
  usePlaygroundTransport,
} from '@/playground';
import { useOperation } from '@/operation';
import { useAsyncAPI } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { getUrlParts } from '@/utils/server-url';
import { ConnectionBar } from '@/ui/operation/connection';
import { DirectionBadge } from '@/ui/components/direction';
import { Markdown } from '@/ui/components/markdown';
import { ServerSelect } from '@/ui/components/server-select';
import { cn } from '@/utils/cn';
import { ConnectionPanel, useConnectionInputs } from './connection';
import { MessagesPanel } from './messages';

/**
 * The connection bar with a playground for the channel, the bar alone when no transport connects to the server.
 */
export function PlaygroundClient() {
  if (!usePlaygroundTransport()) return <ConnectionBar />;

  return <PlaygroundSession />;
}

function PlaygroundSession() {
  const t = useTranslations({ note: 'playground' });
  const playground = usePlayground();
  const { status } = playground;

  return (
    <Dialog.Root>
      <ConnectionBar>
        <Dialog.Trigger
          className={cn(
            buttonVariants({ variant: 'primary', size: 'sm' }),
            'group shrink-0 gap-1.5 rounded-lg px-3 transition-[background-color,scale] active:scale-[0.97] motion-reduce:transition-none',
          )}
        >
          {status === 'closed' ? (
            <Play className="size-3 fill-current transition-transform duration-200 group-hover:translate-x-px motion-reduce:transition-none" />
          ) : (
            <StatusDot
              status={status}
              activity={playground.log.at(-1)?.id}
              label={status === 'open' ? t('Connected') : t('Connecting')}
              className="ring-fd-primary-foreground/30"
            />
          )}
          {t('Try in Playground')}
        </Dialog.Trigger>
      </ConnectionBar>
      <DialogPopup className="sm:h-[min(52rem,calc(100dvh-3rem))] sm:w-[min(80rem,calc(100vw-3rem))]">
        <PlaygroundDialog playground={playground} />
      </DialogPopup>
    </Dialog.Root>
  );
}

// it re-renders with every log entry, the parts unaffected by the log are memoized
function PlaygroundDialog({ playground }: { playground: Playground }) {
  const t = useTranslations({ note: 'playground' });
  const { doc } = useAsyncAPI();
  const { title, action } = useOperation();
  const inputs = useConnectionInputs();
  const hasInputs =
    inputs.auth.length > 0 || inputs.parameters.length > 0 || inputs.query.length > 0;
  const { status } = playground;
  // reopened while connected, the messages matter
  const [selectedView, setView] = useState(
    hasInputs && status === 'closed' ? 'connection' : 'messages',
  );
  const view = hasInputs ? selectedView : 'messages';
  const views = useMemo(
    () => [
      { value: 'connection', label: t('Connection') },
      { value: 'messages', label: t('Messages') },
    ],
    [t],
  );

  return (
    <StfProvider value={playground.stf}>
      <SchemaProvider
        docRoot={doc.dereferenced as never}
        readOnly={false}
        writeOnly
        Markdown={Markdown}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 ps-4 pe-2 sm:ps-5">
            <Dialog.Title className="truncate text-sm font-medium">{title}</Dialog.Title>
            <DirectionBadge action={action} />
            <Dialog.Close aria-label={t('Close')} className={cn(iconButtonClassName, 'ms-auto')}>
              <X />
            </Dialog.Close>
          </div>
          {/* one form, Enter in any input connects */}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (status !== 'closed') return playground.disconnect();
              playground.connect();
              setView('messages');
            }}
            className="contents"
          >
            <UrlBar status={status} activity={playground.log.at(-1)?.id} />
            {hasInputs && <ViewSwitch value={view} onValueChange={setView} items={views} />}
            <div
              className={cn(
                'mx-3 mb-3 grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-fd-card sm:mx-4 sm:mb-4',
                hasInputs && 'md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]',
              )}
            >
              {hasInputs && (
                <ConnectionPanel
                  disabled={status !== 'closed'}
                  transport={playground.transport}
                  className={cn(view !== 'connection' && 'max-md:hidden')}
                />
              )}
              <MessagesPanel
                playground={playground}
                className={cn(hasInputs && 'md:border-s', view !== 'messages' && 'max-md:hidden')}
              />
            </div>
          </form>
        </div>
      </SchemaProvider>
    </StfProvider>
  );
}

/** the URL of connection, with the values of its parameters */
function UrlBar({ status, activity }: { status: ConnectionStatus; activity?: number }) {
  const t = useTranslations({ note: 'playground' });
  const [Icon, label] =
    status === 'closed'
      ? [Plug, t('Connect')]
      : status === 'connecting'
        ? [Spinner, t('Connecting')]
        : [Unplug, t('Disconnect')];

  return (
    <div className="flex shrink-0 items-center gap-2 px-3 pb-3 sm:px-4">
      <div className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl border bg-fd-card ps-3.5 pe-2 text-[0.8125rem]">
        <StatusDot status={status} activity={activity} />
        <EditableAddress disabled={status !== 'closed'} />
      </div>
      <button
        type="submit"
        className={cn(
          buttonVariants({ variant: status === 'open' ? 'secondary' : 'primary' }),
          'h-10 w-34 shrink-0 gap-2 rounded-xl px-4 transition-[background-color,scale] active:scale-[0.97] motion-reduce:transition-none',
        )}
      >
        <Icon className="size-3.5" />
        {label}
      </button>
    </div>
  );
}

/** the server and channel address, parameters are edited in place and locked while connected */
const EditableAddress = memo(function EditableAddress({ disabled }: { disabled: boolean }) {
  const { channel, parameters } = useOperation();
  const { servers, server } = useServer();
  const [base, path] = getUrlParts(servers[server!.id], server!.variables, channel.address ?? '');

  return (
    <div className="flex min-w-0 flex-1 items-center overflow-x-auto font-mono [scrollbar-width:none]">
      <fieldset disabled={disabled} className="contents">
        <ServerSelect label={base} className="min-w-16" />
        <span className="flex shrink-0 items-center whitespace-pre text-fd-foreground">
          {path.split(/(\{[^}]+\})/).map((part, i) => {
            if (i % 2 === 0) return part;
            const name = part.slice(1, -1);
            const item = parameters.find((param) => param.name === name);

            return (
              <ParamInput
                key={i}
                fieldName={['parameters', name]}
                name={name}
                schema={item?.schema}
                description={item?.parameter.description}
              />
            );
          })}
        </span>
      </fieldset>
    </div>
  );
});
