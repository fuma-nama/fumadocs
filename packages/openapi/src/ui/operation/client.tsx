'use client';

import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import { Check, Copy } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useMemo,
  useState,
} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';

export function CopyResponseTypeScript({ code }: { code: string }) {
  const [isChecked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(code);
  });

  return (
    <div className="flex items-start justify-between gap-2 bg-fd-card text-fd-card-foreground border rounded-xl p-3 not-prose mb-4 last:mb-0">
      <div>
        <p className="font-medium text-sm mb-2">TypeScript Definitions</p>
        <p className="text-xs text-fd-muted-foreground">
          Use the response body type in TypeScript.
        </p>
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

const Context = createContext<{
  type: string | null;
  setType: (type: string) => void;
} | null>(null);

export function SelectTabs({
  defaultValue,
  children,
}: {
  defaultValue?: string;
  children: ReactNode;
}) {
  const [type, setType] = useState<string | null>(defaultValue ?? null);

  return (
    <Context value={useMemo(() => ({ type, setType }), [type])}>
      {children}
    </Context>
  );
}

export function SelectTab({
  value,
  ...props
}: ComponentProps<'div'> & {
  value: string;
}) {
  const ctx = use(Context);
  if (value !== ctx?.type) return;

  return <div {...props}>{props.children}</div>;
}

export function SelectTabTrigger({
  items,
  ...props
}: ComponentProps<typeof SelectTrigger> & { items: string[] }) {
  const { type, setType } = use(Context)!;

  return (
    <Select value={type ?? ''} onValueChange={setType}>
      <SelectTrigger
        {...props}
        className={cn('not-prose w-fit', props.className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
