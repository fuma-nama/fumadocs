'use client';
import {
  createContext,
  type ReactNode,
  use,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { APIExampleItem } from '@/ui/operation/example-panel';
import type { RawRequestData, RequestData } from '@/requests/types';

export type ExampleUpdateListener = (
  data: RawRequestData,
  encoded: RequestData,
) => void;

const OperationContext = createContext<{
  route: string;
  examples: APIExampleItem[];
  example: string | undefined;
  setExample: (id: string) => void;
  setExampleData: (data: RawRequestData, encoded: RequestData) => void;

  addListener: (listener: ExampleUpdateListener) => void;
  removeListener: (listener: ExampleUpdateListener) => void;
} | null>(null);

export function OperationProvider({
  route,
  examples,
  defaultExampleId,
  children,
}: {
  route: string;
  examples: APIExampleItem[];
  defaultExampleId?: string;
  children: ReactNode;
}) {
  const [example, setExample] = useState(
    () => defaultExampleId ?? examples.at(0)?.id,
  );
  const listeners = useRef<ExampleUpdateListener[]>([]);

  return (
    <OperationContext
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
          setExampleData: (data, encoded) => {
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
          removeListener: (listener) => {
            listeners.current = listeners.current.filter(
              (item) => item !== listener,
            );
          },
          addListener: (listener) => {
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
    </OperationContext>
  );
}

export function useOperationContext() {
  return use(OperationContext)!;
}
