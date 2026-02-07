'use client';
import { useApiContext, useServerSelectContext } from '@/ui/contexts/api';
import { joinURL, withBase, resolveServerUrl, resolveRequestData } from '@/utils/url';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/ui/components/select';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock.core';
import { useState, useEffect, useMemo, createContext, ReactNode, useRef, use } from 'react';
import type { CodeUsageGenerator } from '.';
import type { ExampleRequestItem } from '../request-tabs';
import type { RawRequestData, RequestData } from '@/requests/types';

export type ExampleUpdateListener = (data: RawRequestData, encoded: RequestData) => void;

const Context = createContext<{
  route: string;
  examples: ExampleRequestItem[];
  example: string | undefined;
  setExample: (id: string) => void;
  setExampleData: (data: RawRequestData, encoded: RequestData) => void;

  addListener: (listener: ExampleUpdateListener) => void;
  removeListener: (listener: ExampleUpdateListener) => void;
} | null>(null);

export function UsageTabsProvider({
  route,
  examples,
  defaultExampleId,
  children,
}: {
  route: string;
  examples: ExampleRequestItem[];
  defaultExampleId?: string;
  children: ReactNode;
}) {
  const [example, setExample] = useState(() => defaultExampleId ?? examples.at(0)?.id);
  const listeners = useRef<ExampleUpdateListener[]>([]);

  return (
    <Context
      value={useMemo(
        () => ({
          example,
          route,
          setExample: (newKey: string) => {
            const example = examples.find((example) => example.id === newKey);
            if (!example) return;

            setExample(newKey);
            for (const listener of listeners.current) {
              listener(example.data, example.encoded);
            }
          },
          examples,
          setExampleData(data, encoded) {
            for (const item of examples) {
              if (item.id === example) {
                // persistent changes
                item.data = data;
                item.encoded = encoded;
                break;
              }
            }

            for (const listener of listeners.current) {
              listener(data, encoded);
            }
          },
          removeListener(listener) {
            listeners.current = listeners.current.filter((item) => item !== listener);
          },
          addListener(listener) {
            // initial call to listeners to ensure their data is the latest
            // this is necessary to avoid race conditions between `useEffect()`
            const active = examples.find((item) => item.id === example)!;

            listener(active.data, active.encoded);
            listeners.current.push(listener);
          },
        }),
        [example, route, examples],
      )}
    >
      {children}
    </Context>
  );
}

export function useExampleRequests() {
  return use(Context)!;
}

export function UsageTabsSelector() {
  const { example: key, setExample: setKey, examples } = useExampleRequests();
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

export function UsageTab(sample: CodeUsageGenerator) {
  const { shikiOptions, mediaAdapters } = useApiContext();
  const {
    examples,
    example: selectedExampleId,
    route,
    addListener,
    removeListener,
  } = useExampleRequests();
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
          typeof window !== 'undefined' ? window.location.origin : 'https://loading',
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

  return <DynamicCodeBlock lang={sample.lang} code={code} options={shikiOptions} />;
}
