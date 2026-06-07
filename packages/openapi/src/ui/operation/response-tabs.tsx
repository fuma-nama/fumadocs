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
import { useMemo, type ReactNode } from 'react';
import { I18nLabel } from '@/ui/client/i18n';
import { Markdown } from '../components/markdown';
import { ClientCodeBlock } from '../components/codeblock';
import type { NoReference } from '@fumadocs/api-docs/schema';
import { useRenderContext } from '../contexts/api';

export interface ResponseTab {
  /**
   * HTTP response code
   */
  code: string;

  response: NoReference<ResponseObject>;
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
  operation: NoReference<OperationObject>;
  method: HttpMethods;
  pathItem: NoReference<PathItemObject>;
}) {
  const ctx = useRenderContext();
  const tabs = useMemo(() => {
    const tabs: ResponseTab[] = [];
    if (!operation.responses) return tabs;

    for (const [code, response] of Object.entries(operation.responses)) {
      const media = response.content ? getPreferredType(response.content) : null;
      const responseOfType = media ? response.content?.[media] : null;

      const tab: ResponseTab = {
        code,
        response,
        mediaType: media as string | null,
      };

      if (responseOfType?.examples) {
        tab.examples ??= [];

        for (const [key, sample] of Object.entries(responseOfType.examples)) {
          tab.examples.push({
            label: sample?.summary ?? <I18nLabel label="responseTabName" replacements={{ key }} />,
            sample: sample.value,
            description: sample?.description,
          });
        }
      } else if (responseOfType?.example || responseOfType?.schema) {
        tab.examples ??= [];
        tab.examples.push({
          label: <I18nLabel label="responseTabNameDefault" />,
          sample: responseOfType.example ?? sample(responseOfType.schema as object),
        });
      }

      tabs.push(tab);
    }

    return tabs;
  }, [operation.responses]);

  if (tabs.length === 0) return null;

  const { renderResponseTabs = renderResponseTabsDefault } = ctx.content ?? {};

  return renderResponseTabs({ tabs }, ctx);
}

function renderResponseTabsDefault({ tabs }: ResponseTabsRenderOptions): ReactNode {
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

        let slot: ReactNode = <I18nLabel label="empty" />;
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
