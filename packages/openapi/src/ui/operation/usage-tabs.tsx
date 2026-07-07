'use client';
import type { HttpMethods, OperationObject, PathItemObject } from '@/types';
import {
  createCodeUsageGeneratorRegistry,
  type InlineCodeUsageGenerator,
  pathnameFromRequest,
} from '@/requests/generators';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import { ResponseTabs } from './response-tabs';
import { NoReference } from '@fumadocs/api-docs/schema';
import { useRenderContext, useServerContext } from '@/ui/contexts/api';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@fumadocs/api-docs/components/select';
import { useState, useEffect, useMemo } from 'react';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { type ExampleUpdateListener, useOperationContext } from './context';
import type { ExampleRequestItem } from '@/utils/get-example-requests';
import { joinURL, resolveServerUrl } from '@fumadocs/api-docs/utils/url';

export function UsageTabs({
  method,
  operation,
  pathItem,
}: {
  method: HttpMethods;
  operation: NoReference<OperationObject>;
  pathItem: NoReference<PathItemObject>;
}) {
  const ctx = useRenderContext();
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
            <UsageTab id={id} lang={item.lang} />
          </CodeBlockTab>
        ))}
      </CodeBlockTabs>
    );
  };

  const registry = useMemo(() => {
    const registry = createCodeUsageGeneratorRegistry(ctx.codeUsages);

    if (ctx.generateCodeSamples) {
      for (const gen of ctx.generateCodeSamples({ operation, method, pathItem })) {
        registry.addInline(gen);
      }
    }

    if (operation['x-codeSamples']) {
      for (const sample of operation['x-codeSamples']) {
        registry.addInline(sample as InlineCodeUsageGenerator);
      }
    }

    return registry;
  }, [ctx, operation, method, pathItem]);

  return renderAPIExampleLayout(
    {
      selector: operation['x-exclusiveCodeSample'] ? null : <UsageTabsSelector />,
      usageTabs: renderAPIExampleUsageTabs(registry, ctx),
      responseTabs: <ResponseTabs operation={operation} method={method} pathItem={pathItem} />,
    },
    ctx,
  );
}

function UsageTabsSelector() {
  const { example: key, setExample: setKey, examples } = useOperationContext();
  const { APIExampleSelector: Override } = useRenderContext().operation ?? {};

  if (Override) {
    return <Override items={examples} value={key} onValueChange={setKey} />;
  }

  function renderItem(item: ExampleRequestItem) {
    return (
      <div>
        <p className="font-medium text-sm">{item.name}</p>
        <p className="text-fd-muted-foreground">{item.description}</p>
      </div>
    );
  }

  if (examples.length === 1) return null;
  const items = examples.map((item) => ({ value: item.id, label: renderItem(item) }));
  return (
    <Select items={items} value={key} onValueChange={(v) => v !== null && setKey(v)}>
      <SelectTrigger className="not-prose mb-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UsageTab({ id, lang }: { id: string; lang: string }) {
  const { mediaAdapters, codeUsages } = useRenderContext();
  const {
    examples,
    example: selectedExampleId,
    route,
    addListener,
    removeListener,
  } = useOperationContext();
  const { server } = useServerContext();
  const codegen = codeUsages.get(id);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(
    () => examples.find((example) => example.id === selectedExampleId)?.encoded,
  );

  useEffect(() => {
    const listener: ExampleUpdateListener = (_, encoded) => setData(encoded);

    addListener(listener);
    setMounted(true);
    return () => {
      removeListener(listener);
    };
  }, [addListener, removeListener]);

  const code = useMemo(() => {
    if (!data) return;
    const url = joinURL(
      server && mounted
        ? new URL(resolveServerUrl(server.url, server.variables), window.location.origin).href
        : 'https://example.com',
      pathnameFromRequest(route, data),
    );

    if (!codegen) return;
    return codegen.generate(
      { ...data, url },
      {
        mediaAdapters,
        custom: null,
      },
    );
  }, [data, server, route, mounted, codegen, mediaAdapters]);

  if (!code) return null;

  return <ClientCodeBlock lang={lang} code={code} />;
}
