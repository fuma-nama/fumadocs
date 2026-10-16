'use client';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
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

/** a code block filling its card */
const cardCodeBlock = {
  className: 'flex min-h-0 flex-col rounded-none border-0 bg-transparent shadow-none',
  viewportProps: { className: 'min-h-0' },
};
/** a code block under its caption */
const captionedCodeBlock = { ...cardCodeBlock, viewportProps: { className: 'min-h-0 pt-2' } };

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
        className="mb-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-fd-card"
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

function ExampleHeader({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b ps-4 pe-1.5 text-[0.8125rem] font-medium">
      {title && <span className="me-auto truncate">{title}</span>}
      {children}
    </div>
  );
}

export function ExampleSelect({
  items,
  value,
  onValueChange,
  align = 'end',
  className,
}: {
  items: { value: string; label: ReactNode; description?: string }[];
  value: string;
  onValueChange: (value: string) => void;
  align?: 'start' | 'end';
  className?: string;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v !== null && onValueChange(v)}>
      <SelectTrigger
        className={cn(
          'h-7 w-fit max-w-1/2 shrink-0 gap-1.5 border-0 bg-transparent px-2 py-0 text-[0.8125rem] font-medium text-fd-muted-foreground hover:text-fd-accent-foreground focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          className,
        )}
      >
        <SelectValue className="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent align={align} className="max-w-80">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            description={
              item.description && (
                <div className="prose prose-xs prose-no-margin font-normal text-fd-muted-foreground">
                  <Markdown md={item.description} />
                </div>
              )
            }
            className="text-[0.8125rem] font-medium"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// the selected code usage applies to every code usage of the session
const storageKey = 'fumadocs_openapi_requests';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function select(id: string) {
  sessionStorage.setItem(storageKey, id);
  for (const listener of listeners) listener();
}

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
  const selected = useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(storageKey),
    () => null,
  );
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
              description: item.description,
            }))}
            value={example.id}
            onValueChange={examples.select}
            align="start"
            className="-ms-2 me-auto max-w-none min-w-0 shrink text-fd-foreground"
          />
        )}
        {items.length > 1 ? (
          <ExampleSelect items={items} value={id} onValueChange={select} />
        ) : (
          <span className="px-2 text-fd-muted-foreground">{items[0].label}</span>
        )}
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

  if (showSchema && schema !== undefined) {
    body = (
      <ClientCodeBlock
        lang="json"
        // the schema as written in the document, with its `$ref`s
        code={JSON.stringify(resolve(schema), (_, value) => getRaw(value), 2)}
        codeblock={cardCodeBlock}
      />
    );
  } else if (example) {
    const captioned = examples.length > 1 || example.description !== undefined;

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
          code={JSON.stringify(example.sample, null, 2)}
          codeblock={captioned ? captionedCodeBlock : cardCodeBlock}
        />
      </>
    );
  } else {
    body = <div className="px-4 py-3 text-sm text-fd-muted-foreground">{t('Empty')}</div>;
  }

  return (
    <div className="mb-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-fd-card">
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
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-fd-card">
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

        return (
          <div key={k} className="flex min-h-0 flex-col border-t">
            <div className="flex shrink-0 px-4 pt-3 text-xs font-medium text-fd-muted-foreground">
              {v}
              {k === 'body' && (
                <span className="ms-auto font-mono font-normal">{requestData.bodyMediaType}</span>
              )}
            </div>
            <ClientCodeBlock
              lang="json"
              code={JSON.stringify(data, null, 2)}
              codeblock={captionedCodeBlock}
            />
          </div>
        );
      })}
    </div>
  );
}
