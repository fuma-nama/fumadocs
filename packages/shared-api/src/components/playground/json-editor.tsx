'use client';
import { useState } from 'react';
import { type FieldKey, useDataEngine, useFieldValue } from '@fumari/stf';

export function JsonEditor({ fieldName }: { fieldName: FieldKey }) {
  const engine = useDataEngine();
  const [value] = useFieldValue(fieldName);
  const [draft, setDraft] = useState(() => ({ value, text: formatJson(value), error: '' }));
  if (draft.value !== value) setDraft({ value, text: formatJson(value), error: '' });

  return (
    <div className="flex flex-col">
      <textarea
        aria-label="JSON"
        value={draft.text}
        spellCheck={false}
        onChange={(e) => {
          const text = e.target.value;
          try {
            const parsed: unknown = JSON.parse(text);
            setDraft({ value: parsed, text, error: '' });
            engine.update(fieldName, parsed);
          } catch (err) {
            setDraft({ ...draft, text, error: err instanceof Error ? err.message : '' });
          }
        }}
        className="min-h-60 w-full resize-none bg-transparent px-4 py-3 font-mono text-[0.8125rem] leading-relaxed outline-none field-sizing-content"
      />
      {draft.error && (
        <p className="border-t px-4 py-2 font-mono text-xs text-red-400">{draft.error}</p>
      )}
    </div>
  );
}

function formatJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}
