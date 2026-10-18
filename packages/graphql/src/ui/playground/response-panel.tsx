'use client';
import { type ComponentProps, memo, type ReactNode, useDeferredValue, useMemo } from 'react';
import { Radio, SendHorizontal } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { useDataEngine } from '@fumari/stf';
import { exampleActions, ExampleSelect } from 'shared-api/components/example';
import {
  panelCodeBlock,
  panelTopCodeBlock,
  Placeholder,
  SendingOverlay,
} from 'shared-api/components/playground/panels';
import { RequestError, ResponseView } from 'shared-api/components/playground/result';
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
        {playground.isSending && <SendingOverlay />}
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
    <ClientCodeBlock
      lang={generator.lang}
      code={code}
      codeblock={{
        ...panelTopCodeBlock,
        title: t('Request'),
        Actions: exampleActions(
          <ExampleSelect items={items} value={id} onValueChange={selectCodeUsage} />,
        ),
        viewportProps: { className: 'max-h-[min(18rem,30vh)]' },
      }}
    />
  );
});

function ExampleResponse({ example }: { example?: OperationExample }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { kind } = useOperation();

  if (!example) {
    return kind === 'subscription' ? (
      <Placeholder icon={Radio}>{t('Subscribe to see its events.')}</Placeholder>
    ) : (
      <Placeholder icon={SendHorizontal}>{t('Send a request to see its response.')}</Placeholder>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <ClientCodeBlock
        lang="json"
        code={JSON.stringify(example.response, null, 2)}
        codeblock={{ ...panelCodeBlock, title: t('Example Response') }}
      />
    </div>
  );
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
  if (data.type === 'client_error')
    return <RequestError {...rest} message={data.message} url={url} onClear={onClear} />;

  return <ResponseResult {...rest} url={url} data={data} onClear={onClear} />;
}

function ResponseResult({
  url,
  data,
  onClear,
  ...rest
}: ComponentProps<'div'> & {
  url: string;
  data: Extract<PlaygroundResult, { type: 'response' }>;
  onClear: () => void;
}) {
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

  return (
    <ResponseView
      {...rest}
      status={data.status}
      duration={data.time}
      size={size}
      url={url}
      headers={data.headers}
      warning={errors.length > 0 && data.status < 300}
      onClear={onClear}
    >
      <div className="flex h-full flex-col">
        {errors.length > 0 && (
          <ErrorList errors={errors} className="max-h-1/3 shrink-0 overflow-y-auto border-b" />
        )}
        <div className="min-h-0 flex-1">
          <ClientCodeBlock
            lang={lang}
            code={code}
            codeblock={{ ...panelCodeBlock, title: data.contentType }}
          />
        </div>
      </div>
    </ResponseView>
  );
}
