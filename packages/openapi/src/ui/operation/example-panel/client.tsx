'use client';
import { useApiContext, useServerSelectContext } from '@/ui/contexts/api';
import {
  useOperationContext,
  type ExampleUpdateListener,
} from '@/ui/contexts/operation';
import {
  joinURL,
  withBase,
  resolveServerUrl,
  resolveRequestData,
} from '@/utils/url';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/ui/components/select';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { useState, useEffect, useMemo } from 'react';
import type { APIExampleItem, CodeUsageGenerator } from '.';

export function APIExampleSelector() {
  const { example: key, setExample: setKey, examples } = useOperationContext();
  const { APIExampleSelector: Override } =
    useApiContext().client.operation ?? {};

  if (Override) {
    return <Override items={examples} value={key} onValueChange={setKey} />;
  }

  function renderItem(item: APIExampleItem) {
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

export function APIExampleUsageTab(sample: CodeUsageGenerator) {
  const { shikiOptions, mediaAdapters } = useApiContext();
  const {
    examples,
    example: selectedExampleId,
    route,
    addListener,
    removeListener,
  } = useOperationContext();
  const { server } = useServerSelectContext();
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
    if (!sample.source || !data) return;
    if (typeof sample.source === 'string') return sample.source;

    return sample.source(
      joinURL(
        withBase(
          server ? resolveServerUrl(server.url, server.variables) : '/',
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://loading',
        ),
        resolveRequestData(route, data),
      ),
      data,
      {
        server: sample.serverContext,
        mediaAdapters,
      },
    );
  }, [mediaAdapters, sample, server, route, data]);

  if (!code || !sample) return null;

  return (
    <DynamicCodeBlock lang={sample.lang} code={code} options={shikiOptions} />
  );
}
