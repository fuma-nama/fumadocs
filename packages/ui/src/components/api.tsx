
'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- Users can pass any value to the playground  */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Some parts require logical OR operator */
/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Response from API is not typed */
/* eslint-disable @typescript-eslint/no-unsafe-return -- Users can pass any value to the playground  */

import useSWR from 'swr';
import { useForm, useFieldArray, useFormContext } from 'react-hook-form';
import React, {
  ButtonHTMLAttributes,
  Fragment,
  useCallback,
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import {
  CheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  CopyIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import * as Base from 'fumadocs-ui/components/codeblock';
import { cn } from '@/utils/cn';
import { Tab, Tabs } from '@/components/tabs';
import { Accordion, Accordions } from '@/components/accordion';
import { buttonVariants } from '@/theme/variants';
import { useCopyButton } from '@/utils/use-copy-button';
import { useApiContext } from '@/contexts/api';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from './ui/form';
import { Input } from './ui/input';

export function Root({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col gap-24 text-sm text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function API({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col gap-x-6 gap-y-2 xl:flex-row xl:items-start',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface APIInfoProps extends HTMLAttributes<HTMLDivElement> {
  route: string;
  method?: string;
  badgeClassName?: string;
}

const badgeVariants = cva(
  'rounded border px-1.5 py-1 text-xs font-medium leading-[12px]',
  {
    variants: {
      color: {
        green:
          'border-green-400/50 bg-green-400/20 text-green-600 dark:text-green-400',
        yellow:
          'border-yellow-400/50 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400',
        red: 'border-red-400/50 bg-red-400/20 text-red-600 dark:text-red-400',
        blue: 'border-blue-400/50 bg-blue-400/20 text-blue-600 dark:text-blue-400',
        orange:
          'border-orange-400/50 bg-orange-400/20 text-orange-600 dark:text-orange-400',
      },
    },
  },
);

export function APIInfo({
  children,
  className,
  route,
  badgeClassName,
  method = 'GET',
  ...props
}: APIInfoProps): React.ReactElement {
  const { baseUrl } = useApiContext();

  let color: VariantProps<typeof badgeVariants>['color'] = 'green';
  if (['GET', 'HEAD'].includes(method)) color = 'green';
  if (['PUT'].includes(method)) color = 'yellow';
  if (['PATCH'].includes(method)) color = 'orange';
  if (['POST'].includes(method)) color = 'blue';
  if (['DELETE'].includes(method)) color = 'red';

  const renderRoute = (): ReactNode => {
    const routeFragments = route.split('/').filter((part) => part !== '');

    return routeFragments.map((part, index, array) => (
      <Fragment key={`${route}-part-${String(index)}`}>
        {index === 0 && <div className="text-gray-400">/</div>}
        <div className="text-foreground">{part}</div>
        {index < array.length - 1 && <div className="text-gray-400">/</div>}
      </Fragment>
    ));
  };

  const onCopy = (): void => {
    const textContent = baseUrl + route;
    void navigator.clipboard.writeText(textContent);
  };

  const [checked, onClick] = useCopyButton(onCopy);

  if (children) {
    return (
      <div
        className={cn('min-w-0 flex-1 prose-no-margin', className)}
        {...props}
      >
        <div
          className={cn(
            'group flex w-full items-center justify-between rounded-lg border bg-card p-3 text-base',
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn(badgeVariants({ color }), badgeClassName)}>
              {method}
            </span>
            <div className="h-4 w-px bg-muted" />
            <div className="flex items-center gap-1 font-mono text-sm">
              {renderRoute()}
            </div>
          </div>

          <InteractiveButton
            className="size-6 p-1"
            checked={checked}
            onClick={onClick}
          >
            <CheckIcon
              className={cn(
                'size-3 transition-transform',
                !checked && 'scale-0',
              )}
            />
            <CopyIcon
              className={cn(
                'absolute size-3 transition-transform',
                checked && 'scale-0',
              )}
            />
          </InteractiveButton>
        </div>

        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex w-full items-center justify-between rounded-lg border bg-card p-3 text-base',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn(badgeVariants({ color }), badgeClassName)}>
          {method}
        </span>
        <div className="h-4 w-px bg-muted" />
        <div className="flex items-center gap-1 font-mono text-sm">
          {renderRoute()}
        </div>
      </div>

      <InteractiveButton
        className="size-6 p-1"
        checked={checked}
        onClick={onClick}
      >
        <CheckIcon
          className={cn('size-3 transition-transform', !checked && 'scale-0')}
        />
        <CopyIcon
          className={cn(
            'absolute size-3 transition-transform',
            checked && 'scale-0',
          )}
        />
      </InteractiveButton>
    </div>
  );
}

interface PropertyProps {
  name: string;
  type: string;
  required: boolean;
  deprecated: boolean;
  children: ReactNode;
}

export function Property({
  name,
  type,
  required,
  deprecated,
  children,
}: PropertyProps): React.ReactElement {
  return (
    <div className="mb-4 flex flex-col rounded-lg border bg-card p-3 prose-no-margin">
      <h4 className="inline-flex items-center gap-4">
        <code>{name}</code>
        {required ? (
          <div className={cn(badgeVariants({ color: 'red' }))}>Required</div>
        ) : null}
        {deprecated ? (
          <div className={cn(badgeVariants({ color: 'yellow' }))}>
            Deprecated
          </div>
        ) : null}
        <span className="ms-auto font-mono text-[13px] text-muted-foreground">
          {type}
        </span>
      </h4>
      {children}
    </div>
  );
}

export function APIExample({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('sticky top-6 prose-no-margin xl:w-[400px]', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const Responses = Tabs;
export const Response = Tab;

export const Requests = Tabs;
export const Request = Tab;

export function ResponseTypes(props: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <Accordions
      type="single"
      className="!-m-4 border-none pt-2"
      defaultValue="Response"
    >
      {props.children}
    </Accordions>
  );
}

export function ExampleResponse(props: {
  children: ReactNode;
}): React.ReactElement {
  return <Accordion title="Response">{props.children}</Accordion>;
}

export function TypeScriptResponse(props: {
  children: ReactNode;
}): React.ReactElement {
  return <Accordion title="Typescript">{props.children}</Accordion>;
}

export function ObjectCollapsible(props: {
  name: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <Accordions type="single">
      <Accordion title={props.name}>{props.children}</Accordion>
    </Accordions>
  );
}

export interface InteractiveButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
}

export function InteractiveButton({
  className,
  checked = true,
  children,
  ...props
}: InteractiveButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          color: 'ghost',
          className: 'transition-all group-hover:opacity-100',
        }),
        !checked && 'opacity-0',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const sendButtonVariants = cva(
  'rounded-lg font-medium text-white transition-colors',
  {
    variants: {
      color: {
        green: 'bg-green-500 hover:bg-green-600 disabled:bg-green-600',
        yellow: 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-600',
        red: 'bg-red-500 hover:bg-red-600 disabled:bg-red-600',
        blue: 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-600',
        orange: 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-600',
      },
    },
  },
);

export function SendButton({
  children,
  className,
  disabled,
  method,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  method: string;
}): React.ReactElement {
  let color: VariantProps<typeof sendButtonVariants>['color'] = 'green';

  if (['GET', 'HEAD'].includes(method)) color = 'green';
  if (['PUT'].includes(method)) color = 'yellow';
  if (['PATCH'].includes(method)) color = 'orange';
  if (['POST'].includes(method)) color = 'blue';
  if (['DELETE'].includes(method)) color = 'red';

  return (
    <button
      disabled={disabled}
      type="submit"
      className={cn(sendButtonVariants({ color }), className)}
      {...props}
    >
      {children}
    </button>
  );
}

const statusMap: Record<
  number,
  { description: string; color: string; icon: React.ElementType }
> = {
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

function getStatusInfo(status: number): {
  description: string;
  color: string;
  icon: React.ElementType;
} {
  if (status in statusMap) {
    return statusMap[status];
  }

  if (status >= 200 && status < 300) {
    return {
      description: 'Success',
      color: 'text-green-500',
      icon: CircleCheckIcon,
    };
  }

  if (status >= 400 && status < 500) {
    return { description: 'Error', color: 'text-red-500', icon: CircleXIcon };
  }

  if (status >= 500) {
    return { description: 'Error', color: 'text-red-500', icon: CircleXIcon };
  }

  return {
    description: 'Unknown Status',
    color: 'text-gray-500',
    icon: CircleXIcon,
  };
}

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  code: string;
  wrapper?: Base.CodeBlockProps;
  lang?: string;
};

export function CodeBlock({
  code,
  wrapper,
  lang = 'json',
  ...props
}: CodeBlockProps): React.ReactElement {
  const { highlighter } = useApiContext();
  const [html, setHtml] = useState('');

  useEffect(() => {
    const highlightCode = (): void => {
      if (!highlighter) return;

      const themedHtml = highlighter.codeToHtml(code, {
        lang,
        defaultColor: false,
        themes: { light: 'github-light', dark: 'github-dark' },
      });

      setHtml(themedHtml);
    };

    highlightCode();
  }, [code, lang, highlighter]);

  return (
    <Base.CodeBlock {...wrapper}>
      <Base.Pre {...props} dangerouslySetInnerHTML={{ __html: html }} />
    </Base.CodeBlock>
  );
}

interface BaseApiRequestValue {
  name: string;
  type: string;
  description: string;
  isRequired?: boolean;
}

interface StringApiRequestValue extends BaseApiRequestValue {
  value: string;
}

interface BodyApiRequestValue extends BaseApiRequestValue {
  value: string | BodyApiRequestValue[];
}

interface APIPlaygroundProps extends HTMLAttributes<HTMLDivElement> {
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

export function APIPlayground({
  route,
  method = 'GET',
  authorization,
  path,
  parameters,
  body,
  children,
  className,
  ...props
}: APIPlaygroundProps): React.ReactElement {
  const { baseUrl } = useApiContext();

  const parseNestedValues = (arr: BodyApiRequestValue[]): Record<string, any> =>
    arr.reduce((acc, item) => {
      if (item.type === 'object' && Array.isArray(item.value)) {
        return { ...acc, [item.name]: parseNestedValues(item.value) };
      }
      if (item.type === 'array') {
        return { ...acc, [item.name]: [] };
      }
      return { ...acc, [item.name]: item.value };
    }, {});

  const form = useForm({
    defaultValues: {
      authorization: authorization?.value ?? '',
      path: path?.reduce(
        (acc, param) => ({ ...acc, [param.name]: param.value || '' }),
        {},
      ),
      parameters: parameters?.reduce(
        (acc, param) => ({ ...acc, [param.name]: param.value || '' }),
        {},
      ),
      body: parseNestedValues(body ?? []),
    },
  });

  const fetcher = useCallback(
    async (formData: APIPlaygroundFormData) => {
      let url = `${baseUrl}${route}`;

      if (path) {
        path.forEach((param) => {
          const paramValue = formData.path?.[param.name] || '';
          url = url.replace(`{${param.name}}`, paramValue);
        });
      }
      const urlObj = new URL(url);

      if (parameters) {
        parameters.forEach((param) => {
          const paramValue = formData.parameters?.[param.name] || '';
          urlObj.searchParams.append(param.name, paramValue);
        });
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (formData.authorization) {
        headers.Authorization = formData.authorization;
      }

      const convertValue = (value: any, type: string): any => {
        if (value === '' || value === undefined || value === null) {
          return type === 'boolean' ? false : '';
        }

        switch (type) {
          case 'number':
            return Number(value);
          case 'boolean':
            return Boolean(value);
          case 'string':
          default:
            return String(value);
        }
      };

      const parseBody = (
        fields: Record<string, unknown>,
        schema: BodyApiRequestValue[],
      ): Record<string, unknown> => {
        return Object.keys(fields).reduce(
          (acc: Record<string, unknown>, key: string) => {
            const value = fields[key];
            const schemaItem = schema.find((item) => item.name === key);

            if (!schemaItem) {
              acc[key] = value;
              return acc;
            }

            if (Array.isArray(value)) {
              // Handle arrays
              acc[key] =
                value.length > 0
                  ? value.map((item) =>
                      typeof item === 'object' && item !== null
                        ? parseBody(
                            item as Record<string, unknown>,
                            Array.isArray(schemaItem.value)
                              ? schemaItem.value
                              : [],
                          )
                        : convertValue(item, schemaItem.type),
                    )
                  : [];
            } else if (
              typeof value === 'object' &&
              value !== null &&
              schemaItem.type === 'object'
            ) {
              // Handle nested objects
              acc[key] = parseBody(
                value as Record<string, unknown>,
                Array.isArray(schemaItem.value) ? schemaItem.value : [],
              );
            } else {
              // Handle primitive values
              acc[key] = convertValue(value, schemaItem.type);
            }
            return acc;
          },
          {},
        );
      };

      const bodyObject = parseBody(formData.body ?? {}, body || []);

      const bodyString = JSON.stringify(bodyObject);

      try {
        const response = await fetch(urlObj.toString(), {
          method,
          headers,
          body: bodyString !== '{}' ? bodyString : undefined,
        });

        const data = await response.json();

        return { status: response.status, data };
      } catch (error) {
        return { status: 'Error', data: null };
      }
    },
    [baseUrl, route, method, path, parameters, body],
  );

  const { data, isLoading, isValidating, mutate } = useSWR(
    `${method}-${baseUrl}-${route}`,
    null,
    {
      revalidateOnMount: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const statusInfo = data
    ? getStatusInfo((data as unknown as { status: number }).status)
    : { description: '', color: '', icon: null };

  const StatusIcon = statusInfo.icon;

  const onSubmit = (submitData: APIPlaygroundFormData): void => {
     void mutate(fetcher(submitData));
  };

  const renderFields = (
    fields: BodyApiRequestValue[],
    namePrefix = '',
  ): JSX.Element[] =>
    fields.map((item) => {
      const fieldName = namePrefix ? `${namePrefix}.${item.name}` : item.name;

      if (item.type === 'object' && item.value && Array.isArray(item.value)) {
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="font-mono text-foreground">
                <span>{item.name}</span>{' '}
                <span className="text-muted-foreground">{item.type}</span>
                {item.isRequired ? (
                  <span className="absolute items-start text-xs text-red-500">
                    *
                  </span>
                ) : null}
              </div>
              <div className="text-xs">{item.description}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="space-y-4">
                {renderFields(item.value, fieldName)}
              </div>
            </div>
          </div>
        );
      }

      if (item.type === 'array' && Array.isArray(item.value)) {
        return (
          <div key={fieldName} className="flex flex-col gap-2">
            <ArrayInput
              name={fieldName}
              label={item.name}
              description={item.description}
              fieldsSchema={item.value}
            />
          </div>
        );
      }

      return (
        <FormField
          key={fieldName}
          control={form.control}
          name={
            fieldName as
              | 'body'
              | 'path'
              | 'authorization'
              | 'parameters'
              | `body.${string}`
          }
          render={({ field: { value, ...restField } }) => (
            <FormItem className="space-y-1">
              <FormLabel className="relative font-mono text-sm text-foreground">
                <span>{item.name}</span>{' '}
                <span className="text-muted-foreground">{item.type}</span>
                {item.isRequired ? (
                  <span className="absolute items-start text-xs text-red-500">
                    *
                  </span>
                ) : null}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={`Enter ${item.name}`}
                  className="text-foreground"
                  value={value ? String(value) : ''}
                  {...restField}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {item.description}
              </FormDescription>
            </FormItem>
          )}
        />
      );
    });

  return (
    <div className={cn('min-w-0 flex-1 prose-no-margin', className)} {...props}>
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(onSubmit)();
          }}
        >
          <div className="flex flex-col gap-6 rounded-lg border bg-card p-4">
            <div className="flex gap-2">
              <APIInfo
                route={route}
                method={method}
                className="w-full rounded-lg p-1.5"
              />
              <SendButton
                type="submit"
                disabled={isValidating}
                method={method}
                className={cn('grid w-16 shrink-0 place-items-center')}
              >
                {isValidating ? (
                  <Loader2Icon className="animate-spin text-white/80" />
                ) : (
                  <span>Send</span>
                )}
              </SendButton>
            </div>

            {authorization || path || parameters || body ? (
              <Accordions type="multiple">
                {authorization ? (
                  <Accordion
                    title="Authorization"
                    className={cn(
                      'overflow-hidden bg-card transition-colors',
                      '[&>div]:border-t',
                    )}
                  >
                    <div className="pt-4">
                      <FormField
                        control={form.control}
                        name="authorization"
                        render={({ field: { value, ...restField } }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="relative font-mono text-sm text-foreground">
                              <span>{authorization.name}</span>{' '}
                              <span className="text-muted-foreground">
                                {authorization.type}
                              </span>
                              {authorization.isRequired ? (
                                <span className="absolute items-start text-xs text-red-500">
                                  *
                                </span>
                              ) : null}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={`Enter ${authorization.name}`}
                                className="text-foreground"
                                value={typeof value === 'string' ? value : ''}
                                {...restField}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              {authorization.description}
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                  </Accordion>
                ) : null}

                {path ? (
                  <Accordion
                    title="Path"
                    className={cn(
                      'overflow-hidden bg-card transition-colors',
                      '[&>div]:border-t',
                    )}
                  >
                    <div className="space-y-4 pt-4">
                      {renderFields(path, 'path')}
                    </div>
                  </Accordion>
                ) : null}

                {parameters ? (
                  <Accordion
                    title="Parameters"
                    className={cn(
                      'overflow-hidden bg-card transition-colors',
                      '[&>div]:border-t',
                    )}
                  >
                    <div className="space-y-4 pt-4">
                      {renderFields(parameters, 'parameters')}
                    </div>
                  </Accordion>
                ) : null}

                {body ? (
                  <Accordion
                    title="Body"
                    className={cn(
                      'overflow-hidden bg-card transition-colors',
                      '[&>div]:border-t',
                    )}
                  >
                    <div className="space-y-4 pt-4">
                      {renderFields(body, 'body')}
                    </div>
                  </Accordion>
                ) : null}
              </Accordions>
            ) : null}
          </div>

          {!isLoading && data ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex items-center gap-1.5">
                {StatusIcon ? (
                  <StatusIcon className={cn('size-4', statusInfo.color)} />
                ) : null}
                <span className="mt-px text-sm font-medium text-foreground">
                  {(data as unknown as { status: number }).status} -{' '}
                  {statusInfo.description}
                </span>
              </div>

              <CodeBlock
                wrapper={{ title: 'Response', className: 'my-0' }}
                code={JSON.stringify(data, null, 2)}
                className="max-h-[288px]"
              />
            </div>
          ) : null}
        </form>
      </Form>

      <div>{children}</div>
    </div>
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

  const defaultValues = isObjectArray
    ? fieldsSchema.reduce<Record<string, string>>((acc, field) => {
        acc[field.name] = '';
        return acc;
      }, {})
    : '';

  const handleAppend = (e: React.MouseEvent): void => {
    e.preventDefault();
    append(defaultValues);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="font-mono text-sm text-foreground">
          <span>{label}</span>{' '}
          <span className="text-muted-foreground">array</span>
        </div>
        <div className="text-xs">{description}</div>
      </div>
      <div className="space-y-4 rounded-lg border p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="relative space-y-2">
            {isObjectArray ? (
              fieldsSchema.map((schemaField: BodyApiRequestValue) => (
                <FormField
                  key={`${name}.${String(index)}.${schemaField.name}`}
                  control={control}
                  name={`${name}.${String(index)}.${schemaField.name}`}
                  render={({ field: fieldRef }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="relative font-mono text-sm text-foreground">
                        <span>{schemaField.name}</span>{' '}
                        <span className="text-muted-foreground">
                          {schemaField.type}
                        </span>
                        {schemaField.isRequired ? (
                          <span className="absolute items-start text-xs text-red-500">
                            *
                          </span>
                        ) : null}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`Enter ${schemaField.name}`}
                          className="text-foreground"
                          {...fieldRef}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {schemaField.description}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              ))
            ) : (
              <FormControl className="relative">
                <Input
                  {...register(`${name}.${String(index)}`)}
                  placeholder="Enter value"
                  className="pr-10 text-foreground"
                />
              </FormControl>
            )}
            <button
              type="button"
              className={cn(
                'group absolute right-2 top-0 flex aspect-square size-6 shrink-0 p-0 hover:bg-transparent',
                isObjectArray && '-right-2 -top-4',
              )}
              onClick={() => {
                remove(index);
              }}
            >
              <Trash2Icon className="size-4 text-muted-foreground transition-colors group-hover:text-red-500" />
            </button>
          </div>
        ))}
        <button type="button" className="w-full" onClick={handleAppend}>
          <PlusIcon className="size-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}
