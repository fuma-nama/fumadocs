'use client';

import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import { Check, Copy } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import {
  type ExampleUpdateListener,
  useOperationContext,
} from '../contexts/operation';
import type { CodeUsageGenerator, APIExampleItem } from './api-example';
import { useApiContext, useServerSelectContext } from '../contexts/api';
import {
  joinURL,
  withBase,
  resolveServerUrl,
  resolveRequestData,
} from '@/utils/url';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

export interface OperationClientOptions {
  APIExampleSelector?: FC<{
    items: APIExampleItem[];

    value: string;
    onValueChange: (id: string) => void;
  }>;
}

export function CopyResponseTypeScript({ code }: { code: string }) {
  const [isChecked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(code);
  });

  return (
    <div className="flex items-start justify-between gap-2 bg-fd-card text-fd-card-foreground border rounded-xl p-3 not-prose mb-4 last:mb-0">
      <div>
        <p className="font-medium text-sm mb-2">TypeScript Definitions</p>
        <p className="text-xs text-fd-muted-foreground">
          Use the response body type in TypeScript.
        </p>
      </div>
      <button
        onClick={onCopy}
        className={cn(
          buttonVariants({
            color: 'secondary',
            className: 'p-2 gap-2',
            size: 'sm',
          }),
        )}
      >
        {isChecked ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
        Copy
      </button>
    </div>
  );
}

const Context = createContext<{
  type: string | null;
  setType: (type: string) => void;
} | null>(null);

export function SelectTabs({
  defaultValue,
  children,
}: {
  defaultValue?: string;
  children: ReactNode;
}) {
  const [type, setType] = useState<string | null>(defaultValue ?? null);

  return (
    <Context value={useMemo(() => ({ type, setType }), [type])}>
      {children}
    </Context>
  );
}

export function SelectTab({
  value,
  ...props
}: ComponentProps<'div'> & {
  value: string;
}) {
  const ctx = useContext(Context);
  if (value !== ctx?.type) return;

  return <div {...props}>{props.children}</div>;
}

export function SelectTabTrigger({
  items,
  ...props
}: ComponentProps<typeof SelectTrigger> & { items: string[] }) {
  const { type, setType } = useContext(Context)!;

  return (
    <Select value={type ?? ''} onValueChange={setType}>
      <SelectTrigger
        {...props}
        className={cn('not-prose w-fit', props.className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
    example: key,
    route,
    addListener,
    removeListener,
  } = useOperationContext();
  const { server } = useServerSelectContext();
  const [data, setData] = useState(
    () => examples.find((example) => example.id === key)!.encoded,
  );

  useEffect(() => {
    const listener: ExampleUpdateListener = (_, encoded) => setData(encoded);

    addListener(listener);
    return () => {
      removeListener(listener);
    };
  }, [addListener, removeListener]);

  const code = useMemo(() => {
    if (!sample.source) return;
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
