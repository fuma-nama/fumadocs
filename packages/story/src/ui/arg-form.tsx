'use client';
import { type ComponentProps, type HTMLAttributes, type ReactNode, useState } from 'react';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { FieldKey, useArray, useDataEngine, useObject } from '@fumari/stf';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { Input, labelVariants } from '@/ui/components/input';
import { getDefaultValue } from '../get-default-values';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { FormatFlags, typeToString } from '@/utils/type-to-string';
import { useFieldInfo, useResolvedTypeNode } from '@/playground/schema';
import type { TypeNode } from '../lib/types';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';

function FieldLabel(props: ComponentProps<'label'>) {
  return (
    <label {...props} className={cn('w-full inline-flex items-center gap-0.5', props.className)}>
      {props.children}
    </label>
  );
}

function FieldLabelName({
  required = false,
  ...props
}: ComponentProps<'span'> & { required?: boolean }) {
  return (
    <span {...props} className={cn(labelVariants(), 'font-mono me-auto', props.className)}>
      {props.children}
      {required && <span className="text-red-400/80 mx-1">*</span>}
    </span>
  );
}

function FieldLabelType(props: ComponentProps<'code'>) {
  return (
    <code {...props} className={cn('text-xs text-fd-muted-foreground', props.className)}>
      {props.children}
    </code>
  );
}

export function ObjectInput({
  field,
  fieldName,
  ...props
}: {
  field: Extract<TypeNode, { type: 'object' }>;
  fieldName: FieldKey;
} & ComponentProps<'div'>) {
  const node = useResolvedTypeNode(field);

  const propertiesMap =
    node.type === 'object'
      ? Object.fromEntries(node.properties.map((prop) => [prop.name, prop.type]))
      : {};

  const { properties } = useObject(fieldName, {
    defaultValue: getDefaultValue(node) as object,
    properties: propertiesMap,
  });

  if (node.type !== 'object') return null;

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
  const [value, setValue] = engine.useFieldValue(fieldName);
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

  if (field.type === 'null' || field.type === 'undefined') {
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

  if (field.type === 'literal') {
    return renderUnset(
      <Input
        id={id}
        placeholder="Enter value"
        type={typeof field.value === 'number' ? 'number' : 'text'}
        value={String(value ?? field.value)}
        onChange={(e) => {
          if (typeof field.value === 'number') {
            setValue(Number.isNaN(e.target.valueAsNumber) ? field.value : e.target.valueAsNumber);
          } else {
            setValue(e.target.value);
          }
        }}
      />,
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

  const isNumber = field.type === 'number';
  return renderUnset(
    <Input
      id={id}
      placeholder="Enter value"
      type={isNumber ? 'number' : 'text'}
      value={String(value ?? '')}
      onChange={(e) => {
        if (isNumber) {
          setValue(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber);
        } else {
          setValue(e.target.value);
        }
      }}
    />,
  );
}

export function FieldSet({
  field: _field,
  fieldName,
  toolbar,
  name,
  isRequired,
  depth = 0,
  slotType,
  collapsible = true,
  ...props
}: HTMLAttributes<HTMLElement> & {
  isRequired?: boolean;
  name?: ReactNode;
  field: TypeNode;
  fieldName: FieldKey;
  depth?: number;

  slotType?: ReactNode;
  toolbar?: ReactNode;
  collapsible?: boolean;
}) {
  const field = useResolvedTypeNode(_field);
  const [show, setShow] = useState(!collapsible);
  const { info, updateInfo } = useFieldInfo(fieldName, field);
  const id = stringifyFieldKey(fieldName);
  const dataEngine = useDataEngine();

  if (field.type === 'union') {
    const showSelect = field.types.length > 1;
    const selectedType = field.types[info.unionIndex] ?? field.types[0]!;

    return (
      <FieldSet
        {...props}
        name={name}
        fieldName={fieldName}
        isRequired={isRequired}
        field={selectedType}
        depth={depth + 1}
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
    const merged = info.intersection?.merged ?? {
      type: 'object' as const,
      properties: field.types
        .filter((t): t is Extract<TypeNode, { type: 'object' }> => t.type === 'object')
        .flatMap((obj) => obj.properties),
    };

    return (
      <fieldset
        {...props}
        className={cn('flex flex-col gap-1.5 col-span-full @container', props.className)}
      >
        <FieldLabel htmlFor={id}>
          {collapsible && (
            <button
              type="button"
              onClick={() => {
                dataEngine.init(fieldName, getDefaultValue(merged));
                setShow((prev) => !prev);
              }}
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
          <FieldLabelName required={isRequired}>{name}</FieldLabelName>
          {slotType ?? <FieldLabelType>{typeToString(field)}</FieldLabelType>}
          {toolbar}
        </FieldLabel>
        {show && merged.type === 'object' && (
          <ObjectInput
            field={merged}
            fieldName={fieldName}
            {...props}
            className={cn(
              'rounded-lg border border-fd-primary/20 bg-fd-background/50 p-2 shadow-sm',
              props.className,
            )}
          />
        )}
      </fieldset>
    );
  }

  if (field.type === 'object') {
    return (
      <fieldset
        {...props}
        className={cn('flex flex-col gap-1.5 col-span-full @container', props.className)}
      >
        <FieldLabel htmlFor={id}>
          {collapsible && (
            <button
              type="button"
              onClick={() => {
                dataEngine.init(fieldName, getDefaultValue(field));
                setShow((prev) => !prev);
              }}
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
          <FieldLabelName required={isRequired}>{name}</FieldLabelName>
          {slotType ?? <FieldLabelType>{typeToString(field)}</FieldLabelType>}
          {toolbar}
        </FieldLabel>
        {show && (
          <ObjectInput
            field={field}
            fieldName={fieldName}
            {...props}
            className={cn(
              'rounded-lg border border-fd-primary/20 bg-fd-background/50 p-2 shadow-sm',
              props.className,
            )}
          />
        )}
      </fieldset>
    );
  }

  if (field.type === 'array') {
    return (
      <fieldset {...props} className={cn('flex flex-col gap-1.5 col-span-full', props.className)}>
        <FieldLabel htmlFor={id}>
          {collapsible && (
            <button
              type="button"
              onClick={() => {
                dataEngine.init(fieldName, getDefaultValue(field));
                setShow((prev) => !prev);
              }}
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
          <FieldLabelName required={isRequired}>{name}</FieldLabelName>
          {slotType ?? <FieldLabelType>{typeToString(field)}</FieldLabelType>}
          {toolbar}
        </FieldLabel>
        {show && (
          <ArrayInput
            fieldName={fieldName}
            items={field.elementType}
            {...props}
            className={cn(
              'rounded-lg border border-fd-primary/20 bg-fd-background/50 p-2 shadow-sm',
              props.className,
            )}
          />
        )}
      </fieldset>
    );
  }
  return (
    <fieldset {...props} className={cn('flex flex-col gap-1.5', props.className)}>
      <FieldLabel htmlFor={id}>
        <FieldLabelName required={isRequired}>{name}</FieldLabelName>
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
  const { items, insertItem, removeItem } = useArray(fieldName, []);

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
