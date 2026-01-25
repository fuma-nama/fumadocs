import { type ComponentProps, type HTMLAttributes, type ReactNode, useState } from 'react';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { FieldKey, useArray, useDataEngine, useFieldValue, useObject } from '@fumari/stf';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/select';
import { Input } from '@/client/components/input';
import { getDefaultValue } from '@/type-tree/sampler';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { FormatFlags, typeToString } from '@/type-tree/stringify';
import type { ObjectNode, TypeNode } from '@/type-tree/types';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { validate } from '@/type-tree/validator';
import { formatDateForInput } from '@/utils/date';
import { cva } from 'class-variance-authority';

const labelVariants = cva(
  'text-xs font-mono font-medium text-fd-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

function FieldLabel(props: ComponentProps<'label'>) {
  return (
    <label {...props} className={cn('w-full inline-flex items-center gap-0.5', props.className)}>
      {props.children}
    </label>
  );
}

function FieldLabelRequired() {
  return <span className="text-red-400/80 mx-1">*</span>;
}

function FieldLabelType(props: ComponentProps<'code'>) {
  return (
    <code {...props} className={cn('text-xs text-fd-muted-foreground', props.className)}>
      {props.children}
    </code>
  );
}

export function ObjectInput({
  field: node,
  fieldName,
  ...props
}: {
  field: ObjectNode;
  fieldName: FieldKey;
} & ComponentProps<'div'>) {
  const { properties } = useObject(fieldName, {
    defaultValue: () => getDefaultValue(node) as object,
    properties: Object.fromEntries(node.properties.map((prop) => [prop.name, prop.type])),
  });

  return (
    <div {...props} className={cn('grid grid-cols-1 gap-4 @md:grid-cols-2', props.className)}>
      {properties.map((child) => {
        const prop = node.properties.find((p) => p.name === child.key);
        if (!prop) return null;

        return (
          <FieldSet
            key={child.key}
            name={child.key}
            field={prop.type}
            fieldName={child.field}
            isRequired={prop.required}
          />
        );
      })}
    </div>
  );
}

export function JsonInput({ fieldName }: { fieldName: FieldKey }) {
  const engine = useDataEngine();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(() => JSON.stringify(engine.init(fieldName, {}), null, 2));

  return (
    <div className="flex flex-col bg-fd-secondary text-fd-secondary-foreground overflow-hidden border rounded-lg">
      <textarea
        value={value}
        className="p-2 h-[240px] text-sm font-mono resize-none focus-visible:outline-none"
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setValue(e.target.value);
          try {
            engine.update(fieldName, JSON.parse(e.target.value));
            setError(null);
          } catch (err) {
            if (err instanceof Error) setError(err.message);
          }
        }}
      />
      <p className="p-2 text-xs font-mono border-t text-red-400 empty:hidden">{error}</p>
    </div>
  );
}

export function FieldInput({
  field,
  fieldName,
  isRequired,
  ...props
}: HTMLAttributes<HTMLElement> & {
  field: TypeNode;
  isRequired?: boolean;
  fieldName: FieldKey;
}) {
  const engine = useDataEngine();
  const [value, setValue] = useFieldValue(fieldName);
  const id = stringifyFieldKey(fieldName);

  function renderUnset(children: ReactNode) {
    return (
      <div {...props} className={cn('flex flex-row gap-2', props.className)}>
        {children}
        {value !== undefined && !isRequired && (
          <button
            type="button"
            onClick={() => engine.delete(fieldName)}
            className="text-fd-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  if (
    field.type === 'null' ||
    field.type === 'undefined' ||
    field.type === 'never' ||
    field.type === 'unknown' ||
    field.type === 'literal'
  ) {
    return null;
  }

  if (field.type === 'enum') {
    const idx = field.members.findIndex((m) => m.value === value);

    return (
      <Select
        value={idx >= 0 ? String(idx) : '-1'}
        onValueChange={(v: string) => {
          const index = Number(v);
          if (index >= 0 && index < field.members.length) {
            setValue(field.members[index]!.value);
          } else {
            setValue(undefined);
          }
        }}
      >
        <SelectTrigger id={id} {...props}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {field.members.map((member, i) => (
            <SelectItem key={i} value={String(i)}>
              {member.label}
            </SelectItem>
          ))}
          {!isRequired && <SelectItem value="-1">Unset</SelectItem>}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'boolean') {
    return (
      <Select
        value={String(value)}
        onValueChange={(val: string) => setValue(val === 'undefined' ? undefined : val === 'true')}
      >
        <SelectTrigger id={id} {...props}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
          {!isRequired && <SelectItem value="undefined">Unset</SelectItem>}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === 'date') {
    return renderUnset(
      <Input
        id={id}
        placeholder="Enter value"
        type="date"
        value={value instanceof Date ? formatDateForInput(value) : ''}
        onChange={(e) => {
          setValue(e.target.valueAsDate ?? undefined);
        }}
      />,
    );
  }

  return renderUnset(
    <Input
      id={id}
      placeholder="Enter value"
      type={field.type === 'number' || field.type === 'bigint' ? 'number' : 'text'}
      value={String(value ?? '')}
      onChange={(e) => {
        if (field.type === 'bigint') {
          try {
            setValue(BigInt(e.target.value));
          } catch {
            setValue(undefined);
          }
        } else if (field.type === 'number') {
          setValue(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber);
        } else {
          setValue(e.target.value);
        }
      }}
    />,
  );
}

export function FieldSet(
  props: HTMLAttributes<HTMLElement> & {
    isRequired?: boolean;
    name?: ReactNode;
    field: TypeNode;
    fieldName: FieldKey;

    slotType?: ReactNode;
    toolbar?: ReactNode;
    collapsible?: boolean;
  },
) {
  const {
    field,
    fieldName,
    toolbar,
    name,
    isRequired,
    slotType,
    collapsible = true,
    ...rest
  } = props;
  const [show, setShow] = useState(!collapsible);
  const { info, updateInfo } = useFieldInfo(fieldName, field);
  const id = stringifyFieldKey(fieldName);
  const dataEngine = useDataEngine();
  const onShow = () => {
    dataEngine.init(fieldName, getDefaultValue(field));
    setShow((prev) => !prev);
  };

  if (field.type === 'never') return;

  if (field.type === 'union') {
    const showSelect = field.types.length > 1;
    const selectedType = field.types[info.unionIndex] ?? field.types[0]!;

    return (
      <FieldSet
        {...rest}
        name={name}
        fieldName={fieldName}
        isRequired={isRequired}
        field={selectedType}
        slotType={showSelect ? false : slotType}
        toolbar={
          <>
            {showSelect && (
              <select
                className="text-xs font-mono"
                value={info.unionIndex}
                onChange={(e) => {
                  updateInfo({
                    unionIndex: Number(e.target.value),
                  });
                }}
              >
                {field.types.map((item, i) => (
                  <option key={i} value={i} className="bg-fd-popover text-fd-popover-foreground">
                    {typeToString(item, FormatFlags.UseAlias)}
                  </option>
                ))}
              </select>
            )}
            {toolbar}
          </>
        }
      />
    );
  }

  if (field.type === 'intersection') {
    return <FieldSet {...props} field={field.intersection} />;
  }

  if (field.type === 'object') {
    return (
      <fieldset
        {...rest}
        className={cn('flex flex-col gap-1.5 col-span-full @container', rest.className)}
      >
        <FieldLabel htmlFor={id}>
          {collapsible && (
            <button
              type="button"
              onClick={onShow}
              className={cn(
                buttonVariants({
                  size: 'icon-xs',
                  color: 'ghost',
                  className: 'text-fd-muted-foreground',
                }),
              )}
            >
              <ChevronRight className={cn(show && 'rotate-90')} />
            </button>
          )}
          <button type="button" onClick={onShow} className={cn(labelVariants(), 'me-auto')}>
            {name}
            {isRequired && <FieldLabelRequired />}
          </button>
          {slotType ?? <FieldLabelType>{typeToString(field)}</FieldLabelType>}
          {toolbar}
        </FieldLabel>
        {show && (
          <ObjectInput
            field={field}
            fieldName={fieldName}
            className="rounded-lg border border-fd-primary/20 bg-fd-background/50 p-2 shadow-sm"
          />
        )}
      </fieldset>
    );
  }

  if (field.type === 'array') {
    return (
      <fieldset {...rest} className={cn('flex flex-col gap-1.5 col-span-full', rest.className)}>
        <FieldLabel htmlFor={id}>
          {collapsible && (
            <button
              type="button"
              onClick={onShow}
              className={cn(
                buttonVariants({
                  size: 'icon-xs',
                  color: 'ghost',
                  className: 'text-fd-muted-foreground -ms-1',
                }),
              )}
            >
              <ChevronRight className={cn(show && 'rotate-90')} />
            </button>
          )}
          <button type="button" onClick={onShow} className={cn(labelVariants(), 'me-auto')}>
            {name}
            {isRequired && <FieldLabelRequired />}
          </button>
          {slotType ?? <FieldLabelType>{typeToString(field)}</FieldLabelType>}
          {toolbar}
        </FieldLabel>
        {show && (
          <ArrayInput
            fieldName={fieldName}
            items={field.elementType}
            className="rounded-lg border border-fd-primary/20 bg-fd-background/50 p-2 shadow-sm"
          />
        )}
      </fieldset>
    );
  }
  return (
    <fieldset {...rest} className={cn('flex flex-col gap-1.5', rest.className)}>
      <FieldLabel htmlFor={id}>
        <span className={cn(labelVariants(), 'me-auto')}>
          {name}
          {isRequired && <FieldLabelRequired />}
        </span>
        {slotType ?? <FieldLabelType>{typeToString(field)}</FieldLabelType>}
        {toolbar}
      </FieldLabel>
      <FieldInput field={field} fieldName={fieldName} isRequired={isRequired} />
    </fieldset>
  );
}

function ArrayInput({
  fieldName,
  items: itemType,
  ...props
}: {
  fieldName: FieldKey;
  items: TypeNode;
} & ComponentProps<'div'>) {
  const name = fieldName.at(-1) ?? '';
  const { items, insertItem, removeItem } = useArray(fieldName, {
    defaultValue: [],
  });

  return (
    <div {...props} className={cn('flex flex-col gap-2', props.className)}>
      {items.map((item) => (
        <FieldSet
          key={item.index}
          name={
            <span className="text-fd-muted-foreground">
              {name}[{item.index}]
            </span>
          }
          field={itemType}
          isRequired
          fieldName={item.field}
          toolbar={
            <button
              type="button"
              aria-label="Remove Item"
              className={cn(
                buttonVariants({
                  color: 'outline',
                  size: 'icon-xs',
                }),
              )}
              onClick={() => removeItem(item.index)}
            >
              <Trash2 />
            </button>
          }
        />
      ))}
      <button
        type="button"
        className={cn(
          buttonVariants({
            color: 'secondary',
            className: 'gap-1.5 py-2',
            size: 'sm',
          }),
        )}
        onClick={() => {
          insertItem(getDefaultValue(itemType));
        }}
      >
        <Plus className="size-4" />
        New Item
      </button>
    </div>
  );
}

interface FieldInfo {
  unionIndex: number;
}

/**
 * A hook to store dynamic info of a field, such as selected type in union.
 */
function useFieldInfo(
  fieldName: FieldKey,
  node: TypeNode,
): {
  info: FieldInfo;
  updateInfo: (value: Partial<FieldInfo>) => void;
} {
  const engine = useDataEngine();
  const attachedData = engine.attachedData<FieldInfo>('field-info');
  const [info, setInfo] = useState<FieldInfo>(() => {
    const initialInfo = attachedData.get(fieldName);
    if (initialInfo) return initialInfo;

    const out: FieldInfo = {
      unionIndex: 0,
    };

    if (node.type === 'union') {
      // Try to find which union type matches the current value
      const matchingIndex = node.types.findIndex(validate);
      out.unionIndex = matchingIndex === -1 ? 0 : matchingIndex;
    }

    return out;
  });

  attachedData.set(fieldName, info);
  return {
    info,
    updateInfo: (value) => {
      const updated = {
        ...info,
        ...value,
      };

      if (updated.unionIndex === info.unionIndex) return;
      setInfo(updated);
      if (node.type === 'union' && node.types[updated.unionIndex]) {
        engine.update(fieldName, getDefaultValue(node.types[updated.unionIndex]));
      }
    },
  };
}
