'use client';
import type { MessageObject, OperationObject } from '@/types';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { NoReference } from '@fumadocs/api-docs/schema';
import { useRenderContext } from '@/ui/contexts/api';
import { useMemo } from 'react';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import type { ExampleMessageItem } from '@/utils/get-example-messages';
import { I18nLabel } from '@/ui/client/i18n';
import { Heading } from '@/ui/components/heading';

export function UsageTabs({
  operation,
  messages,
  examples,
}: {
  operation: NoReference<OperationObject>;
  messages: NoReference<MessageObject>[];
  examples: ExampleMessageItem[];
}) {
  const ctx = useRenderContext();
  let { renderAPIExampleUsageTabs, renderAPIExampleLayout } = ctx.content ?? {};

  renderAPIExampleLayout ??= (slots) => {
    return <div className="prose-no-margin">{slots.usageTabs}</div>;
  };

  renderAPIExampleUsageTabs ??= (items, _ctx) => {
    if (items.length === 0) return null;

    return (
      <CodeBlockTabs groupId="fumadocs_asyncapi_messages" defaultValue={items[0].id}>
        <CodeBlockTabsList>
          {items.map((item) => (
            <CodeBlockTabsTrigger key={item.id} value={item.id}>
              {item.name}
            </CodeBlockTabsTrigger>
          ))}
        </CodeBlockTabsList>
        {items.map((item) => (
          <CodeBlockTab key={item.id} value={item.id}>
            <MessageExampleContent item={item} />
          </CodeBlockTab>
        ))}
      </CodeBlockTabs>
    );
  };

  const content =
    renderAPIExampleLayout?.(
      {
        selector: null,
        usageTabs: renderAPIExampleUsageTabs(examples, ctx),
        responseTabs: null,
      },
      ctx,
    ) ?? renderAPIExampleUsageTabs(examples, ctx);

  if (!content) return null;

  return (
    <>
      <Heading id="message-examples" depth={3} className="my-0!">
        <I18nLabel label="titleMessages" />
      </Heading>
      {operation.description && messages.length > 0 ? null : null}
      {content}
    </>
  );
}

function MessageExampleContent({ item }: { item: ExampleMessageItem }) {
  const payload = useMemo(() => {
    if (item.payload === undefined) return;
    return JSON.stringify(item.payload, null, 2);
  }, [item.payload]);

  const headers = useMemo(() => {
    if (item.headers === undefined) return;
    return JSON.stringify(item.headers, null, 2);
  }, [item.headers]);

  return (
    <div className="flex flex-col gap-3">
      {item.description && <p className="text-sm text-fd-muted-foreground">{item.description}</p>}
      {headers && (
        <div>
          <p className="text-xs font-medium mb-1">
            <I18nLabel label="titleHeaders" />
          </p>
          <ClientCodeBlock lang="json" code={headers} />
        </div>
      )}
      {payload && (
        <div>
          <p className="text-xs font-medium mb-1">
            <I18nLabel label="titlePayload" />
          </p>
          <ClientCodeBlock lang="json" code={payload} />
        </div>
      )}
    </div>
  );
}
