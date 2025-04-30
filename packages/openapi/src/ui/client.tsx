'use client';

import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import { Check, Copy } from 'lucide-react';

export { ClientLazy as APIPlayground } from '@/playground/client.lazy';

export function CopyResponseTypeScript({ code }: { code: string }) {
  const [isChecked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(code);
  });

  return (
    <div className="flex items-start justify-between gap-2 bg-fd-card border rounded-xl p-3 not-prose mt-4 first:mt-0">
      <div>
        <p className="font-medium text-fd-foreground mb-2">
          TypeScript Definitions
        </p>
        <p className="text-xs">Use the response body type in TypeScript.</p>
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
        {isChecked ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
        Copy
      </button>
    </div>
  );
}
