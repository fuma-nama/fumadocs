import {
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { cn, buttonVariants } from 'fumadocs-ui/components/api';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
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
import { resolve } from '@/ui/playground/resolve';
import { Input } from '@/ui/components/input';
import { getDefaultValue } from '@/ui/playground/get-default-values';
import { useSchemaContext } from '../contexts/schema';

interface RenderOptions {
  field: RequestSchema;
  fieldName: string;
  className?: string;
}

function renderInner({ field, ...props }: RenderOptions) {
  if (field.type === 'object')
    return (
      <ObjectInput
        field={field}
        {...props}
        className={cn('rounded-lg border bg-fd-accent/20 p-3', props.className)}
      />
    );
  if (field.type === 'switcher')
    return <Switcher inline field={field} {...props} />;
  if (field.type === 'array')
    return (
      <ArrayInput
        field={field}
        {...props}
        className={cn(
          'rounded-lg border bg-fd-background p-3',
          props.className,
        )}
      />
    );
  if (field.type === 'null') return null;

  return <NormalInput field={field} {...props} />;
}

interface InputProps<Type> {
  field: Extract<RequestSchema, { type: Type }>;
  fieldName: string;
}

interface InputContainerProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  required: boolean;
  type?: string;
  description?: string;

  inline?: boolean;
  toolbar?: ReactNode;
}

function InputContainer({
  toolbar,
  name,
  required,
  type,
  description,
  inline = false,
  ...props
}: InputContainerProps) {
  return (
    <div {...props} className={cn('flex flex-col gap-1', props.className)}>
      <div className="inline-flex items-center gap-1">
        <span className={cn(labelVariants())}>{name}</span>
        {required ? <span className="text-red-500">*</span> : null}
        <div className="flex-1" />
        {type ? (
          <code className="text-xs text-fd-muted-foreground">{type}</code>
        ) : null}
        {toolbar}
      </div>
      {!inline ? <p className="text-xs">{description}</p> : null}
      {props.children}
    </div>
  );
}

export function ObjectInput({
  field,
  fieldName,
  ...props
}: InputProps<'object'> & HTMLAttributes<HTMLDivElement>): React.ReactElement {
  const { references } = useSchemaContext();

  return (
    <div {...props} className={cn('flex flex-col gap-6', props.className)}>
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
  const { control, setValue } = useFormContext();
  const { references, dynamic } = useSchemaContext();
  const [nextName, setNextName] = useState('');
  const [properties, setProperties] = useState<string[]>(() => {
    const d = dynamic.current.get(`additional_${fieldName}`);
    if (d?.type === 'object') return d.properties;

    return [];
  });

  useOnChange(properties, () => {
    dynamic.current.set(`additional_${fieldName}`, {
      type: 'object',
      properties,
    });
  });

  const onAppend = useCallback(() => {
    const name = nextName.trim();
    if (name.length === 0) return;

    setProperties((p) => {
      if (p.includes(name)) return p;

      setValue(`${fieldName}.${name}`, '');
      setNextName('');
      return [...p, name];
    });
  }, [nextName, setValue, fieldName]);

  const types =
    typeof type === 'string'
      ? resolveDynamicTypes(references[type], references)
      : undefined;

  return (
    <>
      {properties.map((item) => (
        <Switcher
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

function Switcher({
  field,
  fieldName,
  ...props
}: InputProps<'switcher'> & Partial<InputContainerProps>) {
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

  useOnChange(value, () => {
    if (!value) return;

    dynamic.current.set(fieldName, {
      type: 'field',
      schema: field.items[value],
    });
  });

  return (
    <InputContainer
      required={field.isRequired}
      description={field.description}
      {...props}
      toolbar={
        <>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="h-auto p-1 text-xs">
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
          {props.toolbar}
        </>
      }
    >
      {renderInner({
        field: resolve(field.items[value], references),
        fieldName,
      })}
    </InputContainer>
  );
}

export function InputField({
  field,
  fieldName,
  ...props
}: {
  field: RequestSchema;
  fieldName: string;
} & Partial<InputContainerProps>): React.ReactNode {
  const { references } = useSchemaContext();

  if (field.type === 'null') return null;

  if (field.type === 'object') {
    return (
      <InputContainer
        required={field.isRequired}
        type={field.type}
        description={field.description}
        {...props}
      >
        <ObjectInput
          field={field}
          fieldName={fieldName}
          className="rounded-lg border bg-fd-accent/20 p-3"
        />
      </InputContainer>
    );
  }

  if (field.type === 'array') {
    return (
      <InputContainer
        required={field.isRequired}
        description={
          field.description ?? resolve(field.items, references).description
        }
        type="array"
        {...props}
      >
        <ArrayInput
          fieldName={fieldName}
          field={field}
          className="rounded-lg border bg-fd-background p-3"
        />
      </InputContainer>
    );
  }

  if (field.type === 'switcher') {
    return <Switcher field={field} fieldName={fieldName} {...props} />;
  }

  const { toolbar, inline = false, name, ...rest } = props;

  return (
    <NormalInput
      field={field}
      fieldName={fieldName}
      header={
        <>
          <FormLabel className="inline-flex items-center gap-1">
            <span className={cn(labelVariants())}>{name}</span>
            {field.isRequired ? <span className="text-red-500">*</span> : null}
            <code className="ms-auto text-xs text-fd-muted-foreground">
              {field.type}
            </code>
            {toolbar}
          </FormLabel>
          {!inline ? (
            <FormDescription className="text-xs">
              {field.description}
            </FormDescription>
          ) : null}
        </>
      }
      {...rest}
    />
  );
}

function NormalInput({
  fieldName,
  header,
  field,
  ...props
}: InputProps<'string' | 'boolean' | 'number' | 'file'> & {
  header?: React.ReactNode;
}): React.ReactElement {
  const { control } = useFormContext();

  if (field.type === 'file') {
    return (
      <FormField
        control={control}
        name={fieldName}
        render={({ field: { value: _value, onChange, ...restField } }) => (
          <FormItem {...props}>
            {header}
            <FormControl>
              <input
                type="file"
                multiple={false}
                onChange={(e) => {
                  if (!e.target.files) return;
                  onChange(e.target.files.item(0));
                }}
                {...restField}
              />
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

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
}: {
  fieldName: string;
  field: {
    description?: string;
    items: RequestSchema | string;
  };
} & HTMLAttributes<HTMLDivElement>): React.ReactElement {
  const { references } = useSchemaContext();
  const items = resolve(field.items, references);
  const { fields, append, remove } = useFieldArray({
    name: fieldName,
  });

  const handleAppend = useCallback(() => {
    append(getDefaultValue(items, references));
  }, [append, references, items]);

  return (
    <div {...props} className={cn('flex flex-col gap-4', props.className)}>
      {fields.map((item, index) => (
        <InputField
          key={item.id}
          inline
          name={`Item ${String(index + 1)}`}
          field={items}
          fieldName={`${fieldName}.${String(index)}`}
          className="flex-1"
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
