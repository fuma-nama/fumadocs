'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronDown, CircleCheck, CircleX, Play, Plus, Trash2 } from 'lucide-react';
import { isRequiredArgument } from 'graphql';
import { StfProvider, useStf } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@fumadocs/api-docs/components/collapsible';
import { FieldSet } from '@fumadocs/api-docs/components/playground/inputs';
import { SchemaProvider } from '@fumadocs/api-docs/components/playground/schema';
import { Input } from '@fumadocs/api-docs/components/input';
import { Spinner } from '@fumadocs/api-docs/components/spinner';
import { cn } from '@/utils/cn';
import { getOperationField, type OperationKind } from '@/utils/schema';
import { generateOperationExample } from '@/utils/example';
import { useQuery } from '@/utils/use-query';
import { useRenderContext } from '@/ui/contexts/api';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { CodeEditor } from '@/ui/components/code-editor';
import { Badge } from '@/ui/components/badge';
import { executeGraphQL, type PlaygroundResult } from './fetcher';
import { inputTypeToJsonSchema } from './json-schema';

const StorageKey = 'fumadocs-graphql-playground';

interface HeaderItem {
  key: string;
  value: string;
}

interface StoredState {
  url?: string;
  headers?: HeaderItem[];
}

function readStored(): StoredState {
  try {
    const raw = localStorage.getItem(StorageKey);
    if (raw) return JSON.parse(raw) as StoredState;
  } catch {
    // ignore
  }
  return {};
}

export function OperationPlayground({ kind, name }: { kind: OperationKind; name: string }) {
  const t = useTranslations({ note: 'graphql playground' });
  const ctx = useRenderContext();
  const playground = ctx.playground ?? {};
  const { schema } = ctx.schema;

  const field = useMemo(() => getOperationField(schema, kind, name), [schema, kind, name]);
  const example = useMemo(
    () => generateOperationExample(schema, { kind, name }),
    [schema, kind, name],
  );

  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'variables' | 'headers'>(
    field && field.args.length > 0 ? 'variables' : 'headers',
  );
  const [url, setUrl] = useState(playground.url ?? '');
  const [query, setQuery] = useState(example?.query ?? '');
  const [headers, setHeaders] = useState<HeaderItem[]>([]);

  const stf = useStf({
    defaultValues: {
      variables: example?.variables ?? {},
    },
  });

  useEffect(() => {
    const stored = readStored();
    if (stored.url && !playground.url) setUrl(stored.url);
    if (Array.isArray(stored.headers)) setHeaders(stored.headers);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only at mount
  }, []);

  const testQuery = useQuery(async (): Promise<PlaygroundResult> => {
    const headersObject: Record<string, string> = {};
    for (const item of headers) {
      if (item.key.trim().length > 0) headersObject[item.key.trim()] = item.value;
    }

    localStorage.setItem(StorageKey, JSON.stringify({ url, headers } satisfies StoredState));

    const data = stf.dataEngine.getData() as { variables?: Record<string, unknown> };
    // strip `undefined` values
    const variables =
      data.variables && Object.keys(data.variables).length > 0
        ? (JSON.parse(JSON.stringify(data.variables)) as Record<string, unknown>)
        : undefined;

    const fetcher = playground.fetcher ?? executeGraphQL;
    return fetcher(
      {
        url,
        query,
        variables,
        headers: headersObject,
      },
      ctx,
    );
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(true);
        void testQuery.start();
      }}
    >
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="rounded-xl border bg-fd-card text-fd-card-foreground not-prose overflow-hidden text-sm shadow-sm"
      >
        <div className="flex items-center gap-2 p-2">
          <Badge color="blue" className="text-xs ps-1.5">
            POST
          </Badge>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('GraphQL endpoint')}
            aria-label={t('GraphQL endpoint')}
            className="flex-1 min-w-0 bg-transparent font-mono text-[0.8125rem] text-fd-muted-foreground focus:outline-none focus:text-fd-foreground"
          />
          <CollapsibleTrigger
            aria-label={t('Toggle playground')}
            className={cn(
              buttonVariants({ size: 'icon-xs', variant: 'ghost' }),
              'text-fd-muted-foreground data-panel-open:rotate-180 transition-transform',
            )}
          >
            <ChevronDown />
          </CollapsibleTrigger>
          <button
            type="submit"
            disabled={testQuery.isLoading || url.length === 0}
            className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'gap-1.5 px-3')}
          >
            {testQuery.isLoading ? <Spinner className="size-3.5" /> : <Play className="size-3.5" />}
            {t('Run')}
          </button>
        </div>
        <CollapsibleContent>
          <CodeEditor
            value={query}
            onValueChange={setQuery}
            lang="graphql"
            aria-label={t('Query editor')}
            className="border-t"
          />
          <div className="flex flex-row items-center gap-4 border-t bg-fd-secondary/50 px-3">
            {(['variables', 'headers'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  'py-2 text-xs font-medium border-b border-transparent text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground',
                  tab === item && 'border-fd-primary text-fd-foreground',
                )}
              >
                {item === 'variables' ? t('Variables') : t('Headers')}
              </button>
            ))}
          </div>
          <div className={cn('flex flex-col gap-3 p-3', tab !== 'variables' && 'hidden')}>
            {field && field.args.length > 0 ? (
              <StfProvider value={stf}>
                <SchemaProvider docRoot={{}} readOnly={false} writeOnly>
                  {field.args.map((arg) => {
                    const fieldName = ['variables', arg.name];
                    const isRequired = isRequiredArgument(arg);

                    return (
                      <FieldSet
                        key={stringifyFieldKey(fieldName)}
                        name={arg.name}
                        fieldName={fieldName}
                        field={inputTypeToJsonSchema(arg.type)}
                        isRequired={isRequired}
                        collapsible={!isRequired}
                      />
                    );
                  })}
                </SchemaProvider>
              </StfProvider>
            ) : (
              <p className="text-xs text-fd-muted-foreground">
                {t('This operation has no variables.')}
              </p>
            )}
          </div>
          <div className={cn('flex flex-col gap-2 p-3', tab !== 'headers' && 'hidden')}>
            {headers.map((item, i) => (
              <div key={i} className="flex flex-row gap-2">
                <Input
                  value={item.key}
                  onChange={(e) => {
                    setHeaders((prev) =>
                      prev.map((v, j) => (j === i ? { ...v, key: e.target.value } : v)),
                    );
                  }}
                  placeholder={t('Name')}
                  aria-label={t('Header name')}
                  className="flex-1"
                />
                <Input
                  value={item.value}
                  onChange={(e) => {
                    setHeaders((prev) =>
                      prev.map((v, j) => (j === i ? { ...v, value: e.target.value } : v)),
                    );
                  }}
                  placeholder={t('Value')}
                  aria-label={t('Header value')}
                  className="flex-2"
                />
                <button
                  type="button"
                  aria-label={t('Remove header')}
                  onClick={() => setHeaders((prev) => prev.filter((_, j) => j !== i))}
                  className={cn(
                    buttonVariants({ size: 'icon-sm', variant: 'ghost' }),
                    'text-fd-muted-foreground',
                  )}
                >
                  <Trash2 />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setHeaders((prev) => [...prev, { key: '', value: '' }])}
              className={cn(
                buttonVariants({ size: 'sm', variant: 'secondary' }),
                'gap-1.5 me-auto',
              )}
            >
              <Plus className="size-3.5" />
              {t('Add Header')}
            </button>
          </div>
          {testQuery.data && (
            <ResultDisplay data={testQuery.data} reset={() => testQuery.reset()} />
          )}
        </CollapsibleContent>
      </Collapsible>
    </form>
  );
}

function ResultDisplay({ data, reset }: { data: PlaygroundResult; reset: () => void }) {
  const t = useTranslations({ note: 'graphql playground' });

  if (data.type === 'client_error') {
    return (
      <div className="flex flex-col gap-2 border-t bg-fd-secondary/50 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <CircleX className="size-4 text-red-500" />
          <p className="font-medium me-auto">{t('Client Error')}</p>
          <button
            type="button"
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
            onClick={reset}
          >
            {t('Close')}
          </button>
        </div>
        <p className="text-fd-muted-foreground">{data.message}</p>
      </div>
    );
  }

  const isSuccess = data.status >= 200 && data.status < 300;
  const Icon = isSuccess ? CircleCheck : CircleX;
  let body = data.body;
  let lang = 'text';

  if (data.contentType.includes('json')) {
    lang = 'json';
    try {
      body = JSON.stringify(JSON.parse(data.body), null, 2);
    } catch {
      // keep original body
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t bg-fd-secondary/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('size-4 shrink-0', isSuccess ? 'text-green-500' : 'text-red-500')} />
        <p className="font-medium">{data.status}</p>
        <p className="text-xs text-fd-muted-foreground me-auto">
          {t('{time}ms', { variables: { time: String(Math.round(data.time)) } })}
        </p>
        <button
          type="button"
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
          onClick={reset}
        >
          {t('Close')}
        </button>
      </div>
      {body.length > 0 && <ClientCodeBlock lang={lang} code={body} />}
    </div>
  );
}
