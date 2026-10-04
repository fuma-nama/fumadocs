'use client';
import { createContext, Fragment, type ReactNode, use, useCallback, useRef, useState } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Menu } from '@base-ui/react/menu';
import { CheckIcon, ChevronRightIcon, FilterIcon, FilterXIcon, LinkIcon } from 'lucide-react';
import type { SchemaData, SchemaUIGeneratedData } from '@fumadocs/json-schema/react';
import {
  SchemaUIProvider,
  type SchemaUnion,
  useSchemaUI,
} from '@fumadocs/json-schema/react/client';
import { cn } from '@/utils/cn';
import { Collapsible, CollapsibleContent } from '../collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

export interface SchemaUIProps {
  /** anchor ID of the root schema, links to a property are resolved against it */
  rootId: string;
  name: string;
  required?: boolean;
  as?: 'property' | 'body';
  /** selects the variant of the root schema, like its media type, shown above the breadcrumbs */
  selector?: ReactNode;
  /** actions of the root schema, like copying its type definitions */
  actions?: ReactNode;

  generated: SchemaUIGeneratedData;
}

const TypeContext = createContext<{
  open: (name: string, $ref: string) => void;
  /** set for the root property, its types toggle the card below it */
  isExpanded?: (name: string, $ref: string) => boolean;
} | null>(null);

const typeClassName = 'font-mono text-xs text-fd-muted-foreground';

const crumbClassName =
  'truncate rounded-md px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-ring data-popup-open:bg-fd-accent';

const chevronClassName = 'size-3.5 shrink-0 text-fd-muted-foreground/60';

/** below the sticky headers of docs layouts */
const scrollMarginClassName = 'scroll-mt-[calc(var(--fd-docs-row-3,0px)+0.5rem)]';

const tagClassName =
  'rounded-md border bg-fd-secondary px-1.5 py-0.5 text-xs text-fd-secondary-foreground';

export function SchemaUI({
  rootId,
  name,
  required = false,
  as = 'property',
  selector,
  actions,
  generated,
}: SchemaUIProps) {
  return (
    <SchemaUIProvider id={rootId} name={name} generated={generated}>
      {as === 'body' && generated.refs[generated.$root].type !== 'primitive' ? (
        <SchemaCard id={rootId} selector={selector} actions={actions} />
      ) : (
        <RootProperty
          id={rootId}
          name={name}
          $type={generated.$root}
          required={required}
          actions={
            <>
              {selector}
              {actions}
            </>
          }
        />
      )}
    </SchemaUIProvider>
  );
}

function RootProperty({
  id,
  name,
  $type,
  required,
  actions,
}: {
  id: string;
  name: string;
  $type: string;
  required: boolean;
  actions: ReactNode;
}) {
  const { refs, path, open, back } = useSchemaUI();
  // `path` is kept while the card collapses
  const [collapsed, setCollapsed] = useState(false);

  function isExpanded(name: string, $ref: string) {
    return !collapsed && path[1]?.name === name && path[1].$ref === $ref;
  }

  return (
    <TypeContext
      value={{
        isExpanded,
        open(name, $ref) {
          if (isExpanded(name, $ref)) return setCollapsed(true);
          setCollapsed(false);
          back(0);
          open(name, $ref);
        },
      }}
    >
      <ObjectProperty
        id={id}
        name={name}
        $type={$type}
        required={required}
        parentIndex={0}
        actions={actions}
      >
        {refs[$type].type !== 'primitive' && (
          <Collapsible open={!collapsed && path.length > 1}>
            <CollapsibleContent>
              <SchemaCard from={1} className="mt-2.5" />
            </CollapsibleContent>
          </Collapsible>
        )}
      </ObjectProperty>
    </TypeContext>
  );
}

const motionClassNames = {
  forward: 'motion-safe:starting:translate-x-6',
  back: 'motion-safe:starting:-translate-x-6',
};

/** the last schema of the path, with the path from `from` as breadcrumbs */
function SchemaCard({
  from = 0,
  id,
  selector,
  actions,
  className,
}: {
  from?: number;
  id?: string;
  selector?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { path, open, back } = useSchemaUI();
  const index = path.length - 1;
  const { name, $ref, unions, schema } = path[index];
  const panelKey = `${index}\0${name}\0${$ref}`;
  // the filter of each panel starts empty
  const [filter, setFilter] = useState({ key: panelKey, value: '' });
  const search = filter.key === panelKey ? filter.value : '';
  const query = search.trim().toLowerCase();
  // the side that the next panel slides in from
  const [motion, setMotion] = useState<keyof typeof motionClassNames>();
  const headerRef = useRef<HTMLDivElement>(null);
  const filterable = schema.type === 'object' && schema.props.length > 0;
  // the root property above already describes its own schema
  const described = from > 0 && index === from && $ref === path[0].$ref;
  let content: ReactNode = null;

  // the opened schema replaces the properties above, scroll back to the breadcrumbs
  function navigate(direction: keyof typeof motionClassNames, update: () => void) {
    setMotion(direction);
    update();
    headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (schema.type === 'object') {
    const props: ReactNode[] = [];
    for (const prop of schema.props) {
      if (query && !prop.name.toLowerCase().includes(query)) continue;
      props.push(
        <ObjectProperty
          key={prop.name}
          name={prop.name}
          $type={prop.$type}
          required={prop.required}
          parentIndex={index}
        />,
      );
    }

    content = props;
    if (props.length === 0 && query) {
      content = (
        <div className="not-prose my-3 flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center text-fd-muted-foreground">
          <FilterXIcon className="box-content size-4 rounded-lg border bg-fd-secondary p-2" />
          <p>
            {t('No property matching')}{' '}
            <span className="font-medium break-all text-fd-foreground">{`"${search}"`}</span>
          </p>
        </div>
      );
    }
  } else if (schema.type === 'array') {
    content = (
      <ObjectProperty name="[index: integer]" $type={schema.item.$type} parentIndex={index} />
    );
  }

  return (
    <div
      id={id}
      className={cn(
        '@container overflow-hidden rounded-xl border bg-fd-card text-fd-card-foreground',
        scrollMarginClassName,
        className,
      )}
    >
      <div
        ref={headerRef}
        className={cn('not-prose flex flex-wrap border-b', scrollMarginClassName)}
      >
        {selector && (
          <div className="flex h-9 basis-full items-center border-b ps-1.5 pe-1 text-[0.8125rem]">
            {selector}
          </div>
        )}
        <Breadcrumbs
          from={from}
          unions={unions}
          onBack={(index) => navigate('back', () => back(index))}
        />
        {(filterable || actions) && (
          <div
            className={cn(
              'flex h-9 items-center gap-1 pe-1',
              // a row of its own in narrow cards, leaving the breadcrumbs room
              filterable && '@max-xl:basis-full @max-xl:border-t @max-xl:ps-1.5',
            )}
          >
            {filterable && (
              <label className="flex h-7 cursor-text items-center gap-1.5 rounded-md border bg-fd-secondary px-2 text-fd-muted-foreground transition-shadow focus-within:ring-1 focus-within:ring-fd-ring @max-xl:flex-1 @xl:w-40">
                <FilterIcon className="size-3.5 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setFilter({ key: panelKey, value: e.target.value })}
                  aria-label={t('Filter Properties')}
                  placeholder={t('Filter Properties')}
                  className="min-w-0 flex-1 bg-transparent text-[0.8125rem] text-fd-foreground outline-none placeholder:text-fd-muted-foreground"
                />
              </label>
            )}
            {actions}
          </div>
        )}
      </div>
      <TypeContext value={{ open: (name, $ref) => navigate('forward', () => open(name, $ref)) }}>
        <div
          key={panelKey}
          className={cn(
            'px-3',
            motion &&
              'starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]',
            motion && motionClassNames[motion],
          )}
        >
          {!described && <SchemaDescription schema={schema} className="py-2.5" />}
          {content}
        </div>
      </TypeContext>
    </div>
  );
}

/**
 * The path from `from`, the crumbs between the first and last ones collapse into a menu when they don't fit.
 */
function Breadcrumbs({
  from,
  unions,
  onBack,
}: {
  from: number;
  unions: SchemaUnion[];
  onBack: (index: number) => void;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { path } = useSchemaUI();
  const last = path.length - 1;
  const [collapsed, setCollapsed] = useState(0);
  // the hidden copy of all crumbs is measured before paint, and again when resized
  const measure = useCallback((copy: HTMLElement | null) => {
    if (!copy) return;
    const element = copy.parentElement!;
    const after = copy.previousElementSibling!;
    const update = () =>
      setCollapsed(countCollapsed(copy, element.clientWidth - after.getBoundingClientRect().width));
    const observer = new ResizeObserver(update);
    update();
    observer.observe(element);
    observer.observe(after);
    return () => observer.disconnect();
  }, []);
  const hidden = Math.min(collapsed, Math.max(0, last - from - 1));
  const crumbs: ReactNode[] = [];
  const menuItems: ReactNode[] = [];
  const copy: ReactNode[] = [];
  let names = '';

  for (let i = from; i <= last; i++) {
    const name = formatName(path[i].name);
    const chevron = i > from && <ChevronRightIcon className={chevronClassName} />;
    names += `${name}\0`;
    copy.push(
      <li key={i} className="flex items-center gap-0.5">
        {chevron}
        <span className={cn('px-1.5 py-1', i === last && 'font-medium')}>{name}</span>
      </li>,
    );

    if (i > from && i <= from + hidden) {
      menuItems.push(
        <Menu.Item
          key={i}
          onClick={() => onBack(i)}
          className="truncate rounded-md px-2 py-1.5 outline-none data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground"
        >
          {name}
        </Menu.Item>,
      );
      continue;
    }

    crumbs.push(
      <li
        key={i}
        className={cn(
          'flex items-center gap-0.5 overflow-hidden',
          i > from && 'motion-safe:transition-opacity motion-safe:starting:opacity-0',
        )}
      >
        {chevron}
        {i < last ? (
          <button type="button" onClick={() => onBack(i)} className={crumbClassName}>
            {name}
          </button>
        ) : (
          <span aria-current="page" className="truncate px-1.5 py-1 font-medium">
            {name}
          </span>
        )}
      </li>,
    );
  }

  if (menuItems.length > 0) {
    crumbs.splice(
      1,
      0,
      <li key="menu" className="flex items-center gap-0.5">
        <ChevronRightIcon className={chevronClassName} />
        <Menu.Root>
          <Menu.Trigger
            aria-label={t('Show Path', { note: 'aria-label' })}
            className={crumbClassName}
          >
            …
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="start" sideOffset={4} className="z-50">
              <Menu.Popup className="flex max-h-(--available-height) max-w-72 min-w-40 origin-(--transform-origin) flex-col overflow-y-auto rounded-xl border bg-fd-popover p-1 font-mono text-[0.8125rem] text-fd-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
                {menuItems}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </li>,
    );
  }

  return (
    // margins instead of paddings, so `clientWidth` is the space of crumbs
    <div className="relative ms-1.5 me-1 flex h-9 min-w-0 flex-1 items-center font-mono text-[0.8125rem]">
      {/* space is shared equally, so only the crumbs longer than their share truncate */}
      <ol className="grid min-w-0 auto-cols-[minmax(0,max-content)] grid-flow-col items-center">
        {crumbs}
      </ol>
      <div className="flex min-w-0 items-center gap-0.5">
        {unions.map((union, depth) => (
          <Fragment key={depth}>
            <ChevronRightIcon className={chevronClassName} />
            <UnionSelect union={union} />
          </Fragment>
        ))}
      </div>
      {/* remounted for other crumbs to measure them */}
      <ol key={names} ref={measure} aria-hidden className="invisible absolute top-0 flex w-max">
        {copy}
        <li className="flex items-center gap-0.5">
          <ChevronRightIcon className={chevronClassName} />
          <span className="px-1.5 py-1">…</span>
        </li>
      </ol>
    </div>
  );
}

/** the number of crumbs after the first one to collapse, measured from the hidden copy of all crumbs */
function countCollapsed(copy: HTMLElement, available: number): number {
  const widths = Array.from(copy.children, (child) => child.getBoundingClientRect().width);
  // the menu is measured last
  const menu = widths.pop()!;
  let total = 0;
  for (const width of widths) total += width;
  if (total <= available) return 0;

  // keep the crumbs closest to the last one
  let count = 0;
  total += menu;
  while (count < widths.length - 2 && total > available) total -= widths[++count];
  return count;
}

/** shorten the names of items and additional properties, like `[index]` */
function formatName(name: string): string {
  const match = /^\[(\w+): \w+]$/.exec(name);
  return match ? `[${match[1]}]` : name;
}

function UnionSelect({ union: { schema, value, select } }: { union: SchemaUnion }) {
  const items = schema.items.map((item) => ({ label: item.name, value: item.$type }));

  return (
    <Select items={items} value={value} onValueChange={(v) => v && select(v)}>
      <SelectTrigger className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 text-[0.8125rem] font-medium text-fd-foreground hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset data-popup-open:bg-fd-accent">
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

function ObjectProperty({
  id,
  name,
  $type,
  required = false,
  parentIndex,
  actions,
  children,
}: {
  id?: string;
  name: string;
  $type: string;
  required?: boolean;
  /** index of the path item that has the property */
  parentIndex: number;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { refs, path, highlighted, getLink } = useSchemaUI();
  const schema = refs[$type];
  const isHighlighted = highlighted === name && parentIndex === path.length - 1;
  const [isChecked, onCopy] = useCopyButton(() =>
    navigator.clipboard.writeText(getLink(parentIndex, name)),
  );
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !isHighlighted) return;
      // after the opened schemas expand
      const timer = window.setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => window.clearTimeout(timer);
    },
    [isHighlighted],
  );

  return (
    <div id={id} ref={ref} className="group/property scroll-m-20 border-t py-2.5 first:border-t-0">
      <div className="not-prose flex flex-wrap items-center gap-x-2 gap-y-1">
        <code className="text-[0.8125rem] font-medium">
          <span
            className={cn(
              isHighlighted
                ? 'rounded-sm bg-fd-primary text-fd-primary-foreground'
                : 'text-fd-primary',
              schema.deprecated && 'line-through opacity-80',
            )}
          >
            {name}
          </span>
          {required ? (
            <span className="text-red-400">*</span>
          ) : (
            <span className="text-fd-muted-foreground">?</span>
          )}
        </code>
        {schema.type === 'primitive' ? (
          <span className={typeClassName}>{schema.aliasName}</span>
        ) : (
          <TypeInfo name={name} $ref={$type}>
            {schema.aliasName}
          </TypeInfo>
        )}
        {schema.deprecated && (
          <span className="font-mono text-xs text-yellow-600 dark:text-yellow-400">
            {t('Deprecated')}
          </span>
        )}
        <button
          type="button"
          aria-live="polite"
          onClick={onCopy}
          className={cn(
            buttonVariants({ size: 'icon-xs', variant: 'ghost' }),
            '-my-1 ms-auto text-fd-muted-foreground opacity-0 transition-opacity group-hover/property:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5',
          )}
        >
          {isChecked ? <CheckIcon /> : <LinkIcon />}
          <span className="sr-only">
            {isChecked
              ? t('Copied Link', { note: 'aria-label' })
              : t('Copy Link', { note: 'aria-label' })}
          </span>
        </button>
        {actions}
      </div>
      <SchemaDescription schema={schema} className="mt-1" />
      {children}
    </div>
  );
}

function TypeInfo({ name, $ref, children }: { name: string; $ref: string; children: ReactNode }) {
  const { refs } = useSchemaUI();
  const { open, isExpanded } = use(TypeContext)!;
  const schema = refs[$ref];

  if (schema.type === 'primitive' && !schema.description && !schema.infoTags?.length) {
    return <span className={typeClassName}>{children}</span>;
  }

  if (schema.type === 'and' || schema.type === 'or') {
    return (
      <span className={cn(typeClassName, 'flex flex-wrap items-center gap-1.5')}>
        {schema.items.map((item, i) => (
          <Fragment key={item.$type}>
            {i > 0 && (schema.type === 'and' ? '&' : '|')}
            <TypeInfo name={name} $ref={item.$type}>
              {item.name}
            </TypeInfo>
          </Fragment>
        ))}
      </span>
    );
  }

  if (schema.type === 'array') {
    return (
      <span className={cn(typeClassName, 'flex flex-wrap items-center')}>
        {'array<'}
        <TypeInfo name={`${name}[]`} $ref={schema.item.$type}>
          {refs[schema.item.$type].aliasName}
        </TypeInfo>
        {'>'}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-expanded={isExpanded?.(name, $ref)}
      onClick={() => open(name, $ref)}
      className={cn(
        typeClassName,
        'text-start underline decoration-dotted underline-offset-4 transition-colors hover:text-fd-accent-foreground aria-expanded:text-fd-accent-foreground aria-expanded:decoration-solid',
      )}
    >
      {children}
    </button>
  );
}

function SchemaDescription({
  schema: { description, infoTags = [] },
  className,
}: {
  schema: SchemaData;
  className?: string;
}) {
  if (!description && infoTags.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2 text-fd-muted-foreground', className)}>
      {description && <div className="prose-no-margin">{description}</div>}
      {infoTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {infoTags.map((tag, i) => {
            if ('node' in tag) return <Fragment key={i}>{tag.node}</Fragment>;

            if ('list' in tag)
              return (
                <div
                  key={i}
                  className="not-prose flex w-full flex-wrap items-center gap-1.5 text-xs"
                >
                  {tag.label}
                  {tag.list.map((item, j) => (
                    <code key={j} className={tagClassName}>
                      {item}
                    </code>
                  ))}
                </div>
              );

            if (tag.block)
              return (
                <div key={i} className="not-prose flex w-full flex-col gap-1.5 text-xs">
                  {tag.label}
                  {tag.value}
                </div>
              );

            return (
              <div
                key={i}
                className={cn(tagClassName, 'inline-flex max-w-full items-baseline gap-1.5')}
              >
                <span className="not-prose shrink-0 text-fd-muted-foreground">{tag.label}</span>
                {tag.prose ? (
                  <div className="prose-sm prose-no-margin min-w-0 flex-1">{tag.value}</div>
                ) : (
                  <code className="not-prose min-w-0 wrap-break-word">{tag.value}</code>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
