'use client';
import type { ReactNode } from 'react';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { ResponseTabs } from './response-tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'shared-api/components/select';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { type ExampleRequest, useCodeUsage, useExampleRequests, useOperation } from '@/headless';
import type { RenderContext } from '@/types';

export function UsageTabs({ ctx }: { ctx: RenderContext }) {
  const { operation, codeUsages } = useOperation();
  let usageTabs: ReactNode;

  if (ctx.content?.renderAPIExampleUsageTabs) {
    usageTabs = ctx.content.renderAPIExampleUsageTabs(codeUsages, ctx);
  } else {
    const items = Array.from(codeUsages.map());

    usageTabs = items.length > 0 && (
      <CodeBlockTabs groupId="fumadocs_openapi_requests" defaultValue={items[0][0]}>
        <CodeBlockTabsList>
          {items.map(([id, item]) => (
            <CodeBlockTabsTrigger key={id} value={id}>
              {item.label ?? item.lang}
            </CodeBlockTabsTrigger>
          ))}
        </CodeBlockTabsList>
        {items.map(([id, item]) => (
          <CodeBlockTab key={id} value={id}>
            <UsageTab id={id} lang={item.lang} />
          </CodeBlockTab>
        ))}
      </CodeBlockTabs>
    );
  }

  const slots = {
    selector: operation['x-exclusiveCodeSample'] ? null : <UsageTabsSelector />,
    usageTabs,
    responseTabs: <ResponseTabs ctx={ctx} />,
  };

  if (ctx.content?.renderAPIExampleLayout) return ctx.content.renderAPIExampleLayout(slots, ctx);

  return (
    <div className="prose-no-margin">
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
      <SelectTrigger className="not-prose mb-2">
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

function UsageTab({ id, lang }: { id: string; lang: string }) {
  const code = useCodeUsage(id);
  if (!code) return null;

  return <ClientCodeBlock lang={lang} code={code} />;
}
