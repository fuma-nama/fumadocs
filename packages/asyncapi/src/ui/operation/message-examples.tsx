'use client';
import { useRenderContext } from '@/ui/contexts/api';
import { useMemo } from 'react';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { getExampleMessages, type ExampleMessageItem } from '@/utils/get-example-messages';
import { useTranslations } from '@fuma-translate/react';
import { NoReference } from '@fumadocs/api-docs/schema';
import { MessageObject } from '@/types';
import { SelectTab, SelectTabs, SelectTabTrigger } from '@fumadocs/api-docs/components/select-tab';
import { Markdown } from '../components/markdown';

export function MessageExamples({ message }: { message: NoReference<MessageObject> }) {
  const ctx = useRenderContext();
  const items = useMemo(
    () =>
      getExampleMessages({ message }).filter(
        (item) => item.payload !== undefined || item.headers !== undefined || item.description,
      ),
    [message],
  );
  let { renderAPIExampleUsageTabs } = ctx.content ?? {};

  if (items.length === 0) return null;

  renderAPIExampleUsageTabs ??= (examples) => {
    if (examples.length === 0) return null;

    if (examples.length === 1) {
      return <MessageExampleContent item={examples[0]} />;
    }

    return (
      <SelectTabs defaultValue={examples[0]?.id}>
        <SelectTabTrigger
          items={examples.map((item) => ({ label: <code>{item.name}</code>, value: item.id }))}
        />
        {examples.map((item) => (
          <SelectTab key={item.id} value={item.id}>
            <MessageExampleContent item={item} />
          </SelectTab>
        ))}
      </SelectTabs>
    );
  };

  return renderAPIExampleUsageTabs(items, ctx);
}

function MessageExampleContent({ item }: { item: ExampleMessageItem }) {
  const t = useTranslations({ note: 'operation page' });
  const payload = useMemo(() => {
    if (item.payload === undefined) return;
    return JSON.stringify(item.payload, null, 2);
  }, [item.payload]);

  const headers = useMemo(() => {
    if (item.headers === undefined) return;
    return JSON.stringify(item.headers, null, 2);
  }, [item.headers]);

  return (
    <div className="flex flex-col gap-2 not-prose">
      {item.description && (
        <div className="text-sm p-4 bg-fd-card text-fd-card-foreground border rounded-xl">
          <Markdown md={item.description} />
        </div>
      )}
      {headers && (
        <ClientCodeBlock lang="json" code={headers} codeblock={{ title: t('Headers') }} />
      )}
      {payload && (
        <ClientCodeBlock lang="json" code={payload} codeblock={{ title: t('Payload') }} />
      )}
    </div>
  );
}
