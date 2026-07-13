'use client';
import { useRenderContext } from '@/ui/contexts/api';
import { ReactNode, useMemo } from 'react';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { getExampleMessages, type ExampleMessageItem } from '@/utils/get-example-messages';
import { useTranslations } from '@fuma-translate/react';
import { MessageObject } from '@/types';
import { SelectTab, SelectTabs, SelectTabTrigger } from '@fumadocs/api-docs/components/select-tab';
import { Markdown } from '../components/markdown';
import { Heading } from '../components/heading';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';

export function MessageExamples({
  message,
  headingLevel,
}: {
  message: MessageObject;
  headingLevel: number;
}) {
  const ctx = useRenderContext();
  const t = useTranslations({ note: 'asyncapi message example' });
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

    return (
      <div className="p-1 pt-4 border rounded-xl bg-fd-card text-fd-card-foreground prose-no-margin">
        <Heading id="example" depth={headingLevel} className="px-4">
          {t('Message Example')}
        </Heading>
        <SelectTabs defaultValue={examples[0]?.id}>
          <SelectTabTrigger
            className="w-full mb-2 px-4"
            items={examples.map((item) => ({
              label: (
                <div>
                  <p className="font-medium">{item.name}</p>
                  <div className="text-sm text-fd-muted-foreground">
                    {item.description && <Markdown md={item.description} />}
                  </div>
                </div>
              ),
              value: item.id,
            }))}
          />
          {examples.map((item) => (
            <SelectTab key={item.id} value={item.id} className="prose-no-margin">
              <MessageExampleContent item={item} />
            </SelectTab>
          ))}
        </SelectTabs>
      </div>
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

  const items: { label: string; value: string; content: ReactNode }[] = [];
  if (headers)
    items.push({
      label: t('Headers'),
      value: 'headers',
      content: <ClientCodeBlock lang="json" code={headers} />,
    });
  if (payload)
    items.push({
      label: t('Payload'),
      value: 'payload',
      content: <ClientCodeBlock lang="json" code={payload} />,
    });

  if (items.length === 0) return null;
  return (
    <CodeBlockTabs defaultValue={items[0].value}>
      <CodeBlockTabsList>
        {items.map((item) => (
          <CodeBlockTabsTrigger key={item.value} value={item.value}>
            {item.label}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {items.map((item) => (
        <CodeBlockTab key={item.value} value={item.value}>
          {item.content}
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  );
}
