'use client';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { ArrowLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useDataEngine } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
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
  className: 'h-full rounded-none border-0 bg-transparent shadow-none',
  viewportProps: { className: 'h-full max-h-none' },
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

const crumbClassName =
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
