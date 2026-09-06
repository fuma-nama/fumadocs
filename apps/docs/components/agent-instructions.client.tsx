'use client';
import { Check, Copy } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';

export function CopyButton({ text }: { text: string }) {
  const [checked, onClick] = useCopyButton(() => navigator.clipboard.writeText(text));

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonVariants({
        color: 'secondary',
        size: 'sm',
        className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
      })}
    >
      {checked ? <Check /> : <Copy />}
      {checked ? 'Copied' : 'Copy Instructions'}
    </button>
  );
}
