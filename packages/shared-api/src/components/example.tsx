'use client';
import { type ReactNode, useSyncExternalStore } from 'react';
import { Check, Clipboard } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
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

/** an example card, a code block with its controls in its title bar, it shrinks with its column */
export const exampleCodeBlock = {
  // selects in the title reach into its padding
  className: 'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] [&_figcaption]:overflow-visible',
};

/** the actions of a code block's title bar, `controls` before its copy button */
export function exampleActions(controls: ReactNode): CodeBlockProps['Actions'] {
  return ({ className, children }) => (
    <div className={cn('flex items-center', className)}>
      {controls}
      {children}
    </div>
  );
}

/** a code block filling its example card, under an `<ExampleHeader />` with its copy button */
export const cardCodeBlock = {
  className: 'flex min-h-0 flex-col rounded-none border-0 bg-transparent shadow-none',
  viewportProps: { className: 'min-h-0' },
  allowCopy: false,
};

export const exampleCardClassName =
  'flex min-h-0 flex-col overflow-hidden rounded-xl border bg-fd-card';

/** copies the code below, like the copy button of code blocks */
function ExampleCopy({ text }: { text: string }) {
  const t = useTranslations({ note: 'code block' });
  const [checked, onCopy] = useCopyButton(() => navigator.clipboard.writeText(text));

  return (
    <button
      type="button"
      aria-live="polite"
      data-checked={checked || undefined}
      onClick={onCopy}
      className={cn(
        buttonVariants({ size: 'icon-xs' }),
        'hover:text-fd-accent-foreground data-checked:text-fd-accent-foreground',
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

/** for example cards with more under their header row than a code block's title bar holds, it looks like one */
export function ExampleHeader({
  title,
  description,
  copy,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  copy?: string;
  /** of the first row */
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className="shrink-0 border-b ps-4 pe-2 text-sm text-fd-muted-foreground">
      <div className={cn('flex h-[calc(--spacing(9.5)-1px)] items-center', className)}>
        {title && <span className="me-auto truncate">{title}</span>}
        {children}
        {copy && <ExampleCopy text={copy} />}
      </div>
      {description}
    </div>
  );
}

/** a single item is a plain label */
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
  if (items.length === 1)
    return <span className="px-2 text-fd-muted-foreground">{items[0].label}</span>;

  return (
    <Select items={items} value={value} onValueChange={(v) => v !== null && onValueChange(v)}>
      <SelectTrigger
        className={cn(
          'h-7 w-fit max-w-40 shrink-0 gap-1.5 border-0 bg-transparent px-2 py-0 text-[0.8125rem] font-medium text-fd-muted-foreground hover:text-fd-accent-foreground focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
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
