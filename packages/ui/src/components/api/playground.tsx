import { type HTMLAttributes, useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import {
  CircleCheckIcon,
  CircleXIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import useSWRImmutable from 'swr/immutable';
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
import { createBodyFromFields } from '@/components/api/fetcher';
import { buttonVariants } from '@/theme/variants';

export interface BaseApiRequestValue {
  name: string;
  type: string;
  description: string;
  isRequired?: boolean;
}

export interface StringApiRequestValue extends BaseApiRequestValue {
  value: string;
}

export interface BodyApiRequestValue extends BaseApiRequestValue {
  value: string | BodyApiRequestValue[];
}

export interface APIPlaygroundProps extends HTMLAttributes<HTMLDivElement> {
  route: string;
  method?: string;
  authorization?: StringApiRequestValue;
  path?: StringApiRequestValue[];
  parameters?: StringApiRequestValue[];
  body?: BodyApiRequestValue[];
}

interface APIPlaygroundFormData {
  authorization?: string | undefined;
  path?: Record<string, string> | undefined;
  parameters?: Record<string, string> | undefined;
  body?: Record<string, unknown> | undefined;
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

function getDefaultValue(arr: BodyApiRequestValue[]): Record<string, unknown> {
  return Object.fromEntries<unknown>(
    arr.map((item) => {
      if (item.type === 'object' && Array.isArray(item.value)) {
        return [item.name, getDefaultValue(item.value)];
      }

      if (item.type === 'array') {
        return [item.name, []];
      }

      return [item.name, item.value];
    }),
  );
}

export function APIPlayground({
  route,
  method = 'GET',
  authorization,
  path,
  parameters,
  body,
}: APIPlaygroundProps): React.ReactElement {
  const { baseUrl } = useApiContext();
  const [input, setInput] = useState<APIPlaygroundFormData>();
  const form = useForm({
    defaultValues: {
      authorization: authorization?.value ?? '',
      path: path ? getDefaultValue(path) : undefined,
      parameters: parameters ? getDefaultValue(parameters) : undefined,
      body: body ? getDefaultValue(body) : undefined,
    },
  });

  const query = useSWRImmutable(
    input ? [baseUrl, route, method, input] : null,
    async ([_baseUrl, _route, _method, formData]) => {
      const url = new URL(route, baseUrl ?? window.location.origin);

      path?.forEach((param) => {
        const paramValue = formData.path?.[param.name];
        if (paramValue)
          url.pathname = url.pathname.replace(`{${param.name}}`, paramValue);
      });

      parameters?.forEach((param) => {
        const paramValue = formData.parameters?.[param.name];
        if (paramValue) url.searchParams.append(param.name, paramValue);
      });

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (formData.authorization) {
        headers.Authorization = formData.authorization;
      }

      const bodyValue =
        formData.body && Object.keys(formData.body).length > 0
          ? createBodyFromFields(formData.body, body ?? [])
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

  const statusInfo = query.data
    ? getStatusInfo(query.data.status)
    : { description: '', color: '', icon: null };

  const StatusIcon = statusInfo.icon;

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
            disabled={query.isLoading}
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

          {path ? (
            <Accordion title="Path">
              {path.map((field) => (
                <InputField key={field.name} field={field} namePrefix="path" />
              ))}
            </Accordion>
          ) : null}

          {parameters ? (
            <Accordion title="Parameters">
              {parameters.map((field) => (
                <InputField
                  key={field.name}
                  field={field}
                  namePrefix="parameters"
                />
              ))}
            </Accordion>
          ) : null}

          {body ? (
            <Accordion title="Body">
              {body.map((field) => (
                <InputField key={field.name} field={field} namePrefix="body" />
              ))}
            </Accordion>
          ) : null}
        </Accordions>

        {query.data ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="inline-flex items-center gap-1.5 text-sm">
              {StatusIcon ? (
                <StatusIcon className={cn('size-4', statusInfo.color)} />
              ) : null}
              <span className="font-medium text-foreground">
                {query.data.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {statusInfo.description}
            </p>
            {query.data.data ? (
              <CodeBlock
                code={JSON.stringify(query.data.data, null, 2)}
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
  fieldName = namePrefix ? `${namePrefix}.${field.name}` : field.name,
}: {
  namePrefix?: string;
  field: BodyApiRequestValue;
  fieldName?: string;
}): React.ReactElement {
  const { control } = useFormContext();

  if (field.type === 'object' && Array.isArray(field.value)) {
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
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          {field.value.map((child) => (
            <InputField key={child.name} field={child} namePrefix={fieldName} />
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'array' && Array.isArray(field.value)) {
    return (
      <ArrayInput
        name={fieldName}
        label={field.name}
        description={field.description}
        fieldsSchema={field.value}
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
              placeholder={`Enter ${field.name}`}
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
  label: string;
  description: string;
  fieldsSchema: BodyApiRequestValue[];
}

function ArrayInput({
  name,
  label,
  description,
  fieldsSchema,
}: ArrayInputProps): React.ReactElement {
  const { register, control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  const isObjectArray =
    Array.isArray(fieldsSchema) &&
    fieldsSchema.length > 0 &&
    typeof fieldsSchema[0] === 'object';

  const handleAppend = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      let defaultValue: unknown = '';

      if (isObjectArray)
        defaultValue = Object.fromEntries(
          fieldsSchema.map((field) => [field.name, '']),
        );

      append(defaultValue);
    },
    [append, isObjectArray, fieldsSchema],
  );

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
            {isObjectArray ? (
              fieldsSchema.map((schemaField: BodyApiRequestValue) => (
                <InputField
                  key={schemaField.name}
                  field={schemaField}
                  namePrefix={`${name}.${String(index)}`}
                />
              ))
            ) : (
              <FormControl key={field.id}>
                <Input
                  {...register(`${name}.${String(index)}`)}
                  placeholder="Enter value"
                  className="text-foreground"
                />
              </FormControl>
            )}
            <button
              type="button"
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  className: 'absolute end-2 top-0 text-muted-foreground',
                }),
                isObjectArray && '-end-2 -top-4',
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
