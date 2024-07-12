import {
  createContext,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { PlusIcon, Trash2 } from 'lucide-react';
import useSWRImmutable from 'swr/immutable';
import type {
  APIPlaygroundProps,
  ReferenceSchema,
  RequestSchema,
} from 'fumadocs-openapi';
import { useApiContext } from '@/contexts/api';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  labelVariants,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { Accordion, Accordions } from '@/components/accordion';
import * as Base from '@/components/codeblock';
import { createBodyFromValue, getStatusInfo } from '@/components/api/fetcher';
import { buttonVariants } from '@/theme/variants';
import {
  getDefaultValue,
  getDefaultValues,
  resolve,
} from '@/components/api/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface APIPlaygroundFormData {
  authorization?: string | undefined;
  path?: Record<string, string>;
  query?: Record<string, string>;
  header?: Record<string, string>;
  body?: Record<string, unknown>;
}

export type DynamicField =
  | {
      type: 'object';
      properties: string[];
    }
  | {
      type: 'field';
      schema: RequestSchema | ReferenceSchema;
    };

interface SchemaContextType {
  references: Record<string, RequestSchema>;
  dynamic: MutableRefObject<Map<string, DynamicField>>;
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

function useSchemaContext(): SchemaContextType {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error('Missing provider');
  return ctx;
}

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  lang?: string;
};

function CodeBlock({
  code,
  lang = 'json',
  ...props
}: CodeBlockProps): React.ReactElement {
  const { highlighter } = useApiContext();
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!highlighter) return;

    const themedHtml = highlighter.codeToHtml(code, {
      lang,
      defaultColor: false,
      themes: { light: 'github-light', dark: 'github-dark' },
    });

    setHtml(themedHtml);
  }, [code, lang, highlighter]);

  return (
    <Base.CodeBlock className="my-0">
      <Base.Pre {...props} dangerouslySetInnerHTML={{ __html: html }} />
    </Base.CodeBlock>
  );
}

export function APIPlayground({
  route,
  method = 'GET',
  authorization,
  path = [],
  header = [],
  query = [],
  body,
  schemas,
}: APIPlaygroundProps & HTMLAttributes<HTMLFormElement>): React.ReactElement {
  const { baseUrl } = useApiContext();
  const dynamicRef = useRef(new Map<string, DynamicField>());
  const [input, setInput] = useState<APIPlaygroundFormData>();
  const form = useForm({
    defaultValues: {
      authorization: authorization?.defaultValue,
      path: getDefaultValues(path, schemas),
      query: getDefaultValues(query, schemas),
      header: getDefaultValues(header, schemas),
      body: body ? getDefaultValue(body, schemas) : undefined,
    },
  });

  const testQuery = useSWRImmutable(
    input ? [baseUrl, route, method, input] : null,
    async () => {
      if (!input) return;

      let pathname = route;
      Object.keys(input.path ?? {}).forEach((key) => {
        const paramValue = input.path?.[key];

        if (paramValue) pathname = pathname.replace(`{${key}}`, paramValue);
      });

      const url = new URL(pathname, baseUrl ?? window.location.origin);
      Object.keys(input.query ?? {}).forEach((key) => {
        const paramValue = input.query?.[key];
        if (paramValue) url.searchParams.append(key, paramValue);
      });

      const headers = new Headers({
        'Content-Type': 'application/json',
      });

      if (input.authorization) {
        headers.append('Authorization', input.authorization);
      }

      Object.keys(input.header ?? {}).forEach((key) => {
        const paramValue = input.header?.[key];

        if (paramValue) headers.append(key, paramValue);
      });

      const bodyValue =
        body && input.body && Object.keys(input.body).length > 0
          ? createBodyFromValue(input.body, body, schemas, dynamicRef.current)
          : undefined;
      const response = await fetch(url, {
        method,
        headers,
        body: bodyValue ? JSON.stringify(bodyValue) : undefined,
      });

      const data: unknown = await response.json().catch(() => undefined);

      return { status: response.status, data };
    },
    {
      shouldRetryOnError: false,
    },
  );

  const statusInfo = testQuery.data
    ? getStatusInfo(testQuery.data.status)
    : undefined;

  const onSubmit = form.handleSubmit((value) => {
    setInput(value as APIPlaygroundFormData);
  });

  return (
    <Form {...form}>
      <SchemaContext.Provider
        value={useMemo(
          () => ({ references: schemas, dynamic: dynamicRef }),
          [schemas],
        )}
      >
        <form
          className="not-prose flex flex-col gap-4 rounded-lg border bg-card p-4"
          onSubmit={onSubmit as React.FormEventHandler}
        >
          <div className="flex flex-row gap-2">
            <code className="flex-1 overflow-auto rounded-lg border bg-secondary px-3 py-1.5 text-sm">
              {route}
            </code>
            <button
              type="submit"
              className={cn(buttonVariants({ color: 'secondary' }))}
              disabled={testQuery.isLoading}
            >
              Send
            </button>
          </div>

          <Accordions type="multiple" className="-m-4 mt-2 border-0 text-sm">
            {authorization ? (
              <Accordion title="Authorization">
                <InputField
                  name="Authorization"
                  fieldName="authorization"
                  field={authorization}
                />
              </Accordion>
            ) : null}

            {path.length > 0 ? (
              <Accordion title="Path">
                {path.map((field) => (
                  <InputField
                    key={field.name}
                    field={field}
                    name={field.name}
                    fieldName={`path.${field.name}`}
                  />
                ))}
              </Accordion>
            ) : null}

            {query.length > 0 ? (
              <Accordion title="Query">
                <div className="flex flex-col gap-2">
                  {query.map((field) => (
                    <InputField
                      key={field.name}
                      field={field}
                      name={field.name}
                      fieldName={`query.${field.name}`}
                    />
                  ))}
                </div>
              </Accordion>
            ) : null}

            {header.length > 0 ? (
              <Accordion title="Headers">
                {header.map((field) => (
                  <InputField
                    key={field.name}
                    field={field}
                    name={field.name}
                    fieldName={`header.${field.name}`}
                  />
                ))}
              </Accordion>
            ) : null}

            {body ? (
              <Accordion title="Body">
                {renderExtracted({
                  field: body,
                  fieldName: 'body',
                  label: 'Body',
                })}
              </Accordion>
            ) : null}
          </Accordions>

          {testQuery.data && statusInfo ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <statusInfo.icon className={cn('size-4', statusInfo.color)} />
                {statusInfo.description}
              </div>
              <p className="text-sm text-muted-foreground">
                {testQuery.data.status}
              </p>
              {testQuery.data.data ? (
                <CodeBlock
                  code={JSON.stringify(testQuery.data.data, null, 2)}
                  className="max-h-[288px]"
                />
              ) : null}
            </div>
          ) : null}
        </form>
      </SchemaContext.Provider>
    </Form>
  );
}

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

function renderExtracted({
  field,
  fieldName,
  label,
}: {
  field: RequestSchema;
  fieldName: string;
  label: string;
}): React.ReactNode {
  if (field.type === 'object')
    return <ObjectInput field={field} fieldName={fieldName} />;

  return <InputField name={label} field={field} fieldName={fieldName} />;
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
    <div {...props} className={cn('flex flex-col gap-2', props.className)}>
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

function ObjectInput({
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
  }, [properties]);

  const onAppend = useCallback(() => {
    if (nextName.length === 0) return;
    setProperties((p) => (p.includes(nextName) ? p : [...p, nextName]));
    setNextName('');
  }, [nextName]);

  const types =
    typeof type === 'string'
      ? resolveDynamicField(references[type], references)
      : undefined;

  return (
    <>
      {properties.map((item) => (
        <DynamicField
          key={item}
          label={item}
          types={types}
          fieldName={`${fieldName}.${item}`}
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

function resolveDynamicField(
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
  },
  className,
}: {
  fieldName: string;
  label: string;
  /**
   * Available types, fallback to any
   */
  types?: Record<string, RequestSchema>;
  className?: string;
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
        <SelectTrigger>
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
      {renderExtracted({
        field: resolve(field.items[value], references),
        fieldName,
        label: 'Value',
      })}
    </div>
  );
}

function InputField({
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
                color: 'outline',
                size: 'sm',
                className: 'absolute bg-background -top-2 -end-2',
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
        <PlusIcon className="size-4" />
        New Item
      </button>
    </div>
  );
}
