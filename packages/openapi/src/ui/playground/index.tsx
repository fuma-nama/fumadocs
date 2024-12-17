'use client';
import {
  type ReactElement,
  type HTMLAttributes,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
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
import { CodeBlock } from '@/ui/components/codeblock';
import { type DynamicField, SchemaContext } from '../contexts/schema';
import { getStatusInfo } from '@/ui/playground/status-info';

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
  bodyType,
  authorization,
  path = [],
  header = [],
  query = [],
  body,
  fields = {},
  schemas,
  proxyUrl,
}: APIPlaygroundProps & {
  fields?: {
    auth?: CustomField<'authorization', PrimitiveRequestField>;
    path?: CustomField<`path.${string}`, PrimitiveRequestField>;
    query?: CustomField<`query.${string}`, PrimitiveRequestField>;
    header?: CustomField<`header.${string}`, PrimitiveRequestField>;
    body?: CustomField<'body', RequestSchema>;
  };
} & HTMLAttributes<HTMLFormElement>) {
  const { baseUrl } = useApiContext();
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
    const targetUrl = `${baseUrl ?? window.location.origin}${createPathnameFromInput(route, input.path, input.query)}`;

    let url: URL;
    if (proxyUrl) {
      url = new URL(proxyUrl, window.location.origin);
      url.searchParams.append('url', targetUrl);
    } else {
      url = new URL(targetUrl);
    }

    const header = { ...input.header };

    if (input.authorization && authorization) {
      header[authorization.name] = input.authorization;
    }

    return fetcher.fetch({
      type: bodyType,
      url: url.toString(),
      header,
      body: input.body,
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

  const isParamEmpty =
    path.length === 0 &&
    query.length === 0 &&
    header.length === 0 &&
    body === undefined;

  return (
    <Form {...form}>
      <SchemaContext.Provider
        value={useMemo(
          () => ({ references: schemas, dynamic: dynamicRef }),
          [schemas],
        )}
      >
        <form
          className="not-prose flex flex-col gap-5 rounded-xl border bg-fd-card p-3"
          onSubmit={onSubmit as React.FormEventHandler}
        >
          <div className="flex flex-row gap-2">
            <RouteDisplay route={route} />
            <button
              type="submit"
              className={cn(buttonVariants({ color: 'outline' }))}
              disabled={testQuery.isLoading}
            >
              Send
            </button>
          </div>

          {authorization
            ? renderCustomField('authorization', authorization, fields.auth)
            : null}
          {!isParamEmpty ? (
            <Accordions
              type="multiple"
              className="-m-3 border-0 bg-transparent text-sm"
            >
              {path.length > 0 ? (
                <Accordion title="Path">
                  <div className="flex flex-col gap-4">
                    {path.map((field) =>
                      renderCustomField(
                        `path.${field.name}`,
                        field,
                        fields.path,
                        field.name,
                      ),
                    )}
                  </div>
                </Accordion>
              ) : null}

              {query.length > 0 ? (
                <Accordion title="Query">
                  <div className="flex flex-col gap-4">
                    {query.map((field) =>
                      renderCustomField(
                        `query.${field.name}`,
                        field,
                        fields.query,
                        field.name,
                      ),
                    )}
                  </div>
                </Accordion>
              ) : null}

              {header.length > 0 ? (
                <Accordion title="Headers">
                  <div className="flex flex-col gap-4">
                    {header.map((field) =>
                      renderCustomField(
                        `header.${field.name}`,
                        field,
                        fields.header,
                        field.name,
                      ),
                    )}
                  </div>
                </Accordion>
              ) : null}

              {body ? (
                <Accordion title="Body">
                  {body.type === 'object' && !fields.body ? (
                    <ObjectInput field={body} fieldName="body" />
                  ) : (
                    renderCustomField('body', body, fields.body)
                  )}
                </Accordion>
              ) : null}
            </Accordions>
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

function RouteDisplay({ route }: { route: string }): ReactElement {
  const [path, query] = useWatch<FormValues, ['path', 'query']>({
    name: ['path', 'query'],
  });

  const pathname = useMemo(
    () => createPathnameFromInput(route, path, query),
    [route, path, query],
  );

  return (
    <code className="flex-1 overflow-auto text-nowrap rounded-lg border bg-fd-muted px-2 py-1.5 text-sm text-fd-muted-foreground">
      {pathname}
    </code>
  );
}

function ResultDisplay({ data }: { data: FetchResult }) {
  const statusInfo = useMemo(() => getStatusInfo(data.status), [data.status]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-fd-card p-4">
      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-foreground">
        <statusInfo.icon className={cn('size-4', statusInfo.color)} />
        {statusInfo.description}
      </div>
      <p className="text-sm text-fd-muted-foreground">{data.status}</p>
      {data.data ? (
        <CodeBlock
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
