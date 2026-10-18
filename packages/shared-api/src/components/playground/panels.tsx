'use client';
import { type ComponentProps, memo, type ReactNode, useState } from 'react';
import { ArrowLeft, ChevronRight, type LucideIcon, SendHorizontal } from 'lucide-react';
import { useDataEngine } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { titleBarClassName } from '../example';
import { Segmented, SegmentedList } from '../segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { Spinner } from '../spinner';
import { useSchemaUtils } from './schema';
import {
  type FieldEntry,
  FieldRows,
  getNestedFields,
  type NavigateFn,
  resolveField,
} from './fields';
import { cn } from '@/utils/cn';

/** into a nested field, out of it, or to its next/previous sibling */
export type Motion = 'forward' | 'back' | 'next' | 'previous';

const motionClassNames: Record<Motion, string> = {
  forward: 'motion-safe:starting:translate-x-6',
  back: 'motion-safe:starting:-translate-x-6',
  next: 'motion-safe:starting:translate-y-4',
  previous: 'motion-safe:starting:-translate-y-4',
};

const transitionClassName =
  'motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]';

export const iconButtonClassName = cn(
  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
  'text-fd-muted-foreground [&_svg]:size-3.5',
);

/** a code block filling its panel */
export const panelCodeBlock: CodeBlockProps = {
  className: `flex h-full flex-col rounded-none border-0 bg-transparent shadow-none ${titleBarClassName}`,
  viewportProps: { className: 'min-h-0 flex-1 max-h-none' },
};

/** a code block on top of a panel */
export const panelTopCodeBlock: CodeBlockProps = {
  className: `shrink-0 rounded-none border-0 border-b ${titleBarClassName}`,
};

export function PanelHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('flex h-10 shrink-0 items-center gap-2.5 border-b ps-4 pe-1.5', className)}
    />
  );
}

/** the path to the nested field open in a panel */
export function useFieldStack() {
  const engine = useDataEngine();
  const { generateDefault } = useSchemaUtils();
  const [stack, setStack] = useState<FieldEntry[]>([]);
  const [motion, setMotion] = useState<Motion>('forward');

  function navigate(next: FieldEntry[], nextMotion?: Motion) {
    const target = next.at(-1);
    if (target)
      engine.init(target.fieldName, () => {
        const field = resolveField(target.schema, undefined);
        return field ? generateDefault(field) : undefined;
      });
    setMotion(nextMotion ?? (next.length >= stack.length ? 'forward' : 'back'));
    setStack(next);
  }

  return {
    stack,
    motion,
    navigate,
    /** opens a field nested in the last of `parents` */
    openNested(parents: FieldEntry[]): NavigateFn {
      return (entry, siblings) =>
        navigate([...parents, { ...entry, siblings: getNestedFields(engine, siblings) }]);
    },
  };
}

export type FieldStack = ReturnType<typeof useFieldStack>;

/** the overview of fields, it stays under panels and keeps its scroll position */
export function OverviewLayer({ covered, children }: { covered: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'fd-scroll-container min-h-0 overflow-y-auto [grid-area:1/1]',
        transitionClassName,
        covered && 'invisible opacity-0 motion-safe:-translate-x-6',
      )}
    >
      {children}
    </div>
  );
}

/**
 * The panel of the field open in `fields`, breadcrumbs go back to `root`.
 */
export function FieldPanel({
  fields: { stack, motion, navigate, openNested },
  root,
  disabled,
}: {
  fields: FieldStack;
  root: ReactNode;
  /** lock the fields, breadcrumbs still navigate */
  disabled?: boolean;
}) {
  const current = stack[stack.length - 1];
  const rows = <FieldRows entry={current} showDescription onNavigate={openNested(stack)} />;

  return (
    <Panel
      id={stringifyFieldKey(current.fieldName)}
      motion={motion}
      nav={<Breadcrumbs root={root} stack={stack} disabled={disabled} onNavigate={navigate} />}
    >
      {disabled === undefined ? (
        rows
      ) : (
        <fieldset disabled={disabled} className="contents">
          {rows}
        </fieldset>
      )}
    </Panel>
  );
}

/** a panel over the overview, its content animates in when `id` changes */
export function Panel({
  id,
  motion,
  nav,
  children,
}: {
  id: string;
  motion: Motion;
  nav: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col [grid-area:1/1]">
      {nav}
      <div
        key={id}
        className={cn(
          'fd-scroll-container min-h-0 flex-1 overflow-y-auto starting:opacity-0',
          transitionClassName,
          motionClassNames[motion],
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const crumbClassName =
  'truncate rounded-md px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

/** the bar on top of a panel, going back to the overview from `root` */
export function PanelNav({
  root,
  onRoot,
  onBack,
  end,
  children,
}: {
  root: ReactNode;
  onRoot: () => void;
  onBack: () => void;
  end?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations({ note: 'playground' });

  return (
    <nav
      aria-label={t('Breadcrumb')}
      className="flex h-10 shrink-0 items-center gap-1 border-b ps-1.5 pe-1.5 text-[0.8125rem]"
    >
      <button
        type="button"
        aria-label={t('Back')}
        onClick={onBack}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
          'me-1 text-fd-muted-foreground',
        )}
      >
        <ArrowLeft />
      </button>
      <ol className="flex min-w-0 items-center gap-0.5">
        <li className="flex min-w-0 shrink-0 items-center">
          <button type="button" onClick={onRoot} className={crumbClassName}>
            {root}
          </button>
        </li>
        {children}
      </ol>
      {end}
    </nav>
  );
}

export function Crumb({ children }: { children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-0.5 last:shrink-0 motion-safe:transition-opacity motion-safe:starting:opacity-0">
      <ChevronRight className="size-3.5 shrink-0 text-fd-muted-foreground/60" />
      {children}
    </li>
  );
}

function Breadcrumbs({
  root,
  stack,
  disabled,
  onNavigate,
}: {
  root: ReactNode;
  stack: FieldEntry[];
  /** the removal of current field is locked */
  disabled?: boolean;
  onNavigate: (stack: FieldEntry[], motion?: Motion) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const engine = useDataEngine();
  const current = stack[stack.length - 1];

  return (
    <PanelNav
      root={root}
      onRoot={() => onNavigate([])}
      onBack={() => onNavigate(stack.slice(0, -1))}
      end={
        current.removal && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              engine.delete(current.fieldName);
              onNavigate(stack.slice(0, -1));
            }}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'ms-auto shrink-0 text-fd-muted-foreground',
            )}
          >
            {current.removal === 'remove' ? t('Remove') : t('Unset')}
          </button>
        )
      }
    >
      {stack.map((entry, i) => {
        const { siblings } = entry;
        let node: ReactNode;
        if (i < stack.length - 1) {
          node = (
            <button
              type="button"
              onClick={() => onNavigate(stack.slice(0, i + 1))}
              className={cn(crumbClassName, 'font-mono')}
            >
              {entry.name}
            </button>
          );
        } else if (siblings && siblings.length > 1) {
          node = (
            <SiblingSelect
              entry={entry}
              siblings={siblings}
              onSelect={(sibling, motion) =>
                onNavigate([...stack.slice(0, -1), { ...sibling, siblings }], motion)
              }
            />
          );
        } else {
          node = (
            <span aria-current="page" className="truncate px-1.5 py-1 font-mono font-medium">
              {entry.name}
            </span>
          );
        }

        return <Crumb key={stringifyFieldKey(entry.fieldName)}>{node}</Crumb>;
      })}
    </PanelNav>
  );
}

/** the current field, switches to the other nested fields of its parent */
function SiblingSelect({
  entry,
  siblings,
  onSelect,
}: {
  entry: FieldEntry;
  siblings: FieldEntry[];
  onSelect: (sibling: FieldEntry, motion: Motion) => void;
}) {
  const t = useTranslations({ note: 'playground' });
  const current = stringifyFieldKey(entry.fieldName);
  const items = siblings.map((item) => ({
    value: stringifyFieldKey(item.fieldName),
    label: item.name,
  }));

  return (
    <Select
      items={items}
      value={current}
      onValueChange={(value) => {
        const next = items.findIndex((item) => item.value === value);
        if (next === -1 || value === current) return;
        const prev = items.findIndex((item) => item.value === current);
        onSelect(siblings[next], next > prev ? 'next' : 'previous');
      }}
    >
      <SelectTrigger
        aria-label={t('Switch Field')}
        className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 font-mono text-[0.8125rem] font-medium text-fd-foreground hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent"
      >
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="font-mono text-[0.8125rem]">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** a group of fields in the overview, its header stays on top while scrolling */
export function Section({
  icon: Icon,
  title,
  count,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b last:border-b-0">
      <div className="sticky top-0 z-10 flex h-10 items-center gap-2 border-b bg-fd-card ps-4 pe-2 @sm:pe-7.5">
        <Icon className="size-3.5 shrink-0 text-fd-primary" />
        <h3 className="text-[0.8125rem] font-medium">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-fd-muted-foreground tabular-nums">{count}</span>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

/** switches the panels of a playground on small screens, memoized as its indicator measures the tabs on render */
export const ViewSwitch = memo(function ViewSwitch({
  value,
  onValueChange,
  items,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /** keep it the same object across renders */
  items: { value: string; label: ReactNode }[];
}) {
  return (
    <Segmented value={value} onValueChange={onValueChange} className="shrink-0 px-3 pb-3 md:hidden">
      <SegmentedList className="*:flex-1 *:justify-center" items={items} />
    </Segmented>
  );
});

/** the example request loaded in a playground, in the header of its dialog */
export function RequestExampleSelect<V extends string | number>({
  items,
  value,
  onValueChange,
  disabled,
}: {
  items: { value: V; label: ReactNode }[];
  value: V | null;
  onValueChange: (value: V) => void;
  disabled?: boolean;
}) {
  const t = useTranslations({ note: 'playground' });
  if (items.length <= 1) return null;

  return (
    <Select
      items={items}
      value={value}
      disabled={disabled}
      onValueChange={(v) => v !== null && onValueChange(v)}
    >
      <SelectTrigger className="h-8 w-auto max-w-64 gap-1.5 border-0 bg-transparent px-2 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2">
        <span className="text-fd-muted-foreground">{t('Example')}</span>
        <SelectValue className="truncate font-medium" />
      </SelectTrigger>
      <SelectContent align="end">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** the keyboard shortcut to send */
export function SendShortcut() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <kbd className="hidden font-sans text-xs opacity-60 sm:inline">{isMac ? '⌘' : 'Ctrl'} ↵</kbd>
  );
}

export function SendButton({ sending, disabled }: { sending: boolean; disabled?: boolean }) {
  const t = useTranslations({ note: 'playground' });

  return (
    <button
      type="submit"
      disabled={sending || disabled}
      className={cn(
        buttonVariants({ variant: 'primary' }),
        'h-10 shrink-0 gap-2 rounded-xl px-4 transition-[background-color,scale] active:scale-[0.97] disabled:opacity-80 motion-reduce:transition-none',
      )}
    >
      {sending ? <Spinner className="size-3.5" /> : <SendHorizontal className="size-3.5" />}
      {t('Send')}
      <SendShortcut />
    </button>
  );
}

/** an empty panel, telling what fills it */
export function Placeholder({
  icon: Icon,
  className,
  children,
}: {
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center',
        className,
      )}
    >
      <div className="rounded-xl border bg-fd-secondary p-2.5 text-fd-muted-foreground">
        <Icon className="size-4" />
      </div>
      <p className="text-sm text-fd-muted-foreground">{children}</p>
    </div>
  );
}

/** covers the response while its request is sent */
export function SendingOverlay() {
  const t = useTranslations({ note: 'playground' });

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-fd-card/70 text-sm text-fd-muted-foreground backdrop-blur-[1px] transition-opacity delay-150 duration-200 starting:opacity-0">
      <Spinner className="size-3.5" />
      {t('Sending request...')}
    </div>
  );
}
