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
  useState,
} from 'react';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { cn, buttonVariants } from 'fumadocs-ui/components/api';
import type {
  FieldPath,
  UseFormStateReturn,
  ControllerFieldState,
  ControllerRenderProps,
} from 'react-hook-form';
import { useApiContext, useServerSelectContext } from '@/ui/contexts/api';
import type { FetchResult } from '@/playground/fetcher';
import { FieldSet, ObjectInput } from './inputs';
import type {
  PrimitiveRequestField,
  ReferenceSchema,
  RequestSchema,
} from '@/playground/index';
import { getStatusInfo } from './status-info';
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
import {
  OauthDialog,
  OauthDialogTrigger,
} from '@/playground/auth/oauth-dialog';
import { useRequestData } from '@/ui/contexts/code-example';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import type { RequestData } from '@/requests/_shared';

interface FormValues {
  authorization:
    | string
    | {
        username: string;
        password: string;
      };
  path: Record<string, string>;
  query: Record<string, string>;
  header: Record<string, string>;
  cookie: Record<string, string>;
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
  parameters?: PrimitiveRequestField[];
  body?: RequestSchema & {
    mediaType: string;
  };
  /**
   * Resolver for reference schemas you've passed
   */
  references: Record<string, RequestSchema>;
  proxyUrl?: string;

  fields?: {
    parameter?: CustomField<
      `${PrimitiveRequestField['in']}.${string}`,
      PrimitiveRequestField
    >;
    auth?: CustomField<'authorization', RequestSchema>;
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

function toRequestData(
  method: string,
  mediaType: string | undefined,
  value: FormValues,
): RequestData {
  return {
    path: value.path,
    method,
    header: value.header,
    body: value.body,
    bodyMediaType: mediaType as RequestData['bodyMediaType'],
    cookie: value.cookie,
    query: value.query,
  };
}

export function Client({
  route,
  method = 'GET',
  authorization,
  parameters = [],
  body,
  fields = {},
  references,
  proxyUrl,
  components: { ResultDisplay = DefaultResultDisplay } = {},
  ...props
}: ClientProps) {
  const { servers } = useApiContext();
  const { server, setServer, setServerVariables } = useServerSelectContext();
  const params = useMemo(() => {
    return {
      headers: parameters.filter((v) => v.in === 'header'),
      cookies: parameters.filter((v) => v.in === 'cookie'),
      queries: parameters.filter((v) => v.in === 'query'),
      paths: parameters.filter((v) => v.in === 'path'),
    };
  }, [parameters]);

  const dynamicRef = useRef(new Map<string, DynamicField>());
  const requestData = useRequestData();
  const authInfo = usePersistentAuthInfo(authorization);
  const defaultValues: FormValues = useMemo(
    () => ({
      authorization: authInfo.info,
      path: requestData.data.path,
      query: requestData.data.query,
      header: requestData.data.header,
      body: requestData.data.body,
      cookie: requestData.data.cookie,
    }),
    [authInfo.info, requestData.data],
  );

  const form = useForm<FormValues>({
    defaultValues,
  });

  const testQuery = useQuery(async (input: FormValues) => {
    const fetcher = await import('./fetcher').then((mod) =>
      mod.createBrowserFetcher(),
    );

    const serverUrl = server
      ? getUrl(server.url, server.variables)
      : window.location.origin;

    return fetcher.fetch(`${serverUrl}${route}`, {
      proxyUrl,
      ...toRequestData(method, body?.mediaType, input),
    });
  });

  useEffect(() => {
    form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update default value
  }, [defaultValues]);

  useEffect(() => {
    const subscription = form.watch((_value) => {
      const value = _value as FormValues;

      if (authorization && value.authorization) {
        authInfo.saveInfo(value.authorization);

        writeAuthHeader(
          authorization,
          value.authorization,
          value.header,
          value.query,
          value.cookie,
        );
      }

      requestData.saveData(toRequestData(method, body?.mediaType, value));
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
          () => ({ references: references, dynamic: dynamicRef }),
          [references],
        )}
      >
        <AuthProvider authorization={authorization}>
          <form
            {...props}
            className={cn(
              'not-prose flex flex-col gap-2 rounded-xl border p-3 shadow-md',
              props.className,
            )}
            onSubmit={onSubmit}
          >
            <FormHeader
              method={method}
              route={route}
              isLoading={testQuery.isLoading}
            />
            {servers.length > 1 ? (
              <CollapsiblePanel title="Server URL">
                <ServerSelect
                  server={server}
                  onServerChanged={setServer}
                  onVariablesChanged={setServerVariables}
                />
              </CollapsiblePanel>
            ) : null}

            {params.headers.length > 0 || authorization ? (
              <CollapsiblePanel title="Headers">
                {authorization ? (
                  <AuthField authorization={authorization} />
                ) : null}
                {params.headers.map((field) =>
                  renderCustomField(
                    `header.${field.name}`,
                    field,
                    fields.parameter,
                    field.name,
                  ),
                )}
              </CollapsiblePanel>
            ) : null}

            {params.paths.length > 0 ? (
              <CollapsiblePanel title="Path">
                {params.paths.map((field) =>
                  renderCustomField(
                    `path.${field.name}`,
                    field,
                    fields.parameter,
                    field.name,
                  ),
                )}
              </CollapsiblePanel>
            ) : null}

            {params.queries.length > 0 ? (
              <CollapsiblePanel title="Query">
                {params.queries.map((field) =>
                  renderCustomField(
                    `query.${field.name}`,
                    field,
                    fields.parameter,
                    field.name,
                  ),
                )}
              </CollapsiblePanel>
            ) : null}

            {params.cookies.length > 0 ? (
              <CollapsiblePanel title="Cookies">
                {params.cookies.map((field) =>
                  renderCustomField(
                    `cookie.${field.name}`,
                    field,
                    fields.parameter,
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
        </AuthProvider>
      </SchemaContext.Provider>
    </FormProvider>
  );
}

function AuthProvider({
  authorization,
  children,
}: {
  authorization?: Security;
  children: ReactNode;
}) {
  const form = useFormContext();
  if (!authorization || authorization.type !== 'oauth2') return children;

  // only the first one, so it looks simpler :)
  const flow = Object.keys(authorization.flows)[0];

  return (
    <OauthDialog
      flow={flow as keyof typeof authorization.flows}
      scheme={authorization}
      setToken={(token) => form.setValue('authorization', `Bearer ${token}`)}
    >
      {children}
    </OauthDialog>
  );
}

function AuthField({ authorization }: { authorization: Security }) {
  return (
    <>
      <FieldSet
        fieldName="authorization"
        name="Authorization"
        field={
          authorization?.type === 'http' && authorization.scheme === 'basic'
            ? {
                type: 'object',
                isRequired: true,
                properties: {
                  username: {
                    type: 'string',
                    isRequired: true,
                  },
                  password: {
                    type: 'string',
                    isRequired: true,
                  },
                },
              }
            : {
                type: 'string',
                isRequired: true,
                description: 'The Authorization access token',
              }
        }
      />
      {authorization?.type === 'oauth2' && (
        <OauthDialogTrigger
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
            }),
          )}
        >
          Open
        </OauthDialogTrigger>
      )}
    </>
  );
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

function usePersistentAuthInfo(authorization?: Security) {
  const key = authorization
    ? `__fumadocs_auth_${JSON.stringify(authorization)}`
    : null;
  const [info, setInfo] = useState<FormValues['authorization']>(() => {
    if (!authorization || authorization.type === 'apiKey') return '';
    if (authorization.type === 'http' && authorization.scheme === 'basic') {
      return {
        username: '',
        password: '',
      };
    }

    return 'Bearer';
  });

  useEffect(() => {
    if (!key) return;
    const item = localStorage.getItem(key);

    if (item) {
      setInfo(JSON.parse(item));
    }
  }, [key]);

  return {
    info,
    saveInfo: useEffectEvent((value: FormValues['authorization']) => {
      if (!key) return;
      localStorage.setItem(key, JSON.stringify(value));
    }),
  };
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

function writeAuthHeader(
  authorization: Security,
  input: FormValues['authorization'],
  header: Record<string, unknown>,
  query: Record<string, unknown>,
  cookie: Record<string, string>,
) {
  if (authorization.type === 'apiKey') {
    if (authorization.in === 'header') {
      header[authorization.name] = input as string;
    }

    if (authorization.in === 'query') {
      query[authorization.name] = input as string;
    }

    if (authorization.in === 'cookie') {
      cookie[authorization.name] = input as string;
    }
    return;
  }

  if (
    authorization.type === 'http' &&
    authorization.scheme === 'basic' &&
    typeof input === 'object'
  ) {
    header.Authorization = `Basic ${btoa(`${input.username}:${input.password}`)}`;
    return;
  }

  if (typeof input === 'string') {
    header.Authorization = input;
  }
}
