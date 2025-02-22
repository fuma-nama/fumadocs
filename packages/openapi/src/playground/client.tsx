'use client';
import {
  type ReactElement,
  type HTMLAttributes,
  useMemo,
  useRef,
  useEffect,
  type FC,
  Fragment,
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
} from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { cn, buttonVariants } from 'fumadocs-ui/components/api';
import type {
  FieldPath,
  UseFormStateReturn,
  ControllerFieldState,
  ControllerRenderProps,
} from 'react-hook-form';
import { useApiContext } from '@/ui/contexts/api';
import type { FetchResult } from '@/playground/fetcher';
import {
  getDefaultValue,
  getDefaultValues,
} from '@/playground/get-default-values';
import { FieldSet, ObjectInput } from '@/playground/inputs';
import type {
  PrimitiveRequestField,
  ReferenceSchema,
  RequestSchema,
} from '@/playground/index';
import { getStatusInfo } from '@/playground/status-info';
import { getUrl } from '@/utils/server-url';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { MethodLabel } from '@/ui/components/method-label';
import { useQuery } from '@/utils/use-query';
import ServerSelect from '@/ui/server-select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import type { Security } from '@/utils/get-security';

interface FormValues {
  authorization:
    | string
    | {
        username: string;
        password: string;
      };
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

export type ClientProps = HTMLAttributes<HTMLFormElement> & {
  route: string;
  method: string;
  authorization?: Security;
  path?: PrimitiveRequestField[];
  query?: PrimitiveRequestField[];
  header?: PrimitiveRequestField[];
  body?: RequestSchema & {
    mediaType: string;
  };
  schemas: Record<string, RequestSchema>;
  proxyUrl?: string;

  fields?: {
    auth?: CustomField<'authorization', RequestSchema>;
    path?: CustomField<`path.${string}`, PrimitiveRequestField>;
    query?: CustomField<`query.${string}`, PrimitiveRequestField>;
    header?: CustomField<`header.${string}`, PrimitiveRequestField>;
    body?: CustomField<'body', RequestSchema>;
  };

  components?: Partial<{
    ResultDisplay: FC<{ data: FetchResult }>;
  }>;
};

interface SchemaContextType {
  references: Record<string, RequestSchema>;
  dynamic: RefObject<Map<string, DynamicField>>;
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

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

export function useSchemaContext(): SchemaContextType {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error('Missing provider');
  return ctx;
}

function defaultAuthValue(auth: ClientProps['authorization']) {
  if (!auth || auth.type === 'apiKey') return '';
  if (auth.type === 'http' && auth.scheme === 'basic') {
    return {
      username: '',
      password: '',
    };
  }

  return 'Bearer';
}

export function Client({
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
}: ClientProps) {
  const { serverRef, servers } = useApiContext();
  const dynamicRef = useRef(new Map<string, DynamicField>());
  const form = useForm<FormValues>({
    defaultValues: {
      authorization: defaultAuthValue(authorization),
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

    const query = { ...input.query };
    const header = { ...input.header };

    if (input.authorization && authorization) {
      if (authorization.type === 'apiKey') {
        if (authorization.in === 'header') {
          header[authorization.name] = input.authorization;
        } else if (authorization.in === 'query') {
          query[authorization.name] = input.authorization;
        } else {
          if ('cookie' in header) {
            header.Cookie = header.cookie;
            delete header.cookie;
          }

          header.Cookie = [
            header.Cookie as string,
            `${authorization.name}=${input.authorization}`,
          ]
            .filter((s) => s.length > 0)
            .join('; ');
        }
      } else if (
        authorization.type === 'http' &&
        authorization.scheme === 'basic'
      ) {
        if (typeof input.authorization === 'object')
          header.Authorization = `Basic ${btoa(`${input.authorization.username}:${input.authorization.password}`)}`;
      } else {
        header.Authorization = input.authorization;
      }
    }

    const serverUrl = serverRef.current
      ? getUrl(serverRef.current.url, serverRef.current.variables)
      : window.location.origin;
    let url = `${serverUrl}${createPathnameFromInput(route, input.path, query)}`;

    if (proxyUrl) {
      const updated = new URL(proxyUrl, window.location.origin);
      updated.searchParams.append('url', url);
      url = updated.toString();
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
    const key = `__fumadocs_auth_${JSON.stringify(authorization)}`;
    const cached = localStorage.getItem(key);
    if (cached) form.setValue('authorization', JSON.parse(cached));

    const subscription = form.watch((value, { name }) => {
      if (!name || !name.startsWith('authorization') || !value.authorization)
        return;
      localStorage.setItem(key, JSON.stringify(value.authorization));
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
      <FieldSet key={key} name={info.name} fieldName={fieldName} field={info} />
    );
  }

  return (
    <FormProvider {...form}>
      <SchemaContext.Provider
        value={useMemo(
          () => ({ references: schemas, dynamic: dynamicRef }),
          [schemas],
        )}
      >
        <form
          {...props}
          className={cn(
            'not-prose flex flex-col gap-2 rounded-xl border p-3 shadow-md',
            props.className,
          )}
          onSubmit={onSubmit as React.FormEventHandler}
        >
          <FormHeader
            method={method}
            route={route}
            isLoading={testQuery.isLoading}
          />
          {servers.length > 1 ? (
            <CollapsiblePanel title="Server URL">
              <ServerSelect />
            </CollapsiblePanel>
          ) : null}

          {header.length > 0 || authorization ? (
            <CollapsiblePanel title="Headers">
              {authorization?.type === 'http' &&
              authorization.scheme === 'basic'
                ? renderCustomField(
                    'authorization',
                    {
                      name: 'Authorization',
                      type: 'object',
                      isRequired: true,
                      properties: {
                        username: {
                          type: 'string',
                          isRequired: true,
                          defaultValue: '',
                        },
                        password: {
                          type: 'string',
                          isRequired: true,
                          defaultValue: '',
                        },
                      },
                    },
                    fields.auth,
                  )
                : authorization
                  ? renderCustomField(
                      'authorization',
                      {
                        name: 'Authorization',
                        type: 'string',
                        isRequired: true,
                        description: 'The Authorization access token',
                        defaultValue: '',
                      },
                      fields.auth,
                    )
                  : null}
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
    </FormProvider>
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
        'flex flex-row items-center gap-0.5 overflow-auto text-nowrap',
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
    <div className="flex flex-row items-center gap-2 text-sm">
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

function CollapsiblePanel({
  title,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
}) {
  return (
    <Collapsible
      {...props}
      className="border rounded-xl bg-fd-card text-fd-card-foreground overflow-hidden"
    >
      <CollapsibleTrigger className="group w-full inline-flex items-center gap-2 justify-between p-3 text-sm font-medium hover:bg-fd-accent">
        {title}
        <ChevronDown className="size-4 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-4 p-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
