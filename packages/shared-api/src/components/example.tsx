'use client';
import { type ReactNode, useSyncExternalStore } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/utils/cn';

// the selected language applies to every code sample of the session
const selectedCodeUsages = new Map<string, string | null>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** kept in memory, also when the storage is blocked */
function getCodeUsageId(key: string): string | null {
  let id = selectedCodeUsages.get(key);
  if (id === undefined) {
    try {
      id = sessionStorage.getItem(key);
    } catch {
      id = null;
    }
    selectedCodeUsages.set(key, id);
  }

  return id;
}

/** the id of the code sample language selected in the session, stored under `key`, `null` until one is selected */
export function useCodeUsageId(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => getCodeUsageId(key),
    () => null,
  );
}

export function selectCodeUsage(key: string, id: string) {
  selectedCodeUsages.set(key, id);
  try {
    sessionStorage.setItem(key, id);
  } catch {
    // storage blocked, the selection lasts until reloading
  }
  for (const listener of listeners) listener();
}

/** a code block filling its example card, its copy button goes in the row above (`<ExampleCopy />`) */
export const cardCodeBlock = {
  className: 'flex min-h-0 flex-col rounded-none border-0 bg-transparent shadow-none',
  viewportProps: { className: 'min-h-0' },
  allowCopy: false,
};

/** a code block under its caption */
export const captionedCodeBlock = {
  ...cardCodeBlock,
  viewportProps: { className: 'min-h-0 pt-2' },
};

export const exampleCardClassName =
  'flex min-h-0 flex-col overflow-hidden rounded-xl border bg-fd-card';

/** copies the code below, at the end of an example card's header or caption */
export function ExampleCopy({ text, caption = false }: { text: string; caption?: boolean }) {
  const t = useTranslations({ note: 'code block' });
  const [checked, onCopy] = useCopyButton(() => navigator.clipboard.writeText(text));

  return (
    <button
      type="button"
      aria-live="polite"
      onClick={onCopy}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
        'shrink-0 text-fd-muted-foreground',
        // a caption keeps its height, its icon centered under the header's
        caption ? '-my-1 -me-2 p-[5px] [&_svg]:size-3.5' : '[&_svg]:size-4',
      )}
    >
      {checked ? <Check /> : <Clipboard />}
      <span className="sr-only">
        {checked
          ? t('Copied Text', { note: 'aria-label' })
          : t('Copy Text', { note: 'aria-label' })}
      </span>
    </button>
  );
}

/** the header of an example card, its controls at the end */
export function ExampleHeader({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b ps-4 pe-1.5 text-[0.8125rem] font-medium">
      {title && <span className="me-auto truncate">{title}</span>}
      {children}
    </div>
  );
}

export function ExampleSelect({
  items,
  value,
  onValueChange,
  align = 'end',
  className,
}: {
  /** `description` goes under the label in options, like rendered Markdown */
  items: { value: string; label: ReactNode; description?: ReactNode }[];
  value: string;
  onValueChange: (value: string) => void;
  align?: 'start' | 'end';
  className?: string;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v !== null && onValueChange(v)}>
      <SelectTrigger
        className={cn(
          'h-7 w-fit max-w-1/2 shrink-0 gap-1.5 border-0 bg-transparent px-2 py-0 text-[0.8125rem] font-medium text-fd-muted-foreground hover:text-fd-accent-foreground focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          className,
        )}
      >
        <SelectValue className="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent align={align} className="max-w-80">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            description={
              item.description && (
                <div className="prose prose-xs prose-no-margin font-normal text-fd-muted-foreground">
                  {item.description}
                </div>
              )
            }
            className="text-[0.8125rem] font-medium"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
