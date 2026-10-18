'use client';
import { type ReactNode, useState } from 'react';
import { Switch } from '@base-ui/react/switch';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { useTranslations } from '@fuma-translate/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import {
  captionedCodeBlock,
  cardCodeBlock,
  exampleCardClassName,
  ExampleCopy,
  ExampleHeader,
  ExampleSelect,
  selectCodeUsage,
  useCodeUsageId,
} from 'shared-api/components/example';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { Markdown } from '@/ui/components/markdown';
import { MethodLabel } from '@/ui/components/method-label';
import {
  type ExampleRequest,
  type ResponseTab,
  useCodeUsage,
  useExampleRequests,
  useOperation,
  useResponseExamples,
} from '@/operation';
import { useOpenAPI, useRenderContext } from '@/utils/create-page';
import { cn } from '@/utils/cn';

export function UsageTabs() {
  const ctx = useRenderContext();
  const t = useTranslations({ note: 'operation page' });
  const { operation, codeUsages } = useOperation();
  const selectable = !operation['x-exclusiveCodeSample'];

  const slots = {
    // the default usage tabs select example requests in their title
    selector: ctx.content?.renderAPIExampleUsageTabs && selectable ? <UsageTabsSelector /> : null,
    usageTabs: ctx.content?.renderAPIExampleUsageTabs ? (
      ctx.content.renderAPIExampleUsageTabs(codeUsages, ctx)
    ) : (
      <CodeUsages
        title={t('Example Request')}
        selectExample={selectable}
        className={cn('mb-4', exampleCardClassName)}
      />
    ),
    responseTabs: <ResponseTabs />,
  };

  if (ctx.content?.renderAPIExampleLayout) return ctx.content.renderAPIExampleLayout(slots, ctx);

  return (
    <div className="flex min-h-0 flex-col prose-no-margin">
      {slots.selector}
      {slots.usageTabs}
      {slots.responseTabs}
    </div>
  );
}

function UsageTabsSelector() {
  const { items, selected, select } = useExampleRequests();

  function renderItem(item: ExampleRequest) {
    return (
      <div>
        <p className="font-medium text-sm">{item.name}</p>
        <p className="text-fd-muted-foreground">{item.description}</p>
      </div>
    );
  }

  if (items.length === 1) return null;
  const options = items.map((item) => ({ value: item.id, label: renderItem(item) }));
  return (
    <Select items={options} value={selected} onValueChange={(v) => v !== null && select(v)}>
      <SelectTrigger className="not-prose mb-4 rounded-xl bg-fd-card px-3">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const storageKey = 'fumadocs_openapi_requests';

/** the code usages of the selected example request, with a select of their languages */
export function CodeUsages({
  title,
  selectExample = false,
  className,
  viewportClassName,
}: {
  title: ReactNode;
  /** select the example request in place of the title, when there are several */
  selectExample?: boolean;
  className?: string;
  viewportClassName?: string;
}) {
  const generators = useOperation().codeUsages.map();
  const examples = useExampleRequests();
  const selected = useCodeUsageId(storageKey);
  const id =
    selected !== null && generators.has(selected) ? selected : generators.keys().next().value;
  const code = useCodeUsage(id ?? '');
  if (id === undefined) return null;
  const items = Array.from(generators, ([value, item]) => ({
    value,
    label: item.label ?? item.lang,
  }));
  const example =
    selectExample && examples.items.length > 1
      ? examples.items.find((item) => item.id === examples.selected)
      : undefined;

  return (
    <div className={className}>
      <ExampleHeader title={!example && title}>
        {example && (
          <ExampleSelect
            items={examples.items.map((item) => ({
              value: item.id,
              label: item.name,
              description: item.description && <Markdown md={item.description} />,
            }))}
            value={example.id}
            onValueChange={examples.select}
            align="start"
            className="-ms-2 me-auto max-w-none min-w-0 shrink text-fd-foreground"
          />
        )}
        {items.length > 1 ? (
          <ExampleSelect
            items={items}
            value={id}
            onValueChange={(value) => selectCodeUsage(storageKey, value)}
          />
        ) : (
          <span className="px-2 text-fd-muted-foreground">{items[0].label}</span>
        )}
        {code && <ExampleCopy text={code} />}
      </ExampleHeader>
      {code && (
        <ClientCodeBlock
          lang={generators.get(id)!.lang}
          code={code}
          codeblock={{
            ...cardCodeBlock,
            viewportProps: {
              className: cn(cardCodeBlock.viewportProps.className, viewportClassName),
            },
          }}
        />
      )}
    </div>
  );
}

function ResponseTabs() {
  const ctx = useRenderContext();
  const tabs = useResponseExamples();
  if (tabs.length === 0) return null;

  if (ctx.content?.renderResponseTabs) return ctx.content.renderResponseTabs({ tabs }, ctx);

  return <ResponseTabsDefaultContent tabs={tabs} />;
}

function ResponseTabsDefaultContent({ tabs }: { tabs: ResponseTab[] }) {
  const t = useTranslations({ note: 'operation page' });
  const { resolve } = useOpenAPI().doc;
  const [code, setCode] = useState(tabs[0].code);
  const [index, setIndex] = useState(0);
  const [showSchema, setShowSchema] = useState(false);
  const tab = tabs.find((item) => item.code === code) ?? tabs[0];
  const examples = tab.examples ?? [];
  const example = examples.at(index);
  const schema = tab.mediaType ? resolve(tab.response.content?.[tab.mediaType])?.schema : undefined;
  let body: ReactNode;
  let text: string | undefined;

  if (showSchema && schema !== undefined) {
    // the schema as written in the document, with its `$ref`s
    text = JSON.stringify(resolve(schema), (_, value) => getRaw(value), 2);
    body = <ClientCodeBlock lang="json" code={text} codeblock={cardCodeBlock} />;
  } else if (example) {
    const captioned = examples.length > 1 || example.description !== undefined;
    text = JSON.stringify(example.sample, null, 2);

    body = (
      <>
        {captioned && (
          <div className="shrink-0 px-4 pt-2.5">
            {examples.length > 1 && (
              <ExampleSelect
                items={examples.map((item, i) => ({ value: String(i), label: item.label }))}
                value={String(index)}
                onValueChange={(v) => setIndex(Number(v))}
                align="start"
                className="-ms-2"
              />
            )}
            {example.description && (
              <div className="prose prose-xs prose-no-margin text-fd-muted-foreground">
                <Markdown md={example.description} />
              </div>
            )}
          </div>
        )}
        <ClientCodeBlock
          lang="json"
          code={text}
          codeblock={captioned ? captionedCodeBlock : cardCodeBlock}
        />
      </>
    );
  } else {
    body = <div className="px-4 py-3 text-sm text-fd-muted-foreground">{t('Empty')}</div>;
  }

  return (
    <div className={cn('mb-4', exampleCardClassName)}>
      <ExampleHeader title={t('Example Response')}>
        {schema !== undefined && (
          <label className="flex shrink-0 items-center gap-2 text-fd-muted-foreground">
            {t('Schema')}
            <Switch.Root
              checked={showSchema}
              onCheckedChange={setShowSchema}
              className="inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-fd-accent p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring data-checked:bg-fd-primary motion-reduce:transition-none"
            >
              <Switch.Thumb className="size-3 rounded-full bg-fd-muted-foreground transition-[translate,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-checked:translate-x-3 data-checked:bg-fd-primary-foreground motion-reduce:transition-none" />
            </Switch.Root>
          </label>
        )}
        <ExampleSelect
          items={tabs.map((item) => ({ value: item.code, label: item.code }))}
          value={tab.code}
          onValueChange={(v) => {
            setCode(v);
            setIndex(0);
          }}
        />
        {text !== undefined && <ExampleCopy text={text} />}
      </ExampleHeader>
      {body}
    </div>
  );
}

/** the example requests of a webhook */
export function RequestTabs() {
  const ctx = useRenderContext();
  const { path, method, operation, pathItem } = useOperation();
  const { items } = useExampleRequests();
  if (!operation.requestBody) return null;

  if (ctx.content?.renderRequestTabs)
    return ctx.content.renderRequestTabs({ items, route: path, method, pathItem, operation }, ctx);

  return <RequestTabsDefaultContent />;
}

function RequestTabsDefaultContent() {
  const t = useTranslations({ note: 'operation page' });
  const { items, selected, select } = useExampleRequests();
  const item = items.find((item) => item.id === selected) ?? items[0];
  const requestData = item.data;
  const displayNames: Partial<Record<keyof ExampleRequest['data'], string>> = {
    body: t('Request Body'),
    cookie: t('Cookie Parameters'),
    header: t('Header Parameters'),
    query: t('Query Parameters'),
    path: t('Path Parameters'),
  };

  return (
    <div className={exampleCardClassName}>
      <ExampleHeader title={t('Example Requests')}>
        {items.length > 1 && (
          <ExampleSelect
            items={items.map((item) => ({
              value: item.id,
              label: item.id === '_default' ? t('Default') : item.name,
            }))}
            value={item.id}
            onValueChange={select}
          />
        )}
      </ExampleHeader>
      <div className="shrink-0 px-4 py-3 text-[0.8125rem]">
        <MethodLabel className="me-2 text-xs">{requestData.method}</MethodLabel>
        <span className="font-mono">{item.pathname}</span>
        {item.description && (
          <div className="prose prose-xs prose-no-margin mt-1 text-fd-muted-foreground">
            <Markdown md={item.description} />
          </div>
        )}
      </div>
      {Object.entries(displayNames).map(([k, v]) => {
        const data = requestData[k as keyof ExampleRequest['data']];
        if (!data || Object.keys(data).length === 0) return;
        const json = JSON.stringify(data, null, 2);

        return (
          <div key={k} className="flex min-h-0 flex-col border-t">
            <div className="flex shrink-0 items-center gap-2 px-4 pt-3 text-xs font-medium text-fd-muted-foreground">
              <span className="me-auto">{v}</span>
              {k === 'body' && (
                <span className="font-mono font-normal">{requestData.bodyMediaType}</span>
              )}
              <ExampleCopy text={json} caption />
            </div>
            <ClientCodeBlock lang="json" code={json} codeblock={captionedCodeBlock} />
          </div>
        );
      })}
    </div>
  );
}
