'use client';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import { useRenderContext } from '@/ui/contexts/api';
import { useMemo } from 'react';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import type { ExampleMessageItem } from '@/utils/get-example-messages';
import { I18nLabel } from '@/ui/client/i18n';
import { Heading } from '@/ui/components/heading';

export function UsageTabs({ examples }: { examples: ExampleMessageItem[] }) {
  const ctx = useRenderContext();
  let { renderAPIExampleUsageTabs, renderAPIExampleLayout } = ctx.content ?? {};

  renderAPIExampleLayout ??= (slots) => {
    return <div className="prose-no-margin">{slots.usageTabs}</div>;
  };

  renderAPIExampleUsageTabs ??= (items, _ctx) => {
    if (items.length === 0) return null;

    return (
      <Accordions type="multiple">
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionHeader>
              <AccordionTrigger>{item.name}</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent className="ps-4.5 pe-3 border rounded-xl">
              <MessageExampleContent item={item} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordions>
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
