'use client';
import type { HttpMethods, OperationObject, PathItemObject, ResponseObject } from '@/types';
import { getPreferredType } from '@/utils/schema';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@fumadocs/api-docs/components/accordion';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { sample } from '@fumadocs/api-docs/schema/sample';
import { getRaw } from '@scalar/json-magic/magic-proxy';
import { useMemo, type ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { Markdown } from '../components/markdown';
import { ClientCodeBlock } from '../components/codeblock';
import { useRenderContext } from '../contexts/api';

export interface ResponseTab {
  /**
   * HTTP response code
   */
  code: string;

  response: ResponseObject;
  /**
   * media type of response
   */
  mediaType: string | null;

  examples?: ResponseExample[];
}

interface ResponseExample {
  /**
   * generated/defined example data
   */
  sample: unknown;

  label: ReactNode;

  /**
   * description (in Markdown)
   */
  description?: string;
}

export interface ResponseTabsRenderOptions {
  tabs: ResponseTab[];
}

export function ResponseTabs({
  operation,
}: {
  operation: OperationObject;
  method: HttpMethods;
  pathItem: PathItemObject;
}) {
  const ctx = useRenderContext();
  const { resolve } = ctx.schema;
  const t = useTranslations({ note: 'operation page' });
  const tabs = useMemo(() => {
    const tabs: ResponseTab[] = [];
    if (!operation.responses) return tabs;

    for (const [code, item] of Object.entries(operation.responses)) {
      const response = resolve(item);
      const media = response.content ? getPreferredType(response.content) : null;
      const responseOfType = media ? resolve(response.content?.[media]) : null;

      const tab: ResponseTab = {
        code,
        response,
        mediaType: media as string | null,
      };

      if (responseOfType?.examples) {
        tab.examples ??= [];

        for (const [key, item] of Object.entries(responseOfType.examples)) {
          const example = resolve(item);

          tab.examples.push({
            label:
              example?.summary ??
              t('Example {key}', {
                variables: { key },
              }),
            sample: getRaw(example.value),
            description: example?.description,
          });
        }
      } else if (responseOfType?.example || responseOfType?.schema) {
        tab.examples ??= [];
        tab.examples.push({
          label: t('Example'),
          sample: getRaw(responseOfType.example) ?? sample(responseOfType.schema as object),
        });
      }

      tabs.push(tab);
    }

    return tabs;
  }, [operation.responses, resolve, t]);

  if (tabs.length === 0) return null;

  const { renderResponseTabs = renderResponseTabsDefault } = ctx.content ?? {};

  return renderResponseTabs({ tabs }, ctx);
}

function renderResponseTabsDefault({ tabs }: ResponseTabsRenderOptions): ReactNode {
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
