'use client';
import { type ReactNode, useState } from 'react';
import { ArrowLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useDataEngine } from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/select';
import { getDefaultValue } from '@/type-tree/sampler';
import type { TypeNode } from '@/type-tree/types';
import { cn } from '@/utils/cn';
import {
  type FieldEntry,
  FieldRows,
  getNestedFields,
  type NavigateFn,
  resolveNode,
} from './fields';

/** into a nested field, out of it, or to its next/previous sibling */
type Motion = 'forward' | 'back' | 'next' | 'previous';

const motionClassNames: Record<Motion, string> = {
  forward: 'motion-safe:starting:translate-x-6',
  back: 'motion-safe:starting:-translate-x-6',
  next: 'motion-safe:starting:translate-y-4',
  previous: 'motion-safe:starting:-translate-y-4',
};

const easing = 'motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]';
const transitionClassName = cn('motion-safe:transition-[opacity,translate]', easing);

const crumbClassName =
  'truncate rounded-md px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

/** the arguments of a story, nested fields open in a panel over them */
export function Controls({ node, onReset }: { node: TypeNode; onReset: () => void }) {
  const t = useTranslations({ note: 'story controls' });
  const engine = useDataEngine();
  const [stack, setStack] = useState<FieldEntry[]>([]);
  const [motion, setMotion] = useState<Motion>('forward');
  const current = stack.at(-1);

  function navigate(next: FieldEntry[], nextMotion?: Motion) {
    const target = next.at(-1);
    if (target)
      engine.init(target.fieldName, () => getDefaultValue(resolveNode(target.node, undefined)));
    setMotion(nextMotion ?? (next.length >= stack.length ? 'forward' : 'back'));
    setStack(next);
  }

  function openNested(parents: FieldEntry[]): NavigateFn {
    return (entry, siblings) =>
      navigate([...parents, { ...entry, siblings: getNestedFields(engine, siblings) }]);
  }

  // the arguments stay mounted under panels to keep their scroll position, without taking space
  return (
    <div className="@container flex flex-col leading-normal">
      <Breadcrumbs stack={stack} onNavigate={navigate} onReset={onReset} />
      <div className="flex max-h-[600px] flex-col">
        <div
          className={cn(
            'fd-scroll-container min-h-0 overflow-y-auto',
            transitionClassName,
            current && 'invisible h-0 opacity-0 motion-safe:-translate-x-6',
          )}
        >
          <FieldRows
            entry={{ fieldName: [], name: t('Props'), node }}
            onNavigate={openNested([])}
          />
        </div>
        {current && (
          <div
            key={stringifyFieldKey(current.fieldName)}
            className={cn(
              'fd-scroll-container min-h-0 overflow-y-auto starting:opacity-0',
              transitionClassName,
              motionClassNames[motion],
            )}
          >
            <FieldRows entry={current} onNavigate={openNested(stack)} />
          </div>
        )}
      </div>
    </div>
  );
}

/** the title of arguments, it becomes the path to a nested field */
function Breadcrumbs({
  stack,
  onNavigate,
  onReset,
}: {
  stack: FieldEntry[];
  onNavigate: (stack: FieldEntry[], motion?: Motion) => void;
  onReset: () => void;
}) {
  const t = useTranslations({ note: 'story controls' });
  const tField = useTranslations({ note: 'story arguments form' });
  const engine = useDataEngine();
  const current = stack.at(-1);

  let end: ReactNode;
  if (!current) {
    end = (
      <button
        type="button"
        aria-label={t('Reset')}
        title={t('Reset')}
        onClick={onReset}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'ms-auto text-fd-muted-foreground [&_svg]:size-3.5',
        )}
      >
        <RotateCcw />
      </button>
    );
  } else if (current.removal) {
    end = (
      <button
        type="button"
        onClick={() => {
          engine.delete(current.fieldName);
          onNavigate(stack.slice(0, -1));
        }}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'ms-auto shrink-0 text-fd-muted-foreground',
        )}
      >
        {current.removal === 'remove' ? tField('Remove') : tField('Unset')}
      </button>
    );
  }

  return (
    <nav
      aria-label={t('Breadcrumb')}
      className="flex h-10 shrink-0 items-center gap-1 border-b ps-4 pe-1.5 text-[0.8125rem]"
    >
      {/* slides in from the start, the title moves aside from the gutter of fields */}
      <button
        type="button"
        aria-label={t('Back')}
        onClick={() => onNavigate(stack.slice(0, -1))}
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'size-6 shrink-0 p-0 text-fd-muted-foreground motion-safe:transition-[background-color,color,margin,opacity,visibility] [&_svg]:size-3.5',
          easing,
          current ? '-ms-1.25' : 'invisible -ms-8.5 opacity-0',
        )}
      >
        <ArrowLeft />
      </button>
      <ol className="flex min-w-0 items-center gap-0.5">
        <li className="flex shrink-0 items-center">
          {current ? (
            <button type="button" onClick={() => onNavigate([])} className={crumbClassName}>
              {t('Props')}
            </button>
          ) : (
            <span aria-current="page" className="px-1.5 py-1 text-fd-muted-foreground">
              {t('Props')}
            </span>
          )}
        </li>
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

          return (
            <li
              key={stringifyFieldKey(entry.fieldName)}
              className="flex min-w-0 items-center gap-0.5 last:shrink-0 motion-safe:transition-opacity motion-safe:starting:opacity-0"
            >
              <ChevronRight className="size-3.5 shrink-0 text-fd-muted-foreground/60" />
              {node}
            </li>
          );
        })}
      </ol>
      {end}
    </nav>
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
  const t = useTranslations({ note: 'story controls' });

  // names are unique among siblings
  return (
    <Select
      value={entry.name}
      onValueChange={(name) => {
        const next = siblings.findIndex((item) => item.name === name);
        if (next === -1) return;
        const current = siblings.findIndex((item) => item.name === entry.name);
        onSelect(siblings[next], next > current ? 'next' : 'previous');
      }}
    >
      <SelectTrigger
        aria-label={t('Switch Field')}
        className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 font-mono text-[0.8125rem] font-medium text-fd-foreground hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent"
      >
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {siblings.map((item) => (
          <SelectItem key={item.name} value={item.name} className="font-mono text-[0.8125rem]">
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
