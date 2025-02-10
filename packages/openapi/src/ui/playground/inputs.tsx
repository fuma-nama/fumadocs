import {
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  useState,
} from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { cn, buttonVariants } from 'fumadocs-ui/components/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import type { RequestSchema } from '@/render/operation/playground';
import { resolve } from '@/ui/playground/resolve';
import { Input, labelVariants } from '@/ui/components/input';
import { getDefaultValue } from '@/ui/playground/get-default-values';
import { useSchemaContext } from '@/ui/contexts/schema';

type FieldOfType<Type> = Extract<RequestSchema, { type: Type }>;
interface InputHeaderProps {
  name?: string;
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

function AdditionalProperties({
  fieldName,
  type,
}: {
  fieldName: string;
  type: boolean | string;
}) {
  const { control, setValue } = useFormContext();
  const { references, dynamic } = useSchemaContext();
  const [nextName, setNextName] = useState('');
  const [properties, setProperties] = useState<string[]>(() => {
    const d = dynamic.current.get(`additional_${fieldName}`);
    if (d?.type === 'object') return d.properties;

    return [];
  });

  dynamic.current.set(`additional_${fieldName}`, {
    type: 'object',
    properties,
  });

  const onAppend = () => {
    const name = nextName.trim();
    if (name.length === 0) return;

    setProperties((p) => {
      if (p.includes(name)) return p;

      setValue(`${fieldName}.${name}`, '');
      setNextName('');
      return [...p, name];
    });
  };

  const types =
    typeof type === 'string'
      ? resolveDynamicTypes(references[type], references)
      : undefined;

  return (
    <>
      {properties.map((item) => (
        <FieldSet
          key={item}
          name={item}
          field={{
            type: 'switcher',
            items: types ?? anyFields,
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
    defaultValue: '',
  },
  boolean: {
    type: 'boolean',
    isRequired: false,
    defaultValue: '',
  },
  number: {
    type: 'number',
    isRequired: false,
    defaultValue: '',
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
          'rounded-lg border border-fd-primary/20 bg-fd-card p-3 shadow-sm',
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
          'rounded-lg border border-fd-primary/20 bg-fd-background p-3 shadow-sm',
          props.className,
        )}
      />
    );
  }

  if (field.type === 'file' || field.type === 'boolean') {
    return (
      <Controller
        control={control}
        name={fieldName}
        render={({ field: { value, onChange, ...restField } }) =>
          field.type === 'file' ? (
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
          ) : (
            <Select
              value={value as string}
              onValueChange={onChange}
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
          )
        }
      />
    );
  }

  return (
    <Input
      id={fieldName}
      placeholder="Enter value"
      type={field.type === 'string' ? 'text' : 'number'}
      {...register(fieldName)}
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
  name?: string;
  field: RequestSchema;
  fieldName: string;
  toolbar?: ReactNode;
}) {
  const { references, dynamic } = useSchemaContext();
  const [value, setValue] = useState<string>(() => {
    if (field.type !== 'switcher') return '';
    const d = dynamic.current.get(fieldName);
    const items = Object.keys(field.items);

    if (d?.type === 'field') {
      // schemas are passed from server components, they shouldn't be re-constructed
      const cached = items.find((item) => d.schema === field.items[item]);

      if (cached) return cached;
    }

    return items[0];
  });

  if (field.type === 'null') return null;

  if (value && field.type === 'switcher') {
    dynamic.current.set(fieldName, {
      type: 'field',
      schema: field.items[value],
    });
  }

  if (field.type === 'switcher') {
    const child = resolve(field.items[value], references);

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
            value={value}
            onChange={(e) => setValue(e.target.value)}
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
  const { fields, append, remove } = useFieldArray({
    name: fieldName,
  });

  return (
    <div {...props} className={cn('flex flex-col gap-2', props.className)}>
      {fields.map((item, index) => (
        <FieldSet
          key={item.id}
          name={`${fieldName.split('.').at(-1)}[${index}]`}
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
