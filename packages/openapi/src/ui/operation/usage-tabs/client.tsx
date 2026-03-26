'use client';
import { useApiContext, useServerContext } from '@/ui/contexts/api';
import { joinURL, withBase, resolveServerUrl, resolveRequestData } from '@/utils/url';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/ui/components/select';
import { useState, useEffect, useMemo } from 'react';
import type { CodeUsageGenerator } from '@/requests/generators';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { type ExampleUpdateListener, useOperationContext } from '../client';
import type { ExampleRequestItem } from '../get-example-requests';

export function UsageTabsSelector() {
  const { example: key, setExample: setKey, examples } = useOperationContext();
  const { APIExampleSelector: Override } = useApiContext().client.operation ?? {};

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

export function UsageTab({
  id,
  lang,
  _client,
}: Pick<CodeUsageGenerator, 'lang' | '_client'> & { id: string }) {
  const { mediaAdapters, codeUsages } = useApiContext();
  const {
    examples,
    example: selectedExampleId,
    route,
    addListener,
    removeListener,
  } = useOperationContext();
  const { server } = useServerContext();
  const codegen = codeUsages.get(id);
  const [data, setData] = useState(
    () => examples.find((example) => example.id === selectedExampleId)?.encoded,
  );

  useEffect(() => {
    const listener: ExampleUpdateListener = (_, encoded) => setData(encoded);

    addListener(listener);
    return () => {
      removeListener(listener);
    };
  }, [addListener, removeListener]);

  const code = useMemo(() => {
    if (!data) return;
    const url = joinURL(
      withBase(
        server ? resolveServerUrl(server.url, server.variables) : '/',
        typeof window !== 'undefined' ? window.location.origin : 'https://loading',
      ),
      resolveRequestData(route, data),
    );

    if (_client) {
      const { generate, serverContext } = _client;
      if (typeof generate === 'string') return generate;
      return generate(url, data, {
        mediaAdapters,
        server: serverContext,
      });
    }

    if (!codegen) return;
    return codegen.generate(url, data, {
      mediaAdapters,
      server: null,
    });
  }, [data, server, route, _client, codegen, mediaAdapters]);

  if (!code) return null;

  return <ClientCodeBlock lang={lang} code={code} />;
}
