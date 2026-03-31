import type { MethodInformation, RenderContext } from '@/types';
import {
  type CodeUsageGeneratorRegistry,
  createCodeUsageGeneratorRegistry,
} from '@/requests/generators';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { ResponseTabs } from '../response-tabs';
import { registerDefault } from '@/requests/generators/all';
import { useMemo } from 'react';

export function UsageTabs({ method, ctx }: { method: MethodInformation; ctx: RenderContext }) {
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

  renderAPIExampleUsageTabs ??= (registry) => {
    const map = Array.from(registry.map().entries());
    if (map.length === 0) return null;

    return (
      <CodeBlockTabs groupId="fumadocs_openapi_requests" defaultValue={map[0][0]}>
        <CodeBlockTabsList>
          {map.map(([id, item]) => (
            <CodeBlockTabsTrigger key={id} value={id}>
              {item.label ?? item.lang}
            </CodeBlockTabsTrigger>
          ))}
        </CodeBlockTabsList>
        {map.map(([id, item]) => (
          <CodeBlockTab key={id} value={id}>
            <ctx.clientBoundary.UsageTab id={id} lang={item.lang} _client={item._client} />
          </CodeBlockTab>
        ))}
      </CodeBlockTabs>
    );
  };

  const registry = useMemo(() => {
    let registry: CodeUsageGeneratorRegistry;

    if (ctx.codeUsages) {
      registry = createCodeUsageGeneratorRegistry(ctx.codeUsages);
    } else {
      registry = createCodeUsageGeneratorRegistry();
      registerDefault(registry);
    }

    for (const gen of ctx.generateCodeSamples?.(method) ?? []) {
      registry.addInline(gen);
    }

    if (method['x-codeSamples']) {
      for (const sample of method['x-codeSamples']) {
        registry.addInline(sample);
      }
    }

    return registry;
  }, [ctx, method]);

  return renderAPIExampleLayout(
    {
      selector: method['x-exclusiveCodeSample'] ? null : <ctx.clientBoundary.UsageTabsSelector />,
      usageTabs: renderAPIExampleUsageTabs(registry, ctx),
      responseTabs: <ResponseTabs operation={method} ctx={ctx} />,
    },
    ctx,
  );
}
