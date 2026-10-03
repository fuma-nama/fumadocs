'use client';
import {
  type ComponentProps,
  type FC,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Play, X } from 'lucide-react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { useOpenAPI } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { useExampleRequests, useOperation } from '@/operation';
import type { BrowserFetcherOptions } from '@/playground/fetcher';
import {
  DefaultResultDisplay,
  iconButtonClassName,
  type ResultDisplayProps,
} from './components/result-display';
import { pathnameFromRequest } from '@/requests/generators';
import { EndpointBar } from '@/ui/components/endpoint';
import { useQuery } from 'shared-api/utils/use-query';
import { encodeRequestData } from '@/requests/media/encode';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/utils/cn';
import { SchemaProvider } from 'shared-api/components/playground/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import {
  type DataEngineListener,
  type FieldKey,
  StfProvider,
  useFieldValue,
  useStf,
} from '@fumari/stf';
import type { ParameterObject } from '@/types';
import { useTranslations } from '@fuma-translate/react';
import { type AuthField, useAuthFields, usePlaygroundAuth } from '@/playground/auth';
import { UrlBar } from './components/url-bar';
import { type RequestBodyInfo, RequestPanel } from './components/request-panel';
import { ResponsePanel, type TestResult } from './components/response-panel';
import { Segmented, SegmentedList } from './components/segmented';

export interface FormValues extends Record<string, unknown> {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  cookie: Record<string, unknown>;
  body: unknown;
}

export interface PlaygroundClientProps extends ComponentProps<'div'>, PlaygroundClientOptions {
  writeOnly: boolean;
  readOnly: boolean;
}

export type { ResultDisplayProps };
export { DefaultResultDisplay };

export interface PlaygroundClientOptions {
  /**
   * transform fields for auth-specific parameters (e.g. header)
   */
  transformAuthInputs?: (fields: AuthField[]) => AuthField[];

  fetchOptions?: BrowserFetcherOptions;

  components?: {
    ResultDisplay?: FC<ResultDisplayProps>;
  };

  /**
   * render the parameter inputs of API endpoint.
   *
   * for updating values, use:
   * - the `Custom.useController()` from `fumadocs-openapi/ui/playground/client`.
   *
   * Recommended types packages: `json-schema-typed`.
   */
  renderParameterField?: (fieldName: FieldKey, param: ParameterObject) => ReactNode;

  /**
   * render the input for API endpoint body.
   *
   * @see renderParameterField for customization tips
   */
  renderBodyField?: (fieldName: 'body', info: RequestBodyInfo) => ReactNode;
}

export default function PlaygroundClient({
  writeOnly,
  readOnly,
  transformAuthInputs,
  fetchOptions,
  components,
  renderParameterField,
  renderBodyField,
  ...rest
}: PlaygroundClientProps) {
  const t = useTranslations({ note: 'playground' });
  const { doc, mediaAdapters, proxyUrl } = useOpenAPI();
  const { path: route, method, operation, parameters: groups, requestBody } = useOperation();
  const parameters = groups.flatMap((group) => group.items);
  let body: RequestBodyInfo | undefined;
  if (requestBody) {
    const { content } = requestBody;
    const mediaType = 'application/json' in content ? 'application/json' : Object.keys(content)[0];
    body = { mediaType, schema: content[mediaType].schema ?? true };
  }
  const { items: examples, selected: exampleId, update } = useExampleRequests();
  const { resolveUrl } = useServer();
  const [open, setOpen] = useState(false);

  // reopen after the OAuth flow started here returns to the page
  useOnChange(usePlaygroundAuth().origin, (origin) => {
    if (origin === `${method} ${route}`) setOpen(true);
  });

  const defaultValues: FormValues = useMemo(() => {
    const requestData = examples.find((example) => example.id === exampleId)?.data;

    return {
      path: requestData?.path ?? {},
      query: requestData?.query ?? {},
      header: requestData?.header ?? {},
      body: requestData?.body ?? {},
      cookie: requestData?.cookie ?? {},
    };
  }, [examples, exampleId]);

  const stf = useStf({
    // it is fine to modify `defaultValues` in place
    // because we already try to persist the form values via `update()`.
    defaultValues,
  });
  const engine = stf.dataEngine;

  const auth = useAuthFields(engine, {
    operation,
    transform: transformAuthInputs,
  });

  const testQuery = useQuery(async (input: FormValues): Promise<TestResult> => {
    const fetcher = await import('@/playground').then((mod) =>
      mod.createBrowserFetcher(mediaAdapters, {
        proxyUrl,
        ...fetchOptions,
      }),
    );

    const encoded = encodeRequestData(
      { ...auth.mapValues(input), method, bodyMediaType: body?.mediaType },
      mediaAdapters,
      parameters,
    );
    const start = performance.now();
    const result = await fetcher.fetch(resolveUrl(pathnameFromRequest(route, encoded)), encoded);
    return { id: start, result, duration: performance.now() - start };
  });

  const syncExample = useEffectEvent(() => {
    update({
      ...auth.mapValues(engine.getData() as FormValues),
      method,
      bodyMediaType: body?.mediaType,
    });
  });

  useEffect(() => {
    // same object reference = unchanged
    if (engine.getData() !== defaultValues) engine.reset(defaultValues);
  }, [engine, defaultValues]);

  const initAuth = auth.init;
  // write the auth values again after resets, then sync the edits with a delay
  useEffect(() => {
    const reset = initAuth();
    syncExample();
    let timer: number | undefined;
    const listener: DataEngineListener = {
      onUpdate() {
        window.clearTimeout(timer);
        timer = window.setTimeout(syncExample, 400);
      },
    };

    engine.listen(listener);
    return () => {
      engine.unlisten(listener);
      window.clearTimeout(timer);
      reset();
    };
  }, [engine, defaultValues, initAuth]);

  return (
    <StfProvider value={stf}>
      <SchemaProvider docRoot={doc.dereferenced as never} writeOnly={writeOnly} readOnly={readOnly}>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <EndpointBar method={method} route={route} deprecated={operation.deprecated} {...rest}>
            <Dialog.Trigger
              className={cn(
                buttonVariants({ variant: 'primary', size: 'sm' }),
                'group shrink-0 gap-1.5 rounded-lg px-3 transition-[background-color,scale] active:scale-[0.97] motion-reduce:transition-none',
              )}
            >
              <Play className="size-3 fill-current transition-transform duration-200 group-hover:translate-x-px motion-reduce:transition-none" />
              {t('Try it out')}
            </Dialog.Trigger>
          </EndpointBar>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
            <Dialog.Popup className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-fd-background text-fd-foreground outline-none transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-opacity sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(52rem,calc(100dvh-3rem))] sm:w-[min(80rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:shadow-2xl">
              <PlaygroundDialog
                auth={auth}
                body={body}
                parameters={parameters}
                result={testQuery.data}
                loading={testQuery.isLoading}
                onSend={() => testQuery.start(engine.getData() as FormValues)}
                onReset={testQuery.reset}
                renderParameterField={renderParameterField}
                renderBodyField={renderBodyField}
                ResultDisplay={components?.ResultDisplay}
              />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </SchemaProvider>
    </StfProvider>
  );
}

function PlaygroundDialog({
  auth,
  body,
  parameters,
  result,
  loading,
  onSend,
  onReset,
  renderParameterField,
  renderBodyField,
  ResultDisplay,
}: Pick<PlaygroundClientOptions, 'renderParameterField' | 'renderBodyField'> & {
  auth: ReturnType<typeof useAuthFields>;
  body?: RequestBodyInfo;
  parameters: ParameterObject[];
  result?: TestResult;
  loading: boolean;
  onSend: () => void;
  onReset: () => void;
  ResultDisplay?: FC<ResultDisplayProps>;
}) {
  const t = useTranslations({ note: 'playground' });
  const { title, method, path, operation } = useOperation();
  const [view, setView] = useState('request');

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
        setView('response');
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        e.currentTarget.requestSubmit();
      }}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 ps-4 pe-2 sm:ps-5">
        <Dialog.Title className="truncate text-sm font-medium">{title}</Dialog.Title>
        {operation.deprecated && (
          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            {t('Deprecated')}
          </span>
        )}
        <div className="ms-auto flex items-center gap-1">
          <ExampleSelect />
          <Dialog.Close aria-label={t('Close')} className={iconButtonClassName}>
            <X />
          </Dialog.Close>
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3 sm:px-4">
        <UrlBar
          method={method}
          route={path}
          parameters={parameters.filter((param) => param.in === 'path')}
          deprecated={operation.deprecated}
          loading={loading}
        />
      </div>
      <Segmented value={view} onValueChange={setView} className="shrink-0 px-3 pb-3 md:hidden">
        <SegmentedList
          className="*:flex-1 *:justify-center"
          items={[
            { value: 'request', label: t('Request') },
            { value: 'response', label: t('Response') },
          ]}
        />
      </Segmented>
      <div className="mx-3 mb-3 grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-fd-card sm:mx-4 sm:mb-4 md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <RequestPanel
          auth={auth}
          body={body}
          parameters={parameters}
          renderParameterField={renderParameterField}
          renderBodyField={renderBodyField}
          className={cn(view !== 'request' && 'max-md:hidden')}
        />
        <ResponsePanel
          result={result}
          loading={loading}
          onReset={onReset}
          ResultDisplay={ResultDisplay}
          className={cn('md:border-s', view !== 'response' && 'max-md:hidden')}
        />
      </div>
    </form>
  );
}

function ExampleSelect() {
  const { items, selected, select } = useExampleRequests();
  const t = useTranslations({ note: 'playground' });
  if (items.length <= 1) return null;
  const options = items.map((item) => ({ value: item.id, label: item.name }));

  return (
    <Select items={options} value={selected ?? null} onValueChange={(v) => v !== null && select(v)}>
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

export const Custom = {
  useController(
    fieldName: FieldKey,
    options?: {
      defaultValue?: unknown;
    },
  ) {
    const [value, setValue] = useFieldValue(fieldName, options);
    return {
      value,
      setValue,
    };
  },
};
