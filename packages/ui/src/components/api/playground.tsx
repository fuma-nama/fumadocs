import { type HTMLAttributes, useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import {
  CircleCheckIcon,
  CircleXIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import useSWRImmutable from 'swr/immutable';
import type { APIPlaygroundProps, RequestField } from 'fumadocs-openapi';
import { useApiContext } from '@/contexts/api';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { Accordion, Accordions } from '@/components/accordion';
import * as Base from '@/components/codeblock';
import { createBodyFromValue } from '@/components/api/fetcher';
import { buttonVariants } from '@/theme/variants';

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

function getDefaultValues(arr: RequestField[]): Record<string, unknown> {
  return Object.fromEntries<unknown>(
    arr.map((item) => {
      const key = item.name ?? '';

      if (item.type === 'object') {
        return [key, getDefaultValues(item.properties)];
      }

      return [key, getDefaultValue(item)];
    }),
  );
}

function getDefaultValue(item: RequestField): unknown {
  if (item.type === 'object') return getDefaultValues(item.properties);

  if (item.type === 'array') return [];
  if (item.type === 'null') return null;
  if (item.type === 'switcher') return 0;

  return String(item.defaultValue);
}

export function APIPlayground({
  route,
  method = 'GET',
  authorization,
  path = [],
  header = [],
  query = [],
  body,
}: APIPlaygroundProps & HTMLAttributes<HTMLFormElement>): React.ReactElement {
  const { baseUrl } = useApiContext();
  const [input, setInput] = useState<APIPlaygroundFormData>();
  const form = useForm({
    defaultValues: {
      authorization: authorization?.defaultValue,
      path: getDefaultValues(path),
      query: getDefaultValues(query),
      header: getDefaultValues(header),
      body: body ? getDefaultValue(body) : undefined,
    },
  });

  const testQuery = useSWRImmutable(
    input ? [baseUrl, route, method, input] : null,
    async () => {
      if (!input) return;
      const url = new URL(route, baseUrl ?? window.location.origin);

      Object.keys(input.path ?? {}).forEach((key) => {
        const paramValue = input.path?.[key];

        if (paramValue)
          url.pathname = url.pathname.replace(`{${key}}`, paramValue);
      });

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
          ? createBodyFromValue(input.body, body)
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

        <Accordions type="multiple" className="text-sm">
          {authorization ? (
            <Accordion title="Authorization">
              <InputField fieldName="authorization" field={authorization} />
            </Accordion>
          ) : null}

          {path.length > 0 ? (
            <Accordion title="Path">
              {path.map((field) => (
                <InputField key={field.name} field={field} namePrefix="path" />
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
                    namePrefix="query"
                  />
                ))}
              </div>
            </Accordion>
          ) : null}

          {header.length > 0 ? (
            <Accordion title="Headers">
              {header.map((field) => (
                <InputField key={field.name} field={field} namePrefix="query" />
              ))}
            </Accordion>
          ) : null}

          {body ? (
            <Accordion title="Body">
              <InputField field={body} namePrefix="body" />
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
    </Form>
  );
}

function InputField({
  field,
  namePrefix,
  fieldName = namePrefix
    ? `${namePrefix}.${field.name ?? ''}`
    : field.name ?? '',
}: {
  namePrefix?: string;
  field: RequestField;
  fieldName?: string;
}): React.ReactElement {
  const { control } = useFormContext();

  if (field.type === 'object') {
    return (
      <div className="flex flex-col gap-2">
        <div className="inline-flex gap-1 text-sm text-foreground">
          {field.name}
          {field.isRequired ? <span className="text-red-500">*</span> : null}
          <code className="ms-auto text-xs text-muted-foreground">
            {field.type}
          </code>
        </div>
        <p className="text-xs">{field.description}</p>
        <div className="flex flex-col gap-2 rounded-lg border p-2">
          {field.properties.map((child) => (
            <InputField key={child.name} field={child} namePrefix={fieldName} />
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'array') {
    return (
      <ArrayInput
        name={fieldName}
        label={field.name}
        description={field.description}
        items={field.items}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field: { value, ...restField } }) => (
        <FormItem>
          <FormLabel className="inline-flex gap-1 text-sm text-foreground">
            {field.name}
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
              placeholder={`Enter ${field.name ?? 'value'}`}
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
  items: RequestField;
}

function ArrayInput({
  name,
  label,
  description,
  items,
}: ArrayInputProps): React.ReactElement {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const handleAppend = useCallback(() => {
    append(getDefaultValue(items));
  }, [append, items]);

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex gap-2 text-sm text-foreground">
        {label}
        <code className="ms-auto text-xs text-muted-foreground">array</code>
      </div>
      <p className="text-xs">{description}</p>
      <div className="flex flex-col gap-4 rounded-lg border p-4">
        {fields.map((field, index) => (
          <div key={field.id}>
            <InputField field={items} namePrefix={`${name}.${String(index)}`} />
            <button
              type="button"
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  className: 'absolute end-2 top-0 text-muted-foreground',
                }),
              )}
              onClick={() => {
                remove(index);
              }}
            >
              <Trash2Icon className="size-4 text-muted-foreground" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={cn(buttonVariants({ color: 'secondary' }))}
          onClick={handleAppend}
        >
          <PlusIcon className="size-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}
