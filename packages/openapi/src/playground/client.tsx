'use client';
import {
  type FC,
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  useRef,
} from 'react';
import { useRenderContext, useServerContext } from '@/ui/contexts/api';
import type { BrowserFetcherOptions } from '@/playground/fetcher';
import { DefaultResultDisplay, type ResultDisplayProps } from './components/result-display';
import { pathnameFromRequest } from '@/requests/generators';
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
import { cn } from '@/utils/cn';
import {
  anyFields,
  SchemaProvider,
  useResolvedSchema,
} from '@fumadocs/api-docs/components/playground/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fumadocs/api-docs/components/select';
import { labelVariants } from '@fumadocs/api-docs/components/input';
import { getPreferredType, type ParsedSchema } from '@/utils/schema';
import ServerSelect from './components/server-select';
import { useStorageKey } from '@/ui/client/storage-key';
import {
  type DataEngine,
  FieldKey,
  StfProvider,
  useDataEngine,
  useFieldValue,
  useListener,
  useStf,
} from '@fumari/stf';
import { arrayStartsWith, objectGet, objectSet, stringifyFieldKey } from '@fumari/stf/lib/utils';
import {
  FieldInput,
  FieldSet,
  JsonInput,
  ObjectInput,
} from '@fumadocs/api-docs/components/playground/inputs';
import type { HttpMethods, OperationObject, ParameterObject, PathItemObject } from '@/types';
import { useTranslations } from '@fuma-translate/react';
import { useOperationContext } from '@/ui/operation/context';
import { OAuthDialog, OAuthDialogContent, OAuthDialogTrigger } from './components/oauth-dialog';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { useAuth } from './auth';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { Spinner } from '@fumadocs/api-docs/components/spinner';
import { joinURL, resolveServerUrl } from '@fumadocs/api-docs/utils/url';
import { NoReference } from '@fumadocs/api-docs/schema';

export interface FormValues extends Record<string, unknown> {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  cookie: Record<string, unknown>;
  body: unknown;
}

export interface PlaygroundClientProps extends Omit<ComponentProps<'form'>, 'method'> {
  route: string;
  method: HttpMethods;
  operation: NoReference<OperationObject>;
  pathItem: NoReference<PathItemObject>;
  writeOnly: boolean;
  readOnly: boolean;
}

interface SecurityEntry {
  scopes: string[];
  id: string;
}

export type { ResultDisplayProps };
export { DefaultResultDisplay };

export interface CollapsiblePanelProps extends Omit<ComponentProps<typeof Collapsible>, 'title'> {
  'data-type': 'authorization' | 'body' | ParamType;
  title: ReactNode;
}

export interface PlaygroundClientOptions {
  /**
   * transform fields for auth-specific parameters (e.g. header)
   */
  transformAuthInputs?: (fields: AuthField[]) => AuthField[];

  fetchOptions?: BrowserFetcherOptions;

  /**
   * Request timeout in seconds (default: 10s)
   * @deprecated use `fetchOptions.requestTimeout` instead.
   */
  requestTimeout?: number;

  components?: {
    ResultDisplay?: FC<ResultDisplayProps>;
    CollapsiblePanel?: FC<CollapsiblePanelProps>;
  };

  /**
   * render the parameter inputs of API endpoint.
   *
   * for updating values, use:
   * - the `Custom.useController()` from `fumadocs-openapi/playground/client`.
   *
   * Recommended types packages: `json-schema-typed`.
   */
  renderParameterField?: (fieldName: FieldKey, param: ParameterObject) => ReactNode;

  /**
   * render the input for API endpoint body.
   *
   * @see renderParameterField for customization tips
   */
  renderBodyField?: (fieldName: 'body', info: RequestBodyInfo) => ReactNode;
}

interface RequestBodyInfo {
  schema: ParsedSchema;
  mediaType: string;
}

export default function PlaygroundClient({
  route,
  method,
  operation,
  pathItem,
  writeOnly,
  readOnly,
  ...rest
}: PlaygroundClientProps) {
  const t = useTranslations({ note: 'playground' });
  const ctx = useRenderContext();
  const { bundled, dereferenced } = ctx.schema;
  const { parameters, body } = useMemo(() => {
    const parameters: ParameterObject[] = [];
    if (operation.parameters)
      for (const p of operation.parameters) parameters.push(dereferenceShallow(p, bundled));
    if (pathItem.parameters)
      for (const p of pathItem.parameters) parameters.push(dereferenceShallow(p, bundled));
    let body: RequestBodyInfo | undefined;

    if (operation.requestBody) {
      const content = dereferenceShallow(operation.requestBody, bundled).content;
      const mediaType = content ? getPreferredType(content) : undefined;

      if (content && mediaType) {
        body = {
          mediaType,
          schema: dereferenceShallow(content[mediaType], bundled).schema ?? true,
        };
      }
    }

    return {
      body,
      parameters,
    };
  }, [bundled, operation, pathItem]);
  const securityEntries = useMemo(() => {
    const result: SecurityEntry[][] = [];
    const security = operation.security ?? dereferenced.security ?? [];
    if (security.length === 0) return result;

    for (const map of security) {
      const list: SecurityEntry[] = [];

      for (const [key, scopes] of Object.entries(map)) {
        list.push({
          id: key,
          scopes,
        });
      }

      if (list.length > 0) result.push(list);
    }

    return result;
  }, [dereferenced, operation.security]);

  const { example: exampleId, examples, setExampleData } = useOperationContext();
  const { server } = useServerContext();
  const {
    mediaAdapters,
    playground: {
      components: {
        ResultDisplay = DefaultResultDisplay,
        CollapsiblePanel = DefaultCollapsiblePanel,
      } = {},
      requestTimeout,
      fetchOptions = { requestTimeout },
      renderBodyField,
    } = {},
  } = useRenderContext();

  const defaultValues: FormValues = useMemo(() => {
    const requestData = examples.find((example) => example.id === exampleId)?.data;

    return {
      path: requestData?.path ?? {},
      query: requestData?.query ?? {},
      header: requestData?.header ?? {},
      body: requestData?.body ?? {},
      cookie: requestData?.cookie ?? {},
    };
  }, [examples, exampleId]);

  const stf = useStf({
    // it is fine to modify `defaultValues` in place
    // because we already try to persist the form values via `setExampleData`.
    defaultValues,
  });

  const { inputs, requirementId, setRequirementId, mapInputs, initAuthInputs } = useAuthInputs(
    stf.dataEngine,
    securityEntries,
  );

  const testQuery = useQuery(async (input: FormValues) => {
    const fetcher = await import('./fetcher').then((mod) =>
      mod.createBrowserFetcher(mediaAdapters, { proxyUrl: ctx.proxyUrl, ...fetchOptions }),
    );

    const encoded = encodeRequestData(
      { ...mapInputs(input), method, bodyMediaType: body?.mediaType },
      mediaAdapters,
      parameters,
    );
    return fetcher.fetch(
      joinURL(
        new URL(
          server ? resolveServerUrl(server.url, server.variables) : '/',
          window.location.origin,
        ).href,
        pathnameFromRequest(route, encoded),
      ),
      encoded,
    );
  });

  const timerRef = useRef<number | null>(null);
  const stfSync = useRef(false);
  function triggerExampleUpdate() {
    const data = {
      ...mapInputs(stf.dataEngine.getData() as FormValues),
      method,
      bodyMediaType: body?.mediaType,
    };
    setExampleData(data, encodeRequestData(data, mediaAdapters, parameters));
  }

  useListener({
    stf,
    onUpdate() {
      if (!stfSync.current) return;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(triggerExampleUpdate, 400);
    },
  });

  useEffect(() => {
    // same object reference = unchanged
    if (stf.dataEngine.getData() === defaultValues) return;

    stf.dataEngine.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ignore other parts
  }, [defaultValues]);

  useEffect(() => {
    const reset = initAuthInputs();
    triggerExampleUpdate();
    stfSync.current = true;
    return () => {
      stfSync.current = false;
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ignore other parts
  }, [defaultValues, inputs]);

  return (
    <StfProvider value={stf}>
      <SchemaProvider docRoot={bundled as never} writeOnly={writeOnly} readOnly={readOnly}>
        <form
          {...rest}
          className={cn(
            'not-prose flex flex-col rounded-xl border shadow-md overflow-hidden bg-fd-card text-fd-card-foreground',
            rest.className,
          )}
          onSubmit={(e) => {
            testQuery.start(stf.dataEngine.getData() as FormValues);
            e.preventDefault();
          }}
        >
          <ServerSelect className="border-b" />
          <div className="flex flex-row items-center gap-2 text-sm p-3 not-last:pb-0">
            <MethodLabel>{method}</MethodLabel>
            <Route route={route} className={cn('flex-1', operation.deprecated && 'line-through')} />
            <button
              type="submit"
              className={cn(buttonVariants({ color: 'primary', size: 'sm' }), 'w-14 py-1.5')}
              disabled={testQuery.isLoading}
            >
              {testQuery.isLoading ? <LoaderCircle className="size-4 animate-spin" /> : t('Send')}
            </button>
          </div>
          {testQuery.data ? <ResultDisplay data={testQuery.data} reset={testQuery.reset} /> : null}

          {securityEntries.length > 0 && (
            <SecurityRequirements
              securities={securityEntries}
              securityId={requirementId}
              setSecurityId={setRequirementId}
            >
              {inputs.map((input) => (
                <Fragment key={stringifyFieldKey(input.fieldName)}>{input.children}</Fragment>
              ))}
            </SecurityRequirements>
          )}
          <ParametersForm parameters={parameters} />
          {body && (
            <CollapsiblePanel data-type="body" title={t('Body')}>
              {renderBodyField ? renderBodyField('body', body) : <BodyInput field={body.schema} />}
            </CollapsiblePanel>
          )}
        </form>
      </SchemaProvider>
    </StfProvider>
  );
}

function SecurityRequirements({
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
  const t = useTranslations({ note: 'playground' });
  const { isLoading, error } = useAuth();
  const defaultOpen = isLoading || error != null;
  const [open, setOpen] = useState(defaultOpen);
  const { CollapsiblePanel = DefaultCollapsiblePanel } =
    useRenderContext().playground?.components ?? {};

  useOnChange(defaultOpen, () => {
    if (defaultOpen) setOpen(true);
  });

  return (
    <CollapsiblePanel
      title={
        <>
          {t('Authorization')}
          {isLoading && (
            <span className="border-s ps-2 inline-flex items-center gap-1.5 text-fd-muted-foreground text-xs font-mono">
              <Spinner /> {t('Fetching token...')}
            </span>
          )}
        </>
      }
      data-type="authorization"
      open={open}
      onOpenChange={setOpen}
    >
      {error != null && (
        <div className="p-2 border rounded-lg bg-fd-secondary">
          <p className="text-fd-muted-foreground font-medium mb-1">{t('Failed to fetch token')}</p>
          <p>{String(error)}</p>
        </div>
      )}
      <Select value={securityId.toString()} onValueChange={(v) => setSecurityId(Number(v))}>
        <SelectTrigger>
          <SelectValue>
            <SecurityRequirement requirement={securities[securityId]} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {securities.map((security, i) => (
            <SelectItem key={i} value={i.toString()}>
              <SecurityRequirement requirement={security} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </CollapsiblePanel>
  );
}

function SecurityRequirement({ requirement }: { requirement: SecurityEntry[] }) {
  const schemes = useRenderContext().schema.dereferenced.components?.securitySchemes;

  return (
    <div className="flex flex-col gap-2 max-w-[600px]">
      {requirement.map((item) => {
        const scheme = schemes?.[item.id];
        if (!scheme) return;

        return (
          <div key={item.id}>
            <p
              className={cn(
                'font-mono font-medium',
                scheme.deprecated && 'text-fd-muted-foreground line-through',
              )}
            >
              {item.id}
            </p>
            <p className="text-fd-muted-foreground whitespace-pre-wrap">{scheme.description}</p>
          </div>
        );
      })}
    </div>
  );
}

const ParamTypes = ['path', 'header', 'cookie', 'query'] as const;
type ParamType = (typeof ParamTypes)[number];

function ParameterItem({ type, parameters }: { type: ParamType; parameters: ParameterObject[] }) {
  const { renderParameterField } = useRenderContext().playground ?? {};

  return parameters.map((field) => {
    const fieldName: FieldKey = [type, field.name!];
    if (renderParameterField) {
      return renderParameterField(fieldName, field);
    }

    const contentTypes = field.content && Object.keys(field.content);
    const schema =
      field.content && contentTypes && contentTypes.length > 0
        ? field.content[contentTypes[0]].schema
        : field.schema;

    return (
      <FieldSet
        key={stringifyFieldKey(fieldName)}
        name={field.name}
        fieldName={fieldName}
        field={(schema ?? anyFields) as ParsedSchema}
        isRequired={field.required}
      />
    );
  });
}

function ParametersForm({ parameters }: { parameters: ParameterObject[] }) {
  const { components: { CollapsiblePanel = DefaultCollapsiblePanel } = {} } =
    useRenderContext().playground ?? {};
  const t = useTranslations({ note: 'playground' });
  const displayNames = {
    header: t('Header'),
    cookie: t('Cookies'),
    query: t('Query'),
    path: t('Path'),
  };

  return ParamTypes.map((type) => {
    const items = parameters.filter((v) => v.in === type);
    if (items.length === 0) return;

    return (
      <CollapsiblePanel key={type} data-type={type} title={displayNames[type]}>
        <ParameterItem parameters={items} type={type} />
      </CollapsiblePanel>
    );
  });
}

function BodyInput({ field: _field }: { field: ParsedSchema }) {
  const field = useResolvedSchema(_field);
  const [isJson, setIsJson] = useState(false);
  const t = useTranslations({ note: 'playground' });

  if (field.format === 'binary') return <FieldSet field={field} fieldName={['body']} isRequired />;

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
          {t('Close JSON Editor')}
        </button>
        <JsonInput fieldName={['body']} />
      </>
    );

  return (
    <FieldSet
      field={field}
      fieldName={['body']}
      collapsible={false}
      isRequired
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
          {t('Open JSON Editor')}
        </button>
      }
    />
  );
}

export interface AuthField {
  fieldName: FieldKey;
  schemeId: string;
  storageKey: string;
  defaultValue: unknown;
  children: ReactNode;

  mapOutput?: (values: unknown) => unknown;
}

function useAuthInputs(engine: DataEngine, requirements: SecurityEntry[][]) {
  const authCtx = useAuth();
  const storageKeys = useStorageKey();
  const t = useTranslations({ note: 'playground' });
  const ctx = useRenderContext();
  const schemes = ctx.schema.dereferenced.components?.securitySchemes;
  const { transformAuthInputs } = ctx.playground ?? {};

  const [requirementId, setRequirementId] = useState(() => {
    if (!schemes || requirements.length === 0) return -1;

    const idx = requirements.findIndex((s) => s.every((item) => !schemes[item.id].deprecated));
    return idx !== -1 ? idx : 0;
  });
  const requirement = requirementId === -1 ? null : requirements[requirementId];

  let inputs = useMemo<AuthField[]>(() => {
    if (!requirement || !schemes) return [];

    return requirement.map((item) => {
      const scheme = schemes?.[item.id];
      if (scheme.type === 'http' && scheme.scheme === 'basic') {
        const fieldName: FieldKey = ['header', 'Authorization'];
        return {
          fieldName,
          schemeId: item.id,
          storageKey: storageKeys.AuthField(item.id),
          defaultValue: {
            username: '',
            password: '',
          },
          mapOutput(out: unknown) {
            if (out && typeof out === 'object') {
              const obj = out as Record<string, unknown>;
              return `Basic ${btoa(`${obj.username ?? ''}:${obj.password ?? ''}`)}`;
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
              }}
              fieldName={fieldName}
            />
          ),
        };
      }
      if (scheme.type === 'oauth2') {
        const fieldName: FieldKey = ['header', 'Authorization'];
        return {
          fieldName,
          schemeId: item.id,
          storageKey: storageKeys.AuthField(item.id),
          defaultValue: 'Bearer ',
          children: <OAuth2Input fieldName={fieldName} security={item} />,
        };
      }
      if (scheme.type === 'http') {
        const fieldName: FieldKey = ['header', 'Authorization'];
        return {
          fieldName,
          schemeId: item.id,
          storageKey: storageKeys.AuthField(item.id),
          defaultValue: 'Bearer ',
          children: (
            <FieldSet
              name={`${t('Authorization')} (${t('Header')})`}
              fieldName={fieldName}
              field={{
                type: 'string',
              }}
            />
          ),
        };
      }
      if (scheme.type === 'apiKey') {
        const fieldName: FieldKey = [scheme.in!, scheme.name!];
        return {
          fieldName,
          schemeId: item.id,
          defaultValue: '',
          storageKey: storageKeys.AuthField(item.id),
          children: (
            <FieldSet
              fieldName={fieldName}
              name={`${scheme.name} (${scheme.in})`}
              field={{
                type: 'string',
              }}
            />
          ),
        };
      }
      // fallback: openid or unknown
      const fieldName: FieldKey = ['header', 'Authorization'];
      return {
        fieldName,
        schemeId: item.id,
        defaultValue: '',
        storageKey: storageKeys.AuthField(item.id),
        children: (
          <>
            <FieldSet
              name={`${t('Authorization')} (${t('Header')})`}
              fieldName={fieldName}
              field={{
                type: 'string',
              }}
            />
            <p className="text-fd-muted-foreground text-xs">
              {t(
                'OpenID Connect is not supported at the moment, you can still set an access token here.',
              )}
            </p>
          </>
        ),
      };
    });
  }, [requirement, storageKeys, schemes, t]);
  if (transformAuthInputs) inputs = transformAuthInputs(inputs);

  useListener({
    stf: engine,
    onUpdate(key) {
      for (const item of inputs) {
        if (!arrayStartsWith(item.fieldName, key)) continue;
        const value = engine.get(item.fieldName);

        if (value != null) {
          localStorage.setItem(item.storageKey, JSON.stringify(value));
        }
      }
    },
  });

  useOnChange(authCtx.updatedSchemeId, () => {
    const { updatedSchemeId } = authCtx;
    if (!updatedSchemeId) return;
    const { token } = authCtx.store[updatedSchemeId]!;

    const input = inputs.find((input) => input.schemeId === updatedSchemeId);
    if (input) {
      // update current value
      engine.update(input.fieldName, token);
      return;
    }

    const idx = requirements.findIndex((requirement) =>
      requirement.some((item) => item.id === updatedSchemeId),
    );
    if (idx !== -1) {
      // persisted value
      localStorage.setItem(storageKeys.AuthField(updatedSchemeId), JSON.stringify(token));
      setRequirementId(idx);
    }
  });

  return {
    inputs,
    requirementId,
    setRequirementId,
    mapInputs(values: FormValues) {
      const cloned = structuredClone(values);

      for (const item of inputs) {
        if (!item.mapOutput) continue;
        objectSet(cloned, item.fieldName, item.mapOutput(objectGet(cloned, item.fieldName)));
      }

      return cloned;
    },
    initAuthInputs() {
      for (const item of inputs) {
        const stored = localStorage.getItem(item.storageKey);

        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === typeof item.defaultValue) {
            engine.init(item.fieldName, parsed);
            continue;
          }
        }

        engine.init(item.fieldName, item.defaultValue);
      }

      // reset
      return () => {
        for (const item of inputs) {
          engine.delete(item.fieldName);
        }
      };
    },
  };
}

function OAuth2Input({ fieldName, security }: { fieldName: FieldKey; security: SecurityEntry }) {
  const [open, setOpen] = useState(false);
  const engine = useDataEngine();
  const t = useTranslations({ note: 'playground' });

  return (
    <fieldset className="flex flex-col gap-2">
      <label htmlFor={stringifyFieldKey(fieldName)} className={cn(labelVariants())}>
        {t('Access Token')}
      </label>
      <div className="flex gap-2">
        <FieldInput
          fieldName={fieldName}
          field={{
            type: 'string',
          }}
          className="flex-1"
        />

        <OAuthDialog open={open} onOpenChange={setOpen}>
          <OAuthDialogTrigger
            type="button"
            className={cn(
              buttonVariants({
                size: 'sm',
                color: 'secondary',
              }),
            )}
          >
            {t('Authorize')}
          </OAuthDialogTrigger>
          <OAuthDialogContent
            setOpen={setOpen}
            schemeId={security.id}
            scopes={security.scopes}
            setToken={(token) => engine.update(['header', 'Authorization'], token)}
          ></OAuthDialogContent>
        </OAuthDialog>
      </div>
    </fieldset>
  );
}

function Route({ route, ...props }: ComponentProps<'div'> & { route: string }) {
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

export function DefaultCollapsiblePanel({ title, children, ...props }: CollapsiblePanelProps) {
  return (
    <Collapsible {...props} className={cn('border-b last:border-b-0', props.className)}>
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

export const Custom = {
  useController(
    fieldName: FieldKey,
    options?: {
      defaultValue?: unknown;
    },
  ) {
    const [value, setValue] = useFieldValue(fieldName, options);
    return {
      value,
      setValue,
    };
  },
};
