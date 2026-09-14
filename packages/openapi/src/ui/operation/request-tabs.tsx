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
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import { MethodLabel } from '@/ui/components/method-label';
import { Markdown } from '../components/markdown';
import { ClientCodeBlock } from '../components/codeblock';
import { type ExampleRequest, useExampleRequests, useOperation } from './context';
import type { OperationLegacyOptions } from '.';

export function RequestTabs({ legacy }: { legacy?: OperationLegacyOptions }) {
  const { operation } = useOperation();
  const { items } = useExampleRequests();
  if (!operation.requestBody) return null;
  if (legacy?.RequestTabs) return <legacy.RequestTabs />;

  return <RequestTabsDefaultContent items={items} />;
}

function RequestTabsDefaultContent({ items }: { items: ExampleRequest[] }) {
  const t = useTranslations({ note: 'operation page' });
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
            <RequestTabsItem item={item} />
          </TabsContent>
        ))}
      </Tabs>
    );
  } else if (items.length === 1) {
    children = <RequestTabsItem item={items[0]} />;
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

function RequestTabsItem({ item }: { item: ExampleRequest }) {
  const t = useTranslations({ note: 'operation page' });
  const requestData = item.data;
  const displayNames: Partial<Record<keyof ExampleRequest['data'], ReactNode>> = {
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
        <code>{item.pathname}</code>
      </div>

      <Accordions type="multiple" className="mt-2">
        {Object.entries(displayNames).map(([k, v]) => {
          const data = requestData[k as keyof ExampleRequest['data']];
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
