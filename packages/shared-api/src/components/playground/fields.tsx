'use client';
import { Fragment, type MouseEventHandler, type ReactNode, useId, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { Popover } from '@base-ui/react/popover';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  type DataEngine,
  type FieldKey,
  useArray,
  useDataEngine,
  useFieldValue,
  useObject,
} from '@fumari/stf';
import { isPlainObject, stringifyFieldKey } from '@fumari/stf/lib/utils';
import {
  dereference,
  type JsonSchema,
  matches,
  matchesType,
  mergeAllOf,
  stringify,
} from '@fumadocs/json-schema';
import {
  anyFields,
  type FieldInfo,
  useFieldInfo,
  useResolvedSchema,
  useSchemaContext,
  useSchemaUtils,
} from './schema';
import { Select, SelectContent, SelectItem, SelectValue } from '../select';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/utils/cn';

type Schema = Exclude<JsonSchema, boolean>;

/** a nested field to open in its own panel */
export interface FieldEntry {
  fieldName: FieldKey;
  name: string;
  /** unresolved, so its unions resolve to the members selected in the parent panel */
  schema: JsonSchema;
  /** the nested fields of its parent, including itself */
  siblings?: FieldEntry[];
  /** how it can be removed from its parent: unset when optional, removed when an item or added property */
  removal?: 'unset' | 'remove';
}

/** open a nested field, `siblings` are the fields of its parent */
export type NavigateFn = (entry: FieldEntry, siblings: FieldEntry[]) => void;

/** a segment of the type pill, the type or an action on the field */
const segmentClassName =
  'flex items-center transition-colors not-first:border-s hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:bg-fd-accent focus-visible:outline-none data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground';

/** the type of a field and the actions on it, like changing its type or unsetting it */
function TypePill({
  type,
  action,
  quiet = false,
}: {
  type?: ReactNode;
  action?: ReactNode;
  quiet?: boolean;
}) {
  return (
    <span
      className={cn(
        'flex h-6 shrink-0 items-stretch overflow-hidden rounded-md border bg-fd-secondary font-mono text-xs',
        quiet ? 'text-fd-muted-foreground/70' : 'text-fd-muted-foreground',
      )}
    >
      {typeof type === 'string' ? (
        <span className="max-w-40 truncate px-1.5 leading-[1.375rem]" title={type}>
          {type}
        </span>
      ) : (
        type
      )}
      {action}
    </span>
  );
}

const rowButtonClassName =
  'flex h-10 w-full items-center gap-2 px-4 text-[0.8125rem] text-fd-muted-foreground transition-colors hover:bg-fd-accent/40 hover:text-fd-accent-foreground focus-visible:bg-fd-secondary focus-visible:text-fd-accent-foreground focus-visible:outline-none';

function getType(field: Schema): string | undefined {
  if (typeof field.type === 'string') return field.type;
  if (field.properties || field.patternProperties || field.additionalProperties) return 'object';
  if (field.items) return 'array';
}

function typeLabel(field: Schema, alias = false): string {
  return field.const !== undefined ? JSON.stringify(field.const) : stringify(field, { alias });
}

/** a union of `const` members, an `enum` whose values are named by their `title` */
function isConstUnion(union: readonly JsonSchema[] | undefined): union is Schema[] {
  return (
    union !== undefined &&
    union.length > 0 &&
    union.every((item) => typeof item === 'object' && item.const !== undefined)
  );
}

/** the values of a field rendered as a select */
function getOptions(field: Schema): { value: unknown; label: string }[] | undefined {
  const union = field.anyOf ?? field.oneOf;
  if (isConstUnion(union))
    return union.map((item) => ({
      value: item.const,
      label: item.title ?? valueLabel(item.const),
    }));

  const values =
    field.const !== undefined
      ? [field.const]
      : (field.enum ?? (field.type === 'boolean' ? [true, false] : undefined));
  return values?.map((value) => ({ value, label: valueLabel(value) }));
}

interface Suggestion {
  value: string;
  label: string;
}

function getSuggestions(field: Schema): Suggestion[] | undefined {
  const union = field.anyOf ?? field.oneOf;
  if (!union) return;
  const suggestions: Suggestion[] = [];
  let open = false;
  for (const item of union) {
    if (typeof item !== 'object') return;
    if (typeof item.const === 'string')
      suggestions.push({ value: item.const, label: item.title ?? item.const });
    else if (item.type === 'string' && item.const === undefined && item.enum === undefined)
      open = true;
    else return;
  }
  if (open && suggestions.length > 0) return suggestions;
}

function valueLabel(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Resolve the unions and multiple types of a field from its value, like `useFieldInfo()` does initially.
 */
export function resolveField(schema: JsonSchema, value: unknown, depth = 0): Schema | undefined {
  let field = dereference(schema);
  if (typeof field !== 'object') return;
  if (field.allOf) field = mergeAllOf(field) as Schema;

  const union = field.anyOf ?? field.oneOf;
  if (union && union.length > 0 && depth < 4) {
    const idx = union.findIndex((item) => typeof item === 'object' && matches(item, value));
    return resolveField(union[idx === -1 ? 0 : idx], value, depth + 1);
  }

  if (Array.isArray(field.type))
    return { ...field, type: field.type.find((item) => matchesType(value, item)) ?? field.type[0] };
  return field;
}

/** the candidates that open in their own panel, the siblings of a nested field */
export function getNestedFields(engine: DataEngine, candidates: FieldEntry[]): FieldEntry[] {
  const out: FieldEntry[] = [];
  for (const item of candidates) {
    const field = resolveField(item.schema, engine.get(item.fieldName));
    const type = field && getType(field);
    if (type === 'object' || type === 'array') out.push(item);
  }
  return out;
}

function joinNodes(a: ReactNode, b: ReactNode): ReactNode {
  if (a && b)
    return (
      <>
        {a}
        {b}
      </>
    );
  return a ?? b;
}

/**
 * Resolve the unions and multiple types of a schema to the selected one, with the selectors to change it.
 */
function SchemaSwitch({
  fieldName,
  schema,
  depth = 0,
  children,
}: {
  fieldName: FieldKey;
  schema: JsonSchema;
  depth?: number;
  children: (field: Schema, selector: ReactNode) => ReactNode;
}) {
  const field = useResolvedSchema(schema);
  const { info, updateInfo } = useFieldInfo(fieldName, field, depth);
  const union = info.unionField ? field[info.unionField] : undefined;
  const types = Array.isArray(field.type) ? field.type : undefined;
  const member = useMemo(() => getMember(field, info), [field, info]);

  // a union of `const` members is one select, not a switch between them
  if (member === undefined || isConstUnion(union) || getSuggestions(field))
    return children(field, null);

  let selector: ReactNode = null;
  if (union && union.length > 1) {
    selector = (
      <TypeSelect
        value={String(info.oneOf)}
        options={union.map((item, i) => ({
          value: String(i),
          label: stringify(item, { alias: true }),
        }))}
        onChange={(v) => updateInfo({ oneOf: Number(v) })}
      />
    );
  } else if (types && types.length > 1) {
    selector = (
      <TypeSelect
        value={info.selectedType ?? types[0]}
        options={types.map((type) => ({ value: type, label: type }))}
        onChange={(v) => updateInfo({ selectedType: v })}
      />
    );
  }

  return (
    <SchemaSwitch fieldName={fieldName} schema={member} depth={depth + 1}>
      {(resolved, inner) => children(resolved, joinNodes(selector, inner))}
    </SchemaSwitch>
  );
}

/** the member of a union or a multi-type field chosen by `info` */
function getMember(field: Schema, info: FieldInfo): JsonSchema | undefined {
  const union = info.unionField ? field[info.unionField] : undefined;
  if (union && union.length > 0) return union[info.oneOf];
  if (!Array.isArray(field.type)) return;
  const type = info.selectedType ?? field.type[0];
  // the default and examples of other types aren't values of this one
  return {
    ...field,
    type,
    default: matchesType(field.default, type) ? field.default : undefined,
    examples: field.examples?.filter((example) => matchesType(example, type)),
  };
}

function TypeSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const t = useTranslations({ note: 'playground' });

  return (
    <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectPrimitive.Trigger
        aria-label={t('Type')}
        className={cn(segmentClassName, 'max-w-40 min-w-0 cursor-pointer gap-0.5 ps-1.5 pe-1')}
      >
        <SelectValue className="truncate" />
        <SelectPrimitive.Icon className="shrink-0">
          <ChevronsUpDown className="size-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="font-mono text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface RowProps {
  name: string;
  required?: boolean;
  /** a card opened from the name, like the description of field */
  info?: ReactNode;
  /** id of the control labelled by `name` */
  htmlFor?: string;
  /** a cell without input, not highlighted on hover */
  readOnly?: boolean;
  /** a field out of the request, its name muted */
  quiet?: boolean;
  /** after the cell in a column of its own, like the type and actions of field */
  aside?: ReactNode;
  children: ReactNode;
}

/** a field in the editor: its name, its input filling the cell, then its type and actions */
export function Row({
  name,
  required = false,
  info,
  htmlFor,
  readOnly = false,
  quiet = false,
  aside,
  children,
}: RowProps) {
  const nameClassName = cn(
    'truncate font-mono text-[0.8125rem]',
    quiet ? 'text-fd-muted-foreground' : 'text-fd-foreground',
  );

  return (
    <div
      className={cn(
        'group/row grid grid-cols-[minmax(0,1fr)_auto] border-b transition-colors last:border-b-0 @max-sm:pb-3 @sm:min-h-10 @sm:grid-cols-[minmax(9rem,1fr)_minmax(0,2fr)]',
        // the field is the unit of a table, it highlights as a whole
        !readOnly && 'hover:bg-fd-accent/40 has-focus-visible:bg-fd-secondary',
      )}
    >
      <div className="flex min-w-0 items-center gap-1 py-2 ps-4 pe-3 @max-sm:pb-1.5">
        {info ? (
          <Popover.Root>
            <label htmlFor={htmlFor} className="sr-only">
              {name}
            </label>
            <Popover.Trigger
              openOnHover
              delay={200}
              closeDelay={100}
              title={name}
              className={cn(
                nameClassName,
                'cursor-help rounded-sm decoration-dotted underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:underline',
              )}
            >
              {name}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
                <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border bg-fd-popover p-3 text-fd-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
                  {info}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <label htmlFor={htmlFor} title={name} className={nameClassName}>
            {name}
          </label>
        )}
        {required && <span className="-ms-0.5 text-red-400">*</span>}
      </div>
      {/* stacked, the aside sits on the line of name above the value */}
      <div className="contents @sm:flex @sm:min-w-0">
        <div className="col-span-full row-start-2 flex min-h-9 min-w-0 flex-1 items-stretch text-[0.8125rem] @max-sm:mx-4 @max-sm:overflow-hidden @max-sm:rounded-lg @max-sm:border @max-sm:bg-fd-secondary/50 @sm:min-h-10 @sm:border-s">
          {children}
        </div>
        {aside && (
          <div className="col-start-2 row-start-1 flex shrink-0 items-center pe-4 @max-sm:pt-2 @max-sm:pb-1.5">
            {aside}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRange(
  value: string,
  min: number | undefined,
  exclusiveMin: number | undefined,
  max: number | undefined,
  exclusiveMax: number | undefined,
): string | undefined {
  const out: string[] = [];
  if (min !== undefined) out.push(`${min} <=`);
  else if (exclusiveMin !== undefined) out.push(`${exclusiveMin} <`);
  out.push(value);
  if (max !== undefined) out.push(`<= ${max}`);
  else if (exclusiveMax !== undefined) out.push(`< ${exclusiveMax}`);
  if (out.length > 1) return out.join(' ');
}

/** the card of a field: its description and constraints, `null` without them */
function useFieldCard(name: string, field: Schema, description?: string): ReactNode {
  const t = useTranslations({ note: 'schema UI' });
  const constraints: [label: string, value: string][] = [];

  if (field.default !== undefined) constraints.push([t('Default'), JSON.stringify(field.default)]);
  let range = formatRange(
    'value',
    field.minimum,
    field.exclusiveMinimum,
    field.maximum,
    field.exclusiveMaximum,
  );
  if (range) constraints.push([t('Range'), range]);
  range = formatRange('length', field.minLength, undefined, field.maxLength, undefined);
  if (range) constraints.push([t('Length'), range]);
  range = formatRange('items', field.minItems, undefined, field.maxItems, undefined);
  if (range) constraints.push([t('Items'), range]);
  if (field.format && field.format !== 'binary') constraints.push([t('Format'), field.format]);
  if (field.pattern) constraints.push([t('Match'), field.pattern]);
  if (field.examples && field.examples.length > 0)
    constraints.push([t('Example'), JSON.stringify(field.examples[0])]);

  if (!description && constraints.length === 0) return null;

  return (
    <>
      <p className="flex items-baseline gap-3">
        <span className="truncate font-mono text-[0.8125rem] font-medium">{name}</span>
        <span className="ms-auto shrink-0 font-mono text-xs text-fd-muted-foreground">
          {typeLabel(field)}
        </span>
      </p>
      {description && (
        <div className="mt-1.5 text-xs leading-relaxed text-fd-muted-foreground prose-no-margin [&_a]:underline [&_code]:font-mono">
          <FieldMarkdown md={description} />
        </div>
      )}
      {constraints.length > 0 && (
        <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t pt-2.5 text-xs">
          {constraints.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-fd-muted-foreground">{label}</dt>
              <dd className="truncate font-mono" title={value}>
                {value}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </>
  );
}

function ActionButton({
  label,
  onClick,
  tabIndex,
  children,
}: {
  label: string;
  onClick: MouseEventHandler;
  tabIndex?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={tabIndex}
      onClick={onClick}
      className={cn(segmentClassName, 'w-6 justify-center [&_svg]:size-3')}
    >
      {children}
    </button>
  );
}

interface FieldProps {
  name: string;
  /** placed at the end of its input box */
  type?: ReactNode;
  required?: boolean;
  /** show the required mark, defaults to `required` */
  marked?: boolean;
  description?: string;
  fieldName: FieldKey;
  field: Schema;
  /** fixed text before its input, like the scheme of a token */
  start?: ReactNode;
  /** in the last column, like unsetting the value */
  action?: ReactNode;
  /** after its input */
  end?: ReactNode;
}

export function ValueRow({
  fieldName,
  field,
  type,
  start,
  end,
  required,
  marked = required,
  name,
  description,
  action,
}: FieldProps) {
  const id = stringifyFieldKey(fieldName);

  return (
    <Row
      name={name}
      required={marked}
      htmlFor={id}
      info={useFieldCard(name, field, description)}
      aside={(type || action) && <TypePill type={type} action={action} />}
    >
      {start && (
        <label htmlFor={id} className="flex shrink-0 items-center ps-3 text-fd-muted-foreground">
          {start}
        </label>
      )}
      <FieldValue id={id} fieldName={fieldName} field={field} />
      {end}
    </Row>
  );
}

/** the input of a primitive field */
function FieldValue({ id, fieldName, field }: { id: string; fieldName: FieldKey; field: Schema }) {
  const [value, setValue] = useFieldValue(fieldName);
  const t = useTranslations({ note: 'playground' });

  if (field.type === 'null')
    return <span className="flex flex-1 items-center px-3 font-mono text-xs">null</span>;

  if (field.type === 'string' && field.format === 'binary') {
    return (
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3">
        <Upload className="size-3.5 shrink-0 text-fd-muted-foreground" />
        {value instanceof File ? (
          <span className="truncate">{value.name}</span>
        ) : (
          <span className="text-fd-muted-foreground">{t('Choose a file')}</span>
        )}
        <input
          id={id}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.item(0);
            if (file) setValue(file);
          }}
        />
      </label>
    );
  }

  const suggestions = getSuggestions(field);
  if (suggestions) {
    return (
      <CellAutocomplete
        id={id}
        items={suggestions}
        value={value == null ? '' : String(value)}
        onValueChange={(v) => setValue(v)}
        placeholder={t('Enter value')}
      />
    );
  }

  const options = getOptions(field);
  if (options && options.length > 0) {
    const idx = options.findIndex((option) => option.value === value);

    return (
      <CellSelect
        id={id}
        items={options.map((option, i) => ({
          value: String(i),
          // literal values, like the cell shows them
          label: <span className="font-mono text-xs">{option.label}</span>,
        }))}
        value={idx !== -1 ? String(idx) : null}
        onValueChange={(v) => setValue(options[Number(v)].value)}
        placeholder={t('Select')}
      />
    );
  }

  const isNumber = field.type === 'integer' || field.type === 'number';
  const isSecret = field.format === 'password';
  const hint = field.default ?? field.examples?.[0];
  return (
    <input
      id={id}
      type={isNumber ? 'number' : isSecret ? 'password' : 'text'}
      step={isNumber ? 'any' : undefined}
      autoComplete="off"
      spellCheck={false}
      placeholder={
        // a secret is empty until entered, not an empty string
        value === '' && !isSecret
          ? '""'
          : hint !== undefined && typeof hint !== 'object'
            ? String(hint)
            : t('Enter value')
      }
      value={value == null ? '' : String(value)}
      onChange={(e) => {
        if (!isNumber) setValue(e.target.value);
        else setValue(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber);
      }}
      className="min-w-0 flex-1 bg-transparent px-3 text-fd-foreground outline-none placeholder:text-fd-muted-foreground/70"
    />
  );
}

/** an object or array, opened in its own panel */
function NavRow({
  fieldName,
  field,
  type,
  required,
  marked = required,
  name,
  description,
  action,
  onNavigate,
}: FieldProps & { onNavigate: () => void }) {
  const t = useTranslations({ note: 'playground' });
  const id = stringifyFieldKey(fieldName);
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
    <Row
      name={name}
      required={marked}
      htmlFor={id}
      info={useFieldCard(name, field, description)}
      aside={<TypePill type={type} action={action} />}
    >
      <button
        id={id}
        type="button"
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center px-3 text-start outline-none"
      >
        {preview !== null ? (
          <span className="truncate font-mono text-xs">{preview}</span>
        ) : (
          <span className="text-fd-muted-foreground/70">{t('Not set')}</span>
        )}
      </button>
    </Row>
  );
}

interface CellSelectItem {
  value: string;
  label: ReactNode;
  /** shown under the label in the list */
  description?: ReactNode;
}

/** a select filling a cell */
export function CellSelect({
  id,
  items,
  value,
  onValueChange,
  placeholder,
}: {
  id?: string;
  items: CellSelectItem[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v !== null && onValueChange(v)}>
      {/* the whole cell opens it */}
      <SelectPrimitive.Trigger
        id={id}
        className="flex min-w-0 flex-1 cursor-pointer items-center px-3 text-start text-fd-foreground outline-none data-placeholder:text-fd-muted-foreground"
      >
        {/* the arrow ends the cell, so arrows line up across rows */}
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 font-mono text-xs">
          <SelectValue className="truncate" placeholder={placeholder} />
          <SelectPrimitive.Icon className="shrink-0 text-fd-muted-foreground">
            <ChevronDown className="size-3.5" />
          </SelectPrimitive.Icon>
        </span>
      </SelectPrimitive.Trigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            description={
              item.description && (
                <span className="text-xs text-fd-muted-foreground">{item.description}</span>
              )
            }
            className="text-[0.8125rem]"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function matchesSuggestion(item: Suggestion, query: string): boolean {
  const q = query.toLowerCase();
  return item.value.toLowerCase().includes(q) || item.label.toLowerCase().includes(q);
}

function CellAutocomplete({
  id,
  items,
  value,
  onValueChange,
  placeholder,
}: {
  id: string;
  items: Suggestion[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const filled = items.some((item) => item.value === value);

  return (
    <Autocomplete.Root
      items={items}
      value={value}
      onValueChange={onValueChange}
      itemToStringValue={(item) => item.value}
      filter={filled ? null : matchesSuggestion}
      openOnInputClick
    >
      <Autocomplete.InputGroup className="flex min-w-0 flex-1 items-center">
        <Autocomplete.Input
          id={id}
          spellCheck={false}
          placeholder={placeholder}
          className="min-w-0 flex-1 self-stretch bg-transparent px-3 text-fd-foreground outline-none placeholder:text-fd-muted-foreground/70"
        />
      </Autocomplete.InputGroup>
      <Autocomplete.Portal>
        <Autocomplete.Positioner align="start" sideOffset={4} className="z-50">
          <Autocomplete.Popup className="max-h-[min(var(--available-height),20rem)] min-w-[calc(var(--anchor-width)+--spacing(2))] overflow-y-auto rounded-lg border bg-fd-popover p-1 text-fd-popover-foreground shadow-md data-empty:hidden">
            <Autocomplete.List>
              {(item: Suggestion) => (
                <Autocomplete.Item
                  key={item.value}
                  value={item}
                  className="flex select-none items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] outline-none data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground"
                >
                  {item.label}
                  {item.value === value && (
                    <Check className="ms-auto size-3.5 shrink-0 text-fd-primary" />
                  )}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}

export function SelectRow({
  name,
  ...props
}: Omit<Parameters<typeof CellSelect>[0], 'id'> & { name: string }) {
  const id = useId();

  return (
    <Row name={name} htmlFor={id}>
      <CellSelect id={id} {...props} />
    </Row>
  );
}

/** a row of read-only text */
export function TextRow({
  name,
  description,
  copyable = false,
  children,
}: {
  name: string;
  description?: string;
  /** add a button copying the text */
  copyable?: boolean;
  children: string;
}) {
  return (
    <Row
      name={name}
      readOnly
      info={useFieldCard(name, { type: 'string' }, description)}
      aside={copyable && <TypePill action={<CopyButton text={children} />} />}
    >
      <span className="flex min-w-0 flex-1 items-center px-3 text-fd-muted-foreground">
        <span className="truncate">{children}</span>
      </span>
    </Row>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations({ note: 'playground' });
  const [isChecked, onCopy] = useCopyButton(() => navigator.clipboard.writeText(text));

  return (
    <ActionButton
      label={isChecked ? t('Copied', { note: 'aria-label' }) : t('Copy', { note: 'aria-label' })}
      onClick={onCopy}
    >
      {isChecked ? <Check /> : <Copy />}
    </ActionButton>
  );
}

/** a row opening something else, like a panel */
export function LinkRow({
  name,
  onClick,
  children,
}: {
  name: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(rowButtonClassName, 'group/nav border-b last:border-b-0')}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-start">
        <span className="truncate">{children}</span>
        <ChevronRight className="size-3.5 shrink-0 text-fd-muted-foreground transition-transform duration-200 group-hover/nav:translate-x-0.5 motion-reduce:transition-none" />
      </span>
      <span className="shrink-0 font-mono text-xs text-fd-muted-foreground">{name}</span>
    </button>
  );
}

/** a row toggled on click, its check box in the last column */
export function CheckRow({
  name,
  checked,
  onCheckedChange,
  children,
}: {
  name: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  const id = useId();

  return (
    <Row name={name} htmlFor={id}>
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className="flex min-w-0 flex-1 items-center gap-2 px-3 text-start outline-none"
      >
        <span className="min-w-0 flex-1 truncate text-fd-muted-foreground">{children}</span>
        <span className="flex shrink-0">
          <span
            className={cn(
              'flex size-4 items-center justify-center rounded-[5px] border transition-colors',
              checked
                ? 'border-fd-primary bg-fd-primary text-fd-primary-foreground'
                : 'border-fd-muted-foreground/50',
            )}
          >
            {checked && <Check className="size-3" />}
          </span>
        </span>
      </button>
    </Row>
  );
}

/** an optional field out of the request, clicking it adds the field and moves to its input */
function QuietRow({
  name,
  fieldName,
  field,
  description,
  type,
  onNavigate,
}: {
  name: string;
  fieldName: FieldKey;
  field: Schema;
  description?: string;
  type?: ReactNode;
  onNavigate: () => void;
}) {
  const engine = useDataEngine();
  const { generateDefault } = useSchemaUtils();
  const { info } = useFieldInfo(fieldName, field);
  const t = useTranslations({ note: 'playground' });
  const id = stringifyFieldKey(fieldName);
  const label = t('Add {name}', { variables: { name } });
  const example = field.const ?? field.default ?? field.examples?.[0];
  // objects show their preview once added
  const hint = example !== null && typeof example === 'object' ? undefined : example;

  // the type chosen before stays, the value matches it
  const member = getMember(field, info) ?? field;
  function add() {
    engine.update(fieldName, generateDefault(member));
  }

  /** add it, then move to its editor */
  function edit() {
    flushSync(add);
    const kind = getType(resolveField(member, engine.get(fieldName)) ?? field);
    if (kind === 'object' || kind === 'array') return onNavigate();

    const editor = document.getElementById(id);
    editor?.focus();
    if (editor instanceof HTMLInputElement) editor.select();
    else editor?.click();
  }

  return (
    <Row
      name={name}
      htmlFor={id}
      quiet
      info={useFieldCard(name, field, description)}
      aside={
        <TypePill
          quiet
          type={type ?? typeLabel(field, true)}
          action={
            <ActionButton label={label} tabIndex={-1} onClick={add}>
              <Plus />
            </ActionButton>
          }
        />
      }
    >
      <button
        id={id}
        type="button"
        aria-label={label}
        onClick={edit}
        className="flex min-w-0 flex-1 items-center px-3 text-start text-fd-muted-foreground/70 outline-none"
      >
        {/* what adding it gives */}
        {hint !== undefined && (
          <span
            className={cn(
              'truncate',
              (typeof hint !== 'string' || getOptions(field)) && 'font-mono text-xs',
            )}
          >
            {valueLabel(hint)}
          </span>
        )}
      </button>
    </Row>
  );
}

export function getRemoval(required: boolean, removable: boolean): FieldEntry['removal'] {
  if (removable) return 'remove';
  if (!required) return 'unset';
}

export function FieldRow({
  entry: { name, fieldName, schema },
  required = false,
  description,
  type: label,
  onNavigate,
  onRemove,
}: {
  entry: FieldEntry;
  required?: boolean;
  description?: string;
  /** the type label, in place of the one of schema */
  type?: ReactNode;
  onNavigate: () => void;
  onRemove?: () => void;
}) {
  const { readOnly, writeOnly } = useSchemaContext();
  const resolved = useResolvedSchema(schema);
  const engine = useDataEngine();
  const t = useTranslations({ note: 'playground' });
  const [isUnset] = useFieldValue(fieldName, { compute: (value) => value === undefined });
  if (schema === false) return null;
  if (!required && isUnset) {
    if ((resolved.readOnly && !readOnly) || (resolved.writeOnly && !writeOnly)) return null;
    return (
      <QuietRow
        name={name}
        fieldName={fieldName}
        field={resolved}
        description={description ?? resolved.description}
        type={label}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <SchemaSwitch fieldName={fieldName} schema={schema}>
      {(field, selector) => {
        if ((field.readOnly && !readOnly) || (field.writeOnly && !writeOnly)) return null;
        const props: FieldProps = {
          name,
          required,
          // removable items are required, but not marked
          marked: required && !onRemove,
          description: description ?? resolved.description ?? field.description,
          fieldName,
          field,
          action: onRemove ? (
            <ActionButton label={t('Remove Item', { note: 'aria-label' })} onClick={onRemove}>
              <Trash2 />
            </ActionButton>
          ) : (
            !required && (
              <ActionButton label={t('Unset')} onClick={() => engine.delete(fieldName)}>
                <X />
              </ActionButton>
            )
          ),
        };
        const type = getType(field);

        // their unions are selected in their own panels
        if (type === 'object' || type === 'array')
          return (
            <NavRow {...props} type={label ?? typeLabel(field, true)} onNavigate={onNavigate} />
          );
        return <ValueRow {...props} type={selector ?? label ?? typeLabel(field)} />;
      }}
    </SchemaSwitch>
  );
}

function ObjectRows({
  fieldName,
  field,
  onNavigate,
}: {
  fieldName: FieldKey;
  field: Schema;
  onNavigate: NavigateFn;
}) {
  const t = useTranslations({ note: 'playground' });
  const { generateDefault } = useSchemaUtils();
  const schemaKeys = field.properties ? Object.keys(field.properties) : [];
  const {
    patternProperties = {},
    additionalProperties,
    'x-playground-lazy': isLazy = schemaKeys.length > 100,
  } = field as Schema & {
    /** render the fields only when added, defaults to objects with over 100 properties */
    'x-playground-lazy'?: boolean;
  };
  const isDynamic = Object.keys(patternProperties).length > 0 || Boolean(additionalProperties);
  const { properties, onAppend, onDelete, _objectKeys } = useObject(fieldName, {
    lazy: isLazy,
    defaultValue: () => generateDefault(field) as object,
    properties: field.properties ?? {},
    fallback: additionalProperties,
    patternProperties,
  });
  const hiddenKeys = isLazy ? schemaKeys.filter((key) => !_objectKeys.includes(key)) : [];
  const entries = properties.map((child): FieldEntry => ({
    fieldName: child.field,
    name: child.key,
    schema: child.info,
    removal: getRemoval(field.required?.includes(child.key) ?? false, child.kind !== 'fixed'),
  }));

  return (
    <>
      {properties.map((child, i) => (
        <FieldRow
          key={child.key}
          entry={entries[i]}
          required={field.required?.includes(child.key)}
          onNavigate={() => onNavigate(entries[i], entries)}
          onRemove={child.kind === 'fixed' ? undefined : () => onDelete(child.key)}
        />
      ))}
      {hiddenKeys.length > 0 && (
        <Select value={null} onValueChange={(v) => v !== null && onAppend(v)}>
          <SelectPrimitive.Trigger
            className={cn(rowButtonClassName, 'cursor-pointer border-b last:border-b-0')}
          >
            <Plus className="size-3.5 shrink-0" />
            <span className="flex min-w-0 items-center gap-1.5">
              <SelectValue className="truncate" placeholder={t('Show Property')} />
              <SelectPrimitive.Icon className="shrink-0">
                <ChevronDown className="size-3.5" />
              </SelectPrimitive.Icon>
            </span>
          </SelectPrimitive.Trigger>
          <SelectContent>
            {hiddenKeys.map((key) => (
              <SelectItem key={key} value={key} className="font-mono text-[0.8125rem]">
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {isDynamic && <NewPropertyRow onAppend={onAppend} />}
    </>
  );
}

function NewPropertyRow({ onAppend }: { onAppend: (name: string) => void }) {
  const t = useTranslations({ note: 'playground' });
  const [name, setName] = useState('');
  function add() {
    onAppend(name);
    setName('');
  }

  return (
    <div className="flex min-h-10 items-center gap-2 border-b ps-4 pe-4 last:border-b-0">
      <Plus className="size-3.5 shrink-0 text-fd-muted-foreground" />
      <input
        value={name}
        aria-label={t('Property Name')}
        placeholder={t('Enter Property Name')}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          add();
        }}
        className="h-10 min-w-0 flex-1 bg-transparent font-mono text-[0.8125rem] outline-none placeholder:text-fd-muted-foreground/70"
      />
      <button
        type="button"
        disabled={name.trim().length === 0}
        onClick={add}
        className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'px-2.5')}
      >
        {t('Add')}
      </button>
    </div>
  );
}

function ArrayRows({
  fieldName,
  field,
  onNavigate,
}: {
  fieldName: FieldKey;
  field: Schema;
  onNavigate: NavigateFn;
}) {
  const t = useTranslations({ note: 'playground' });
  const { generateDefault } = useSchemaUtils();
  const { items, insertItem, removeItem } = useArray(fieldName);
  const itemSchema = field.items ?? anyFields;
  const entries = items.map((item): FieldEntry => ({
    fieldName: item.field,
    name: `[${item.index}]`,
    schema: itemSchema,
    removal: 'remove',
  }));

  return (
    <>
      {entries.map((entry, i) => (
        <FieldRow
          key={i}
          entry={entry}
          required
          onNavigate={() => onNavigate(entry, entries)}
          onRemove={() => removeItem(i)}
        />
      ))}
      <button
        type="button"
        onClick={() => insertItem(generateDefault(itemSchema))}
        className={rowButtonClassName}
      >
        <Plus className="size-3.5" />
        {t('Add Item')}
      </button>
    </>
  );
}

/** the rows of a field: properties for objects, items for arrays, an input otherwise */
export function FieldRows({
  entry,
  onNavigate,
  showDescription = false,
}: {
  entry: FieldEntry;
  onNavigate: NavigateFn;
  showDescription?: boolean;
}) {
  const t = useTranslations({ note: 'playground' });

  return (
    <SchemaSwitch fieldName={entry.fieldName} schema={entry.schema}>
      {(field, selector) => {
        const type = getType(field);
        let rows: ReactNode;
        if (type === 'object') {
          rows = <ObjectRows fieldName={entry.fieldName} field={field} onNavigate={onNavigate} />;
        } else if (type === 'array') {
          rows = <ArrayRows fieldName={entry.fieldName} field={field} onNavigate={onNavigate} />;
        } else {
          rows = (
            <ValueRow
              name={entry.name}
              type={typeLabel(field)}
              required
              fieldName={entry.fieldName}
              field={field}
            />
          );
        }

        return (
          <>
            {showDescription && field.description && (
              <div className="border-b px-4 py-2.5 text-xs text-fd-muted-foreground [&_a]:underline">
                <FieldMarkdown md={field.description} />
              </div>
            )}
            {selector && (
              <div className="flex min-h-10 items-center gap-2 border-b ps-4 pe-4 text-xs text-fd-muted-foreground">
                {t('Schema')}
                <span className="ms-auto">
                  <TypePill type={selector} />
                </span>
              </div>
            )}
            {rows}
          </>
        );
      }}
    </SchemaSwitch>
  );
}

function FieldMarkdown({ md }: { md: string }) {
  const { Markdown } = useSchemaContext();

  return Markdown ? <Markdown md={md} /> : md;
}
