'use client';
import { type MouseEventHandler, type ReactNode, useId, useMemo } from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronRight, ChevronsUpDown, Plus, Trash2, X } from 'lucide-react';
import {
  type DataEngine,
  type FieldKey,
  useArray,
  useDataEngine,
  useFieldValue,
  useNamespace,
  useObject,
} from '@fumari/stf';
import { isPlainObject, stringifyFieldKey } from '@fumari/stf/lib/utils';
import { useTranslations } from '@fuma-translate/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/select';
import { getDefaultValue } from '@/type-tree/sampler';
import { typeToString } from '@/type-tree/stringify';
import type { ArrayNode, ObjectNode, TypeNode } from '@/type-tree/types';
import { validate } from '@/type-tree/validator';
import { cn } from '@/utils/cn';

/** a nested field to open in its own panel */
export interface FieldEntry {
  fieldName: FieldKey;
  name: string;
  /** unresolved, so its unions resolve to the members selected in the parent panel */
  node: TypeNode;
  /** the nested fields of its parent, including itself */
  siblings?: FieldEntry[];
  /** how it can be removed from its parent: unset when optional, removed when an item */
  removal?: 'unset' | 'remove';
}

/** open a nested field, `siblings` are the fields of its parent */
export type NavigateFn = (entry: FieldEntry, siblings: FieldEntry[]) => void;

/** the type of a field, at the end of its cell like a unit */
const typeClassName = 'flex shrink-0 items-center pe-1 font-mono text-xs text-fd-muted-foreground';

/** holds the actions of a field, reserved so the types align, an end padding when stacked */
const slotClassName =
  'flex w-7 shrink-0 items-center justify-center @max-sm:pe-2 @max-sm:empty:w-2';

const inputClassName =
  'min-w-0 flex-1 bg-transparent px-3 text-fd-foreground outline-none placeholder:text-fd-muted-foreground/70';

const rowButtonClassName =
  'flex h-10 w-full items-center gap-2 px-4 last:h-11 last:pb-1 text-[0.8125rem] text-fd-muted-foreground transition-colors hover:bg-fd-accent/40 hover:text-fd-accent-foreground focus-visible:bg-fd-secondary focus-visible:text-fd-accent-foreground focus-visible:outline-none';

/** the type a field is edited as, unions resolve to the member matching its value */
export function resolveNode(node: TypeNode, value: unknown): TypeNode {
  if (node.type === 'intersection') return resolveNode(node.intersection, value);
  if (node.type !== 'union') return node;
  return resolveNode(node.types.find((item) => validate(item, value)) ?? node.types[0], value);
}

function isNested(node: TypeNode): node is ObjectNode | ArrayNode {
  return node.type === 'object' || node.type === 'array';
}

/** a value without input, its type tells it */
function isFixed(node: TypeNode): boolean {
  return (
    node.type === 'literal' ||
    node.type === 'null' ||
    node.type === 'undefined' ||
    node.type === 'unknown'
  );
}

/** the candidates that open in their own panel, the siblings of a nested field */
export function getNestedFields(engine: DataEngine, candidates: FieldEntry[]): FieldEntry[] {
  const out: FieldEntry[] = [];
  for (const item of candidates) {
    if (isNested(resolveNode(item.node, engine.get(item.fieldName)))) out.push(item);
  }
  return out;
}

/** objects in a union are told apart by their literal properties, like `{ kind: "a" }` */
function memberLabel(node: TypeNode): string {
  const object = node.type === 'intersection' ? node.intersection : node;
  if (object.type === 'object' && !object.displayName) {
    const literals: string[] = [];
    for (const prop of object.properties) {
      if (prop.type.type === 'literal') literals.push(`${prop.name}: ${typeToString(prop.type)}`);
    }
    if (literals.length > 0) return `{ ${literals.join(', ')} }`;
  }
  return typeToString(node);
}

/**
 * The type a field is edited as: the selected member of unions, with the select to change it.
 */
function useFieldType(
  fieldName: FieldKey,
  node: TypeNode,
): { node: TypeNode; selector?: ReactNode } {
  const engine = useDataEngine();
  // stored outside the arguments, as a value can match multiple members
  const selections = useNamespace({ namespace: 'unions', initial: () => ({}) });
  const [selected, setSelected] = useFieldValue<number | undefined>(
    [stringifyFieldKey(fieldName)],
    { stf: selections },
  );
  const resolved = node.type === 'intersection' ? node.intersection : node;
  if (resolved.type !== 'union') return { node: resolved };

  const { types } = resolved;
  const index =
    selected ??
    Math.max(
      0,
      types.findIndex((item) => validate(item, engine.get(fieldName))),
    );
  const member = types[index];

  return {
    node: member.type === 'intersection' ? member.intersection : member,
    selector: (
      <TypeSelect
        value={index}
        options={types}
        onChange={(next) => {
          setSelected(next);
          engine.update(fieldName, getDefaultValue(types[next]));
        }}
      />
    ),
  };
}

function TypeSelect({
  value,
  options,
  onChange,
}: {
  value: number;
  options: TypeNode[];
  onChange: (index: number) => void;
}) {
  const t = useTranslations({ note: 'story arguments form' });
  const items = options.map((node, i) => ({ value: i, label: memberLabel(node) }));

  return (
    <Select items={items} value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectPrimitive.Trigger
        aria-label={t('Type')}
        className="flex h-5 max-w-40 min-w-0 cursor-pointer items-center gap-0.5 rounded-md border bg-fd-secondary ps-1.5 pe-1 font-mono text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring/50 data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground"
      >
        <SelectValue className="truncate" />
        <SelectPrimitive.Icon className="shrink-0">
          <ChevronsUpDown className="size-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="font-mono text-xs">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** a field: its name on the left, its input filling the cell on the right */
function Row({
  name,
  required = false,
  htmlFor,
  readOnly = false,
  children,
}: {
  name: string;
  required?: boolean;
  /** id of the control labelled by `name` */
  htmlFor?: string;
  /** a cell without input, not highlighted on hover */
  readOnly?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="group/row grid border-b last:border-b-0 @max-sm:pb-3 @max-sm:last:pb-4 @sm:min-h-10 @sm:last:min-h-11 @sm:grid-cols-[minmax(9rem,1fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 items-center gap-1 py-2 ps-4 pe-3 @max-sm:pb-1.5 @sm:group-last/row:pb-3">
        <label
          htmlFor={htmlFor}
          title={name}
          className="truncate font-mono text-[0.8125rem] text-fd-foreground"
        >
          {name}
        </label>
        {required && <span className="-ms-0.5 text-red-400">*</span>}
      </div>
      <div
        className={cn(
          'flex min-h-9 min-w-0 items-stretch text-[0.8125rem] transition-colors @max-sm:mx-4 @max-sm:overflow-hidden @max-sm:rounded-lg @max-sm:border @max-sm:bg-fd-secondary/50 @sm:min-h-10 @sm:border-s @sm:group-last/row:pb-1',
          !readOnly &&
            'hover:bg-fd-accent/40 has-focus-visible:border-fd-ring has-focus-visible:bg-fd-secondary',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function SlotButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: MouseEventHandler;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-5 items-center justify-center rounded text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring [&_svg]:size-3"
    >
      {children}
    </button>
  );
}

/** a field with an input, or the value telling its type */
function ValueRow({
  name,
  fieldName,
  node,
  removal,
  selector,
  onRemove,
}: {
  name: string;
  fieldName: FieldKey;
  node: TypeNode;
  removal?: FieldEntry['removal'];
  /** the select of union members, in place of the type */
  selector?: ReactNode;
  onRemove?: () => void;
}) {
  const t = useTranslations({ note: 'story arguments form' });
  const engine = useDataEngine();
  const id = useId();
  const [value, setValue] = useFieldValue(fieldName);
  const fixed = isFixed(node);
  const type = selector ?? (fixed || node.type === 'enum' ? null : typeToString(node));

  let slot: ReactNode = null;
  if (removal === 'remove') {
    slot = (
      <SlotButton label={t('Remove Item', { note: 'aria-label' })} onClick={onRemove}>
        <Trash2 />
      </SlotButton>
    );
  } else if (removal === 'unset' && value !== undefined) {
    slot = (
      <SlotButton label={t('Unset')} onClick={() => engine.delete(fieldName)}>
        <X />
      </SlotButton>
    );
  }

  // array items can't be unset, but aren't marked as required
  return (
    <Row name={name} required={!removal} htmlFor={id} readOnly={fixed}>
      <FieldInput
        id={id}
        node={node}
        value={value}
        onChange={setValue}
        required={removal !== 'unset'}
      />
      {type && <span className={typeClassName}>{type}</span>}
      <span className={slotClassName}>{slot}</span>
    </Row>
  );
}

/** the input of a primitive value */
function FieldInput({
  id,
  node,
  value,
  onChange,
  required,
}: {
  id: string;
  node: TypeNode;
  value: unknown;
  onChange: (value: unknown) => void;
  required: boolean;
}) {
  const t = useTranslations({ note: 'story arguments form' });

  if (isFixed(node))
    return (
      <span className="flex flex-1 items-center px-3 font-mono text-fd-muted-foreground">
        {typeToString(node)}
      </span>
    );

  if (node.type === 'enum') {
    const idx = node.members.findIndex((member) => member.value === value);
    const items: { value: number; label: ReactNode }[] = node.members.map((member, i) => ({
      value: i,
      label: member.label,
    }));
    if (!required)
      items.push({
        value: -1,
        label: <span className="font-sans text-fd-muted-foreground">{t('Unset')}</span>,
      });

    return (
      <Select
        items={items}
        value={idx !== -1 ? idx : required ? null : -1}
        onValueChange={(i) => {
          if (i !== null) onChange(i === -1 ? undefined : node.members[i].value);
        }}
      >
        <SelectTrigger
          id={id}
          className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent py-0 ps-3 pe-1 font-mono text-[0.8125rem] hover:bg-transparent focus:ring-0 focus-visible:outline-none"
        >
          <SelectValue className="truncate" placeholder={t('Select')} />
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

  if (node.type === 'boolean') {
    return (
      <div className="flex flex-1 items-center gap-0.5 px-2">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className="h-6 rounded px-2 font-mono text-xs text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring aria-pressed:bg-fd-background aria-pressed:text-fd-foreground aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-fd-border dark:aria-pressed:bg-fd-accent"
          >
            {String(option)}
          </button>
        ))}
      </div>
    );
  }

  if (node.type === 'date') {
    return (
      <input
        id={id}
        type="date"
        value={value instanceof Date ? formatDate(value) : ''}
        // a date at local midnight, like `new Date(year, month, day)`
        onChange={(e) => onChange(e.target.value ? new Date(`${e.target.value}T00:00`) : undefined)}
        className={cn(inputClassName, !(value instanceof Date) && 'text-fd-muted-foreground/70')}
      />
    );
  }

  return (
    <input
      id={id}
      type={node.type === 'number' || node.type === 'bigint' ? 'number' : 'text'}
      step={node.type === 'number' ? 'any' : undefined}
      autoComplete="off"
      spellCheck={false}
      placeholder={value === '' ? '""' : t('Enter value')}
      value={value == null ? '' : String(value)}
      onChange={(e) => {
        const input = e.target;
        if (node.type === 'number') {
          onChange(Number.isNaN(input.valueAsNumber) ? undefined : input.valueAsNumber);
        } else if (node.type !== 'bigint') {
          onChange(input.value);
        } else if (input.value.length === 0) {
          onChange(undefined);
        } else {
          try {
            onChange(BigInt(input.value));
          } catch {
            // not an integer
          }
        }
      }}
      className={inputClassName}
    />
  );
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** an object or array, opened in its own panel */
function NavRow({
  name,
  fieldName,
  type,
  required,
  onNavigate,
}: {
  name: string;
  fieldName: FieldKey;
  type: string;
  required: boolean;
  onNavigate: () => void;
}) {
  const t = useTranslations({ note: 'story arguments form' });
  const id = useId();
  const [preview] = useFieldValue(fieldName, {
    compute(value): string | null {
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return value.length === 1
          ? t('1 item')
          : t('{count} items', { variables: { count: String(value.length) } });
      }
      if (!isPlainObject(value)) return null;
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''} }`;
    },
  });

  return (
    <Row name={name} required={required} htmlFor={id}>
      <button
        id={id}
        type="button"
        onClick={onNavigate}
        className="group/nav flex min-w-0 flex-1 items-center ps-3 text-start outline-none"
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate pe-2 font-mono text-xs',
            preview === null ? 'text-fd-muted-foreground/70' : 'text-fd-muted-foreground',
          )}
        >
          {preview ?? t('Not set')}
        </span>
        <span
          title={type}
          className="max-w-1/2 shrink-0 truncate pe-1 font-mono text-xs text-fd-muted-foreground"
        >
          {type}
        </span>
        <span className={slotClassName}>
          <ChevronRight className="size-3.5 text-fd-muted-foreground transition-transform duration-200 group-hover/nav:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </button>
    </Row>
  );
}

function FieldRow({
  entry: { name, fieldName, node, removal },
  onNavigate,
  onRemove,
}: {
  entry: FieldEntry;
  onNavigate: () => void;
  onRemove?: () => void;
}) {
  const { node: resolved, selector } = useFieldType(fieldName, node);
  if (resolved.type === 'never') return null;
  // their unions are selected in their own panels
  if (isNested(resolved))
    return (
      <NavRow
        name={name}
        fieldName={fieldName}
        type={typeToString(resolved)}
        required={!removal}
        onNavigate={onNavigate}
      />
    );

  return (
    <ValueRow
      name={name}
      fieldName={fieldName}
      node={resolved}
      removal={removal}
      selector={selector}
      onRemove={onRemove}
    />
  );
}

function ObjectRows({
  fieldName,
  node,
  onNavigate,
}: {
  fieldName: FieldKey;
  node: ObjectNode;
  onNavigate: NavigateFn;
}) {
  const t = useTranslations({ note: 'story arguments form' });
  // like the attributes of elements, too many properties are shown only when added
  const isLazy = node.properties.length > 100;
  const definitions = useMemo(() => {
    const out: Record<string, ObjectNode['properties'][number]> = {};
    for (const prop of node.properties) out[prop.name] = prop;
    return out;
  }, [node]);
  const { properties, onAppend, _objectKeys } = useObject(fieldName, {
    lazy: isLazy,
    defaultValue: () => getDefaultValue(node) as object,
    properties: definitions,
  });
  const entries: FieldEntry[] = [];
  for (const { field, key, info } of properties) {
    entries.push({
      fieldName: field,
      name: key,
      node: info.type,
      removal: info.required ? undefined : 'unset',
    });
  }

  const hiddenKeys: string[] = [];
  if (isLazy) {
    const shown = new Set(_objectKeys);
    for (const prop of node.properties) if (!shown.has(prop.name)) hiddenKeys.push(prop.name);
  }

  return (
    <>
      {entries.map((entry) => (
        <FieldRow key={entry.name} entry={entry} onNavigate={() => onNavigate(entry, entries)} />
      ))}
      {hiddenKeys.length > 0 && (
        <Select value={null} onValueChange={(v) => v !== null && onAppend(v)}>
          <SelectTrigger
            className={cn(
              rowButtonClassName,
              'rounded-none border-0 border-b bg-transparent p-0 ps-4 pe-1.75 last:border-b-0 focus:ring-0',
            )}
          >
            <Plus className="size-3.5" />
            <SelectValue placeholder={t('Show Property')} />
          </SelectTrigger>
          <SelectContent>
            {hiddenKeys.map((key) => (
              <SelectItem key={key} value={key} className="font-mono text-[0.8125rem]">
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}

function ArrayRows({
  fieldName,
  node,
  onNavigate,
}: {
  fieldName: FieldKey;
  node: ArrayNode;
  onNavigate: NavigateFn;
}) {
  const t = useTranslations({ note: 'story arguments form' });
  const { items, insertItem, removeItem } = useArray(fieldName);
  const entries: FieldEntry[] = [];
  for (const item of items) {
    entries.push({
      fieldName: item.field,
      name: `[${item.index}]`,
      node: node.elementType,
      removal: 'remove',
    });
  }

  return (
    <>
      {entries.map((entry, i) => (
        <FieldRow
          key={i}
          entry={entry}
          onNavigate={() => onNavigate(entry, entries)}
          onRemove={() => removeItem(i)}
        />
      ))}
      <button
        type="button"
        onClick={() => insertItem(getDefaultValue(node.elementType))}
        className={rowButtonClassName}
      >
        <Plus className="size-3.5" />
        {t('Add Item')}
      </button>
    </>
  );
}

/** the rows of a field: properties for objects, items for arrays, an input otherwise */
export function FieldRows({ entry, onNavigate }: { entry: FieldEntry; onNavigate: NavigateFn }) {
  const t = useTranslations({ note: 'story arguments form' });
  const { node, selector } = useFieldType(entry.fieldName, entry.node);
  let rows: ReactNode = null;
  if (node.type === 'object') {
    rows = <ObjectRows fieldName={entry.fieldName} node={node} onNavigate={onNavigate} />;
  } else if (node.type === 'array') {
    rows = <ArrayRows fieldName={entry.fieldName} node={node} onNavigate={onNavigate} />;
  } else if (node.type !== 'never') {
    rows = <ValueRow name={entry.name} fieldName={entry.fieldName} node={node} />;
  }

  return (
    <>
      {selector && (
        <div className="flex min-h-10 items-center gap-2 border-b ps-4 pe-4 text-xs text-fd-muted-foreground @sm:pe-8">
          {t('Type')}
          <span className="ms-auto">{selector}</span>
        </div>
      )}
      {rows}
    </>
  );
}
