'use client';
import { useOpenAPI } from '@/utils/create-page';
import { useQuery } from 'shared-api/utils/use-query';
import {
  createContext,
  type FC,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import { type DataEngine, type FieldKey, useListener } from '@fumari/stf';
import { arrayStartsWith, objectGet } from '@fumari/stf/lib/utils';
import type { JsonSchema } from '@fumadocs/json-schema';
import type { OAuth2SecurityScheme, OperationObject, SecuritySchemeObject } from '@/types';
import type { RawRequestData } from '@/requests/types';
import { useOperation } from '@/operation';

/** an `implicit` or `authorizationCode` flow that left the page */
interface OAuthFlowData {
  /** the random `state` of the flow */
  state: string;
  client_id: string;
  client_secret: string;
  client_auth: OAuthFlowInput['clientAuth'];
  redirect_uri: string;
  token_url?: string;
}

/** a flow of `requestOAuthToken()` that left the page, in `sessionStorage` */
interface PendingOAuthFlow extends OAuthFlowData {
  /** name of the security scheme */
  scheme: string;
  origin?: string;
}

/** a flow that left the page with `useAuthRedirect()`, in `sessionStorage` */
interface PendingFlow {
  scheme: string;
  origin: string;
  data: unknown;
}

const pendingOAuthKey = 'fumadocs-openapi-oauth';
const pendingFlowKey = 'fumadocs-openapi-flow';

export function readPendingFlow(): PendingFlow | undefined {
  const stored = sessionStorage.getItem(pendingFlowKey);
  if (stored) return JSON.parse(stored) as PendingFlow;
}

function leavePage(url: string | URL, redirectUrl?: string, flow?: PendingFlow) {
  if (flow) sessionStorage.setItem(pendingFlowKey, JSON.stringify(flow));
  // where `createOAuthHandler()` sends users back to
  if (redirectUrl)
    document.cookie = `fumadocs-openapi-oauth=${encodeURIComponent(window.location.pathname)}; path=/`;
  window.location.replace(url);
}

export type OAuthFlowType = keyof NonNullable<OAuth2SecurityScheme['flows']>;

export interface OAuthFlowInput {
  /** name of the security scheme */
  schemeId: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /**
   * where token requests send the client credentials,
   * `header` (HTTP Basic) applies only with a client secret, otherwise the `client_id` goes in the body
   */
  clientAuth: 'body' | 'header';
  /** URL of the selected server, relative URLs of the flow resolve against it */
  serverUrl: string;
  /** URL of the `createOAuthHandler()` route, defaults to the page */
  redirectUrl?: string;
  /** where the flow started, like an operation, restored when it returns to the page */
  origin?: string;
  /**
   * leave the page for `implicit` and `authorizationCode`, like the one of `useAuthRedirect()`, `finishOAuthFlow()` takes `data` when it returns.
   *
   * By default, `usePlaygroundAuth()` finishes them.
   */
  redirect?: (url: URL, data: unknown) => void;
}

/**
 * Run an OAuth flow and resolve its token.
 *
 * `implicit` and `authorizationCode` leave the page instead, see `redirect`.
 */
export async function requestOAuthToken(
  scheme: OAuth2SecurityScheme,
  type: OAuthFlowType,
  {
    schemeId,
    scopes,
    clientId,
    clientSecret,
    username,
    password,
    clientAuth,
    serverUrl,
    redirectUrl,
    origin,
    redirect,
  }: OAuthFlowInput,
): Promise<string | undefined> {
  const flows = scheme.flows ?? {};
  const scope = scopes.join(' ');

  if (type === 'implicit' || type === 'authorizationCode') {
    const flow = flows[type];
    if (!flow) return;
    const data: OAuthFlowData = {
      state: crypto.getRandomValues(new Uint32Array(4)).join(''),
      client_id: clientId,
      client_secret: clientSecret,
      client_auth: clientAuth,
      // redirect URIs cannot have a fragment
      redirect_uri: new URL(redirectUrl ?? window.location.pathname, window.location.origin).href,
      token_url: 'tokenUrl' in flow ? new URL(flow.tokenUrl!, serverUrl).href : undefined,
    };

    // keep the params of `authorizationUrl`, like `audience`
    const url = new URL(flow.authorizationUrl!, serverUrl);
    url.searchParams.set('response_type', type === 'implicit' ? 'token' : 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', data.redirect_uri);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', data.state);
    if (redirect) {
      redirect(url, data);
    } else {
      const pending: PendingOAuthFlow = { ...data, scheme: schemeId, origin };
      sessionStorage.setItem(pendingOAuthKey, JSON.stringify(pending));
      leavePage(url, redirectUrl);
    }
    return;
  }

  if (type !== 'password' && type !== 'clientCredentials') return;
  const flow = flows[type];
  if (!flow) return;

  const body = new URLSearchParams({ scope });
  if (type === 'password') {
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);
  } else {
    body.set('grant_type', 'client_credentials');
  }

  return fetchToken(new URL(flow.tokenUrl!, serverUrl).href, body, {
    client_id: clientId,
    client_secret: clientSecret,
    client_auth: clientAuth,
  });
}

/**
 * Finish an `implicit` or `authorizationCode` flow of `requestOAuthToken()` from the URL it returned to.
 *
 * @returns the token, `undefined` when the URL isn't returning from it
 */
export function finishOAuthFlow(url: URL, data: unknown): Promise<string> | string | undefined {
  const flow = data as OAuthFlowData;
  const code = url.searchParams.get('code');
  // only accept the flow started in this tab
  if (code && url.searchParams.get('state') === flow.state) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: flow.redirect_uri,
    });
    return fetchToken(flow.token_url!, body, flow);
  }

  const hash = new URLSearchParams(url.hash.slice(1));
  const token = hash.get('access_token');
  if (token && hash.get('state') === flow.state)
    return `${hash.get('token_type') ?? 'Bearer'} ${token}`;
}

async function fetchToken(
  tokenUrl: string,
  body: URLSearchParams,
  {
    client_id,
    client_secret,
    client_auth,
  }: Pick<OAuthFlowData, 'client_id' | 'client_secret' | 'client_auth'>,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (client_auth === 'header' && client_secret) {
    // form-encoded first, see RFC 6749 section 2.3.1
    headers.Authorization = `Basic ${btoa(`${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`)}`;
  } else {
    if (client_id) body.set('client_id', client_id);
    if (client_secret) body.set('client_secret', client_secret);
  }

  const res = await fetch(tokenUrl, { method: 'POST', headers, body });

  if (!res.ok) throw new Error(await res.text());
  const { access_token, token_type = 'Bearer' } = (await res.json()) as {
    access_token: string;
    token_type?: string;
  };

  return `${token_type} ${access_token}`;
}

/** scheme name -> token info */
type TokenStore = Record<string, TokenInfo | undefined>;
type TokenInfo =
  | {
      type: 'authorization_code';
      client_id: string;
      client_secret: string;
      client_auth: OAuthFlowInput['clientAuth'];
      token: string;
    }
  | {
      type: 'implicit';
      client_id: string;
      token: string;
    };

type TokenListener = (schemeId: string, token: string) => void;

interface AuthContextType {
  store: TokenStore;
  isLoading: boolean;
  error?: unknown;
  /** `origin` of the flow that returned to the page */
  origin?: string;
  /** listen to the tokens of flows returning to the page, returns a cleanup */
  subscribe: (listener: TokenListener) => () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function usePlaygroundAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');
  return ctx;
}

export function PlaygroundAuthProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<TokenStore>({});
  const [origin, setOrigin] = useState<string>();
  const { subscribe, emit } = useMemo(() => {
    const listeners = new Set<TokenListener>();

    return {
      subscribe(listener: TokenListener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      emit(schemeId: string, token: string) {
        for (const listener of listeners) listener(schemeId, token);
      },
    };
  }, []);

  const returnQuery = useQuery(async (flow: PendingOAuthFlow, result: Promise<string> | string) => {
    setOrigin(flow.origin);
    const token = await result;
    const info: TokenInfo =
      typeof result === 'string'
        ? { type: 'implicit', client_id: flow.client_id, token }
        : {
            type: 'authorization_code',
            client_id: flow.client_id,
            client_secret: flow.client_secret,
            client_auth: flow.client_auth,
            token,
          };

    setStore((s) => ({ ...s, [flow.scheme]: info }));
    emit(flow.scheme, token);
  });

  const onMount = useEffectEvent(() => {
    const stored = sessionStorage.getItem(pendingOAuthKey);
    if (!stored) return;
    const flow = JSON.parse(stored) as PendingOAuthFlow;
    const result = finishOAuthFlow(new URL(window.location.href), flow);
    if (result === undefined) return;

    sessionStorage.removeItem(pendingOAuthKey);
    window.history.replaceState(null, '', window.location.pathname);
    void returnQuery.start(flow, result);
  });

  useEffect(() => onMount(), []);

  return (
    <AuthContext
      value={useMemo(
        () => ({
          store,
          isLoading: returnQuery.isLoading,
          error: returnQuery.error,
          origin,
          subscribe,
        }),
        [store, returnQuery.isLoading, returnQuery.error, origin, subscribe],
      )}
    >
      {children}
    </AuthContext>
  );
}

/**
 * Leave the page for a flow of field, like signing in, with the returned function.
 *
 * When the page loads again, the playground reopens, and `onReturn` gets the URL and `data` of flow.
 */
export function useAuthRedirect(
  field: AuthField,
  onReturn?: (url: URL, data: unknown) => void,
): (url: string | URL, data?: unknown) => void {
  const { oauthRedirectUrl } = useOpenAPI();
  const { method, path } = useOperation();
  const origin = `${method} ${path}`;
  const onMount = useEffectEvent(() => {
    if (!onReturn) return;
    const flow = readPendingFlow();
    if (flow?.scheme !== field.schemeId || flow.origin !== origin) return;
    sessionStorage.removeItem(pendingFlowKey);
    const url = new URL(window.location.href);
    window.history.replaceState(null, '', window.location.pathname);
    onReturn(url, flow.data);
  });

  useEffect(() => onMount(), []);
  return (url, data) => leavePage(url, oauthRedirectUrl, { scheme: field.schemeId, origin, data });
}

export interface AuthRequirement {
  /** id of the security scheme */
  id: string;
  scopes: string[];
  scheme: SecuritySchemeObject;
}

/**
 * How the playground handles a security scheme: its rows, and how its value authorizes requests.
 *
 * Omitted options come from the next provider of the scheme, and then the built-in one.
 */
export interface AuthProvider {
  /** the ID of security schemes it handles, or a function. Every scheme when omitted */
  on?: string | ((item: AuthRequirement) => boolean);
  /** the rows of field */
  render?: FC<AuthRenderProps>;
  /** write the value into request data, for sending and code usages */
  onRequest?: (data: RawRequestData, value: unknown, field: AuthField) => void;
}

export interface AuthRenderProps {
  field: AuthField;
  /** a row editing the value, or its property at `path` */
  Value: FC<{
    name: string;
    type?: string;
    description?: string;
    schema?: Exclude<JsonSchema, boolean>;
    path?: string;
  }>;
  /** a row opening `component` in a panel */
  Panel: FC<{ title: ReactNode; component: FC<AuthPanelProps> }>;
}

export interface AuthPanelProps {
  field: AuthField;
  /** back to the request */
  close: () => void;
}

export interface AuthField {
  schemeId: string;
  scheme: SecuritySchemeObject;
  scopes: string[];
  /** the form field holding its value */
  fieldName: FieldKey;
  /** `localStorage` key of its persisted value */
  storageKey: string;
  defaultValue: unknown;
  provider: AuthProvider;
}

const builtinProviders: AuthProvider[] = [
  {
    on: ({ scheme }) => scheme.type === 'http' && scheme.scheme === 'basic',
    render: ({ field, Value }) => (
      <>
        <Value
          name="username"
          type="basic"
          description={field.scheme.description}
          path="username"
        />
        <Value name="password" path="password" schema={{ type: 'string', format: 'password' }} />
      </>
    ),
    onRequest(data, value) {
      const { username, password } = value as Record<string, string>;
      data.header.Authorization = `Basic ${btoa(`${username}:${password}`)}`;
    },
  },
  {
    on: ({ scheme }) => scheme.type === 'apiKey',
    render: ({ field: { scheme }, Value }) =>
      scheme.type === 'apiKey' && (
        <Value name={scheme.name!} type={scheme.in} description={scheme.description} />
      ),
    onRequest(data, value, { scheme }) {
      if (scheme.type === 'apiKey') data[scheme.in as 'header'][scheme.name!] = value;
    },
  },
  {
    render: ({ field, Value }) => (
      <Value name="Authorization" type="header" description={field.scheme.description} />
    ),
    onRequest(data, value) {
      data.header.Authorization = value;
    },
  },
];

function findProvider(providers: AuthProvider[] = [], item: AuthRequirement): AuthProvider {
  const match = ({ on }: AuthProvider) =>
    on === undefined || (typeof on === 'string' ? on === item.id : on(item));
  let provider = builtinProviders.find(match)!;

  for (let i = providers.length - 1; i >= 0; i--) {
    if (match(providers[i])) provider = { ...provider, ...providers[i] };
  }
  return provider;
}

function getDefaultValue(scheme: SecuritySchemeObject): unknown {
  if (scheme.type === 'apiKey') return '';
  if (scheme.type !== 'http' || !scheme.scheme) return 'Bearer ';
  if (scheme.scheme === 'basic') return { username: '', password: '' };
  // HTTP schemes are prefixed by their name, like `Token `
  return `${scheme.scheme[0].toUpperCase()}${scheme.scheme.slice(1)} `;
}

export interface AuthFields {
  /** the security requirements of the operation, one of them authorizes the request */
  requirements: AuthRequirement[][];
  /** index of the selected requirement, `-1` when the operation needs no authorization */
  selected: number;
  select: (index: number) => void;
  /** the fields of the selected requirement */
  fields: AuthField[];
  /** encode the auth fields of form values into request data */
  mapValues: <T>(values: T) => T;
  /** write the persisted values into the form, returns a cleanup removing them */
  init: () => () => void;
}

export interface AuthFieldsOptions {
  /** the operation to authorize, defaults to the security of the document */
  operation?: OperationObject;

  /** handle security schemes, before the built-in providers */
  providers?: AuthProvider[];

  /** customise the generated fields, like their default values */
  transform?: (fields: AuthField[]) => AuthField[];
}

/**
 * The auth fields of an API playground: the values it persists, and the request data they encode into.
 */
export function useAuthFields(
  engine: DataEngine,
  { operation, providers, transform }: AuthFieldsOptions = {},
): AuthFields {
  const { subscribe } = usePlaygroundAuth();
  const { storageKeyPrefix, doc } = useOpenAPI();
  const { dereferenced, resolve } = doc;
  const schemes = dereferenced.components?.securitySchemes;

  const requirements = useMemo<AuthRequirement[][]>(() => {
    const out: AuthRequirement[][] = [];
    if (!schemes) return out;

    for (const map of operation?.security ?? dereferenced.security ?? []) {
      const list: AuthRequirement[] = [];

      for (const [id, scopes] of Object.entries(map)) {
        const scheme = resolve(schemes[id]);
        if (scheme) list.push({ id, scopes, scheme });
      }

      if (list.length > 0) out.push(list);
    }

    return out;
  }, [dereferenced.security, operation?.security, resolve, schemes]);

  const [selected, select] = useState(() => {
    if (requirements.length === 0) return -1;
    const idx = requirements.findIndex((req) => req.every((item) => !item.scheme.deprecated));

    return idx !== -1 ? idx : 0;
  });
  const requirement = selected === -1 ? null : requirements[selected];

  const fields = useMemo<AuthField[]>(() => {
    if (!requirement) return [];

    const out = requirement.map((item): AuthField => ({
      schemeId: item.id,
      scheme: item.scheme,
      scopes: item.scopes,
      fieldName: ['auth', item.id],
      storageKey: `${storageKeyPrefix}auth-${item.id}`,
      defaultValue: getDefaultValue(item.scheme),
      provider: findProvider(providers, item),
    }));

    return transform ? transform(out) : out;
  }, [requirement, storageKeyPrefix, providers, transform]);

  useListener({
    stf: engine,
    onUpdate(key) {
      for (const field of fields) {
        // the field, its properties, or its parents
        if (!arrayStartsWith(key, field.fieldName) && !arrayStartsWith(field.fieldName, key))
          continue;
        const value = engine.get(field.fieldName);

        if (value != null) localStorage.setItem(field.storageKey, JSON.stringify(value));
      }
    },
  });

  const onToken = useEffectEvent((schemeId: string, token: string) => {
    const field = fields.find((field) => field.schemeId === schemeId);
    if (field) {
      // update current value
      engine.update(field.fieldName, token);
      return;
    }

    const idx = requirements.findIndex((req) => req.some((item) => item.id === schemeId));
    if (idx !== -1) {
      // persisted value
      localStorage.setItem(`${storageKeyPrefix}auth-${schemeId}`, JSON.stringify(token));
      select(idx);
    }
  });

  useEffect(() => subscribe(onToken), [subscribe]);

  return {
    requirements,
    selected,
    select,
    fields,
    mapValues: useCallback(
      (values) => {
        const cloned = structuredClone(values);
        const data = cloned as unknown as RawRequestData & { auth?: unknown };
        for (const field of fields)
          field.provider.onRequest!(data, objectGet(data, field.fieldName), field);

        delete data.auth;
        return cloned;
      },
      [fields],
    ),
    init: useCallback(() => {
      for (const field of fields) {
        const stored = localStorage.getItem(field.storageKey);

        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (typeof parsed === typeof field.defaultValue) {
            engine.init(field.fieldName, parsed);
            continue;
          }
        }

        engine.init(field.fieldName, field.defaultValue);
      }

      return () => {
        for (const field of fields) engine.delete(field.fieldName);
      };
    }, [engine, fields]),
  };
}
