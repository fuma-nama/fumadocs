'use client';
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
} from '@fumadocs/api-docs/components/select';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import {
  type ExampleRequest,
  useCodeUsage,
  useCodeUsages,
  useExampleRequests,
  useOperation,
} from './context';
import type { OperationLegacyOptions } from '.';
import type { CreateOpenAPIPageOptions } from '..';

export function UsageTabs({ legacy }: { legacy?: OperationLegacyOptions }) {
  const { operation } = useOperation();
  const codeUsages = useCodeUsages();
  const content: NonNullable<CreateOpenAPIPageOptions['content']> = legacy?.content ?? {};
  let { renderAPIExampleLayout } = content;

  renderAPIExampleLayout ??= (slots) => {
    return (
      <div className="prose-no-margin">
        {slots.selector}
        {slots.usageTabs}
        {slots.responseTabs}
      </div>
    );
  };

  let usageTabs;
  if (legacy?.UsageTabs) {
    usageTabs = <legacy.UsageTabs />;
  } else if (codeUsages.length > 0) {
    usageTabs = (
      <CodeBlockTabs groupId="fumadocs_openapi_requests" defaultValue={codeUsages[0].id}>
        <CodeBlockTabsList>
          {codeUsages.map((item) => (
            <CodeBlockTabsTrigger key={item.id} value={item.id}>
              {item.label ?? item.lang}
            </CodeBlockTabsTrigger>
          ))}
        </CodeBlockTabsList>
        {codeUsages.map((item) => (
          <CodeBlockTab key={item.id} value={item.id}>
            <UsageTab id={item.id} lang={item.lang} />
          </CodeBlockTab>
        ))}
      </CodeBlockTabs>
    );
  }

  return renderAPIExampleLayout(
    {
      selector: operation['x-exclusiveCodeSample'] ? null : <UsageTabsSelector legacy={legacy} />,
      usageTabs,
      responseTabs: <ResponseTabs legacy={legacy} />,
    },
    legacy!.ctx,
  );
}

function UsageTabsSelector({ legacy }: { legacy?: OperationLegacyOptions }) {
  const { items, selected, select } = useExampleRequests();
  if (legacy?.ExampleSelector) return <legacy.ExampleSelector />;

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
