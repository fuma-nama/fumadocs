import {
  createContext,
  type HTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import {
  CircleCheckIcon,
  CircleXIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import useSWRImmutable from 'swr/immutable';
import type { APIPlaygroundProps, RequestSchema } from 'fumadocs-openapi';
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
import { createBodyFromValue } from '@/components/api/fetcher';
import { buttonVariants } from '@/theme/variants';
import {
  getDefaultValue,
  getDefaultValues,
  resolve,
} from '@/components/api/shared';

interface APIPlaygroundFormData {
  authorization?: string | undefined;
  path?: Record<string, string>;
  query?: Record<string, string>;
  header?: Record<string, string>;
  body?: Record<string, unknown>;
}

interface StatusInfo {
  description: string;
  color: string;
  icon: React.ElementType;
}

const statusMap: Record<number, StatusInfo> = {
  200: { description: 'OK', color: 'text-green-500', icon: CircleCheckIcon },
  400: { description: 'Bad Request', color: 'text-red-500', icon: CircleXIcon },
  401: {
    description: 'Unauthorized',
    color: 'text-red-500',
    icon: CircleXIcon,
  },
  403: { description: 'Forbidden', color: 'text-red-500', icon: CircleXIcon },
  404: { description: 'Not Found', color: 'text-gray-500', icon: CircleXIcon },
  500: {
    description: 'Internal Server Error',
    color: 'text-red-500',
    icon: CircleXIcon,
  },
};

const SchemaContext = createContext<Record<string, RequestSchema>>({});

function getStatusInfo(status: number): StatusInfo {
  if (status in statusMap) {
    return statusMap[status];
  }

  if (status >= 200 && status < 300) {
    return {
      description: 'Success',
      color: 'text-foreground',
      icon: CircleCheckIcon,
    };
  }

  if (status >= 400) {
    return { description: 'Error', color: 'text-red-500', icon: CircleXIcon };
  }

  return {
    description: 'No Description',
    color: 'text-muted-foreground',
    icon: CircleXIcon,
  };
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
          ? createBodyFromValue(input.body, body, schemas)
          : undefined;
      const response = await fetch(url, {
        method,
        headers,
        body: bodyValue ? JSON.stringify(bodyValue) : undefined,
      });
      try {
        const data: unknown = await response.json();

        return { status: response.status, data };
      } catch (_) {
        return { status: response.status };
      }
    },
    {
      shouldRetryOnError: false,
    },
  );

  const statusInfo = testQuery.data
    ? getStatusInfo(testQuery.data.status)
    : undefined;

  const StatusIcon = statusInfo?.icon;

  const onSubmit = form.handleSubmit((value) => {
    setInput(value as APIPlaygroundFormData);
  });

  return (
    <Form {...form}>
      <SchemaContext.Provider value={schemas}>
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
                <InputField field={body} name="Body" fieldName="body" />
              </Accordion>
            ) : null}
          </Accordions>

          {testQuery.data ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="inline-flex items-center gap-1.5 text-sm">
                {StatusIcon ? (
                  <StatusIcon className={cn('size-4', statusInfo.color)} />
                ) : null}
                <span className="font-medium text-foreground">
                  {testQuery.data.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {statusInfo?.description}
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
}): React.ReactElement {
  const context = useContext(SchemaContext);
  const { control } = useFormContext();

  if (field.type === 'object') {
    return (
      <div {...props} className={cn('flex flex-col gap-2', props.className)}>
        <div className={cn(labelVariants(), 'inline-flex gap-1')}>
          {name}
          {field.isRequired ? <span className="text-red-500">*</span> : null}
          <code className="ms-auto text-xs text-muted-foreground">
            {field.type}
          </code>
        </div>
        <p className="text-xs">{field.description}</p>
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          {Object.entries(field.properties).map(([key, child]) => (
            <InputField
              key={key}
              name={key}
              field={resolve(child, context)}
              fieldName={`${fieldName}.${key}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'array') {
    return (
      <ArrayInput
        name={fieldName}
        label={name}
        description={field.description}
        items={context[field.items]}
        {...props}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field: { value, ...restField } }) => (
        <FormItem {...props}>
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
          <FormControl>
            <Input
              placeholder="Enter value"
              className="text-foreground"
              value={value as string}
              {...restField}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

interface ArrayInputProps {
  name: string;
  label?: string;
  description?: string;
  items: RequestSchema;
  className?: string;
}

function ArrayInput({
  name,
  label,
  description,
  items,
  ...props
}: ArrayInputProps): React.ReactElement {
  const { control } = useFormContext();
  const context = useContext(SchemaContext);
  const { fields, append, remove } = useFieldArray({ control, name });

  const handleAppend = useCallback(() => {
    append(getDefaultValue(items, context));
  }, [append, context, items]);

  return (
    <div {...props} className={cn('flex flex-col gap-2', props.className)}>
      <div className={cn(labelVariants({ className: 'inline-flex gap-1' }))}>
        {label}
        <code className="ms-auto text-xs text-muted-foreground">array</code>
      </div>
      <p className="text-xs">{description}</p>
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-row items-start">
            <InputField
              field={items}
              fieldName={`${name}.${String(index)}`}
              className="flex-1"
            />
            <button
              type="button"
              aria-label="Remove Item"
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  className: 'text-muted-foreground p-1 -mt-1',
                }),
              )}
              onClick={() => {
                remove(index);
              }}
            >
              <Trash2Icon className="size-4" />
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
    </div>
  );
}
