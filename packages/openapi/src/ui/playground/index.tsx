'use client';
import {
  type ReactElement,
  type HTMLAttributes,
  useMemo,
  useRef,
  useState,
  useEffect,
  type FC,
} from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
          <FormHeader route={route} isLoading={testQuery.isLoading} />

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

function FormHeader({
  route,
  isLoading,
}: {
  route: string;
  isLoading: boolean;
}) {
  const [path, query] = useWatch<FormValues, ['path', 'query']>({
    name: ['path', 'query'],
  });

  const pathname = useMemo(
    () => createPathnameFromInput(route, path, query),
    [route, path, query],
  );

  return (
    <div className="flex flex-row gap-2 mb-2">
      <code className="inline-flex flex-row items-center rounded-full flex-1 overflow-auto text-nowrap border px-2 text-xs text-fd-secondary-foreground bg-fd-secondary">
        {pathname}
      </code>
      <button
        type="submit"
        className={cn(
          buttonVariants({ color: 'primary' }),
          'px-3 py-1.5 rounded-full',
        )}
        disabled={isLoading}
      >
        Send
      </button>
    </div>
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

function useQuery<I, T>(
  fn: (input: I) => Promise<T>,
): {
  start: (input: I) => void;
  data?: T;
  isLoading: boolean;
} {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T>();

  return useMemo(
    () => ({
      isLoading: loading,
      data,
      start(input) {
        setLoading(true);

        void fn(input)
          .then((res) => {
            setData(res);
          })
          .catch(() => {
            setData(undefined);
          })
          .finally(() => {
            setLoading(false);
          });
      },
    }),
    [data, fn, loading],
  );
}
