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
import type { ReactNode } from 'react';

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

  label: string;

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
  if (!operation.responses) return null;
  const tabs: ResponseTab[] = [];

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
        const title = sample?.summary || `Example ${key}`;

        tab.examples.push({
          label: title,
          sample: sample.value,
          description: sample?.description,
        });
      }
    } else if (responseOfType?.example || responseOfType?.schema) {
      tab.examples ??= [];
      tab.examples.push({
        label: 'Example',
        sample: responseOfType.example ?? sample(responseOfType.schema as object),
      });
    }

    tabs.push(tab);
  }
  const { renderResponseTabs = renderResponseTabsDefault } = ctx.content ?? {};

  return renderResponseTabs(tabs, ctx);
}

function renderResponseTabsDefault(
  tabs: ResponseTab[],
  ctx: RenderContext,
): ReactNode | Promise<ReactNode> {
  function renderExampleContent(example: ResponseExample) {
    return (
      <>
        {example.description && ctx.renderMarkdown(example.description)}
        {ctx.renderCodeBlock('json', JSON.stringify(example.sample, null, 2))}
      </>
    );
  }

  async function renderResponse(tab: ResponseTab) {
    const { examples = [] } = tab;

    let slot: ReactNode = 'Empty';
    if (examples.length > 1) {
      slot = (
        <Accordions type="single" className="pt-2" defaultValue={examples[0].label}>
          {examples.map((example, i) => (
            <AccordionItem key={i} value={example.label}>
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

    return <Tab value={tab.code}>{slot}</Tab>;
  }

  if (tabs.length === 0) return null;

  return (
    <Tabs groupId="fumadocs_openapi_responses" items={tabs.map((tab) => tab.code)}>
      {tabs.map(renderResponse)}
    </Tabs>
  );
}
