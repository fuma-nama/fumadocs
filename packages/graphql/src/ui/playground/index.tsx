'use client';
import { memo, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Play, Radio, SendHorizontal, Square, X } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { StfProvider } from '@fumari/stf';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Badge } from 'shared-api/components/badge';
import { DialogPopup } from 'shared-api/components/dialog';
import { Segmented, SegmentedList } from 'shared-api/components/segmented';
import { Spinner } from 'shared-api/components/spinner';
import { iconButtonClassName } from 'shared-api/components/playground/panels';
import { StatusDot } from 'shared-api/components/playground/log';
import { SchemaProvider } from 'shared-api/components/playground/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { useOperation } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import { OperationBar } from '@/ui/operation/bar';
import { KindLabel } from '@/ui/components/badge';
import { Markdown } from '@/ui/components/markdown';
import { cn } from '@/utils/cn';
import { type Playground, usePlayground } from './use-playground';
import { RequestPanel } from './request-panel';
import { ResponsePanel } from './response-panel';

const docRoot = {};

/**
 * The bar of operation with a playground dialog to send it.
 */
export function OperationPlayground() {
  const t = useTranslations({ note: 'graphql playground' });
  const playground = usePlayground();
  const { status } = playground;

  return (
    <Dialog.Root onOpenChange={(open) => open && playground.open()}>
      <OperationBar>
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
              label={status === 'open' ? t('Subscribed') : t('Subscribing')}
              className="ring-fd-primary-foreground/30"
            />
          )}
          {t('Try in Playground')}
        </Dialog.Trigger>
      </OperationBar>
      <DialogPopup className="sm:h-[min(52rem,calc(100dvh-3rem))] sm:w-[min(80rem,calc(100vw-3rem))]">
        <PlaygroundDialog playground={playground} />
      </DialogPopup>
    </Dialog.Root>
  );
}

function PlaygroundDialog({ playground }: { playground: Playground }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { title, kind, field } = useOperation();
  const { fetcher } = useRenderContext().playground ?? {};
  const [view, setView] = useState('request');
  const isSubscription = kind === 'subscription';
  const active = playground.status !== 'closed';

  function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (isSubscription) {
      if (active) return playground.stop();
      if (!playground.url) return;
      playground.subscribe();
    } else {
      if (!playground.url && !fetcher) return;
      void playground.send();
    }

    setView('response');
  }

  return (
    <StfProvider value={playground.stf}>
      <SchemaProvider docRoot={docRoot} readOnly={false} writeOnly Markdown={Markdown}>
        <div
          className="flex min-h-0 flex-1 flex-col"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(e);
          }}
        >
          <div className="flex h-12 shrink-0 items-center gap-2 ps-4 pe-2 sm:ps-5">
            <Dialog.Title className="truncate text-sm font-medium">{title}</Dialog.Title>
            <KindLabel className="text-xs">{kind}</KindLabel>
            {field.deprecationReason != null && (
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                {t('Deprecated')}
              </span>
            )}
            <div className="ms-auto flex items-center gap-1">
              <ExampleSelect playground={playground} disabled={active} />
              <Dialog.Close aria-label={t('Close')} className={iconButtonClassName}>
                <X />
              </Dialog.Close>
            </div>
          </div>
          {/* one form, Enter in any input sends */}
          <form noValidate className="contents" onSubmit={onSubmit}>
            <EndpointBar playground={playground} />
            <ViewSwitch value={view} onValueChange={setView} />
            <div className="mx-3 mb-3 grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-fd-card sm:mx-4 sm:mb-4 md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
              <RequestPanel
                key={playground.loaded}
                query={playground.query}
                onQueryChange={playground.setQuery}
                onReset={playground.reset}
                locked={active}
                className={cn(view !== 'request' && 'max-md:hidden')}
              />
              <ResponsePanel
                playground={playground}
                className={cn('md:border-s', view !== 'response' && 'max-md:hidden')}
              />
            </div>
          </form>
        </div>
      </SchemaProvider>
    </StfProvider>
  );
}

function ExampleSelect({ playground, disabled }: { playground: Playground; disabled: boolean }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { examples, selected } = useOperation();
  if (examples.length <= 1) return null;
  const options = examples.map((example, i) => ({
    value: i,
    label: example.name ?? String(i + 1),
  }));

  return (
    <Select
      items={options}
      value={selected}
      disabled={disabled}
      onValueChange={(v) => v !== null && playground.select(v)}
    >
      <SelectTrigger className="h-8 w-auto max-w-64 gap-1.5 border-0 bg-transparent px-2 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2">
        <span className="text-fd-muted-foreground">{t('Example')}</span>
        <SelectValue className="truncate font-medium" />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** switches the panels on small screens, its indicator measures the tabs on render */
const ViewSwitch = memo(function ViewSwitch({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const t = useTranslations({ note: 'graphql playground' });

  return (
    <Segmented value={value} onValueChange={onValueChange} className="shrink-0 px-3 pb-3 md:hidden">
      <SegmentedList
        className="*:flex-1 *:justify-center"
        items={[
          { value: 'request', label: t('Request') },
          { value: 'response', label: t('Response') },
        ]}
      />
    </Segmented>
  );
});

/** the endpoint and how the operation is sent, locked while subscribed */
function EndpointBar({ playground }: { playground: Playground }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { kind } = useOperation();
  const { allowUrlEdit = true, fetcher } = useRenderContext().playground ?? {};
  const { url, status, isSending } = playground;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const isSubscription = kind === 'subscription';
  const active = status !== 'closed';
  const shortcut = (
    <kbd className="hidden font-sans text-xs opacity-60 sm:inline">{isMac ? '⌘' : 'Ctrl'} ↵</kbd>
  );

  let button;
  if (!isSubscription) {
    button = (
      <button
        type="submit"
        disabled={isSending || (!url && !fetcher)}
        className={cn(
          buttonVariants({ variant: 'primary' }),
          'h-10 shrink-0 gap-2 rounded-xl px-4 transition-[background-color,scale] active:scale-[0.97] disabled:opacity-80 motion-reduce:transition-none',
        )}
      >
        {isSending ? <Spinner className="size-3.5" /> : <SendHorizontal className="size-3.5" />}
        {t('Send')}
        {shortcut}
      </button>
    );
  } else {
    button = (
      <button
        type="submit"
        disabled={!active && !url}
        className={cn(
          buttonVariants({ variant: active ? 'secondary' : 'primary' }),
          'h-10 shrink-0 rounded-xl border px-4 transition-[background-color,scale] active:scale-[0.97] disabled:opacity-80 motion-reduce:transition-none',
          !active && 'border-transparent',
        )}
      >
        {/* both states take space, so the button keeps its width */}
        <span className="grid *:flex *:items-center *:justify-center *:gap-2 *:[grid-area:1/1]">
          <span className={cn(active && 'invisible')}>
            <Radio className="size-3.5" />
            {t('Subscribe')}
            {shortcut}
          </span>
          <span className={cn(!active && 'invisible')}>
            {status === 'connecting' ? (
              <Spinner className="size-3.5" />
            ) : (
              <Square className="size-3 fill-current" />
            )}
            {t('Stop')}
            {shortcut}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 px-3 pb-3 sm:px-4">
      <div className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl border bg-fd-card ps-1 pe-2 text-[0.8125rem] transition-colors has-focus-visible:border-fd-ring">
        <Badge
          color={isSubscription ? 'orange' : 'blue'}
          className="shrink-0 rounded-lg bg-current/10 px-2 py-1 text-xs"
        >
          {!isSubscription ? 'POST' : /^wss?:/i.test(url) ? 'WS' : 'SSE'}
        </Badge>
        {isSubscription && (
          <StatusDot status={status} activity={playground.log.at(-1)?.id} className="ms-1" />
        )}
        {allowUrlEdit ? (
          <input
            value={url}
            disabled={active}
            onChange={(e) => playground.changeUrl(e.target.value)}
            placeholder={t('GraphQL endpoint')}
            aria-label={t('GraphQL endpoint')}
            autoComplete="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent px-1.5 font-mono text-fd-foreground outline-none placeholder:text-fd-muted-foreground/70"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate px-1.5 font-mono">{url}</span>
        )}
      </div>
      {button}
    </div>
  );
}
