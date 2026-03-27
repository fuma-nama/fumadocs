import type { MethodInformation, RenderContext, ResponseObject } from '@/types';
import { getPreferredType, type NoReference } from '@/utils/schema';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { sample } from 'openapi-sampler';
import { useMemo, type ReactNode } from 'react';
import { I18nLabel } from '@/ui/client/i18n';

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

export function ResponseTabs({
  operation,
  ctx,
}: {
  operation: NoReference<MethodInformation>;
  ctx: RenderContext;
}) {
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

  return renderResponseTabs(tabs, ctx);
}

function renderResponseTabsDefault(tabs: ResponseTab[], ctx: RenderContext): ReactNode {
  function renderExampleContent(example: ResponseExample) {
    return (
      <>
        {example.description && ctx.renderMarkdown(example.description)}
        {ctx.renderCodeBlock('json', JSON.stringify(example.sample, null, 2))}
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
