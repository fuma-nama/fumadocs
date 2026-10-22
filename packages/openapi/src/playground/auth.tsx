'use client';
import { useOpenAPI } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { useQuery } from 'shared-api/utils/use-query';
import {
  createContext,
  type FC,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { type DataEngine, type FieldKey, type Stf, useListener, useStf } from '@fumari/stf';
import { arrayStartsWith, objectGet } from '@fumari/stf/lib/utils';
import type { JsonSchema } from '@fumadocs/json-schema';
import type { OAuthFlows, OperationObject, SecuritySchemeObject } from '@/types';
import type { RawRequestData } from '@/requests/types';
import { useOperation } from '@/operation';
import { proxied } from './fetcher';

/** how token requests authenticate the client */
interface OAuthClient {
  client_id: string;
  client_secret: string;
  client_auth: NonNullable<OAuthFlowInput['clientAuth']>;
}

/** an `implicit` or `authorizationCode` flow that left the page */
interface OAuthFlowData extends OAuthClient {
  /** the random `state` of the flow */
  state: string;
  redirect_uri: string;
  token_url?: string;
  /** the PKCE code verifier of `authorizationCode` */
  code_verifier?: string;
}

/** a flow that left the page, in `sessionStorage` */
interface PendingFlow {
  /** name of the security scheme */
  scheme: string;
  /** where the flow started, like an operation */
  origin?: string;
  /** the data it left the page with */
  data: unknown;
  /** an OAuth flow started without `redirect`, the page finishes it */
  oauth?: true;
}

const pendingFlowKey = 'fumadocs-openapi-flow';

function leavePage(url: string | URL, flow: PendingFlow, redirectUrl?: string) {
  sessionStorage.setItem(pendingFlowKey, JSON.stringify(flow));
  // where `createOAuthHandler()` sends users back to
  if (redirectUrl)
    document.cookie = `fumadocs-openapi-oauth=${encodeURIComponent(window.location.pathname)}; path=/`;
  window.location.replace(url);
}

export type OAuthFlowType = keyof OAuthFlows;

export interface OAuthFlowInput {
  /** name of the security scheme */
  schemeId: string;
  scopes: string[];
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  /**
   * where token requests send the client credentials,
   * `header` (HTTP Basic) applies only with a client secret, otherwise the `client_id` goes in the body
   *
   * @defaultValue 'header'
   */
  clientAuth?: 'body' | 'header';
  /** URL of the selected server, relative URLs of the flow resolve against it */
  serverUrl: string;
  /** URL of the `createOAuthHandler()` route, defaults to the page */
  redirectUrl?: string;
  /** URL of the `createProxy()` route, requests of confidential clients (with a client secret) and devices go through it */
  proxyUrl?: string;
  /** where the flow started, like an operation, restored when it returns to the page */
  origin?: string;
  /**
   * leave the page for `implicit` and `authorizationCode`, like the one of `useAuthRedirect()`, `finishOAuthFlow()` takes `data` when it returns.
   *
   * By default, the page finishes them, see `usePlaygroundAuth()`.
   */
  redirect?: (url: URL, data: unknown) => void;
  /** show the code of `deviceAuthorization`, the token resolves once users enter it on the verification page */
  onUserCode?: (code: DeviceUserCode) => void;
  /** cancel the flow, like the polling of `deviceAuthorization` */
  signal?: AbortSignal;
}

export interface DeviceUserCode {
  /** the code users enter on the verification page */
  userCode: string;
  verificationUri: string;
  /** the verification page with the code filled in */
  verificationUriComplete?: string;
}

interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

/**
 * Run an OAuth flow and resolve its token, `openIdConnect` schemes run the flows of their OpenID Connect configuration.
 *
 * `implicit` and `authorizationCode` leave the page instead, see `redirect`.
 */
export async function requestOAuthToken(
  scheme: SecuritySchemeObject,
  type: OAuthFlowType,
  {
    schemeId,
    scopes,
    clientId = '',
    clientSecret = '',
    username = '',
    password = '',
    clientAuth = 'header',
    serverUrl,
    redirectUrl,
    proxyUrl,
    origin,
    redirect,
    onUserCode,
    signal,
  }: OAuthFlowInput,
): Promise<string | undefined> {
  const { flows, error } =
    scheme.type === 'openIdConnect'
      ? await discoverOAuthFlows(scheme.openIdConnectUrl!, serverUrl)
      : { flows: (scheme.type === 'oauth2' && scheme.flows) || {} };
  if (!flows) throw error;
  // only public clients are expected to make requests from browsers, see RFC 10017 and RFC 8628
  const via = clientSecret || type === 'deviceAuthorization' ? proxyUrl : undefined;
  const endpoint = (url: string) => proxied(new URL(url, serverUrl).href, via);
  const scope = scopes.join(' ');
  const client: OAuthClient = {
    client_id: clientId,
    client_secret: clientSecret,
    client_auth: clientAuth,
  };

  if (type === 'implicit' || type === 'authorizationCode') {
    const flow = flows[type];
    if (!flow) return;
    const data: OAuthFlowData = {
      ...client,
      state: crypto.getRandomValues(new Uint32Array(4)).join(''),
      // redirect URIs cannot have a fragment
      redirect_uri: new URL(redirectUrl ?? window.location.pathname, window.location.origin).href,
      token_url: 'tokenUrl' in flow ? endpoint(flow.tokenUrl!) : undefined,
    };

    // keep the params of `authorizationUrl`, like `audience`
    const url = new URL(flow.authorizationUrl!, serverUrl);
    url.searchParams.set('response_type', type === 'implicit' ? 'token' : 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', data.redirect_uri);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', data.state);
    if (type === 'authorizationCode') {
      // PKCE, see RFC 7636
      data.code_verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(data.code_verifier),
      );
      url.searchParams.set('code_challenge', base64Url(new Uint8Array(challenge)));
      url.searchParams.set('code_challenge_method', 'S256');
    }

    if (redirect) redirect(url, data);
    else leavePage(url, { scheme: schemeId, origin, data, oauth: true }, redirectUrl);
    return;
  }

  const flow = flows[type];
  if (!flow?.tokenUrl) return;
  const tokenUrl = endpoint(flow.tokenUrl);

  if (type === 'deviceAuthorization') {
    const device = await postForm<DeviceAuthorizationResponse>(
      endpoint(flows.deviceAuthorization!.deviceAuthorizationUrl!),
      new URLSearchParams({ scope }),
      client,
      signal,
    );
    onUserCode?.({
      userCode: device.user_code,
      verificationUri: device.verification_uri,
      verificationUriComplete: device.verification_uri_complete,
    });

    // poll until users finish, see RFC 8628 section 3.5
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: device.device_code,
    });
    const expiresAt = Date.now() + device.expires_in * 1000;
    let interval = (device.interval ?? 5) * 1000;
    while (Date.now() < expiresAt) {
      // ends early when cancelled, the request then rejects right away
      await new Promise((resolve) => {
        setTimeout(resolve, interval);
        signal?.addEventListener('abort', resolve);
      });
      try {
        return await fetchToken(tokenUrl, body, client, signal);
      } catch (e) {
        const code = e instanceof Error ? e.cause : undefined;
        if (code === 'slow_down') interval += 5000;
        else if (code !== 'authorization_pending') throw e;
      }
    }
    throw new Error('The device code has expired.');
  }

  const body = new URLSearchParams({ scope });
  if (type === 'password') {
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);
  } else {
    body.set('grant_type', 'client_credentials');
  }

  return fetchToken(tokenUrl, body, client, signal);
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
    if (flow.code_verifier) body.set('code_verifier', flow.code_verifier);
    return fetchToken(flow.token_url!, body, flow);
  }

  const hash = new URLSearchParams(url.hash.slice(1));
  const token = hash.get('access_token');
  if (token && hash.get('state') === flow.state)
    return `${hash.get('token_type') ?? 'Bearer'} ${token}`;
}

async function postForm<T>(
  url: string,
  body: URLSearchParams,
  { client_id, client_secret, client_auth }: OAuthClient,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (client_auth === 'header' && client_secret) {
    // form-encoded first, see RFC 6749 section 2.3.1
    headers.Authorization = `Basic ${btoa(`${encodeURIComponent(client_id)}:${encodeURIComponent(client_secret)}`)}`;
  } else {
    if (client_id) body.set('client_id', client_id);
    if (client_secret) body.set('client_secret', client_secret);
  }

  const res = await fetch(url, { method: 'POST', headers, body, signal });
  const text = await res.text();
  let data: (T & { error?: string; error_description?: string }) | undefined;
  try {
    data = JSON.parse(text);
  } catch {}
  // some servers respond errors with 200
  if (res.ok && data && !data.error) return data;

  let message = text;
  if (data?.error)
    message = data.error_description ? `${data.error}: ${data.error_description}` : data.error;
  // the `error` code of OAuth 2.0 endpoints
  throw new Error(message, { cause: data?.error });
}

async function fetchToken(
  url: string,
  body: URLSearchParams,
  client: OAuthClient,
  signal?: AbortSignal,
): Promise<string> {
  const { access_token, token_type = 'Bearer' } = await postForm<{
    access_token: string;
    token_type?: string;
  }>(url, body, client, signal);

  return `${token_type} ${access_token}`;
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** the OAuth 2.0 flows of an OpenID Connect configuration, or why discovering them failed */
type OpenIdConnectFlows = { flows: OAuthFlows; error?: never } | { flows?: never; error: unknown };

const discovered = new Map<string, Promise<OpenIdConnectFlows>>();

/**
 * The OAuth 2.0 flows of an OpenID Connect configuration, cached.
 */
function discoverOAuthFlows(configUrl: string, serverUrl: string): Promise<OpenIdConnectFlows> {
  const url = new URL(configUrl, serverUrl).href;
  let result = discovered.get(url);
  if (result) return result;

  result = fetch(url).then(async (res): Promise<OpenIdConnectFlows> => {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const config = (await res.json()) as {
      authorization_endpoint?: string;
      token_endpoint?: string;
      device_authorization_endpoint?: string;
      grant_types_supported?: string[];
      scopes_supported?: string[];
    };
    // some configurations have relative endpoints
    const resolve = (endpoint?: string) => endpoint && new URL(endpoint, url).href;
    const authorizationUrl = resolve(config.authorization_endpoint);
    const tokenUrl = resolve(config.token_endpoint);
    const deviceAuthorizationUrl = resolve(config.device_authorization_endpoint);
    // the default of OpenID Connect Discovery
    const grants = new Set(config.grant_types_supported ?? ['authorization_code', 'implicit']);
    const scopes: Record<string, string> = {};
    for (const scope of config.scopes_supported ?? []) scopes[scope] = '';

    const flows: OAuthFlows = {};
    if (authorizationUrl && tokenUrl && grants.has('authorization_code'))
      flows.authorizationCode = { authorizationUrl, tokenUrl, scopes };
    if (authorizationUrl && grants.has('implicit')) flows.implicit = { authorizationUrl, scopes };
    if (tokenUrl && grants.has('password')) flows.password = { tokenUrl, scopes };
    if (tokenUrl && grants.has('client_credentials'))
      flows.clientCredentials = { tokenUrl, scopes };
    if (
      deviceAuthorizationUrl &&
      tokenUrl &&
      grants.has('urn:ietf:params:oauth:grant-type:device_code')
    )
      flows.deviceAuthorization = { deviceAuthorizationUrl, tokenUrl, scopes };
    return { flows };
  });
  result = result.catch((error: unknown) => ({ error }));
  discovered.set(url, result);
  return result;
}

/**
 * The OAuth 2.0 flows of an OpenID Connect configuration, or the error of discovering them, a relative URL resolves against the selected server.
 *
 * It suspends while discovering them.
 */
export function useOpenIdConnectFlows(configUrl: string): OpenIdConnectFlows {
  return use(discoverOAuthFlows(configUrl, useServer().resolveUrl()));
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
  const { returned } = usePlaygroundAuth();
  const origin = `${method} ${path}`;
  // `onReturn` gets the flow once, ending it
  useEffect(() => {
    if (!onReturn || !returned || returned.oauth) return;
    if (returned.scheme !== field.schemeId || returned.origin !== origin) return;
    if (!endReturnedFlow(returned)) return;
    window.history.replaceState(null, '', window.location.pathname);
    onReturn(returned.url, returned.data);
  }, [returned, onReturn, field.schemeId, origin]);
  return (url, data) => leavePage(url, { scheme: field.schemeId, origin, data }, oauthRedirectUrl);
}

type TokenInfo =
  | {
      type: 'authorization_code';
      client_id: string;
      client_secret: string;
      client_auth: OAuthClient['client_auth'];
      token: string;
    }
  | {
      type: 'implicit';
      client_id: string;
      token: string;
    };

interface ReturnedFlow extends PendingFlow {
  /** the URL it returned to */
  url: URL;
}

/** the flow that returned to the page, taken out of `sessionStorage` once read, until it is handled */
let returnedFlow: ReturnedFlow | null | undefined;

const subscribeNever = () => () => {};

function getReturnedFlow(): ReturnedFlow | undefined {
  if (returnedFlow === undefined) {
    const stored = sessionStorage.getItem(pendingFlowKey);
    sessionStorage.removeItem(pendingFlowKey);
    returnedFlow = stored
      ? { ...(JSON.parse(stored) as PendingFlow), url: new URL(window.location.href) }
      : null;
  }
  return returnedFlow ?? undefined;
}

/** the returned flow is handled, `false` when it was already handled */
function endReturnedFlow(flow: ReturnedFlow): boolean {
  if (returnedFlow !== flow) return false;
  returnedFlow = null;
  return true;
}

/** returned OAuth flows the page is finishing */
const finishing = new WeakSet<ReturnedFlow>();

interface PlaygroundAuthState {
  /** the values of security schemes, shared by the playgrounds of page */
  stf: Stf;
  /** the flow that returned to the page, until it is handled */
  returned?: ReturnedFlow;
  /** `origin` of the flow that returned to the page */
  origin?: string;
  /** the page is finishing the returned OAuth flow */
  isLoading: boolean;
  error?: unknown;
  /** token info of the OAuth flow the page finished, by scheme */
  store: Record<string, TokenInfo | undefined>;
}

const AuthContext = createContext<PlaygroundAuthState | null>(null);

/**
 * The auth of page: the values of security schemes, and the flow that returned to it.
 */
export function usePlaygroundAuth(): PlaygroundAuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');
  return ctx;
}

export function PlaygroundAuthProvider({ children }: { children: ReactNode }) {
  const stf = useStf({ defaultValues: { auth: {} } });
  // the server renders without it
  const returned = useSyncExternalStore(subscribeNever, getReturnedFlow, () => undefined);
  const query = useQuery(async (flow: ReturnedFlow) => {
    const result = finishOAuthFlow(flow.url, flow.data);
    if (result !== undefined) window.history.replaceState(null, '', window.location.pathname);

    try {
      // users may come back without finishing it
      const token = await result;
      if (token === undefined) return;
      stf.dataEngine.update(['auth', flow.scheme], token);

      const { client_id, client_secret, client_auth } = flow.data as OAuthFlowData;
      const info: TokenInfo =
        typeof result === 'string'
          ? { type: 'implicit', client_id, token }
          : { type: 'authorization_code', client_id, client_secret, client_auth, token };
      return { [flow.scheme]: info };
    } finally {
      endReturnedFlow(flow);
    }
  });

  // the page finishes OAuth flows started without `redirect`
  if (returned?.oauth && !finishing.has(returned)) {
    finishing.add(returned);
    void query.start(returned);
  }

  return (
    <AuthContext
      value={useMemo(
        () => ({
          stf,
          returned,
          origin: returned?.origin,
          isLoading: query.isLoading,
          error: query.error,
          store: query.data ?? {},
        }),
        [stf, returned, query.isLoading, query.error, query.data],
      )}
    >
      {children}
    </AuthContext>
  );
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
    /** after the input, like a button filling the value */
    end?: ReactNode;
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
  /** the field holding its value, in the auth values of page */
  fieldName: FieldKey;
  /** `sessionStorage` key of its value, kept while the tab is open */
  storageKey: string;
  defaultValue: unknown;
  provider: AuthProvider;
}

const builtinProviders: AuthProvider[] = [
  {
    on: ({ scheme }) => scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic',
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
    // the browser presents its client certificate instead
    on: ({ scheme }) => scheme.type === 'mutualTLS',
    render: () => null,
    onRequest() {},
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
  if (scheme.type === 'mutualTLS') return null;
  if (scheme.type !== 'http' || !scheme.scheme) return 'Bearer ';
  if (scheme.scheme.toLowerCase() === 'basic') return { username: '', password: '' };
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
  /** encode the auth values of page into request data, like the form values */
  mapValues: <T>(values: T) => T;
  /** restore the persisted values, returns a cleanup */
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
  const page = usePlaygroundAuth().stf.dataEngine;
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
    stf: page,
    onUpdate(key) {
      for (const field of fields) {
        // the field, its properties, or its parents
        if (!arrayStartsWith(key, field.fieldName) && !arrayStartsWith(field.fieldName, key))
          continue;
        const value = page.get(field.fieldName);

        if (value != null) sessionStorage.setItem(field.storageKey, JSON.stringify(value));
      }
    },
  });

  return {
    requirements,
    selected,
    select,
    fields,
    mapValues: useCallback(
      (values) => {
        const cloned = structuredClone({ ...values, auth: page.get(['auth']) });
        const data = cloned as unknown as RawRequestData & { auth?: unknown };
        for (const field of fields)
          field.provider.onRequest!(data, objectGet(data, field.fieldName), field);

        delete data.auth;
        return cloned;
      },
      [page, fields],
    ),
    init: useCallback(() => {
      for (const field of fields) {
        page.init(field.fieldName, () => {
          const stored = sessionStorage.getItem(field.storageKey);
          const parsed: unknown = stored ? JSON.parse(stored) : undefined;
          return typeof parsed === typeof field.defaultValue ? parsed : field.defaultValue;
        });
      }

      return () => {};
    }, [page, fields]),
  };
}
