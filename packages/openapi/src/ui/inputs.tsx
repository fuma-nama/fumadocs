import {
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { cn, buttonVariants } from 'fumadocs-ui/components/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import type { RequestSchema } from '@/render/playground';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  labelVariants,
} from '@/ui/components/form';
import { getDefaultValue, resolve } from '@/ui/shared';
import { Input } from '@/ui/components/input';
import { useSchemaContext } from './contexts/schema';

interface RenderOptions {
  field: RequestSchema;
  fieldName: string;
  className?: string;
}

function renderInner({ field, ...props }: RenderOptions): React.ReactNode {
  if (field.type === 'object')
    return (
      <ObjectInput
        field={field}
        {...props}
        className={cn('rounded-lg border p-3', props.className)}
      />
    );
  if (field.type === 'switcher') return <Switcher field={field} {...props} />;
  if (field.type === 'array')
    return (
      <ArrayInput
        field={field}
        {...props}
        className={cn('rounded-lg border p-3', props.className)}
      />
    );
  if (field.type === 'null') return null;

  return <NormalInput field={field} {...props} />;
}

interface InputProps<Type> extends HTMLAttributes<HTMLDivElement> {
  field: Extract<RequestSchema, { type: Type }>;
  fieldName: string;
}

function InputContainer(
  props: {
    name?: ReactNode;
    required: boolean;
    type?: string;
    description?: string;
  } & HTMLAttributes<HTMLDivElement>,
): React.ReactElement {
  return (
    <div
      {...props}
      className={cn('relative flex flex-col gap-2', props.className)}
    >
      <div className={cn(labelVariants(), 'inline-flex items-center gap-1')}>
        {props.name}
        {props.required ? <span className="text-red-500">*</span> : null}
        {props.type ? (
          <code className="ms-auto text-xs text-muted-foreground">
            {props.type}
          </code>
        ) : null}
      </div>
      <p className="text-xs">{props.description}</p>
      {props.children}
    </div>
  );
}

export function ObjectInput({
  field,
  fieldName,
  ...props
}: InputProps<'object'>): React.ReactElement {
  const { references } = useSchemaContext();

  return (
    <div {...props} className={cn('flex flex-col gap-4', props.className)}>
      {Object.entries(field.properties).map(([key, child]) => (
        <InputField
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
}): React.ReactElement {
  const { references, dynamic } = useSchemaContext();
  const [nextName, setNextName] = useState('');
  const [properties, setProperties] = useState<string[]>(() => {
    const d = dynamic.current.get(fieldName);
    if (d?.type === 'object') return d.properties;

    return [];
  });

  useEffect(() => {
    dynamic.current.set(fieldName, { type: 'object', properties });
  }, [dynamic, fieldName, properties]);

  const onAppend = useCallback(() => {
    if (nextName.length === 0) return;
    setProperties((p) => (p.includes(nextName) ? p : [...p, nextName]));
    setNextName('');
  }, [nextName]);

  const types =
    typeof type === 'string'
      ? resolveDynamicTypes(references[type], references)
      : undefined;

  return (
    <>
      {properties.map((item) => (
        <DynamicField
          key={item}
          label={item}
          types={types}
          fieldName={`${fieldName}.${item}`}
          onDelete={() => {
            setProperties((p) => p.filter((prop) => prop !== item));
          }}
        />
      ))}
      <div className="flex flex-row gap-1">
        <Input
          value={nextName}
          placeholder="Enter Property Name"
          onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            setNextName(e.target.value);
          }, [])}
          onKeyDown={useCallback(
            (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                onAppend();
                e.preventDefault();
              }
            },
            [onAppend],
          )}
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

function DynamicField({
  fieldName,
  label,
  types = {
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
  },
  className,
  onDelete,
}: {
  fieldName: string;
  label: string;
  /**
   * Available types, fallback to any
   */
  types?: Record<string, RequestSchema>;
  className?: string;
  onDelete: () => void;
}): React.ReactElement {
  const { dynamic } = useSchemaContext();
  const typeNames = Object.keys(types);
  const [value, setValue] = useState<string>(() => {
    const d = dynamic.current.get(fieldName);

    if (d?.type === 'field') {
      return typeNames.find((name) => types[name] === d.schema) ?? typeNames[0];
    }

    return typeNames[0];
  });

  useEffect(() => {
    if (!value) return;

    dynamic.current.set(fieldName, {
      type: 'field',
      schema: types[value],
    });
  }, [value, fieldName, types, dynamic]);

  return (
    <InputContainer
      name={
        <>
          {label}
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="ms-auto h-auto gap-1 p-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeNames.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
            <button
              type="button"
              aria-label="Remove Item"
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  size: 'sm',
                }),
              )}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </button>
          </Select>
        </>
      }
      className={className}
      required={false}
    >
      {renderInner({
        field: types[value],
        fieldName,
      })}
    </InputContainer>
  );
}

function Switcher({
  field,
  fieldName,
  className,
}: InputProps<'switcher'>): React.ReactElement {
  const { references, dynamic } = useSchemaContext();
  const items = Object.keys(field.items);
  const [value, setValue] = useState<string>(() => {
    const d = dynamic.current.get(fieldName);

    if (d?.type === 'field') {
      // schemas are passed from server components, they shouldn't be re-constructed
      const cached = items.find((item) => d.schema === field.items[item]);

      if (cached) return cached;
    }

    return items[0];
  });

  useEffect(() => {
    if (!value) return;

    dynamic.current.set(fieldName, {
      type: 'field',
      schema: field.items[value],
    });
  }, [value, fieldName, field, dynamic]);

  return (
    <div className={className}>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="ms-auto h-auto p-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {renderInner({
        field: resolve(field.items[value], references),
        fieldName,
      })}
    </div>
  );
}

export function InputField({
  field,
  name,
  fieldName,
  ...props
}: {
  name?: string;
  field: RequestSchema;
  fieldName: string;
  className?: string;
}): React.ReactNode {
  const { references } = useSchemaContext();

  if (field.type === 'object') {
    return (
      <InputContainer
        name={name}
        required={field.isRequired}
        type={field.type}
        description={field.description}
        {...props}
      >
        <ObjectInput
          field={field}
          fieldName={fieldName}
          className="rounded-lg border bg-accent/30 p-3"
        />
      </InputContainer>
    );
  }

  if (field.type === 'array') {
    return (
      <InputContainer
        name={name}
        required={field.isRequired}
        description={field.description ?? references[field.items].description}
        type={`array<${references[field.items].type}>`}
        {...props}
      >
        <ArrayInput
          fieldName={fieldName}
          field={field}
          className="rounded-lg border bg-background p-3"
        />
      </InputContainer>
    );
  }

  if (field.type === 'switcher') {
    return (
      <InputContainer
        name={name}
        description={field.description}
        required={field.isRequired}
        {...props}
      >
        <Switcher field={field} fieldName={fieldName} />
      </InputContainer>
    );
  }

  if (field.type === 'null') return null;

  return (
    <NormalInput
      field={field}
      fieldName={fieldName}
      header={
        <>
          <FormLabel className="inline-flex gap-1">
            {name}
            {field.isRequired ? <span className="text-red-500">*</span> : null}
            <code className="ms-auto text-xs text-muted-foreground">
              {field.type}
            </code>
          </FormLabel>
          <FormDescription className="text-xs">
            {field.description}
          </FormDescription>
        </>
      }
      {...props}
    />
  );
}

function NormalInput({
  fieldName,
  header,
  field,
  ...props
}: InputProps<'string' | 'boolean' | 'number'> & {
  header?: React.ReactNode;
}): React.ReactElement {
  const { control } = useFormContext();

  if (field.type === 'boolean') {
    return (
      <FormField
        control={control}
        name={fieldName}
        render={({ field: { value, onChange, ...restField } }) => (
          <FormItem {...props}>
            {header}
            <Select
              value={value as string}
              onValueChange={onChange}
              disabled={restField.disabled}
            >
              <FormControl>
                <SelectTrigger {...restField}>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
                {field.isRequired ? null : (
                  <SelectItem value="null">Null</SelectItem>
                )}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field: { value, ...restField } }) => (
        <FormItem {...props}>
          {header}
          <FormControl>
            <Input
              placeholder="Enter value"
              type={field.type === 'string' ? 'text' : 'number'}
              value={value as string}
              {...restField}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function ArrayInput({
  fieldName,
  field,
  ...props
}: InputProps<'array'>): React.ReactElement {
  const { references } = useSchemaContext();
  const { fields, append, remove } = useFieldArray({
    name: fieldName,
  });
  const items = references[field.items];

  const handleAppend = useCallback(() => {
    append(getDefaultValue(items, references));
  }, [append, references, items]);

  return (
    <div {...props} className={cn('flex flex-col gap-4', props.className)}>
      {fields.map((item, index) => (
        <div key={item.id} className="relative">
          {renderInner({
            field: items,
            fieldName: `${fieldName}.${String(index)}`,
            className: 'flex-1',
          })}
          <button
            type="button"
            aria-label="Remove Item"
            className={cn(
              buttonVariants({
                color: 'secondary',
                size: 'sm',
                className: 'absolute -top-2 -end-2',
              }),
            )}
            onClick={() => {
              remove(index);
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className={cn(
          buttonVariants({ color: 'secondary', className: 'gap-1.5' }),
        )}
        onClick={handleAppend}
      >
        <Plus className="size-4" />
        New Item
      </button>
    </div>
  );
}
