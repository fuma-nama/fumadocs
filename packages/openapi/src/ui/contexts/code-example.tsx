'use client';
import {
  createContext,
  type HTMLAttributes,
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
import { getUrl } from '@/utils/server-url';
import type { RequestData } from '@/requests/_shared';
import { defaultSamples } from '@/requests';

type UpdateListener = (data: RequestData) => void;

const CodeExampleContext = createContext<{
  route: string;
  examples: {
    key: string;
    data: RequestData;
  }[];

  key: string;
  setKey: (key: string) => void;

  setData: (data: RequestData) => void;

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
    data: RequestData;
  }[];
  initialKey?: string;
  children: React.ReactNode;
}) {
  const [key, setKey] = useState(initialKey ?? examples[0].key);
  const listeners = useRef<UpdateListener[]>([]);

  const setData = useEffectEvent((newData: RequestData) => {
    for (const example of examples) {
      if (example.key === key) {
        // persistent changes
        example.data = newData;
      }
    }

    for (const listener of listeners.current) {
      listener(newData);
    }
  });

  const updateKey = useEffectEvent((newKey: string) => {
    const data = examples.find((example) => example.key === newKey)?.data;
    if (!data) return;

    setKey(newKey);
    for (const listener of listeners.current) {
      listener(data);
    }
  });

  const addListener = useEffectEvent((listener: UpdateListener) => {
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

export function CodeExample(props: CodeSample) {
  const { shikiOptions } = useApiContext();
  const { examples, key, route, addListener, removeListener } =
    useContext(CodeExampleContext)!;
  const { server } = useServerSelectContext();
  const [data, setData] = useState(() => {
    return examples.find((example) => example.key === key)!.data;
  });

  const sample = useMemo(() => {
    if (props.source) return props;
    return defaultSamples.find((item) => item.label === props.label);
  }, [props]);

  useEffect(() => {
    const listener = setData;

    addListener(listener);
    return () => {
      removeListener(listener);
    };
  }, [addListener, removeListener]);

  const code = useMemo(() => {
    if (!sample?.source) return;
    if (typeof sample.source === 'string') return sample.source;

    return sample.source(
      `${server ? getUrl(server.url, server.variables) : '/'}${route}`,
      data,
    );
  }, [sample, server, route, data]);

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

export function useRequestData() {
  const { examples, key, setData } = useContext(CodeExampleContext)!;

  const data = useMemo(
    () => examples.find((example) => example.key === key)!.data,
    [examples, key],
  );
  const saveData = useEffectEvent((data: RequestData) => {
    setData(data);
  });

  return useMemo(
    () => ({
      /**
       * initial request data
       */
      data,
      /**
       * Save changes to request data, it won't trigger re-render on the component itself, which makes it safe to call in an effect with `data` as dep
       */
      saveData,
    }),
    [data, saveData],
  );
}
