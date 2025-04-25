'use client';
import {
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  useState,
} from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Controller,
  useController,
  useFieldArray,
  useFormContext,
} from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import type { RequestSchema } from '@/playground/index';
import { resolve } from '@/playground/resolve';
import { Input, labelVariants } from '@/ui/components/input';
import { getDefaultValue } from './get-default-values';
import { useSchemaContext } from './client';
import { cn } from 'fumadocs-ui/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

type FieldOfType<Type> = Extract<RequestSchema, { type: Type }>;
interface InputHeaderProps {
  name?: ReactNode;
  required?: boolean;
  type?: string;
}

function FieldHeader({
  name,
  required = false,
  type,
  ...props
}: InputHeaderProps & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn('w-full inline-flex items-center gap-1', props.className)}
    >
      <span className={cn(labelVariants())}>{name}</span>
      {required ? <span className="text-red-500">*</span> : null}
      <div className="flex-1" />
      {type ? (
        <code className="text-xs text-fd-muted-foreground">{type}</code>
      ) : null}
      {props.children}
    </label>
  );
}

export function ObjectInput({
  field,
  fieldName,
  ...props
}: {
  field: FieldOfType<'object'>;
  fieldName: string;
} & HTMLAttributes<HTMLDivElement>) {
  const { references } = useSchemaContext();

  return (
    <div {...props} className={cn('flex flex-col gap-6', props.className)}>
      {Object.entries(field.properties).map(([key, child]) => (
        <FieldSet
          key={key}
          name={key}
          field={resolve(child, references)}
          fieldName={`${fieldName}.${key}`}
        />
      ))}
      {field.additionalProperties ? (
        <AdditionalProperties
          fieldName={fieldName}
          type={field.additionalProperties}
        />
      ) : null}
    </div>
  );
}

export function JsonInput({ fieldName }: { fieldName: string }) {
  const controller = useController({
    name: fieldName,
  });
  const [value, setValue] = useState(() =>
    JSON.stringify(controller.field.value, null, 2),
  );

  return (
    <textarea
      {...controller.field}
      value={value}
      className="w-full h-[300px] text-[13px] font-mono resize-none rounded-lg border p-2 bg-fd-secondary text-fd-secondary-foreground focus-visible:outline-none"
      onChange={(v) => {
        setValue(v.target.value);
        try {
          controller.field.onChange(JSON.parse(v.target.value));
        } catch {
          // ignore
        }
      }}
    />
  );
}

function AdditionalProperties({
  fieldName,
  type,
}: {
  fieldName: string;
  type: boolean | string;
}) {
  const { control, setValue, getValues } = useFormContext();
  const { references } = useSchemaContext();
  const [nextName, setNextName] = useState('');
  const [properties, setProperties] = useState<string[]>(() => {
    const value = getValues(fieldName);
    if (value) return Object.keys(value);

    return [];
  });

  const types =
    typeof type === 'string'
      ? resolveDynamicTypes(references[type], references)
      : anyFields;

  const onAppend = () => {
    const name = nextName.trim();
    if (name.length === 0) return;

    setProperties((p) => {
      if (p.includes(name)) return p;

      setValue(
        `${fieldName}.${name}`,
        getDefaultValue(Object.values(types)[0], references),
      );
      setNextName('');
      return [...p, name];
    });
  };

  return (
    <>
      {properties.map((item) => (
        <FieldSet
          key={item}
          name={item}
          field={{
            type: 'switcher',
            items: types,
            isRequired: false,
          }}
          fieldName={`${fieldName}.${item}`}
          toolbar={
            <button
              type="button"
              aria-label="Remove Item"
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  size: 'sm',
                }),
              )}
              onClick={() => {
                setProperties((p) => p.filter((prop) => prop !== item));
                control.unregister(`${fieldName}.${item}`);
              }}
            >
              <Trash2 className="size-4" />
            </button>
          }
        />
      ))}
      <div className="flex flex-row gap-1">
        <Input
          value={nextName}
          placeholder="Enter Property Name"
          onChange={(e) => {
            setNextName(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAppend();
              e.preventDefault();
            }
          }}
        />
        <button
          type="button"
          className={cn(buttonVariants({ color: 'secondary' }))}
          onClick={onAppend}
        >
          New
        </button>
      </div>
    </>
  );
}

function resolveDynamicTypes(
  schema: RequestSchema,
  references: Record<string, RequestSchema>,
): Record<string, RequestSchema> {
  if (schema.type !== 'switcher') return { [schema.type]: schema };

  return Object.fromEntries(
    Object.entries(schema.items).map(([key, value]) => [
      key,
      resolve(value, references),
    ]),
  );
}

const anyFields: Record<string, RequestSchema> = {
  string: {
    type: 'string',
    isRequired: false,
  },
  boolean: {
    type: 'boolean',
    isRequired: false,
  },
  number: {
    type: 'number',
    isRequired: false,
  },
  object: {
    type: 'object',
    properties: {},
    additionalProperties: true,
    isRequired: false,
  },
};

anyFields.array = {
  type: 'array',
  isRequired: false,
  items: {
    type: 'switcher',
    isRequired: false,
    items: anyFields,
  },
};

export function FieldInput({
  field,
  fieldName,
  ...props
}: HTMLAttributes<HTMLElement> & {
  field: Exclude<RequestSchema, { type: 'switcher' }>;
  fieldName: string;
}) {
  const { control, register } = useFormContext();

  if (field.type === 'null') return null;

  if (field.type === 'object') {
    return (
      <ObjectInput
        field={field}
        fieldName={fieldName}
        {...props}
        className={cn(
          'rounded-lg border border-fd-primary/20 bg-fd-background/50 p-3 shadow-sm',
          props.className,
        )}
      />
    );
  }

  if (field.type === 'array') {
    return (
      <ArrayInput
        fieldName={fieldName}
        field={field}
        {...props}
        className={cn(
          'rounded-lg border border-fd-primary/20 bg-fd-background/50 p-3 shadow-sm',
          props.className,
        )}
      />
    );
  }

  if (field.type === 'file') {
    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field: { value: _, onChange, ...restField } }) => (
          <input
            id={fieldName}
            type="file"
            multiple={false}
            onChange={(e) => {
              if (!e.target.files) return;
              onChange(e.target.files.item(0));
            }}
            {...props}
            {...restField}
          />
        )}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field: { value, onChange, ...restField } }) => (
          <Select
            value={String(value)}
            onValueChange={(value) =>
              onChange(value === 'null' ? null : value === 'true')
            }
            disabled={restField.disabled}
          >
            <SelectTrigger
              id={fieldName}
              className={props.className}
              {...restField}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
              {field.isRequired ? null : (
                <SelectItem value="null">Null</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      />
    );
  }

  return (
    <Input
      id={fieldName}
      placeholder="Enter value"
      type={field.type === 'string' ? 'text' : 'number'}
      {...register(fieldName, {
        valueAsNumber: field.type === 'number',
      })}
      {...props}
    />
  );
}

export function FieldSet({
  field,
  fieldName,
  toolbar,
  name,
  ...props
}: HTMLAttributes<HTMLElement> & {
  name?: ReactNode;
  field: RequestSchema;
  fieldName: string;
  toolbar?: ReactNode;
}) {
  const form = useFormContext();
  const { references, dynamic } = useSchemaContext();
  const [type, setType] = useState<string>(() => {
    if (field.type !== 'switcher') return '';
    const d = dynamic.current.get(fieldName);
    const items = Object.keys(field.items);

    if (d?.type === 'field') {
      // schemas are passed from server components, object references are maintained
      const cached = items.find((item) => d.schema === field.items[item]);

      if (cached) return cached;
    }

    const value = form.getValues(fieldName);
    let type: string = typeof value;

    if (Array.isArray(value)) {
      type = 'array';
    } else if (value instanceof File) {
      type = 'file';
    } else if (value === null) {
      type = 'null';
    }

    return items.find((item) => field.items[item].type === type) ?? items[0];
  });

  if (field.type === 'null') return null;

  if (field.type === 'switcher') {
    const child = resolve(field.items[type], references);

    return (
      <fieldset
        {...props}
        className={cn('flex flex-col gap-1.5', props.className)}
      >
        <FieldHeader
          name={name}
          htmlFor={fieldName}
          required={field.isRequired}
        >
          <select
            value={type}
            onChange={(e) => {
              const value = e.target.value;
              if (value === type) return;

              setType(value);
              dynamic.current.set(fieldName, {
                type: 'field',
                schema: field.items[value],
              });
              form.setValue(
                fieldName,
                getDefaultValue(field.items[value], references),
              );
            }}
            className="text-xs"
          >
            {Object.keys(field.items).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {toolbar}
        </FieldHeader>
        <p className="text-xs text-fd-muted-foreground">{field.description}</p>
        {child.type === 'switcher' ? (
          <FieldSet field={child} fieldName={fieldName} />
        ) : (
          <FieldInput field={child} fieldName={fieldName} />
        )}
      </fieldset>
    );
  }

  return (
    <fieldset
      {...props}
      className={cn('flex flex-col gap-1.5', props.className)}
    >
      <FieldHeader
        htmlFor={fieldName}
        name={name}
        required={field.isRequired}
        type={field.type}
      >
        {toolbar}
      </FieldHeader>
      <FieldInput field={field} fieldName={fieldName} />
    </fieldset>
  );
}

function ArrayInput({
  fieldName,
  field,
  ...props
}: {
  fieldName: string;
  field: {
    description?: string;
    items: RequestSchema | string;
  };
} & HTMLAttributes<HTMLDivElement>) {
  const { references } = useSchemaContext();
  const items = resolve(field.items, references);
  const name = fieldName.split('.').at(-1) ?? '';
  const { fields, append, remove } = useFieldArray({
    name: fieldName,
  });

  return (
    <div {...props} className={cn('flex flex-col gap-2', props.className)}>
      {fields.map((item, index) => (
        <FieldSet
          key={item.id}
          name={
            <span className="text-fd-muted-foreground">
              {name}[{index}]
            </span>
          }
          field={items}
          fieldName={`${fieldName}.${index}`}
          toolbar={
            <button
              type="button"
              aria-label="Remove Item"
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  size: 'sm',
                }),
              )}
              onClick={() => {
                remove(index);
              }}
            >
              <Trash2 className="size-4" />
            </button>
          }
        />
      ))}
      <button
        type="button"
        className={cn(
          buttonVariants({
            color: 'outline',
            className: 'gap-1.5 py-2',
            size: 'sm',
          }),
        )}
        onClick={() => {
          append(getDefaultValue(items, references));
        }}
      >
        <Plus className="size-4" />
        New Item
      </button>
    </div>
  );
}
