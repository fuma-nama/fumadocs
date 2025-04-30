'use client';
import {
  createContext,
  type FC,
  Fragment,
  type HTMLAttributes,
  lazy,
  type ReactElement,
  type ReactNode,
  useContext,
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
import { FieldSet, JsonInput, ObjectInput } from './inputs';
import type { ParameterField, RequestSchema } from '@/playground/index';
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
import { ChevronDown, LoaderCircle } from 'lucide-react';
import type { Security } from '@/utils/get-security';
import { useRequestData } from '@/ui/contexts/code-example';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import type { RequestData } from '@/requests/_shared';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from 'fumadocs-ui/utils/cn';
import { cva } from 'class-variance-authority';
import { resolve } from '@/playground/resolve';
import { Ajv2020 } from 'ajv/dist/2020';
import { getDefaultValue } from '@/playground/get-default-values';

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
  authorization?: Security & {
    persistentId: string;
  };
  parameters?: ParameterField[];
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
    auth?: CustomField<'authorization', RequestSchema>;
    body?: CustomField<'body', RequestSchema>;
  };

  components?: Partial<{
    ResultDisplay: FC<{ data: FetchResult }>;
  }>;
};

interface SchemaContextType {
  fieldInfoMap: Map<string, FieldInfo>;
}

interface FieldInfo {
  selectedType?: string;
  oneOf: number;
}

const ajv = new Ajv2020({
  validateSchema: false,
  strict: false,
});

const SchemaContext = createContext<SchemaContextType | undefined>(undefined);

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

export default function Client({
  route,
  method = 'GET',
  authorization,
  parameters: _parameters,
  body: _body,
  fields,
  references,
  proxyUrl,
  components: { ResultDisplay = DefaultResultDisplay } = {},
  ...rest
}: ClientProps) {
  const { server } = useServerSelectContext();
  const requestData = useRequestData();
  const fieldInfoMap = useMemo(() => new Map<string, FieldInfo>(), []);
  const authInfo = usePersistentAuthInfo(authorization);
  const parameters = useMemo(
    () => resolve(_parameters, references),
    [_parameters, references],
  );
  const body = useMemo(() => resolve(_body, references), [_body, references]);

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
    fieldInfoMap.clear();
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

  return (
    <FormProvider {...form}>
      <SchemaContext.Provider
        value={useMemo(
          () => ({
            fieldInfoMap,
          }),
          [fieldInfoMap],
        )}
      >
        <form
          {...rest}
          className={cn(
            'not-prose flex flex-col rounded-xl border shadow-md overflow-hidden bg-fd-card text-fd-card-foreground',
            rest.className,
          )}
          onSubmit={onSubmit}
        >
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

          <FormBody
            body={body}
            fields={fields}
            parameters={parameters}
            authorization={authorization}
          />
          {testQuery.data ? <ResultDisplay data={testQuery.data} /> : null}
          {authorization && <AuthFooter authorization={authorization} />}
        </form>
      </SchemaContext.Provider>
    </FormProvider>
  );
}

const paramNames = ['Headers', 'Cookies', 'Query', 'Path'] as const;
const paramTypes = ['header', 'cookie', 'query', 'path'] as const;

function FormBody({
  authorization,
  parameters = [],
  body,
  fields = {},
}: Pick<ClientProps, 'parameters' | 'authorization' | 'body' | 'fields'>) {
  const { servers } = useApiContext();
  const { server, setServer, setServerVariables } = useServerSelectContext();

  const params = useMemo(() => {
    return paramTypes.map((param) => parameters.filter((v) => v.in === param));
  }, [parameters]);

  function renderAuth() {
    if (!authorization) return null;
    const schema: RequestSchema =
      authorization.type === 'http' && authorization.scheme === 'basic'
        ? {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: {
                type: 'string',
              },
              password: {
                type: 'string',
              },
            },
          }
        : {
            type: 'string',
            description: 'The Authorization access token',
          };

    if (fields?.auth)
      return renderCustomField('authorization', schema, fields.auth);

    return (
      <FieldSet
        fieldName="authorization"
        name="Authorization"
        field={schema}
        isRequired
      />
    );
  }

  return (
    <>
      {servers.length > 0 ? (
        <CollapsiblePanel title="Server URL">
          <ServerSelect
            server={server}
            onServerChanged={setServer}
            onVariablesChanged={setServerVariables}
          />
        </CollapsiblePanel>
      ) : null}

      {params.map((param, i) => {
        const name = paramNames[i];
        const type = paramTypes[i];
        if (type !== 'header' && param.length === 0) return;
        if (type === 'header' && !authorization && param.length === 0) return;

        return (
          <CollapsiblePanel key={name} title={name}>
            {type === 'header' ? renderAuth() : null}
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

      {body ? (
        fields.body ? (
          <CollapsiblePanel title="Body">
            {renderCustomField('body', body.schema, fields.body)}
          </CollapsiblePanel>
        ) : (
          <BodyInput field={body.schema} />
        )
      ) : null}
    </>
  );
}

const bodyTypeVariants = cva(
  'p-1 rounded-lg font-medium text-xs transition-colors',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 text-fd-primary',
        false: 'text-fd-muted-foreground',
      },
    },
  },
);

function BodyInput({ field }: { field: RequestSchema }) {
  const [isJson, setIsJson] = useState(false);

  return (
    <CollapsiblePanel title="Body">
      <div className="grid grid-cols-2 border bg-fd-muted rounded-lg">
        <button
          className={cn(bodyTypeVariants({ active: !isJson }))}
          onClick={() => setIsJson(false)}
          type="button"
        >
          Simple
        </button>
        <button
          className={cn(bodyTypeVariants({ active: isJson }))}
          onClick={() => setIsJson(true)}
          type="button"
        >
          JSON Mode
        </button>
      </div>
      {isJson ? (
        <JsonInput fieldName="body" />
      ) : typeof field === 'object' &&
        field.type === 'object' &&
        !field.oneOf ? (
        <ObjectInput field={field} fieldName="body" />
      ) : (
        <FieldSet field={field} fieldName="body" />
      )}
    </CollapsiblePanel>
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

function usePersistentAuthInfo(authorization?: ClientProps['authorization']) {
  const key = authorization
    ? `__fumadocs_auth_${authorization.persistentId}`
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

/**
 * A hook to store dynamic info of a field, such as selected schema of `oneOf`.
 *
 * @param fieldName - field name of form.
 * @param schema - The JSON Schema to generate initial values.
 * @param depth - The depth to avoid duplicated field name with same schema (e.g. nested `oneOf`).
 */
export function useFieldInfo(
  fieldName: string,
  schema: Exclude<RequestSchema, boolean>,
  depth: number,
): {
  info: FieldInfo;
  updateInfo: (value: Partial<FieldInfo>) => void;
} {
  const keyName = `${fieldName}:${depth}`;
  const { fieldInfoMap } = useContext(SchemaContext)!;
  const [_, trigger] = useState(0);
  const form = useFormContext();
  const value = form.getValues(fieldName as 'body');

  const info = fieldInfoMap.get(keyName) ?? {
    oneOf: -1,
  };

  // update info if needed
  if (!info.selectedType && Array.isArray(schema.type)) {
    info.selectedType =
      schema.type.find((type) =>
        ajv.validate(
          {
            ...schema,
            type,
          },
          value,
        ),
      ) ?? schema.type[0];
  }

  if (info.oneOf === -1 && schema.oneOf) {
    info.oneOf = schema.oneOf.findIndex((item) => ajv.validate(item, value));
    if (info.oneOf === -1) info.oneOf = 0;
  }

  fieldInfoMap.set(keyName, info);

  return {
    info,
    updateInfo: useEffectEvent((value) => {
      const prev = fieldInfoMap.get(keyName);
      if (!prev) return;

      const updated = {
        ...prev,
        ...value,
      };

      if (
        updated.oneOf === prev.oneOf &&
        updated.selectedType === prev.selectedType
      )
        return;

      fieldInfoMap.set(keyName, updated);
      form.setValue(
        fieldName,
        getDefaultValue(
          schema.oneOf && updated.oneOf !== -1
            ? schema.oneOf[updated.oneOf]
            : {
                ...schema,
                type: value.selectedType ?? schema.type,
              },
        ),
      );
      trigger((prev) => prev + 1);
    }),
  };
}
