'use client';
import { useTranslations } from '@fuma-translate/react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import type { ReactNode } from 'react';
import type { RawRequestData } from '@/requests/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import { pathnameFromRequest } from '@/requests/generators';
import { MethodLabel } from '@/ui/components/method-label';
import type { ExampleRequestItem } from '../../utils/get-example-requests';
import { Markdown } from '../components/markdown';
import { ClientCodeBlock } from '../components/codeblock';
import { useRenderContext } from '../contexts/api';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { HttpMethods, OperationObject, PathItemObject } from '@/types';

export interface RequestTabsRenderOptions {
  route: string;
  items: ExampleRequestItem[];
  method: HttpMethods;
  pathItem: NoReference<PathItemObject>;
  operation: NoReference<OperationObject>;
}

export function RequestTabs({
  path,
  operation,
  method,
  pathItem,
  examples,
}: {
  path: string;
  examples: ExampleRequestItem[];
  method: HttpMethods;
  pathItem: NoReference<PathItemObject>;
  operation: NoReference<OperationObject>;
}) {
  const ctx = useRenderContext();
  if (!operation.requestBody) return null;
  const { renderRequestTabs = renderRequestTabsDefault } = ctx.content ?? {};

  return renderRequestTabs(
    {
      items: examples,
      route: path,
      method,
      pathItem,
      operation,
    },
    ctx,
  );
}

function renderRequestTabsDefault(options: RequestTabsRenderOptions) {
  return <RequestTabsDefaultContent options={options} />;
}

function RequestTabsDefaultContent({ options }: { options: RequestTabsRenderOptions }) {
  const t = useTranslations({ note: 'operation page' });
  const { items } = options;
  let children: ReactNode;

  if (items.length > 1) {
    children = (
      <Tabs defaultValue={items[0].id}>
        <TabsList>
          {items.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.id === '_default' ? t('Default') : item.name}
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
    children = <p className="text-fd-muted-foreground text-xs">{t('Empty')}</p>;
  }

  return (
    <div className="p-3 rounded-xl border prose-no-margin bg-fd-card text-fd-card-foreground shadow-md">
      <p className="font-semibold border-b pb-2">{t('Example Requests')}</p>
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
  const t = useTranslations({ note: 'operation page' });
  const requestData = item.data;
  const displayNames: Partial<Record<keyof RawRequestData, ReactNode>> = {
    body: (
      <>
        {t('Request Body')}
        <code className="text-xs text-fd-muted-foreground ms-auto">
          {requestData.bodyMediaType}
        </code>
      </>
    ),
    cookie: t('Cookie Parameters'),
    header: t('Header Parameters'),
    query: t('Query Parameters'),
    path: t('Path Parameters'),
  };

  return (
    <>
      {item.description && <Markdown md={item.description} />}
      <div className="flex flex-row gap-2 items-center justify-between">
        <MethodLabel>{requestData.method}</MethodLabel>
        <code>{pathnameFromRequest(options.route, item.encoded)}</code>
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
