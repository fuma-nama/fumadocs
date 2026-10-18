'use client';
import { useState } from 'react';
import { useTranslations } from '@fuma-translate/react';
import {
  cardCodeBlock,
  exampleCardClassName,
  ExampleHeader,
  ExampleSelect,
} from 'shared-api/components/example';
import type { OperationMessage } from '@/operation';
import { ClientCodeBlock } from '@/ui/components/codeblock';

export type Part = 'payload' | 'headers';

/** the examples of a message beside its schemas, one shown at a time with its name and summary on top */
export function MessageExamples({ item }: { item: OperationMessage }) {
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
  const code = json ? JSON.stringify(value, null, 2) : value;

  return (
    <div className={`${exampleCardClassName} not-prose @4xl:w-[400px] @4xl:shrink-0`}>
      <ExampleHeader
        // examples generated from schemas have no name of their own
        title={examples.length === 1 && (example.id === 'default' ? t('Example') : example.name)}
        description={
          example.description && (
            <p className="-mt-1.5 pe-2.5 pb-2 text-xs">{example.description}</p>
          )
        }
        copy={code}
        // as tall as the first row of schema cards beside it
        className="h-9"
      >
        {examples.length > 1 && (
          <ExampleSelect
            items={examples.map((item, i) => ({
              value: String(i),
              label: item.name,
              description: item.description,
            }))}
            value={String(selected)}
            onValueChange={(v) => setSelected(Number(v))}
            align="start"
            className="-ms-2 me-auto max-w-none min-w-0 shrink"
          />
        )}
        {parts.length > 1 && (
          <ExampleSelect
            items={parts}
            value={part.value}
            onValueChange={(v) => setPart(v as Part)}
          />
        )}
      </ExampleHeader>
      <ClientCodeBlock lang={json ? 'json' : 'text'} code={code} codeblock={cardCodeBlock} />
    </div>
  );
}
