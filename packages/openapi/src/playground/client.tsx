'use client';
import {
  type FC,
  Fragment,
  type HTMLAttributes,
  lazy,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useEffectEvent,
} from 'react';
import type {
  FieldPath,
  UseControllerProps,
  UseControllerReturn,
} from 'react-hook-form';
import {
  FormProvider,
  get,
  set,
  useController,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { useApiContext } from '@/ui/contexts/api';
import type { FetchResult } from '@/playground/fetcher';
import {
  FieldInput,
  FieldSet,
  JsonInput,
  ObjectInput,
} from './components/inputs';
import type {
  ParameterField,
  RequestSchema,
  SecurityEntry,
} from '@/playground/index';
import { getStatusInfo } from './status-info';
import {
  joinURL,
  resolveRequestData,
  resolveServerUrl,
  withBase,
} from '@/utils/url';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { MethodLabel } from '@/ui/components/method-label';
import { useQuery } from '@/utils/use-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import { encodeRequestData } from '@/requests/media/encode';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import {
  type FieldInfo,
  SchemaProvider,
  useResolvedSchema,
} from '@/playground/schema';
import { useOperationContext } from '@/ui/contexts/operation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { labelVariants } from '@/ui/components/input';
import type { ParsedSchema } from '@/utils/schema';
import type { RequestData } from '@/requests/types';
import ServerSelect from './components/server-select';
import { useStorageKey } from '@/ui/client/storage-key';

export interface FormValues {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  cookie: Record<string, unknown>;
  body: unknown;

  /**
   * Store the cached encoded request data, do not modify it.
   */
  _encoded?: RequestData;
}

export interface PlaygroundClientProps extends HTMLAttributes<HTMLFormElement> {
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
}

export interface PlaygroundClientOptions {
  /**
   * transform fields for auth-specific parameters (e.g. header)
   */
  transformAuthInputs?: (fields: AuthField[]) => AuthField[];

  /**
   * Request timeout in seconds (default: 10s)
   */
  requestTimeout?: number;

  components?: Partial<{
    ResultDisplay: FC<{ data: FetchResult }>;
  }>;

  /**
   * render the paremeter inputs of API endpoint.
   *
   * It uses `react-hook-form`, you can use either:
   * - the library itself, with types from `fumadocs-openapi/playground/client`.
   * - the `Custom.useController()` from `fumadocs-openapi/playground/client`.
   *
   * Recommended types packages: `json-schema-typed`, `openapi-types`.
   */
  renderParameterField?: (
    fieldName: FieldPath<FormValues>,
    param: ParameterField,
  ) => ReactNode;

  /**
   * render the input for API endpoint body.
   *
   * @see renderParameterField for customisation tips
   */
  renderBodyField?: (
    fieldName: 'body',
    info: {
      schema: RequestSchema;
      mediaType: string;
    },
  ) => ReactNode;
}

const OauthDialog = lazy(() =>
  import('./components/oauth-dialog').then((mod) => ({
    default: mod.OauthDialog,
  })),
);
const OauthDialogTrigger = lazy(() =>
  import('./components/oauth-dialog').then((mod) => ({
    default: mod.OauthDialogTrigger,
  })),
);

export default function PlaygroundClient({
  route,
  method = 'GET',
  securities,
  parameters = [],
  body,
  references,
  proxyUrl,
  ...rest
}: PlaygroundClientProps) {
  const {
    example: exampleId,
    examples,
    setExampleData,
  } = useOperationContext();
  const storageKeys = useStorageKey();
  const fieldInfoMap = useMemo(() => new Map<string, FieldInfo>(), []);
  const {
    mediaAdapters,
    serverRef,
    client: {
      playground: {
        components: { ResultDisplay = DefaultResultDisplay } = {},
        requestTimeout = 10,
        transformAuthInputs,
      } = {},
    },
  } = useApiContext();
  const [securityId, setSecurityId] = useState(0);
  const { inputs, mapInputs, initAuthValues } = useAuthInputs(
    securities[securityId],
    transformAuthInputs,
  );

  const defaultValues: FormValues = useMemo(() => {
    const requestData = examples.find(
      (example) => example.id === exampleId,
    )?.data;

    return {
      path: requestData?.path ?? {},
      query: requestData?.query ?? {},
      header: requestData?.header ?? {},
      body: requestData?.body ?? {},
      cookie: requestData?.cookie ?? {},
    };
  }, [examples, exampleId]);

  const form = useForm<FormValues>({
    defaultValues,
  });

  const testQuery = useQuery(async (input: FormValues) => {
    const targetServer = serverRef.current;
    const fetcher = await import('./fetcher').then((mod) =>
      mod.createBrowserFetcher(mediaAdapters, requestTimeout),
    );

    input._encoded ??= encodeRequestData(
      { ...mapInputs(input), method, bodyMediaType: body?.mediaType },
      mediaAdapters,
      parameters,
    );

    return fetcher.fetch(
      joinURL(
        withBase(
          targetServer
            ? resolveServerUrl(targetServer.url, targetServer.variables)
            : '/',
          window.location.origin,
        ),
        resolveRequestData(route, input._encoded),
      ),
      {
        proxyUrl,
        ...input._encoded,
      },
    );
  });

  const onUpdateDebounced = useEffectEvent((values: FormValues) => {
    for (const item of inputs) {
      const value = get(values, item.fieldName);

      if (value) {
        localStorage.setItem(
          storageKeys.AuthField(item),
          JSON.stringify(value),
        );
      }
    }

    const data = {
      ...mapInputs(values),
      method,
      bodyMediaType: body?.mediaType,
    };
    values._encoded ??= encodeRequestData(data, mediaAdapters, parameters);
    setExampleData(data, values._encoded);
  });

  useEffect(() => {
    let timer: number | null = null;

    const subscription = form.subscribe({
      formState: {
        values: true,
      },
      callback({ values }) {
        // remove cached encoded request data
        delete values._encoded;

        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(
          () => onUpdateDebounced(values),
          timer ? 400 : 0,
        );
      },
    });

    return () => subscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mounted once only
  }, []);

  useEffect(() => {
    form.reset(initAuthValues(defaultValues));

    return () => fieldInfoMap.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ignore other parts
  }, [defaultValues]);

  useEffect(() => {
    form.reset((values) => initAuthValues(values));

    return () => {
      form.reset((values) => {
        for (const item of inputs) {
          set(values, item.fieldName, undefined);
        }

        return values;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ignore other parts
  }, [inputs]);

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
          <div className="flex flex-row items-center gap-2 text-sm p-3 not-last:pb-0">
            <MethodLabel>{method}</MethodLabel>
            <Route route={route} className="flex-1" />
            <button
              type="submit"
              className={cn(
                buttonVariants({ color: 'primary', size: 'sm' }),
                'w-14 py-1.5',
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
          <FormBody body={body} parameters={parameters} />
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
              {security.map((item) => (
                <div key={item.id} className="max-w-[600px]">
                  <p className="font-mono font-medium">{item.id}</p>
                  <p className="text-fd-muted-foreground whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>
              ))}
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

const ParamTypes = ['path', 'header', 'cookie', 'query'] as const;

function FormBody({
  parameters = [],
  body,
}: Pick<PlaygroundClientProps, 'parameters' | 'body'>) {
  const { renderParameterField, renderBodyField } =
    useApiContext().client.playground ?? {};
  const panels = useMemo(() => {
    return ParamTypes.map((type) => {
      const items = parameters.filter((v) => v.in === type);
      if (items.length === 0) return;

      return (
        <CollapsiblePanel
          key={type}
          title={
            {
              header: 'Header',
              cookie: 'Cookies',
              query: 'Query',
              path: 'Path',
            }[type]
          }
        >
          {items.map((field) => {
            const fieldName = `${type}.${field.name}` as const;
            if (renderParameterField) {
              return renderParameterField(fieldName, field);
            }

            const schema = (
              field.content
                ? field.content[Object.keys(field.content)[0]].schema
                : field.schema
            ) as ParsedSchema;

            return (
              <FieldSet
                key={fieldName}
                name={field.name}
                fieldName={fieldName}
                field={schema}
              />
            );
          })}
        </CollapsiblePanel>
      );
    });
  }, [parameters, renderParameterField]);

  return (
    <>
      {panels}
      {body && (
        <CollapsiblePanel title="Body">
          {renderBodyField ? (
            renderBodyField('body', body)
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

  if (isJson)
    return (
      <>
        <button
          className={cn(
            buttonVariants({
              color: 'secondary',
              size: 'sm',
              className: 'w-fit font-mono p-2',
            }),
          )}
          onClick={() => setIsJson(false)}
          type="button"
        >
          Close JSON Editor
        </button>
        <JsonInput fieldName="body" />
      </>
    );

  return (
    <FieldSet
      field={field}
      fieldName="body"
      collapsible={false}
      name={
        <button
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
              size: 'sm',
              className: 'p-2',
            }),
          )}
          onClick={() => setIsJson(true)}
        >
          Open JSON Editor
        </button>
      }
    />
  );
}

export interface AuthField {
  fieldName: string;
  defaultValue: unknown;

  original?: SecurityEntry;
  children: ReactNode;

  mapOutput?: (values: unknown) => unknown;
}

function useAuthInputs(
  securities?: SecurityEntry[],
  transform?: (fields: AuthField[]) => AuthField[],
) {
  const storageKeys = useStorageKey();
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
            <ObjectInput
              field={{
                type: 'object',
                properties: {
                  username: {
                    type: 'string',
                  },
                  password: {
                    type: 'string',
                  },
                },
                required: ['username', 'password'],
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
                  isRequired
                  field={{
                    type: 'string',
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
              isRequired
              field={{
                type: 'string',
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
              name={`${security.name} (${security.in})`}
              isRequired
              field={{
                type: 'string',
              }}
            />
          ),
        });
      } else {
        const fieldName = 'header.Authorization';

        result.push({
          fieldName,
          defaultValue: '',
          original: security,
          children: (
            <>
              <FieldSet
                name="Authorization (header)"
                isRequired
                fieldName={fieldName}
                field={{
                  type: 'string',
                }}
              />
              <p className="text-fd-muted-foreground text-xs">
                OpenID Connect is not supported at the moment, you can still set
                an access token here.
              </p>
            </>
          ),
        });
      }
    }

    return transform ? transform(result) : result;
  }, [securities, transform]);

  const mapInputs = (values: FormValues) => {
    const cloned = structuredClone(values);

    for (const item of inputs) {
      if (!item.mapOutput) continue;

      set(cloned, item.fieldName, item.mapOutput(get(cloned, item.fieldName)));
    }

    return cloned;
  };

  const initAuthValues = (values: FormValues) => {
    for (const item of inputs) {
      const stored = localStorage.getItem(storageKeys.AuthField(item));

      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === typeof item.defaultValue) {
          set(values, item.fieldName, parsed);
          continue;
        }
      }

      set(values, item.fieldName, item.defaultValue);
    }

    return values;
  };

  return { inputs, mapInputs, initAuthValues };
}

function Route({
  route,
  ...props
}: HTMLAttributes<HTMLDivElement> & { route: string }) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-center gap-0.5 overflow-auto text-nowrap',
        props.className,
      )}
    >
      {route.split('/').map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <span className="text-fd-muted-foreground">/</span>}
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
      {data.data !== undefined && (
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
      )}
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

// exports for customisations
export const Custom = {
  useController<
    TName extends FieldPath<FormValues> = FieldPath<FormValues>,
    TTransformedValues = FormValues,
  >(
    props: UseControllerProps<FormValues, TName, TTransformedValues>,
  ): UseControllerReturn<FormValues, TName> {
    return useController<FormValues, TName, TTransformedValues>(props);
  },
};
