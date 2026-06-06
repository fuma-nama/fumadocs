import type { MethodInformation } from '@/types';
import type { NoReference } from '@/utils/schema';
import { I18nLabel } from '@/ui/client/i18n';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';
import type { ReactNode } from 'react';
import type { RawRequestData } from '@/requests/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import { resolveRequestData } from '@/utils/url';
import { MethodLabel } from '../components/method-label';
import type { ExampleRequestItem } from './get-example-requests';
import { Markdown } from '../components/markdown';
import { ClientCodeBlock } from '../components/codeblock';
import { useRenderContext } from '../contexts/api';

export interface RequestTabsRenderOptions {
  route: string;
  items: ExampleRequestItem[];
  operation: NoReference<MethodInformation>;
}

export function RequestTabs({
  path,
  operation,
  examples,
}: {
  path: string;
  examples: ExampleRequestItem[];
  operation: NoReference<MethodInformation>;
}) {
  const ctx = useRenderContext();
  if (!operation.requestBody) return null;
  const { renderRequestTabs = renderRequestTabsDefault } = ctx.content ?? {};

  return renderRequestTabs(
    {
      items: examples,
      route: path,
      operation,
    },
    ctx,
  );
}

function renderRequestTabsDefault(options: RequestTabsRenderOptions) {
  const { items } = options;
  let children: ReactNode;

  if (items.length > 1) {
    children = (
      <Tabs defaultValue={items[0].id}>
        <TabsList>
          {items.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.id === '_default' ? <I18nLabel label="requestTabNameDefault" /> : item.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {items.map((item) => (
          <TabsContent key={item.id} value={item.id}>
            <RequestTabsItem item={item} options={options} />
          </TabsContent>
        ))}
      </Tabs>
    );
  } else if (items.length === 1) {
    children = <RequestTabsItem item={items[0]} options={options} />;
  } else {
    children = (
      <p className="text-fd-muted-foreground text-xs">
        <I18nLabel label="empty" />
      </p>
    );
  }

  return (
    <div className="p-3 rounded-xl border prose-no-margin bg-fd-card text-fd-card-foreground shadow-md">
      <p className="font-semibold border-b pb-2">
        <I18nLabel label="titleRequestTabs" />
      </p>
      {children}
    </div>
  );
}

function RequestTabsItem({
  item,
  options,
}: {
  item: ExampleRequestItem;
  options: RequestTabsRenderOptions;
}) {
  const requestData = item.data;
  const displayNames: Partial<Record<keyof RawRequestData, ReactNode>> = {
    body: (
      <>
        <I18nLabel label="titleRequestBody" />
        <code className="text-xs text-fd-muted-foreground ms-auto">
          {requestData.bodyMediaType}
        </code>
      </>
    ),
    cookie: <I18nLabel label="cookieParameters" />,
    header: <I18nLabel label="headerParameters" />,
    query: <I18nLabel label="queryParameters" />,
    path: <I18nLabel label="pathParameters" />,
  };

  return (
    <>
      {item.description && <Markdown md={item.description} />}
      <div className="flex flex-row gap-2 items-center justify-between">
        <MethodLabel>{requestData.method}</MethodLabel>
        <code>{resolveRequestData(options.route, item.encoded)}</code>
      </div>

      <Accordions type="multiple" className="mt-2">
        {Object.entries(displayNames).map(([k, v]) => {
          const data = requestData[k as keyof RawRequestData];
          if (!data || Object.keys(data).length === 0) return;

          return (
            <AccordionItem key={k} value={k}>
              <AccordionHeader>
                <AccordionTrigger>{v}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent className="prose-no-margin">
                <ClientCodeBlock lang="json" code={JSON.stringify(data, null, 2)} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordions>
    </>
  );
}
