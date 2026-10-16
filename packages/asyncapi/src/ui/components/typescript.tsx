'use client';
import { use, useMemo } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import type { JsonSchema } from '@fumadocs/json-schema';
import { useAsyncAPI, useRenderContext } from '@/utils/create-page';
import { cn } from '@/utils/cn';

/** the TypeScript definitions of a schema, from the `generateTypeScriptDefinitions` of page */
export function useTypeScriptDefinitions(
  schema: JsonSchema,
  { name, readOnly, writeOnly }: { name: string; readOnly: boolean; writeOnly: boolean },
): string | undefined {
  const { generateTypeScriptDefinitions } = useRenderContext();
  const { doc } = useAsyncAPI();
  const result = useMemo(
    () =>
      generateTypeScriptDefinitions
        ? generateTypeScriptDefinitions(schema, {
            name,
            readOnly,
            writeOnly,
            document: doc.bundled,
          })
        : undefined,
    [generateTypeScriptDefinitions, schema, name, readOnly, writeOnly, doc],
  );

  // generators returning promises are awaited on server components
  return result instanceof Promise ? use(result) : result;
}

export function CopyTypeScript({ code, name }: { code: string; name: string }) {
  const t = useTranslations({ note: 'TypeScript definitions' });
  const [isChecked, onCopy] = useCopyButton(() => navigator.clipboard.writeText(code));

  return (
    <button
      type="button"
      title={t('Use the {name} type in TypeScript.', { variables: { name } })}
      onClick={onCopy}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        '-my-1 shrink-0 gap-1.5 text-fd-muted-foreground [&_svg]:size-3.5',
      )}
    >
      {isChecked ? <Check /> : <Copy />}
      TypeScript
    </button>
  );
}
