'use client';
import {
  type FC,
  Fragment,
  type HTMLAttributes,
  lazy,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldPath,
  UseFormStateReturn,
} from 'react-hook-form';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { useApiContext, useServerSelectContext } from '@/ui/contexts/api';
import type { FetchResult } from '@/playground/fetcher';
import { FieldSet, JsonInput } from './inputs';
import type { ParameterField, RequestSchema } from '@/playground/index';
import { getStatusInfo } from './status-info';
import { getUrl } from '@/utils/server-url';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { MethodLabel } from '@/ui/components/method-label';
import { useQuery } from '@/utils/use-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import type { Security } from '@/utils/get-security';
import { useRequestData } from '@/ui/contexts/code-example';
import type { RequestData } from '@/requests/_shared';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import {
  type FieldInfo,
  SchemaProvider,
  useResolvedSchema,
} from '@/playground/schema';

interface FormValues {
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

type SecurityEntry = Security & {
  id: string;
};

export type ClientProps = HTMLAttributes<HTMLFormElement> & {
  route: string;
  method: string;
  parameters?: ParameterField[];
  securities: SecurityEntry[][];
  body?: {
    schema: RequestSchema;
    mediaType: string;
  };
  /**
   * Resolver for $ref schemas you've passed
   */
  references: Record<string, RequestSchema>;
  proxyUrl?: string;

  fields?: {
    parameter?: CustomField<
      `${ParameterField['in']}.${string}`,
      ParameterField
    >;
    auth?: CustomField<FieldPath<FormValues>, RequestSchema>;
    body?: CustomField<'body', RequestSchema>;
  };

  components?: Partial<{
    ResultDisplay: FC<{ data: FetchResult }>;
  }>;
};

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
    bodyMediaType: mediaType,
    cookie: value.cookie,
    query: value.query,
  };
}

const ServerSelect = lazy(() => import('@/ui/server-select'));

export default function Client({
  route,
  method = 'GET',
  securities,
  parameters,
  body,
  fields,
  references,
  proxyUrl,
  components: { ResultDisplay = DefaultResultDisplay } = {},
  ...rest
}: ClientProps) {
  const { server } = useServerSelectContext();
  const requestData = useRequestData();
  const fieldInfoMap = useMemo(() => new Map<string, FieldInfo>(), []);
  const { mediaAdapters } = useApiContext();
  const submitHandler = useRef<SubmitHandler | null>(null);
  const defaultValues: FormValues = useMemo(
    () => ({
      path: requestData.data.path,
      query: requestData.data.query,
      header: requestData.data.header,
      body: requestData.data.body,
      cookie: requestData.data.cookie,
    }),
    [requestData.data],
  );

  const form = useForm<FormValues>({
    defaultValues,
  });

  const testQuery = useQuery(async (input: FormValues) => {
    const fetcher = await import('./fetcher').then((mod) =>
      mod.createBrowserFetcher(mediaAdapters),
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
    fieldInfoMap.clear();
    form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update default value
  }, [defaultValues]);

  useEffect(() => {
    const subscription = form.watch((_value) => {
      let value = _value as FormValues;
      if (submitHandler.current) value = submitHandler.current(value);

      requestData.saveData(toRequestData(method, body?.mediaType, value));
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mounted only once
  }, []);

  const onSubmit = form.handleSubmit((value) => {
    if (submitHandler.current) value = submitHandler.current(value);

    testQuery.start(value);
  });

  return (
    <FormProvider {...form}>
      <SchemaProvider fieldInfoMap={fieldInfoMap} references={references}>
        <form
          {...rest}
          className={cn(
            'not-prose flex flex-col rounded-xl border shadow-md overflow-hidden bg-fd-card text-fd-card-foreground',
            rest.className,
          )}
          onSubmit={onSubmit}
        >
          <ServerSelect />
          <div className="flex flex-row items-center gap-2 text-sm p-3 pb-0">
            <MethodLabel>{method}</MethodLabel>
            <Route route={route} className="flex-1" />
            <button
              type="submit"
              className={cn(
                buttonVariants({ color: 'primary', size: 'sm' }),
                'px-3 py-1.5',
              )}
              disabled={testQuery.isLoading}
            >
              {testQuery.isLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                'Send'
              )}
            </button>
          </div>

          {securities.length > 0 && (
            <SecuritiesTabs
              securities={securities}
              onSetSubmitHandler={(v) => (submitHandler.current = v)}
            />
          )}
          <FormBody body={body} fields={fields} parameters={parameters} />
          {testQuery.data ? <ResultDisplay data={testQuery.data} /> : null}
        </form>
      </SchemaProvider>
    </FormProvider>
  );
}

function SecuritiesTabs({
  securities,
  onSetSubmitHandler,
}: {
  securities: SecurityEntry[][];
  onSetSubmitHandler: (handler: SubmitHandler) => void;
}) {
  const [idx, setIdx] = useState(0);

  return (
    <div className="p-3">
      <div className="flex items-center mb-4 overflow-auto border bg-fd-muted rounded-full">
        {securities.map((security, i) => (
          <button
            type="button"
            key={i}
            onClick={() => setIdx(i)}
            className={cn(
              'flex-1 text-xs font-medium font-mono px-2 py-1.5 text-nowrap transition-colors',
              i === idx
                ? 'bg-fd-primary/10 text-fd-primary'
                : 'text-fd-muted-foreground hover:text-fd-accent-foreground',
            )}
          >
            {security.map((item) => item.id).join(' & ')}
          </button>
        ))}
      </div>
      <AuthInput
        securities={securities[idx]}
        onSetSubmitHandler={onSetSubmitHandler}
      />
    </div>
  );
}

const paramNames = ['Headers', 'Cookies', 'Query', 'Path'] as const;
const paramTypes = ['header', 'cookie', 'query', 'path'] as const;

function FormBody({
  parameters = [],
  fields = {},
  body,
}: Pick<ClientProps, 'parameters' | 'body' | 'fields'>) {
  const params = useMemo(() => {
    return paramTypes.map((param) => parameters.filter((v) => v.in === param));
  }, [parameters]);

  return (
    <>
      {params.map((param, i) => {
        if (param.length === 0) return;
        const name = paramNames[i];
        const type = paramTypes[i];

        return (
          <CollapsiblePanel key={name} title={name}>
            {param.map((field) => {
              const fieldName = `${type}.${field.name}` as const;

              if (fields?.parameter) {
                return renderCustomField(
                  fieldName,
                  field.schema,
                  fields.parameter,
                  field.name,
                );
              }

              return (
                <FieldSet
                  key={fieldName}
                  name={field.name}
                  fieldName={fieldName}
                  field={field.schema}
                />
              );
            })}
          </CollapsiblePanel>
        );
      })}

      {body && (
        <CollapsiblePanel title="Body">
          {fields.body ? (
            renderCustomField('body', body.schema, fields.body)
          ) : (
            <BodyInput field={body.schema} />
          )}
        </CollapsiblePanel>
      )}
    </>
  );
}

function BodyInput({ field: _field }: { field: RequestSchema }) {
  const field = useResolvedSchema(_field);
  const [isJson, setIsJson] = useState(false);

  if (field.format === 'binary')
    return <FieldSet field={field} fieldName="body" />;

  return (
    <>
      {isJson ? (
        <JsonInput fieldName="body">
          <button
            className={cn(
              buttonVariants({
                color: 'ghost',
                size: 'sm',
                className: 'p-2',
              }),
            )}
            onClick={() => setIsJson(false)}
            type="button"
          >
            Close JSON Editor
          </button>
        </JsonInput>
      ) : (
        <FieldSet
          field={field}
          fieldName="body"
          name={
            <button
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  size: 'sm',
                  className: 'p-2',
                }),
              )}
              onClick={() => setIsJson(true)}
              type="button"
            >
              Open JSON Editor
            </button>
          }
        />
      )}
    </>
  );
}

type SubmitHandler = (values: FormValues) => FormValues;
type AuthField = {
  fieldName: string;
  defaultValue: unknown;

  original: SecurityEntry;
  children: ReactNode;

  mapOutput?: (values: unknown) => unknown;
};

/**
 * manipulate values without mutating the original object
 *
 * @returns a new manipulated object
 */
function manipulateValues(
  values: Record<string, unknown>,
  fieldName: string,
  update: (v: unknown) => unknown,
): Record<string, unknown> {
  const root = { ...values };
  let current = root;
  const segments = fieldName.split('.');

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (i !== segments.length - 1) {
      let v = current[segment] as Record<string, unknown>;
      v = { ...v };

      current[segment] = v;
      current = v;
      continue;
    }

    const updated = update(current[segment]);
    if (updated === undefined) {
      delete current[segment];
    } else {
      current[segment] = updated;
    }
  }

  return root;
}

function AuthInput({
  securities,
  onSetSubmitHandler,
}: {
  securities: SecurityEntry[];
  onSetSubmitHandler: (handler: SubmitHandler) => void;
}) {
  const form = useFormContext();
  const auth = useMemo(() => {
    const result: AuthField[] = [];

    for (const security of securities) {
      if (security.type === 'http' && security.scheme === 'basic') {
        const fieldName = `header.Authorization`;

        result.push({
          fieldName,
          original: security,
          defaultValue: {
            username: '',
            password: '',
          },
          mapOutput(out) {
            if (
              out &&
              typeof out === 'object' &&
              'username' in out &&
              'password' in out
            ) {
              return `Basic ${btoa(`${out.username}:${out.password}`)}`;
            }

            return out;
          },
          children: (
            <FieldSet
              name="Authorization (header)"
              field={{
                type: 'object',
                required: ['username', 'password'],
                description: security.description,
                properties: {
                  username: {
                    type: 'string',
                  },
                  password: {
                    type: 'string',
                  },
                },
              }}
              fieldName={fieldName}
            />
          ),
        });
      } else if (security.type === 'http' || security.type === 'oauth2') {
        const fieldName = 'header.Authorization';
        result.push({
          fieldName: fieldName,
          original: security,
          defaultValue: 'Bearer ',
          children: (
            <>
              <FieldSet
                name="Authorization (header)"
                fieldName={fieldName}
                field={{
                  type: 'string',
                  description:
                    security.description ?? `The Authorization access token.`,
                }}
              />
              <AuthFooter authorization={security} />
            </>
          ),
        });
      } else if (security.type === 'apiKey') {
        const fieldName = `${security.in}.${security.name}`;

        result.push({
          fieldName,
          defaultValue: '',
          original: security,
          children: (
            <FieldSet
              fieldName={fieldName}
              name={security.name}
              field={{
                type: 'string',
                description:
                  security.description ?? `The API key in ${security.in}.`,
              }}
            />
          ),
        });
      }

      // TODO: handle OpenID connect
    }

    return result;
  }, [securities]);

  useEffect(() => {
    const prefix = '__fumadocs_auth';

    for (const item of auth) {
      const value = localStorage.getItem(prefix + item.original.id);

      form.setValue(item.fieldName, value ? JSON.parse(value) : '');
    }

    return () => {
      for (const item of auth) {
        const v = form.getValues(item.fieldName);
        if (v) {
          localStorage.setItem(prefix + item.original.id, JSON.stringify(v));
        }

        form.reset((values) =>
          manipulateValues(values, item.fieldName, () => undefined),
        );
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps -- ignore `form`
  }, [auth, securities]);

  onSetSubmitHandler((values) => {
    for (const item of auth) {
      if (!item.mapOutput) continue;

      values = manipulateValues(
        values as unknown as Record<string, unknown>,
        item.fieldName,
        item.mapOutput,
      ) as unknown as FormValues;
    }

    return values;
  });

  return (
    <div className="flex flex-col gap-4">
      {auth.map((item) => (
        <Fragment key={item.fieldName}>{item.children}</Fragment>
      ))}
    </div>
  );
}

function renderCustomField(
  fieldName: string,
  info: RequestSchema & { name?: string },
  field: CustomField<never, never>,
  key?: string,
) {
  return (
    <Controller
      key={key}
      // @ts-expect-error we use string here
      render={(props) => field.render({ ...props, info })}
      name={fieldName}
    />
  );
}

const OauthDialog = lazy(() =>
  import('./auth/oauth-dialog').then((mod) => ({
    default: mod.OauthDialog,
  })),
);
const OauthDialogTrigger = lazy(() =>
  import('./auth/oauth-dialog').then((mod) => ({
    default: mod.OauthDialogTrigger,
  })),
);

function AuthFooter({ authorization }: { authorization: Security }) {
  const form = useFormContext();
  if (authorization.type !== 'oauth2') return;

  // only the first one, so it looks simpler :)
  const flow = Object.keys(authorization.flows)[0];

  return (
    <OauthDialog
      flow={flow as keyof typeof authorization.flows}
      scheme={authorization}
      setToken={(token) => form.setValue('authorization', `Bearer ${token}`)}
    >
      <OauthDialogTrigger
        type="button"
        className={cn(
          buttonVariants({
            color: 'secondary',
          }),
        )}
      >
        Auth Settings
      </OauthDialogTrigger>
    </OauthDialog>
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

function DefaultResultDisplay({ data }: { data: FetchResult }) {
  const statusInfo = useMemo(() => getStatusInfo(data.status), [data.status]);
  const { shikiOptions } = useApiContext();

  return (
    <div className="flex flex-col gap-3 border-t p-3">
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
          options={shikiOptions}
        />
      ) : null}
    </div>
  );
}

function CollapsiblePanel({
  title,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: ReactNode;
}) {
  return (
    <Collapsible {...props} className="border-b last:border-b-0">
      <CollapsibleTrigger className="group w-full flex items-center gap-2 p-3 text-sm font-medium">
        {title}
        <ChevronDown className="ms-auto size-3.5 text-fd-muted-foreground group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 p-3 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
