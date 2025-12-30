import type { MethodInformation, RenderContext } from '@/types';
import type { SampleGenerator } from '@/requests/types';
import { defaultSamples } from '@/requests/generators';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { UsageTabsSelectorLazy, UsageTabLazy } from './lazy';
import { ResponseTabs } from '../response-tabs';

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

export async function UsageTabs({
  method,
  ctx,
}: {
  method: MethodInformation;
  ctx: RenderContext;
}) {
  let { renderAPIExampleUsageTabs, renderAPIExampleLayout } = ctx.content ?? {};

  renderAPIExampleLayout ??= (slots) => {
    return (
      <div className="prose-no-margin">
        {slots.selector}
        {slots.usageTabs}
        {slots.responseTabs}
      </div>
    );
  };

  renderAPIExampleUsageTabs ??= (generators) => {
    if (generators.length === 0) return null;

    return (
      <CodeBlockTabs groupId="fumadocs_openapi_requests" defaultValue={generators[0].id}>
        <CodeBlockTabsList>
          {generators.map((item) => (
            <CodeBlockTabsTrigger key={item.id} value={item.id}>
              {item.label ?? item.lang}
            </CodeBlockTabsTrigger>
          ))}
        </CodeBlockTabsList>
        {generators.map((item) => (
          <CodeBlockTab key={item.id} value={item.id}>
            <UsageTabLazy {...item} />
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
      selector: method['x-exclusiveCodeSample'] ? null : <UsageTabsSelectorLazy />,
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
