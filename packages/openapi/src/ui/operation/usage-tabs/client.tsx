'use client';
import { useRenderContext, useServerContext } from '@/ui/contexts/api';
import { pathnameFromRequest } from '@/requests/generators';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@fumadocs/api-docs/components/select';
import { useState, useEffect, useMemo } from 'react';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { type ExampleUpdateListener, useOperationContext } from '../client';
import type { ExampleRequestItem } from '../get-example-requests';
import { joinURL, resolveServerUrl } from '@fumadocs/api-docs/utils/url';

export function UsageTabsSelector() {
  const { example: key, setExample: setKey, examples } = useOperationContext();
  const { APIExampleSelector: Override } = useRenderContext().operation ?? {};

  if (Override) {
    return <Override items={examples} value={key} onValueChange={setKey} />;
  }

  function renderItem(item: ExampleRequestItem) {
    return (
      <div>
        <span className="font-medium text-sm">{item.name}</span>
        <span className="text-fd-muted-foreground">{item.description}</span>
      </div>
    );
  }

  if (examples.length === 1) return null;
  const selected = examples.find((item) => item.id === key);
  return (
    <Select value={key} onValueChange={setKey}>
      <SelectTrigger className="not-prose mb-2">
        {selected && <SelectValue asChild>{renderItem(selected)}</SelectValue>}
      </SelectTrigger>
      <SelectContent>
        {examples.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {renderItem(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UsageTab({ id, lang }: { id: string; lang: string }) {
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
