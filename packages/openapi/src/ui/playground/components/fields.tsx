'use client';
import { Fragment, type ReactNode, useId, useMemo, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronRight, Info, Plus, Trash2, Upload, X } from 'lucide-react';
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
  useFieldInfo,
  useResolvedSchema,
  useSchemaContext,
  useSchemaUtils,
} from 'shared-api/components/playground/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/utils/cn';
import { Markdown } from '@/ui/components/markdown';

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

export type NavigateFn = (entry: FieldEntry) => void;

/** the type of a field, at the end of its cell like a unit */
const typeClassName = 'flex shrink-0 items-center pe-1 font-mono text-xs text-fd-muted-foreground';

/** reserved at the end of every cell so their types align, holds the actions of field */
const slotClassName = 'flex w-7 shrink-0 items-center justify-center';

const rowButtonClassName =
  'flex h-10 w-full items-center gap-2 px-4 text-[0.8125rem] text-fd-muted-foreground transition-colors hover:bg-fd-accent/40 hover:text-fd-accent-foreground focus-visible:bg-fd-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-fd-ring/60';

function getType(field: Schema): string | undefined {
  if (typeof field.type === 'string') return field.type;
  if (field.properties || field.patternProperties || field.additionalProperties) return 'object';
  if (field.items) return 'array';
}

function typeLabel(field: Schema, alias = false): string {
  return field.const !== undefined ? JSON.stringify(field.const) : stringify(field, { alias });
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
  const member = useMemo<JsonSchema | undefined>(() => {
    if (union && union.length > 0) return union[info.oneOf];
    if (types) return { ...field, type: info.selectedType ?? types[0] };
  }, [field, union, types, info.oneOf, info.selectedType]);

  if (member === undefined) return children(field, null);

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

  // styled as the type label, aligned to it by the negative margin
  return (
    <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectPrimitive.Trigger
        aria-label={t('Type')}
        className="-me-1 max-w-40 min-w-0 cursor-pointer truncate rounded-md px-1 py-0.5 font-mono text-xs text-fd-muted-foreground underline decoration-fd-muted-foreground/50 decoration-dotted underline-offset-[3px] transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring/50 data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground"
      >
        <SelectValue />
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
  /** shown after the name, like the description of field */
  info?: ReactNode;
  /** id of the control labelled by `name` */
  htmlFor?: string;
  /** a cell without input, not highlighted on hover */
  readOnly?: boolean;
  children: ReactNode;
}

/** a field in the editor: its name on the left, its input filling the cell on the right */
export function Row({
  name,
  required = false,
  info,
  htmlFor,
  readOnly = false,
  children,
}: RowProps) {
  return (
    <div className="group/row grid border-b last:border-b-0 @max-sm:pb-3 @sm:min-h-10 @sm:grid-cols-[minmax(9rem,1fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 items-center gap-1 py-2 ps-4 pe-3 @max-sm:pb-1.5">
        <label
          htmlFor={htmlFor}
          title={name}
          className="truncate font-mono text-[0.8125rem] text-fd-foreground"
        >
          {name}
        </label>
        {required && <span className="-ms-0.5 text-red-400">*</span>}
        {info}
      </div>
      <div
        className={cn(
          'flex min-h-9 min-w-0 items-stretch text-[0.8125rem] transition-colors @max-sm:mx-4 @max-sm:overflow-hidden @max-sm:rounded-lg @max-sm:border @max-sm:bg-fd-secondary/50 @sm:min-h-10 @sm:border-s',
          !readOnly &&
            'hover:bg-fd-accent/40 has-focus-visible:bg-fd-secondary has-focus-visible:ring-1 has-focus-visible:ring-fd-ring/60 has-focus-visible:ring-inset',
        )}
      >
        {children}
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

/** the description and constraints of a field, opened from an info button on hover or click */
function FieldInfo({
  name,
  field,
  description,
}: {
  name: string;
  field: Schema;
  description?: string;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const tPlayground = useTranslations({ note: 'playground' });
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
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={200}
        closeDelay={100}
        aria-label={tPlayground('Field Info')}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-fd-muted-foreground/70 transition-colors hover:text-fd-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:text-fd-foreground"
      >
        <Info className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border bg-fd-popover p-3 text-fd-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <p className="flex items-baseline gap-3">
              <span className="truncate font-mono text-[0.8125rem] font-medium">{name}</span>
              <span className="ms-auto shrink-0 font-mono text-xs text-fd-muted-foreground">
                {typeLabel(field)}
              </span>
            </p>
            {description && (
              <div className="mt-1.5 text-xs leading-relaxed text-fd-muted-foreground prose-no-margin [&_a]:underline [&_code]:font-mono">
                <Markdown md={description} />
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
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SlotButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
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

function UnsetButton({ fieldName }: { fieldName: FieldKey }) {
  const engine = useDataEngine();
  const t = useTranslations({ note: 'playground' });
  const [isDefined] = useFieldValue(fieldName, {
    compute: (value) => value !== undefined,
  });
  if (!isDefined) return null;

  return (
    <SlotButton label={t('Unset')} onClick={() => engine.delete(fieldName)}>
      <X />
    </SlotButton>
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
  /** in the reserved slot at the end of its cell */
  slot?: ReactNode;
  /** before the slot */
  end?: ReactNode;
}

export function ValueRow({
  fieldName,
  field,
  type,
  end,
  required,
  marked = required,
  name,
  description,
  slot,
}: FieldProps) {
  const id = stringifyFieldKey(fieldName);

  return (
    <Row
      name={name}
      required={marked}
      htmlFor={id}
      info={<FieldInfo name={name} field={field} description={description} />}
    >
      <FieldValue id={id} fieldName={fieldName} field={field} required={required} />
      {type && <span className={typeClassName}>{type}</span>}
      {end}
      <span className={slotClassName}>{slot}</span>
    </Row>
  );
}

/** the type in the cell of a primitive field, its selector when it has multiple */
function cellType(field: Schema, selector: ReactNode): ReactNode {
  if (selector) return selector;
  // the options of selects and `null` tell the type already
  if (field.enum === undefined && field.const === undefined && field.type !== 'null')
    return typeLabel(field);
}

/** the input of a primitive field */
function FieldValue({
  id,
  fieldName,
  field,
  required = false,
}: {
  id: string;
  fieldName: FieldKey;
  field: Schema;
  required?: boolean;
}) {
  const [value, setValue] = useFieldValue(fieldName);
  const t = useTranslations({ note: 'playground' });

  if (field.type === 'null')
    return (
      <span className="flex flex-1 items-center px-3 font-mono text-fd-muted-foreground">null</span>
    );

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

  const options = field.const !== undefined ? [field.const] : field.enum;
  if (options && options.length > 0) {
    const idx = options.indexOf(value);
    const items: { value: string; label: ReactNode }[] = options.map((item, i) => ({
      value: String(i),
      label: typeof item === 'string' ? item : JSON.stringify(item),
    }));
    if (!required)
      items.push({
        value: '-1',
        label: <span className="text-fd-muted-foreground">{t('Unset')}</span>,
      });

    return (
      <CellSelect
        id={id}
        items={items}
        value={idx !== -1 ? String(idx) : required ? null : '-1'}
        onValueChange={(v) => setValue(v === '-1' ? undefined : options[Number(v)])}
        placeholder={t('Select')}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="flex flex-1 items-center gap-0.5 px-2">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={value === option}
            onClick={() => setValue(option)}
            className="h-6 rounded px-2 font-mono text-xs text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring aria-pressed:bg-fd-background aria-pressed:text-fd-foreground aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-fd-border dark:aria-pressed:bg-fd-accent"
          >
            {String(option)}
          </button>
        ))}
      </div>
    );
  }

  const isNumber = field.type === 'integer' || field.type === 'number';
  const hint = field.default ?? field.examples?.[0];
  return (
    <input
      id={id}
      type={isNumber ? 'number' : field.format === 'password' ? 'password' : 'text'}
      step={isNumber ? 'any' : undefined}
      autoComplete="off"
      spellCheck={false}
      placeholder={
        value === ''
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
      info={<FieldInfo name={name} field={field} description={description} />}
    >
      <NavButton id={id} type={type} onClick={onNavigate}>
        <span
          className={cn(
            'font-mono text-xs',
            preview === null ? 'text-fd-muted-foreground/70' : 'text-fd-muted-foreground',
          )}
        >
          {preview ?? t('Not set')}
        </span>
      </NavButton>
    </Row>
  );
}

/** fills a cell, opens something else on click */
function NavButton({
  id,
  type,
  onClick,
  children,
}: {
  id?: string;
  type?: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="group/nav flex min-w-0 flex-1 items-center ps-3 text-start outline-none"
    >
      <span className="min-w-0 flex-1 truncate pe-2">{children}</span>
      {type && <span className={typeClassName}>{type}</span>}
      <span className={slotClassName}>
        <ChevronRight className="size-3.5 text-fd-muted-foreground transition-transform duration-200 group-hover/nav:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </button>
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
      <SelectTrigger
        id={id}
        className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent py-0 ps-3 pe-1 text-[0.8125rem] hover:bg-transparent focus:ring-0 focus-visible:outline-none"
      >
        <SelectValue className="truncate" placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="text-[0.8125rem]">
            {item.description ? (
              <span className="flex flex-col">
                {item.label}
                <span className="text-xs text-fd-muted-foreground">{item.description}</span>
              </span>
            ) : (
              item.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
      <span className={slotClassName} />
    </Row>
  );
}

/** a row of read-only text */
export function TextRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <Row name={name} readOnly>
      <span className="flex min-w-0 flex-1 items-center px-3 text-fd-muted-foreground">
        <span className="truncate">{children}</span>
      </span>
      <span className={slotClassName} />
    </Row>
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
  const id = useId();

  return (
    <Row name={name} htmlFor={id}>
      <NavButton id={id} onClick={onClick}>
        <span className="text-fd-muted-foreground">{children}</span>
      </NavButton>
    </Row>
  );
}

/** a row toggled on click, its check box takes the slot */
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
        className="flex min-w-0 flex-1 items-center ps-3 text-start outline-none"
      >
        <span className="min-w-0 flex-1 truncate pe-2 text-fd-muted-foreground">{children}</span>
        <span className={slotClassName}>
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

export function getRemoval(required: boolean, removable: boolean): FieldEntry['removal'] {
  if (removable) return 'remove';
  if (!required) return 'unset';
}

export function FieldRow({
  name,
  fieldName,
  schema,
  required = false,
  description,
  onNavigate,
  onRemove,
}: {
  name: string;
  fieldName: FieldKey;
  schema: JsonSchema;
  required?: boolean;
  description?: string;
  onNavigate: NavigateFn;
  onRemove?: () => void;
}) {
  const { readOnly, writeOnly } = useSchemaContext();
  const resolved = useResolvedSchema(schema);
  const t = useTranslations({ note: 'playground' });
  if (schema === false) return null;
  const removal = getRemoval(required, onRemove !== undefined);

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
          slot: onRemove ? (
            <SlotButton label={t('Remove Item', { note: 'aria-label' })} onClick={onRemove}>
              <Trash2 />
            </SlotButton>
          ) : (
            !required && <UnsetButton fieldName={fieldName} />
          ),
        };
        const type = getType(field);

        // their unions are selected in their own panels
        if (type === 'object' || type === 'array')
          return (
            <NavRow
              {...props}
              type={typeLabel(field, true)}
              onNavigate={() => onNavigate({ fieldName, name, schema, removal })}
            />
          );
        return <ValueRow {...props} type={cellType(field, selector)} />;
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
  const engine = useDataEngine();
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

  function navigate(entry: FieldEntry) {
    const candidates: FieldEntry[] = [];
    for (const child of properties)
      candidates.push({
        fieldName: child.field,
        name: child.key,
        schema: child.info,
        removal: getRemoval(field.required?.includes(child.key) ?? false, child.kind !== 'fixed'),
      });

    onNavigate({ ...entry, siblings: getNestedFields(engine, candidates) });
  }

  return (
    <>
      {properties.map((child) => (
        <FieldRow
          key={child.key}
          name={child.key}
          fieldName={child.field}
          schema={child.info}
          required={field.required?.includes(child.key)}
          onNavigate={navigate}
          onRemove={child.kind === 'fixed' ? undefined : () => onDelete(child.key)}
        />
      ))}
      {hiddenKeys.length > 0 && (
        <Select value={null} onValueChange={(v) => v !== null && onAppend(v)}>
          <SelectTrigger
            className={cn(
              rowButtonClassName,
              'rounded-none border-0 border-b bg-transparent p-0 ps-4 last:border-b-0 focus:ring-0',
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
    <div className="flex min-h-10 items-center gap-2 border-b ps-4 pe-1.5 last:border-b-0">
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
  const engine = useDataEngine();
  const { generateDefault } = useSchemaUtils();
  const { items, insertItem, removeItem } = useArray(fieldName);
  const itemSchema = field.items ?? anyFields;

  function navigate(entry: FieldEntry) {
    const candidates: FieldEntry[] = [];
    for (const item of items)
      candidates.push({
        fieldName: item.field,
        name: `[${item.index}]`,
        schema: itemSchema,
        removal: 'remove',
      });

    onNavigate({ ...entry, siblings: getNestedFields(engine, candidates) });
  }

  return (
    <>
      {items.map((item) => (
        <FieldRow
          key={item.index}
          name={`[${item.index}]`}
          fieldName={item.field}
          schema={itemSchema}
          required
          onNavigate={navigate}
          onRemove={() => removeItem(item.index)}
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
              type={cellType(field, null)}
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
                <Markdown md={field.description} />
              </div>
            )}
            {selector && (
              <div className="flex min-h-10 items-center gap-2 border-b px-4 text-xs text-fd-muted-foreground">
                {t('Schema')}
                <span className="ms-auto">{selector}</span>
              </div>
            )}
            {rows}
          </>
        );
      }}
    </SchemaSwitch>
  );
}
