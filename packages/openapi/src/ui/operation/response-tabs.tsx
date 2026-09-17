'use client';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { Markdown } from '../components/markdown';
import { ClientCodeBlock } from '../components/codeblock';
import { type ResponseExample, type ResponseTab, useResponseExamples } from '@/headless';
import type { RenderContext } from '@/types';

export function ResponseTabs({ ctx }: { ctx: RenderContext }) {
  const tabs = useResponseExamples();
  if (tabs.length === 0) return null;

  if (ctx.content?.renderResponseTabs) return ctx.content.renderResponseTabs({ tabs }, ctx);

  return <ResponseTabsDefaultContent tabs={tabs} />;
}

function ResponseTabsDefaultContent({ tabs }: { tabs: ResponseTab[] }) {
  const t = useTranslations({ note: 'operation page' });

  function renderExampleContent(example: ResponseExample) {
    return (
      <>
        {example.description && <Markdown md={example.description} />}
        <ClientCodeBlock lang="json" code={JSON.stringify(example.sample, null, 2)} />
      </>
    );
  }

  return (
    <Tabs groupId="fumadocs_openapi_responses" items={tabs.map((tab) => tab.code)}>
      {tabs.map((tab) => {
        const { examples = [] } = tab;

        let slot: ReactNode = t('Empty');
        if (examples.length > 1) {
          slot = (
            <Accordions type="single" className="pt-2" defaultValue="0">
              {examples.map((example, i) => (
                <AccordionItem key={i} value={i.toString()}>
                  <AccordionHeader>
                    <AccordionTrigger>{example.label}</AccordionTrigger>
                  </AccordionHeader>
                  <AccordionContent className="prose-no-margin">
                    {renderExampleContent(example)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordions>
          );
        } else if (examples.length === 1) {
          slot = renderExampleContent(examples[0]);
        }

        return (
          <Tab key={tab.code} value={tab.code}>
            {slot}
          </Tab>
        );
      })}
    </Tabs>
  );
}
