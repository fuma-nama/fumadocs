'use client';
import {
  createContext,
  type FC,
  Fragment,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  useRef,
} from 'react';
import { useOpenAPI } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { useExampleRequests } from '@/operation';
import type { BrowserFetcherOptions } from '@/playground/fetcher';
import { DefaultResultDisplay, type ResultDisplayProps } from './components/result-display';
import { pathnameFromRequest } from '@/requests/generators';
import { MethodLabel } from '@/ui/components/method-label';
import { useQuery } from 'shared-api/utils/use-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'shared-api/components/collapsible';
import { ChevronDown, LoaderCircle, PlusIcon } from 'lucide-react';
import { encodeRequestData } from '@/requests/media/encode';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/utils/cn';
import {
  anyFields,
  SchemaProvider,
  useResolvedSchema,
} from 'shared-api/components/playground/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { Label } from 'shared-api/components/label';
import type { JsonSchema } from '@fumadocs/json-schema';
import ServerSelect from './components/server-select';
import {
  FieldKey,
  StfProvider,
  useDataEngine,
  useFieldValue,
  useListener,
  useStf,
} from '@fumari/stf';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import {
  FieldInput,
  FieldSet,
  JsonInput,
  ObjectInput,
} from 'shared-api/components/playground/inputs';
import type { HttpMethods, OperationObject, ParameterObject, PathItemObject } from '@/types';
import { useTranslations } from '@fuma-translate/react';
import { OAuthDialog, OAuthDialogContent, OAuthDialogTrigger } from './components/oauth-dialog';
import { dereference } from '@fumadocs/json-schema';
import {
  type AuthField,
  type AuthRequirement,
  useAuthFields,
  usePlaygroundAuth,
} from '@/playground/auth';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { Spinner } from 'shared-api/components/spinner';

export interface FormValues extends Record<string, unknown> {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  cookie: Record<string, unknown>;
  body: unknown;
}

export interface PlaygroundClientProps
  extends Omit<ComponentProps<'form'>, 'method'>, PlaygroundClientOptions {
  route: string;
  method: HttpMethods;
  operation: OperationObject;
  pathItem: PathItemObject;
  writeOnly: boolean;
  readOnly: boolean;
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

  components?: {
    ResultDisplay?: FC<ResultDisplayProps>;
    CollapsiblePanel?: FC<CollapsiblePanelProps>;
  };

  /**
   * render the parameter inputs of API endpoint.
   *
   * for updating values, use:
   * - the `Custom.useController()` from `fumadocs-openapi/ui/playground/client`.
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
  schema: JsonSchema;
  mediaType: string;
}

const OptionsContext = createContext<PlaygroundClientOptions>({});

function getPreferredType(body: Record<string, unknown>): string | undefined {
  if ('application/json' in body) return 'application/json';

  return Object.keys(body)[0];
}

function usePlaygroundOptions() {
  return use(OptionsContext);
}

export default function PlaygroundClient({
  route,
  method,
  operation,
  pathItem,
  writeOnly,
  readOnly,
  transformAuthInputs,
  fetchOptions,
  components,
  renderParameterField,
  renderBodyField,
  ...rest
}: PlaygroundClientProps) {
  const t = useTranslations({ note: 'playground' });
  const { doc, mediaAdapters, proxyUrl } = useOpenAPI();
  const { dereferenced } = doc;
  const options = useMemo<PlaygroundClientOptions>(
    () => ({
      transformAuthInputs,
      fetchOptions,
      components,
      renderParameterField,
      renderBodyField,
    }),
    [transformAuthInputs, fetchOptions, components, renderParameterField, renderBodyField],
  );
  const { parameters, body } = useMemo(() => {
    const parameters: ParameterObject[] = [];
    if (operation.parameters) for (const p of operation.parameters) parameters.push(dereference(p));
    if (pathItem.parameters) for (const p of pathItem.parameters) parameters.push(dereference(p));
    let body: RequestBodyInfo | undefined;

    if (operation.requestBody) {
      const content = dereference(operation.requestBody).content;
      const mediaType = content ? getPreferredType(content) : undefined;

      if (content && mediaType) {
        body = {
          mediaType,
          schema: dereference(content[mediaType]).schema ?? true,
        };
      }
    }

    return {
      body,
      parameters,
    };
  }, [operation, pathItem]);
  const { items: examples, selected: exampleId, update } = useExampleRequests();
  const { resolveUrl } = useServer();
  const { ResultDisplay = DefaultResultDisplay, CollapsiblePanel = DefaultCollapsiblePanel } =
    components ?? {};

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
    // because we already try to persist the form values via `update()`.
    defaultValues,
  });

  const auth = useAuthFields(stf.dataEngine, {
    operation,
    transform: transformAuthInputs,
  });

  const testQuery = useQuery(async (input: FormValues) => {
    const fetcher = await import('@/playground/fetcher').then((mod) =>
      mod.createBrowserFetcher(mediaAdapters, {
        proxyUrl,
        ...fetchOptions,
      }),
    );

    const encoded = encodeRequestData(
      { ...auth.mapValues(input), method, bodyMediaType: body?.mediaType },
      mediaAdapters,
      parameters,
    );
    return fetcher.fetch(resolveUrl(pathnameFromRequest(route, encoded)), encoded);
  });

  const timerRef = useRef<number | null>(null);
  const stfSync = useRef(false);
  function triggerExampleUpdate() {
    const data = {
      ...auth.mapValues(stf.dataEngine.getData() as FormValues),
      method,
      bodyMediaType: body?.mediaType,
    };
    update(data);
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
    const reset = auth.init();
    triggerExampleUpdate();
    stfSync.current = true;
    return () => {
      stfSync.current = false;
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ignore other parts
  }, [defaultValues, auth.init]);

  return (
    <OptionsContext value={options}>
      <StfProvider value={stf}>
        <SchemaProvider docRoot={dereferenced as never} writeOnly={writeOnly} readOnly={readOnly}>
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
              <Route
                route={route}
                className={cn('flex-1', operation.deprecated && 'line-through')}
              />
              <button
                type="submit"
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'w-14 py-1.5')}
                disabled={testQuery.isLoading}
              >
                {testQuery.isLoading ? <LoaderCircle className="size-4 animate-spin" /> : t('Send')}
              </button>
            </div>
            {testQuery.data ? (
              <ResultDisplay data={testQuery.data} reset={testQuery.reset} />
            ) : null}

            {auth.requirements.length > 0 && (
              <SecurityRequirements
                requirements={auth.requirements}
                selected={auth.selected}
                select={auth.select}
              >
                {auth.fields.map((field) => (
                  <Fragment key={stringifyFieldKey(field.fieldName)}>
                    <AuthInput field={field} />
                  </Fragment>
                ))}
              </SecurityRequirements>
            )}
            <ParametersForm parameters={parameters} />
            {body && (
              <CollapsiblePanel data-type="body" title={t('Body')}>
                {renderBodyField ? (
                  renderBodyField('body', body)
                ) : (
                  <BodyInput field={body.schema} />
                )}
              </CollapsiblePanel>
            )}
          </form>
        </SchemaProvider>
      </StfProvider>
    </OptionsContext>
  );
}

function SecurityRequirements({
  requirements,
  select,
  selected,
  children,
}: {
  requirements: AuthRequirement[][];
  selected: number;
  select: (value: number) => void;
  children: ReactNode;
}) {
  const t = useTranslations({ note: 'playground' });
  const { isLoading, error } = usePlaygroundAuth();
  const defaultOpen = isLoading || error != null;
  const [open, setOpen] = useState(defaultOpen);
  const { CollapsiblePanel = DefaultCollapsiblePanel } = usePlaygroundOptions().components ?? {};

  useOnChange(defaultOpen, () => {
    if (defaultOpen) setOpen(true);
  });

  const items = requirements.map((requirement, i) => {
    if (requirement.length === 1) {
      const { id, scheme } = requirement[0];

      return {
        value: i,
        label: (
          <div>
            <p
              className={cn(
                'font-mono font-medium',
                scheme.deprecated && 'text-fd-muted-foreground line-through',
              )}
            >
              {id}
            </p>
            <p className="text-fd-muted-foreground whitespace-pre-wrap">{scheme.description}</p>
          </div>
        ),
      };
    }

    return {
      value: i,
      label: (
        <div>
          <p className="inline-flex items-center gap-1 font-mono font-medium">
            {requirement.map((item, i) => (
              <Fragment key={i}>
                {i > 0 && <PlusIcon className="text-fd-muted-foreground size-3.5" />}
                <span
                  className={cn(item.scheme.deprecated && 'text-fd-muted-foreground line-through')}
                >
                  {item.id}
                </span>
              </Fragment>
            ))}
          </p>
          <ul className="text-fd-muted-foreground whitespace-pre-wrap list-disc list-inside">
            {requirement.map((item, i) => (
              <li key={i} className="empty:hidden">
                {item.scheme.description}
              </li>
            ))}
          </ul>
        </div>
      ),
    };
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
      <Select items={items} value={selected} onValueChange={(v) => v !== null && select(v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {children}
    </CollapsiblePanel>
  );
}

const ParamTypes = ['path', 'header', 'cookie', 'query'] as const;
type ParamType = (typeof ParamTypes)[number];

function ParameterItem({ type, parameters }: { type: ParamType; parameters: ParameterObject[] }) {
  const { renderParameterField } = usePlaygroundOptions();

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
        field={(schema ?? anyFields) as JsonSchema}
        isRequired={field.required}
      />
    );
  });
}

function ParametersForm({ parameters }: { parameters: ParameterObject[] }) {
  const { CollapsiblePanel = DefaultCollapsiblePanel } = usePlaygroundOptions().components ?? {};
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

function BodyInput({ field: _field }: { field: JsonSchema }) {
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
              variant: 'secondary',
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
              variant: 'secondary',
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

function AuthInput({ field }: { field: AuthField }) {
  const t = useTranslations({ note: 'playground' });
  const { fieldName, scheme } = field;

  if (scheme.type === 'oauth2') return <OAuth2Input field={field} />;

  if (scheme.type === 'http' && scheme.scheme === 'basic') {
    return (
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
    );
  }

  if (scheme.type === 'apiKey') {
    return (
      <FieldSet
        fieldName={fieldName}
        name={`${scheme.name} (${scheme.in})`}
        field={{
          type: 'string',
        }}
      />
    );
  }

  return (
    <>
      <FieldSet
        name={`${t('Authorization')} (${t('Header')})`}
        fieldName={fieldName}
        field={{
          type: 'string',
        }}
      />
      {scheme.type !== 'http' && (
        <p className="text-fd-muted-foreground text-xs">
          {t(
            'OpenID Connect is not supported at the moment, you can still set an access token here.',
          )}
        </p>
      )}
    </>
  );
}

function OAuth2Input({ field }: { field: AuthField }) {
  const { fieldName } = field;
  const [open, setOpen] = useState(false);
  const engine = useDataEngine();
  const t = useTranslations({ note: 'playground' });

  return (
    <fieldset className="flex flex-col gap-2">
      <Label htmlFor={stringifyFieldKey(fieldName)}>{t('Access Token')}</Label>
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
                variant: 'secondary',
              }),
            )}
          >
            {t('Authorize')}
          </OAuthDialogTrigger>
          <OAuthDialogContent
            setOpen={setOpen}
            schemeId={field.schemeId}
            scopes={field.scopes}
            setToken={(token) => engine.update(['header', 'Authorization'], token)}
          />
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
        <ChevronDown className="ms-auto size-3.5 text-fd-muted-foreground group-data-[panel-open]:rotate-180" />
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
