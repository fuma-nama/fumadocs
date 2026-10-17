'use client';
import {
  type ComponentProps,
  Fragment,
  memo,
  type ReactNode,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import { Radio, SendHorizontal, X } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { useDataEngine } from '@fumari/stf';
import { Spinner } from 'shared-api/components/spinner';
import { cardCodeBlock, ExampleHeader, ExampleSelect } from 'shared-api/components/example';
import {
  iconButtonClassName,
  PanelHeader,
  panelCodeBlock,
} from 'shared-api/components/playground/panels';
import { Segmented, SegmentedList, SegmentedPanel } from 'shared-api/components/segmented';
import { useOperation } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import type { OperationExample } from '@/utils/example';
import type { PlaygroundResult } from '@/playground/fetcher';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import {
  codeUsageHeaders,
  selectCodeUsage,
  useCodeUsageId,
  useEndpointUrl,
} from '@/ui/components/code-usage';
import { cn } from '@/utils/cn';
import { type Playground, toRequestValues, useFormSnapshot } from './use-playground';
import { EventLog } from './events';
import { ErrorList, getResponseErrors, type ResponseError } from './errors';

export function ResponsePanel({
  playground,
  className,
}: {
  playground: Playground;
  className?: string;
}) {
  const t = useTranslations({ note: 'graphql playground' });
  const { kind } = useOperation();
  const { response, status, log } = playground;
  // generating code is less urgent than typing
  const deferredQuery = useDeferredValue(playground.query);
  let content: ReactNode;

  if (kind === 'subscription' && (status !== 'closed' || log.length > 0)) {
    content = <EventLog playground={playground} />;
  } else if (response) {
    content = (
      <Result
        key={response.id}
        url={response.url}
        data={response.result}
        onClear={playground.clearResponse}
        className="starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:starting:translate-y-1"
      />
    );
  } else {
    content = <ExampleResponse example={playground.example} />;
  }

  return (
    <div className={cn('@container flex min-h-0 flex-col', className)}>
      {/* the code samples send queries and mutations over HTTP */}
      {kind !== 'subscription' && <RequestCode url={playground.url} query={deferredQuery} />}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {content}
        {playground.isSending && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-fd-card/70 text-sm text-fd-muted-foreground backdrop-blur-[1px] transition-opacity delay-150 duration-200 starting:opacity-0">
            <Spinner className="size-3.5" />
            {t('Sending request...')}
          </div>
        )}
      </div>
    </div>
  );
}

/** the request of the form as code, in the language selected on the page */
const RequestCode = memo(function RequestCode({ url, query }: { url: string; query: string }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { codeUsages } = useRenderContext();
  const engine = useDataEngine();
  const generators = codeUsages.map();
  const selected = useCodeUsageId();
  const id =
    selected !== null && generators.has(selected) ? selected : generators.keys().next().value;
  const endpoint = useEndpointUrl(url);
  const values = useFormSnapshot(engine, () => JSON.stringify(engine.getData()));
  const generator = id === undefined ? undefined : generators.get(id);
  if (id === undefined || !generator) return null;
  const { variables, headers } = toRequestValues(values);
  const code = generator.generate(
    {
      url: endpoint,
      query,
      variables: variables as Record<string, unknown> | undefined,
      headers: codeUsageHeaders(headers),
    },
    undefined,
  );
  const items = Array.from(generators, ([value, item]) => ({
    value,
    label: item.label ?? item.lang,
  }));

  return (
    <div className="shrink-0 border-b">
      <ExampleHeader title={t('Request')}>
        {items.length > 1 ? (
          <ExampleSelect items={items} value={id} onValueChange={selectCodeUsage} />
        ) : (
          <span className="px-2 text-fd-muted-foreground">{items[0].label}</span>
        )}
      </ExampleHeader>
      <ClientCodeBlock
        lang={generator.lang}
        code={code}
        codeblock={{
          ...cardCodeBlock,
          viewportProps: {
            className: cn(cardCodeBlock.viewportProps.className, 'max-h-[min(18rem,30vh)]'),
          },
        }}
      />
    </div>
  );
});

function ExampleResponse({ example }: { example?: OperationExample }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { kind } = useOperation();

  if (!example) {
    const isSubscription = kind === 'subscription';
    const Icon = isSubscription ? Radio : SendHorizontal;

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-xl border bg-fd-secondary p-2.5 text-fd-muted-foreground">
          <Icon className="size-4" />
        </div>
        <p className="text-sm text-fd-muted-foreground">
          {isSubscription
            ? t('Subscribe to see its events.')
            : t('Send a request to see its response.')}
        </p>
      </div>
    );
  }

  return (
    <>
      <PanelHeader>
        <span className="me-auto text-[0.8125rem] font-medium">{t('Example Response')}</span>
      </PanelHeader>
      <div className="min-h-0 flex-1">
        <ClientCodeBlock
          lang="json"
          code={JSON.stringify(example.response, null, 2)}
          codeblock={panelCodeBlock}
        />
      </div>
    </>
  );
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Result({
  url,
  data,
  onClear,
  ...rest
}: ComponentProps<'div'> & {
  url: string;
  data: PlaygroundResult;
  onClear: () => void;
}) {
  const t = useTranslations({ note: 'graphql playground' });

  if (data.type === 'client_error') {
    return (
      <div {...rest} className={cn('flex min-h-0 flex-1 flex-col', rest.className)}>
        <PanelHeader>
          <span className="size-2 shrink-0 rounded-full bg-red-500" />
          <span className="text-[0.8125rem] font-medium">{t('Request Failed')}</span>
          <button
            type="button"
            aria-label={t('Clear')}
            title={t('Clear')}
            className={cn(iconButtonClassName, 'ms-auto')}
            onClick={onClear}
          >
            <X />
          </button>
        </PanelHeader>
        <div className="flex flex-col gap-3 overflow-auto p-4 text-sm">
          <p>{data.message}</p>
          <p className="font-mono text-xs break-all text-fd-muted-foreground">{url}</p>
          <p className="rounded-lg border bg-fd-secondary p-3 text-xs text-fd-muted-foreground">
            {t(
              'Check the endpoint URL. If the server does not allow cross-origin requests from this site, a proxy is needed.',
            )}
          </p>
        </div>
      </div>
    );
  }

  return <ResponseResult data={data} onClear={onClear} {...rest} />;
}

function ResponseResult({
  data,
  onClear,
  ...rest
}: ComponentProps<'div'> & {
  data: Extract<PlaygroundResult, { type: 'response' }>;
  onClear: () => void;
}) {
  const t = useTranslations({ note: 'graphql playground' });
  const [view, setView] = useState('body');
  const { headers } = data;
  const { code, lang, errors, size } = useMemo(() => {
    let code = data.body;
    let lang = 'text';
    let errors: ResponseError[] = [];

    if (data.contentType.includes('json')) {
      lang = 'json';
      try {
        const parsed: unknown = JSON.parse(data.body);
        code = JSON.stringify(parsed, null, 2);
        errors = getResponseErrors(parsed);
      } catch {
        // not JSON after all, keep the body
      }
    }

    return {
      code,
      // highlighting large bodies blocks the page
      lang: code.length > 5000 ? 'text' : lang,
      errors,
      size: new Blob([data.body]).size,
    };
  }, [data]);
  const isSuccess = data.status >= 200 && data.status < 300;

  let body: ReactNode;
  if (data.body.length === 0) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-4xl font-light tracking-tight tabular-nums">{data.status}</p>
        <p className="text-sm text-fd-muted-foreground">{t('Empty response body')}</p>
      </div>
    );
  } else {
    body = (
      <>
        {errors.length > 0 && (
          <ErrorList errors={errors} className="max-h-1/3 shrink-0 overflow-y-auto border-b" />
        )}
        <div className="min-h-0 flex-1">
          <ClientCodeBlock lang={lang} code={code} codeblock={panelCodeBlock} />
        </div>
      </>
    );
  }

  return (
    <div {...rest} className={cn('flex min-h-0 flex-1 flex-col', rest.className)}>
      <Segmented value={view} onValueChange={setView} className="flex min-h-0 flex-1 flex-col">
        <PanelHeader>
          <span
            className={cn(
              'size-2 shrink-0 rounded-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:starting:scale-0',
              !isSuccess ? 'bg-red-500' : errors.length > 0 ? 'bg-amber-500' : 'bg-green-500',
            )}
          />
          <p className="shrink-0 text-[0.8125rem] font-medium tabular-nums">{data.status}</p>
          <p className="hidden min-w-0 truncate text-xs text-fd-muted-foreground tabular-nums @md:block">
            {formatDuration(data.time)} · {formatSize(size)}
          </p>
          <div className="ms-auto flex shrink-0 items-center gap-1">
            {headers && (
              <SegmentedList
                items={[
                  { value: 'body', label: t('Body') },
                  {
                    value: 'headers',
                    label: (
                      <>
                        {t('Headers')}
                        <span className="text-fd-muted-foreground tabular-nums">
                          {headers.length}
                        </span>
                      </>
                    ),
                  },
                ]}
              />
            )}
            <button
              type="button"
              aria-label={t('Clear')}
              title={t('Clear')}
              className={iconButtonClassName}
              onClick={onClear}
            >
              <X />
            </button>
          </div>
        </PanelHeader>
        <SegmentedPanel value="body" className="flex min-h-0 flex-1 flex-col">
          {body}
        </SegmentedPanel>
        {headers && (
          <SegmentedPanel value="headers" className="min-h-0 flex-1 overflow-auto">
            <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] font-mono text-xs">
              {headers.map(([name, value]) => (
                <Fragment key={name}>
                  <dt className="truncate border-b py-2 ps-4 pe-2 text-fd-muted-foreground">
                    {name}
                  </dt>
                  <dd className="border-b border-s px-3 py-2 break-all">{value}</dd>
                </Fragment>
              ))}
            </dl>
          </SegmentedPanel>
        )}
      </Segmented>
    </div>
  );
}
