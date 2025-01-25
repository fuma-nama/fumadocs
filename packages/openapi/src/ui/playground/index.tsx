'use client';
import {
  type ReactElement,
  type HTMLAttributes,
  useMemo,
  useRef,
  useEffect,
  type FC,
  Fragment,
} from 'react';
import { Controller, useForm } from 'react-hook-form';
import { cn, buttonVariants } from 'fumadocs-ui/components/api';
import type {
  FieldPath,
  UseFormStateReturn,
  ControllerFieldState,
  ControllerRenderProps,
} from 'react-hook-form';
import { useApiContext } from '@/ui/contexts/api';
import { Form } from '@/ui/components/form';
import type { FetchResult } from '@/ui/playground/fetcher';
import {
  getDefaultValue,
  getDefaultValues,
} from '@/ui/playground/get-default-values';
import { InputField, ObjectInput } from '@/ui/playground/inputs';
import type {
  APIPlaygroundProps,
  PrimitiveRequestField,
  RequestSchema,
} from '@/render/playground';
import { type DynamicField, SchemaContext } from '../contexts/schema';
import { getStatusInfo } from '@/ui/playground/status-info';
import { getUrl } from '@/utils/server-url';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { CollapsiblePanel } from '@/ui/components/collapsible';
import { MethodLabel } from '@/ui/components/method-label';
import { useQuery } from '@/utils/use-query';
import ServerSelect from '@/ui/server-select';

interface FormValues {
  authorization: string;
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  body: unknown;
}

export interface CustomField<TName extends FieldPath<FormValues>, Info> {
  render: (props: {
    /**
     * Field Info
     */
    info: Info;
    field: ControllerRenderProps<FormValues, TName>;
    fieldState: ControllerFieldState;
    formState: UseFormStateReturn<FormValues>;
  }) => ReactElement;
}

export function APIPlayground({
  route,
  method = 'GET',
  authorization,
  path = [],
  header = [],
  query = [],
  body,
  fields = {},
  schemas,
  proxyUrl,
  components: { ResultDisplay = DefaultResultDisplay } = {},
  ...props
}: APIPlaygroundProps & {
  fields?: {
    auth?: CustomField<'authorization', PrimitiveRequestField>;
    path?: CustomField<`path.${string}`, PrimitiveRequestField>;
    query?: CustomField<`query.${string}`, PrimitiveRequestField>;
    header?: CustomField<`header.${string}`, PrimitiveRequestField>;
    body?: CustomField<'body', RequestSchema>;
  };

  components?: Partial<{
    ResultDisplay: FC<{ data: FetchResult }>;
  }>;
} & HTMLAttributes<HTMLFormElement>) {
  const { serverRef } = useApiContext();
  const dynamicRef = useRef(new Map<string, DynamicField>());
  const form = useForm<FormValues>({
    defaultValues: {
      authorization: authorization?.defaultValue,
      path: getDefaultValues(path, schemas),
      query: getDefaultValues(query, schemas),
      header: getDefaultValues(header, schemas),
      body: body ? getDefaultValue(body, schemas) : undefined,
    },
  });

  const testQuery = useQuery(async (input: FormValues) => {
    const fetcher = await import('./fetcher').then((mod) =>
      mod.createBrowserFetcher(body, schemas),
    );
    const serverUrl = serverRef.current
      ? getUrl(serverRef.current.url, serverRef.current.variables)
      : window.location.origin;
    let url = `${serverUrl}${createPathnameFromInput(route, input.path, input.query)}`;

    if (proxyUrl) {
      const updated = new URL(proxyUrl, window.location.origin);
      updated.searchParams.append('url', url);
      url = updated.toString();
    }

    const header = { ...input.header };

    if (input.authorization && authorization) {
      header[authorization.name] = input.authorization;
    }

    return fetcher.fetch({
      url: url.toString(),
      header,
      body: body
        ? {
            mediaType: body.mediaType,
            value: input.body,
          }
        : undefined,
      dynamicFields: dynamicRef.current,
      method,
    });
  });

  useEffect(() => {
    if (!authorization) return;
    const key = `__fumadocs_authorization_${authorization.authType}`;
    const cached = localStorage.getItem(key);
    if (cached) form.setValue('authorization', cached);

    const subscription = form.watch((value, { name }) => {
      if (name !== 'authorization' || !value.authorization) return;
      localStorage.setItem(key, value.authorization);
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mounted only once
  }, []);

  const onSubmit = form.handleSubmit((value) => {
    testQuery.start(value);
  });

  function renderCustomField<
    T extends FieldPath<FormValues>,
    F extends RequestSchema & { name?: string },
  >(fieldName: T, info: F, field: CustomField<T, F> | undefined, key?: string) {
    if (field) {
      return (
        <Controller
          key={key}
          control={form.control}
          render={(props) => field.render({ ...props, info })}
          name={fieldName}
        />
      );
    }

    return (
      <InputField
        key={key}
        name={info.name}
        fieldName={fieldName}
        field={info}
      />
    );
  }

  return (
    <Form {...form}>
      <SchemaContext.Provider
        value={useMemo(
          () => ({ references: schemas, dynamic: dynamicRef }),
          [schemas],
        )}
      >
        <form
          {...props}
          className={cn(
            'not-prose flex flex-col gap-2 rounded-xl border bg-fd-card p-3',
            props.className,
          )}
          onSubmit={onSubmit as React.FormEventHandler}
        >
          <FormHeader
            method={method}
            route={route}
            isLoading={testQuery.isLoading}
          />

          {authorization
            ? renderCustomField('authorization', authorization, fields.auth)
            : null}
          {path.length > 0 ? (
            <CollapsiblePanel title="Path">
              {path.map((field) =>
                renderCustomField(
                  `path.${field.name}`,
                  field,
                  fields.path,
                  field.name,
                ),
              )}
            </CollapsiblePanel>
          ) : null}

          {query.length > 0 ? (
            <CollapsiblePanel title="Query">
              {query.map((field) =>
                renderCustomField(
                  `query.${field.name}`,
                  field,
                  fields.query,
                  field.name,
                ),
              )}
            </CollapsiblePanel>
          ) : null}

          {header.length > 0 ? (
            <CollapsiblePanel title="Headers">
              {header.map((field) =>
                renderCustomField(
                  `header.${field.name}`,
                  field,
                  fields.header,
                  field.name,
                ),
              )}
            </CollapsiblePanel>
          ) : null}

          {body ? (
            <CollapsiblePanel title="Body">
              {body.type === 'object' && !fields.body ? (
                <ObjectInput field={body} fieldName="body" />
              ) : (
                renderCustomField('body', body, fields.body)
              )}
            </CollapsiblePanel>
          ) : null}

          {testQuery.data ? <ResultDisplay data={testQuery.data} /> : null}
        </form>
      </SchemaContext.Provider>
    </Form>
  );
}

function createPathnameFromInput(
  route: string,
  path: Record<string, unknown>,
  query: Record<string, unknown>,
): string {
  let pathname = route;
  for (const key of Object.keys(path)) {
    const paramValue = path[key];

    if (typeof paramValue === 'string' && paramValue.length > 0)
      pathname = pathname.replace(`{${key}}`, paramValue);
  }

  const searchParams = new URLSearchParams();
  for (const key of Object.keys(query)) {
    const paramValue = query[key];

    if (typeof paramValue === 'string' && paramValue.length > 0)
      searchParams.append(key, paramValue);
  }

  return searchParams.size > 0
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
}

function Route({
  route,
  ...props
}: HTMLAttributes<HTMLDivElement> & { route: string }) {
  const segments = route.split('/').filter((part) => part.length > 0);

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-center gap-0.5 overflow-auto text-nowrap text-xs',
        props.className,
      )}
    >
      {segments.map((part, index) => (
        <Fragment key={index}>
          <span className="text-fd-muted-foreground">/</span>
          {part.startsWith('{') && part.endsWith('}') ? (
            <code className="bg-fd-primary/10 text-fd-primary">{part}</code>
          ) : (
            <code className="text-fd-foreground">{part}</code>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function FormHeader({
  route,
  method,
  isLoading,
}: {
  route: string;
  method: string;
  isLoading: boolean;
}) {
  return (
    <>
      <div className="flex flex-row items-center gap-2">
        <MethodLabel>{method}</MethodLabel>
        <Route route={route} className="flex-1" />
        <button
          type="submit"
          className={cn(
            buttonVariants({ color: 'primary', size: 'sm' }),
            'px-3 py-1.5',
          )}
          disabled={isLoading}
        >
          Send
        </button>
      </div>
      <ServerSelect className="mb-4" />
    </>
  );
}

function DefaultResultDisplay({ data }: { data: FetchResult }) {
  const statusInfo = useMemo(() => getStatusInfo(data.status), [data.status]);
  const { shikiOptions } = useApiContext();

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-fd-card p-4">
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-foreground">
        <statusInfo.icon className={cn('size-4', statusInfo.color)} />
        {statusInfo.description}
      </div>
      <p className="text-sm text-fd-muted-foreground">{data.status}</p>
      {data.data ? (
        <DynamicCodeBlock
          lang={
            typeof data.data === 'string' && data.data.length > 50000
              ? 'text'
              : data.type
          }
          code={
            typeof data.data === 'string'
              ? data.data
              : JSON.stringify(data.data, null, 2)
          }
          {...shikiOptions}
        />
      ) : null}
    </div>
  );
}
