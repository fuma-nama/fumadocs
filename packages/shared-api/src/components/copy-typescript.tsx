'use client';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/utils/cn';

/** copies the TypeScript definitions of a schema, generated on click */
export function CopyTypeScript({
  name,
  generate,
}: {
  name: string;
  generate: () => string | undefined | Promise<string | undefined>;
}) {
  const t = useTranslations({ note: 'TypeScript definitions' });
  const [isChecked, onCopy] = useCopyButton(() => {
    const code = generate();
    if (typeof code === 'string') return navigator.clipboard.writeText(code);
    return Promise.resolve(code).then((code) => {
      if (code) return navigator.clipboard.writeText(code);
    });
  });

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
