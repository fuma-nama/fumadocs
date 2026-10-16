'use client';
import { useState } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { cardCodeBlock, exampleCardClassName, ExampleSelect } from 'shared-api/components/example';
import type { OperationMessage } from '@/operation';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { cn } from '@/utils/cn';

type Part = 'payload' | 'headers';

/** the examples of a message, one shown at a time with its name and summary on top */
export function MessageExamples({
  item,
  className,
}: {
  item: OperationMessage;
  className?: string;
}) {
  const t = useTranslations({ note: 'message example' });
  const { examples } = item;
  const [selected, setSelected] = useState(0);
  const [selectedPart, setPart] = useState<Part>('payload');
  const example = examples[selected] ?? examples[0];
  if (!example) return null;

  const parts: { value: Part; label: string }[] = [];
  if (example.payload !== undefined) parts.push({ value: 'payload', label: t('Payload') });
  if (example.headers !== undefined) parts.push({ value: 'headers', label: t('Headers') });
  const part = parts.find((item) => item.value === selectedPart) ?? parts[0];
  const value = example[part.value];
  const json = typeof value !== 'string';

  return (
    <div className={cn(exampleCardClassName, 'not-prose', className)}>
      <div className="shrink-0 border-b ps-4 pe-1.5">
        {/* as tall as the first row of schema cards beside it */}
        <div className="flex h-9 items-center gap-2 text-[0.8125rem] font-medium">
          {examples.length > 1 ? (
            <ExampleSelect
              items={examples.map((item, i) => ({
                value: String(i),
                label: item.name,
                description: item.description,
              }))}
              value={String(selected)}
              onValueChange={(v) => setSelected(Number(v))}
              align="start"
              className="-ms-2 me-auto max-w-none min-w-0 shrink text-fd-foreground"
            />
          ) : (
            <span className="me-auto truncate">
              {/* examples generated from schemas have no name of their own */}
              {example.id === 'default' ? t('Example') : example.name}
            </span>
          )}
          {parts.length > 1 && (
            <ExampleSelect
              items={parts}
              value={part.value}
              onValueChange={(v) => setPart(v as Part)}
            />
          )}
        </div>
        {example.description && (
          <p className="-mt-1.5 pe-2.5 pb-2 text-xs text-fd-muted-foreground">
            {example.description}
          </p>
        )}
      </div>
      <ClientCodeBlock
        lang={json ? 'json' : 'text'}
        code={json ? JSON.stringify(value, null, 2) : value}
        codeblock={cardCodeBlock}
      />
    </div>
  );
}
