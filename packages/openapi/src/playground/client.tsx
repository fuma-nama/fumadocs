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
import { FieldInput, FieldSet, JsonInput } from './inputs';
import type {
  ParameterField,
  RequestSchema,
  SecurityEntry,
} from '@/playground/index';
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
import type { RequestData } from '@/requests/_shared';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import {
  type FieldInfo,
  SchemaProvider,
  useResolvedSchema,
} from '@/playground/schema';
import {
  useRequestDataUpdater,
  useRequestInitialData,
} from '@/ui/contexts/code-example';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { labelVariants } from '@/ui/components/input';

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

export interface ClientProps extends HTMLAttributes<HTMLFormElement> {
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
}

const AuthPrefix = '__fumadocs_auth';

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
  const requestData = useRequestInitialData();
  const updater = useRequestDataUpdater();
  const fieldInfoMap = useMemo(() => new Map<string, FieldInfo>(), []);
  const { mediaAdapters } = useApiContext();
  const [securityId, setSecurityId] = useState(0);
  const { inputs, mapInputs } = useAuthInputs(securities[securityId]);

  const defaultValues: FormValues = useMemo(
    () => ({
      path: requestData.path,
      query: requestData.query,
      header: requestData.header,
      body: requestData.body,
      cookie: requestData.cookie,
    }),
    [requestData],
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

  function initAuthValues(values: FormValues, inputs: AuthField[]) {
    for (const item of inputs) {
      manipulateValues(values, item.fieldName, () => {
        const stored = localStorage.getItem(AuthPrefix + item.original.id);

        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === typeof item.defaultValue) return parsed;
        }

        return item.defaultValue;
      });
    }

    return values;
  }

  useOnChange(defaultValues, () => {
    fieldInfoMap.clear();
    form.reset(initAuthValues(defaultValues, inputs));
  });

  useOnChange(inputs, (current, previous) => {
    form.reset((values) => {
      for (const item of previous) {
        if (current.some(({ original }) => original.id === item.original.id)) {
          continue;
        }

        manipulateValues(values, item.fieldName, () => undefined);
      }

      return initAuthValues(values, current);
    });
  });

  const onUpdateDebounced = useEffectEvent((values: FormValues) => {
    for (const item of inputs) {
      const value = item.fieldName
        .split('.')
        .reduce((v, seg) => v[seg as keyof object], values as object);

      if (value) {
        localStorage.setItem(
          AuthPrefix + item.original.id,
          JSON.stringify(value),
        );
      }
    }

    updater.setData(toRequestData(method, body?.mediaType, mapInputs(values)));
  });

  useEffect(() => {
    let timer: number | null = null;

    const subscription = form.subscribe({
      formState: {
        values: true,
      },
      callback({ values }) {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(
          () => onUpdateDebounced(values),
          timer ? 400 : 0,
        );
      },
    });
    form.reset((values) => initAuthValues(values, inputs));

    return () => subscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mounted once only
  }, []);

  const onSubmit = form.handleSubmit((value) => {
    testQuery.start(mapInputs(value));
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
            <SecurityTabs
              securities={securities}
              securityId={securityId}
              setSecurityId={setSecurityId}
            >
              {inputs.map((input) => (
                <Fragment key={input.fieldName}>{input.children}</Fragment>
              ))}
            </SecurityTabs>
          )}
          <FormBody body={body} fields={fields} parameters={parameters} />
          {testQuery.data ? <ResultDisplay data={testQuery.data} /> : null}
        </form>
      </SchemaProvider>
    </FormProvider>
  );
}

function SecurityTabs({
  securities,
  setSecurityId,
  securityId,
  children,
}: {
  securities: SecurityEntry[][];
  securityId: number;
  setSecurityId: (value: number) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useFormContext();

  const result = (
    <CollapsiblePanel title="Authorization">
      <Select
        value={securityId.toString()}
        onValueChange={(v) => setSecurityId(Number(v))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {securities.map((security, i) => (
            <SelectItem key={i} value={i.toString()}>
              {security.map((item) => item.id).join(' & ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </CollapsiblePanel>
  );

  for (let i = 0; i < securities.length; i++) {
    const security = securities[i];

    for (const item of security) {
      if (item.type === 'oauth2') {
        return (
          <OauthDialog
            scheme={item}
            scopes={item.scopes}
            open={open}
            setOpen={(v) => {
              setOpen(v);
              if (v) {
                setSecurityId(i);
              }
            }}
            setToken={(token) => form.setValue('header.Authorization', token)}
          >
            {result}
          </OauthDialog>
        );
      }
    }
  }

  return result;
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

interface AuthField {
  fieldName: string;
  defaultValue: unknown;

  original: SecurityEntry;
  children: ReactNode;

  mapOutput?: (values: unknown) => unknown;
}

/**
 * manipulate values without mutating the original object
 *
 * @returns a new manipulated object
 */
function manipulateValues<T extends object>(
  values: T,
  fieldName: string,
  update: (v: unknown) => unknown,
  clone = false,
): T {
  const root = clone ? { ...values } : values;
  let current = root as Record<string, unknown>;
  const segments = fieldName.split('.');

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (i !== segments.length - 1) {
      let v = current[segment] as Record<string, unknown>;
      if (clone) v = { ...v };

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

function useAuthInputs(securities?: SecurityEntry[]) {
  const inputs = useMemo(() => {
    const result: AuthField[] = [];
    if (!securities) return result;

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
            if (out && typeof out === 'object') {
              return `Basic ${btoa(`${'username' in out ? out.username : ''}:${'password' in out ? out.password : ''}`)}`;
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
      } else if (security.type === 'oauth2') {
        const fieldName = 'header.Authorization';

        result.push({
          fieldName: fieldName,
          original: security,
          defaultValue: 'Bearer ',
          children: (
            <fieldset className="flex flex-col gap-2">
              <label htmlFor={fieldName} className={cn(labelVariants())}>
                Access Token
              </label>
              <div className="flex gap-2">
                <FieldInput
                  fieldName={fieldName}
                  field={{
                    type: 'string',
                    description:
                      security.description ?? `The Authorization access token.`,
                  }}
                  className="flex-1"
                />

                <OauthDialogTrigger
                  type="button"
                  className={cn(
                    buttonVariants({
                      size: 'sm',
                      color: 'secondary',
                    }),
                  )}
                >
                  Authorize
                </OauthDialogTrigger>
              </div>
            </fieldset>
          ),
        });
      } else if (security.type === 'http') {
        const fieldName = 'header.Authorization';

        result.push({
          fieldName: fieldName,
          original: security,
          defaultValue: 'Bearer ',
          children: (
            <FieldSet
              name="Authorization (header)"
              fieldName={fieldName}
              field={{
                type: 'string',
                description:
                  security.description ?? `The Authorization access token.`,
              }}
            />
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

  const mapInputs = useEffectEvent((values: FormValues) => {
    for (const item of inputs) {
      if (!item.mapOutput) continue;

      values = manipulateValues(values, item.fieldName, item.mapOutput, true);
    }

    return values;
  });

  return { inputs, mapInputs };
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
    <div className="flex flex-col gap-3 p-3">
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
