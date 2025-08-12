'use client';
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useApiContext, useServerSelectContext } from '@/ui/contexts/api';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import type { CodeSample } from '@/render/operation';
import type { SamplesProps } from '@/render/renderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import {
  joinURL,
  resolveRequestData,
  resolveServerUrl,
  withBase,
} from '@/utils/url';
import type { RawRequestData, RequestData } from '@/requests/_shared';

type UpdateListener = (data: RawRequestData, encoded: RequestData) => void;

const CodeExampleContext = createContext<{
  route: string;
  examples: {
    key: string;
    data: RawRequestData;
    encoded: RequestData;
  }[];

  key: string;
  setKey: (key: string) => void;

  setData: (data: RawRequestData, encoded: RequestData) => void;

  addListener: (listener: UpdateListener) => void;
  removeListener: (listener: UpdateListener) => void;
} | null>(null);

export function CodeExampleProvider({
  route,
  examples,
  initialKey,
  children,
}: {
  route: string;
  examples: {
    key: string;
    data: RawRequestData;
    encoded: RequestData;
  }[];
  initialKey?: string;
  children: ReactNode;
}) {
  const [key, setKey] = useState(initialKey ?? examples[0].key);
  const listeners = useRef<UpdateListener[]>([]);

  const setData = useEffectEvent(
    (data: RawRequestData, encoded: RequestData) => {
      for (const example of examples) {
        if (example.key === key) {
          // persistent changes
          example.data = data;
          example.encoded = encoded;
          break;
        }
      }

      for (const listener of listeners.current) {
        listener(data, encoded);
      }
    },
  );

  const updateKey = useEffectEvent((newKey: string) => {
    const example = examples.find((example) => example.key === newKey);
    if (!example) return;

    setKey(newKey);
    for (const listener of listeners.current) {
      listener(example.data, example.encoded);
    }
  });

  const addListener = useEffectEvent((listener: UpdateListener) => {
    // initial call to listeners to ensure their data is the latest
    // this is necessary to avoid race conditions between `useEffect()`
    const example = examples.find((example) => example.key === key)!;
    listener(example.data, example.encoded);
    listeners.current.push(listener);
  });

  const removeListener = useEffectEvent((listener: UpdateListener) => {
    listeners.current = listeners.current.filter((item) => item !== listener);
  });

  return (
    <CodeExampleContext
      value={useMemo(
        () => ({
          key,
          route,
          setKey: updateKey,
          examples,
          setData,
          removeListener,
          addListener,
        }),
        [addListener, examples, key, removeListener, route, setData, updateKey],
      )}
    >
      {children}
    </CodeExampleContext>
  );
}

export function CodeExample(sample: CodeSample) {
  const { shikiOptions, mediaAdapters } = useApiContext();
  const { examples, key, route, addListener, removeListener } =
    useContext(CodeExampleContext)!;
  const { server } = useServerSelectContext();
  const [data, setData] = useState(() => {
    return examples.find((example) => example.key === key)!.encoded;
  });

  useEffect(() => {
    const listener: UpdateListener = (_, encoded) => setData(encoded);

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

export function CodeExampleSelector({ items }: SamplesProps) {
  const { key, setKey } = useContext(CodeExampleContext)!;
  const item = items.find((item) => item.value === key);

  return (
    <Select value={key} onValueChange={setKey}>
      <SelectTrigger className="not-prose mb-2">
        <SelectValue asChild>
          {item ? <SelectDisplay item={item} /> : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            <SelectDisplay item={item} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SelectDisplay({
  item,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  item: SamplesProps['items'][number];
}) {
  return (
    <div {...props}>
      <span className="font-medium text-sm">{item.title}</span>
      <span className="text-fd-muted-foreground">{item.description}</span>
    </div>
  );
}

export function useRequestInitialData() {
  const { examples, key } = useContext(CodeExampleContext)!;

  return useMemo(
    () => examples.find((example) => example.key === key)!.data,
    [examples, key],
  );
}

export function useRequestDataUpdater() {
  const { setData } = useContext(CodeExampleContext)!;
  return { setData };
}
