import type { MethodInformation, RenderContext, ResponseObject } from '@/types';
import type { ReactNode } from 'react';
import { getPreferredType, type NoReference } from '@/utils/schema';
import { getRequestData } from '@/ui/operation/get-request-data';
import { sample } from 'openapi-sampler';
import type {
  RawRequestData,
  RequestData,
  SampleGenerator,
} from '@/requests/types';
import { defaultSamples } from '@/requests/generators';
import { encodeRequestData } from '@/requests/media/encode';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from '@/ui/components/accordion';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { APIExampleSelectorLazy, APIExampleUsageTabLazy } from './lazy';

/**
 * Generate code example for given programming language
 */
export interface CodeUsageGenerator<T = unknown> {
  id: string;
  lang: string;
  label?: string;
  /**
   * either:
   * - code
   * - a function imported from a file with "use client" directive
   * - false (disabled)
   */
  source?: string | SampleGenerator<T> | false;

  /**
   * Pass extra context to client-side source generator
   */
  serverContext?: T;
}

export interface APIExampleItem {
  id: string;
  name: string;
  description?: string;
  data: RawRequestData;
  encoded: RequestData;
}

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

  examples?: {
    /**
     * generated/defined example data
     */
    sample: unknown;

    label: string;

    /**
     * description (in Markdown)
     */
    description?: string;
  }[];
}

export function getAPIExamples(
  path: string,
  method: MethodInformation,
  ctx: RenderContext,
): APIExampleItem[] {
  const media = method.requestBody
    ? getPreferredType(method.requestBody.content)
    : null;
  const bodyOfType = media ? method.requestBody?.content[media] : null;

  if (bodyOfType?.examples) {
    const result: APIExampleItem[] = [];

    for (const [key, value] of Object.entries(bodyOfType.examples)) {
      const data = getRequestData(path, method, key, ctx);

      result.push({
        id: key,
        name: value.summary ?? key,
        description: value.description,
        data,
        encoded: encodeRequestData(
          data,
          ctx.mediaAdapters,
          method.parameters ?? [],
        ),
      });
    }

    if (result.length > 0) return result;
  }

  const data = getRequestData(path, method, null, ctx);
  return [
    {
      id: '_default',
      name: 'Default',
      description: bodyOfType?.schema?.description,
      data,
      encoded: encodeRequestData(
        data,
        ctx.mediaAdapters,
        method.parameters ?? [],
      ),
    },
  ];
}

export async function APIExample({
  method,
  ctx,
}: {
  method: MethodInformation;
  ctx: RenderContext;
}) {
  let { renderAPIExampleUsageTabs, renderAPIExampleLayout } = ctx.content ?? {};

  renderAPIExampleLayout ??= (slots) => {
    return (
      <div className="prose-no-margin md:sticky md:top-(--fd-api-info-top) xl:w-[400px]">
        {slots.selector}
        {slots.usageTabs}
        {slots.responseTabs}
      </div>
    );
  };

  renderAPIExampleUsageTabs ??= (generators) => {
    if (generators.length === 0) return null;

    return (
      <CodeBlockTabs
        groupId="fumadocs_openapi_requests"
        defaultValue={generators[0].id}
      >
        <CodeBlockTabsList>
          {generators.map((item) => (
            <CodeBlockTabsTrigger key={item.id} value={item.id}>
              {item.label ?? item.lang}
            </CodeBlockTabsTrigger>
          ))}
        </CodeBlockTabsList>
        {generators.map((item) => (
          <CodeBlockTab key={item.id} value={item.id}>
            <APIExampleUsageTabLazy {...item} />
          </CodeBlockTab>
        ))}
      </CodeBlockTabs>
    );
  };

  let generators: CodeUsageGenerator[] = [...defaultSamples];
  if (ctx.generateCodeSamples) {
    generators.push(...(await ctx.generateCodeSamples(method)));
  }

  if (method['x-codeSamples']) {
    for (const sample of method['x-codeSamples']) {
      generators.push(
        'id' in sample && typeof sample.id === 'string'
          ? (sample as CodeUsageGenerator)
          : {
              id: sample.lang,
              ...sample,
            },
      );
    }
  }

  generators = dedupe(generators);

  return renderAPIExampleLayout(
    {
      selector: method['x-exclusiveCodeSample'] ? null : (
        <APIExampleSelectorLazy />
      ),
      usageTabs: await renderAPIExampleUsageTabs(generators, ctx),
      responseTabs: <ResponseTabs operation={method} ctx={ctx} />,
    },
    ctx,
  );
}

/**
 * Remove duplicated ids
 */
function dedupe(samples: CodeUsageGenerator[]): CodeUsageGenerator[] {
  const set = new Set<string>();
  const out: CodeUsageGenerator[] = [];

  for (let i = samples.length - 1; i >= 0; i--) {
    const item = samples[i];
    if (set.has(item.id)) continue;
    set.add(item.id);
    if (item.source !== false) out.unshift(item);
  }

  return out;
}

function ResponseTabs({
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
        const title = sample?.summary ?? `Example ${key}`;

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
        sample:
          responseOfType.example ?? sample(responseOfType.schema as object),
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
  async function renderResponse(tab: ResponseTab) {
    const { examples = [] } = tab;

    let slot: ReactNode = 'Empty';
    if (examples.length > 1) {
      slot = (
        <Accordions
          type="single"
          className="pt-2"
          defaultValue={examples[0].label}
        >
          {examples.map((example, i) => (
            <AccordionItem key={i} value={example.label}>
              <AccordionHeader>
                <AccordionTrigger>{example.label}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent className="prose-no-margin">
                {example.description && ctx.renderMarkdown(example.description)}
                {ctx.renderCodeBlock(
                  'json',
                  JSON.stringify(example.sample, null, 2),
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordions>
      );
    } else if (examples.length === 1) {
      const example = examples[0];

      slot = (
        <>
          {example.description && ctx.renderMarkdown(example.description)}
          {ctx.renderCodeBlock('json', JSON.stringify(example.sample, null, 2))}
        </>
      );
    }

    return <Tab value={tab.code}>{slot}</Tab>;
  }

  if (tabs.length === 0) return null;

  return (
    <Tabs
      groupId="fumadocs_openapi_responses"
      items={tabs.map((tab) => tab.code)}
    >
      {tabs.map(renderResponse)}
    </Tabs>
  );
}
