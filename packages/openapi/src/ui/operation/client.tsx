'use client';

import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/utils/cn';
import { Check, Copy } from 'lucide-react';
import { createContext, type ReactNode, use, useMemo, useRef, useState } from 'react';
import { useTranslations } from '@/ui/client/i18n';
import type { ExampleRequestItem } from './get-example-requests';
import type { RawRequestData, RequestData } from '@/requests/types';

export type ExampleUpdateListener = (data: RawRequestData, encoded: RequestData) => void;

const OperationContext = createContext<{
  route: string;
  examples: ExampleRequestItem[];
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
  examples: ExampleRequestItem[];
  defaultExampleId?: string;
  children: ReactNode;
}) {
  const [example, setExample] = useState(() => defaultExampleId ?? examples.at(0)?.id);
  const listeners = useRef<ExampleUpdateListener[]>([]);

  return (
    <OperationContext
      value={useMemo(
        () => ({
          example,
          route,
          setExample(newKey: string) {
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
    </OperationContext>
  );
}

export function useOperationContext() {
  return use(OperationContext)!;
}

export function CopyTypeScriptPanel({
  name,
  code,
  className,
}: {
  code: string;
  name: 'response body' | 'request body';
  className?: string;
}) {
  const [isChecked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(code);
  });
  const t = useTranslations();
  const useTypeText = t.useTypeInTypeScript.replace('{name}', name);

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 bg-fd-card text-fd-card-foreground border rounded-xl p-3 not-prose mb-4 last:mb-0',
        className,
      )}
    >
      <div>
        <p className="font-medium text-sm mb-2">{t.typeScriptDefinitions}</p>
        <p className="text-xs text-fd-muted-foreground">{useTypeText}</p>
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
        {isChecked ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {t.copy}
      </button>
    </div>
  );
}
