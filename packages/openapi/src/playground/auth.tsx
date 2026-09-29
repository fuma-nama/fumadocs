'use client';
import { useOpenAPI } from '@/utils/create-page';
import { useQuery } from 'shared-api/utils/use-query';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type DataEngine, type FieldKey, useListener } from '@fumari/stf';
import { arrayStartsWith, objectGet, objectSet } from '@fumari/stf/lib/utils';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import type { OAuth2SecurityScheme, OperationObject, SecuritySchemeObject } from '@/types';

/** an `implicit` or `authorizationCode` flow that left the page, in `sessionStorage` */
interface PendingFlow {
  /** the random `state` of the flow */
  state: string;
  /** name of the security scheme */
  scheme: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  token_url?: string;
}

const pendingFlowKey = 'fumadocs-openapi-oauth';

export type OAuthFlowType = keyof NonNullable<OAuth2SecurityScheme['flows']>;

export interface OAuthFlowInput {
  /** name of the security scheme */
  schemeId: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /** where the password and client credentials flows send the client credentials */
  clientAuth: 'body' | 'header';
  /** URL of the selected server, relative URLs of the flow resolve against it */
  serverUrl: string;
  /** URL of the `createOAuthHandler()` route, defaults to the page */
  redirectUrl?: string;
}

/**
 * Run an OAuth flow and resolve its token.
 *
 * `implicit` and `authorizationCode` leave the page instead: the token is picked up on return,
 * in `usePlaygroundAuth().store`.
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
  }: OAuthFlowInput,
): Promise<string | undefined> {
  const flows = scheme.flows ?? {};
  const scope = scopes.join(' ');

  if (type === 'implicit' || type === 'authorizationCode') {
    const flow = flows[type];
    if (!flow) return;
    const pending: PendingFlow = {
      state: crypto.getRandomValues(new Uint32Array(4)).join(''),
      scheme: schemeId,
      client_id: clientId,
      client_secret: clientSecret,
      // redirect URIs cannot have a fragment
      redirect_uri: new URL(redirectUrl ?? window.location.pathname, window.location.origin).href,
      token_url: 'tokenUrl' in flow ? new URL(flow.tokenUrl!, serverUrl).href : undefined,
    };
    sessionStorage.setItem(pendingFlowKey, JSON.stringify(pending));
    // where `createOAuthHandler()` sends users back to
    if (redirectUrl)
      document.cookie = `fumadocs-openapi-oauth=${encodeURIComponent(window.location.pathname)}; path=/`;

    // keep the params of `authorizationUrl`, like `audience`
    const url = new URL(flow.authorizationUrl!, serverUrl);
    url.searchParams.set('response_type', type === 'implicit' ? 'token' : 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', pending.redirect_uri);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', pending.state);
    window.location.replace(url);
    return;
  }

  if (type !== 'password' && type !== 'clientCredentials') return;
  const flow = flows[type];
  if (!flow) return;

  const headers: Record<string, string> = {};
  const body = new URLSearchParams({ scope });
  if (type === 'password') {
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);
  } else {
    body.set('grant_type', 'client_credentials');
  }

  if (clientAuth === 'header') {
    // form-encoded first, see RFC 6749 section 2.3.1
    headers.Authorization = `Basic ${btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`)}`;
  } else {
    if (clientId) body.set('client_id', clientId);
    if (clientSecret) body.set('client_secret', clientSecret);
  }

  return fetchToken(new URL(flow.tokenUrl!, serverUrl).href, body, headers);
}

async function fetchToken(
  tokenUrl: string,
  body: URLSearchParams,
  headers: Record<string, string> = {},
): Promise<string> {
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

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
      token: string;
    }
  | {
      type: 'implicit';
      client_id: string;
      token: string;
    };

interface AuthContextType {
  store: TokenStore;
  updatedSchemeId: string | null;
  isLoading: boolean;
  error?: unknown;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function usePlaygroundAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('Component must be used under <OpenAPIProvider />');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<TokenStore>({});

  const authCodeQuery = useQuery(async (code: string, flow: PendingFlow) => {
    const token = await fetchToken(
      flow.token_url!,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: flow.redirect_uri,
        client_id: flow.client_id,
        client_secret: flow.client_secret,
      }),
    );

    setStore((s) => ({
      ...s,
      [flow.scheme]: {
        type: 'authorization_code',
        client_id: flow.client_id,
        client_secret: flow.client_secret,
        token,
      },
    }));
  });

  useEffect(() => {
    const stored = sessionStorage.getItem(pendingFlowKey);
    if (!stored) return;

    const flow = JSON.parse(stored) as PendingFlow;
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = query.get('code');
    const token = hash.get('access_token');

    // only accept the flow started in this tab
    if (code && query.get('state') === flow.state) {
      authCodeQuery.start(code, flow);
    } else if (token && hash.get('state') === flow.state) {
      setStore((s) => ({
        ...s,
        [flow.scheme]: {
          type: 'implicit',
          client_id: flow.client_id,
          token: `${hash.get('token_type') ?? 'Bearer'} ${token}`,
        },
      }));
    } else {
      return;
    }

    sessionStorage.removeItem(pendingFlowKey);
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first page load only
  }, []);

  return (
    <AuthContext
      value={useMemo(
        () => ({
          store,
          updatedSchemeId: Object.keys(store)[0] ?? null,
          isLoading: authCodeQuery.isLoading,
          error: authCodeQuery.error,
        }),
        [store, authCodeQuery.isLoading, authCodeQuery.error],
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

export interface AuthField {
  schemeId: string;
  scheme: SecuritySchemeObject;
  scopes: string[];
  /** the form field holding its value */
  fieldName: FieldKey;
  /** `localStorage` key of its persisted value */
  storageKey: string;
  defaultValue: unknown;
  /** encode the value into request data, like the header of Basic auth */
  mapOutput?: (value: unknown) => unknown;
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

  /** customise the generated fields, like their default values */
  transform?: (fields: AuthField[]) => AuthField[];
}

/**
 * The auth fields of an API playground: the values it persists, and the request data they encode into.
 */
export function useAuthFields(
  engine: DataEngine,
  { operation, transform }: AuthFieldsOptions = {},
): AuthFields {
  const auth = usePlaygroundAuth();
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

    const out: AuthField[] = requirement.map(({ id, scheme, scopes }) => {
      const shared = {
        schemeId: id,
        scheme,
        scopes,
        storageKey: `${storageKeyPrefix}auth-${id}`,
      };

      if (scheme.type === 'http' && scheme.scheme === 'basic') {
        return {
          ...shared,
          fieldName: ['header', 'Authorization'],
          defaultValue: { username: '', password: '' },
          mapOutput(value) {
            if (!value || typeof value !== 'object') return value;
            const { username = '', password = '' } = value as Record<string, unknown>;

            return `Basic ${btoa(`${username}:${password}`)}`;
          },
        };
      }

      if (scheme.type === 'apiKey') {
        return {
          ...shared,
          fieldName: [scheme.in!, scheme.name!],
          defaultValue: '',
        };
      }

      return {
        ...shared,
        fieldName: ['header', 'Authorization'],
        // `openIdConnect` and unknown types accept a raw access token
        defaultValue: scheme.type === 'http' || scheme.type === 'oauth2' ? 'Bearer ' : '',
      };
    });

    return transform ? transform(out) : out;
  }, [requirement, storageKeyPrefix, transform]);

  useListener({
    stf: engine,
    onUpdate(key) {
      for (const field of fields) {
        if (!arrayStartsWith(field.fieldName, key)) continue;
        const value = engine.get(field.fieldName);

        if (value != null) localStorage.setItem(field.storageKey, JSON.stringify(value));
      }
    },
  });

  useOnChange(auth.updatedSchemeId, () => {
    const { updatedSchemeId } = auth;
    if (!updatedSchemeId) return;
    const { token } = auth.store[updatedSchemeId]!;

    const field = fields.find((field) => field.schemeId === updatedSchemeId);
    if (field) {
      // update current value
      engine.update(field.fieldName, token);
      return;
    }

    const idx = requirements.findIndex((req) => req.some((item) => item.id === updatedSchemeId));
    if (idx !== -1) {
      // persisted value
      localStorage.setItem(`${storageKeyPrefix}auth-${updatedSchemeId}`, JSON.stringify(token));
      select(idx);
    }
  });

  return {
    requirements,
    selected,
    select,
    fields,
    mapValues: useCallback(
      (values) => {
        const cloned = structuredClone(values);

        for (const field of fields) {
          if (!field.mapOutput) continue;
          objectSet(cloned, field.fieldName, field.mapOutput(objectGet(cloned, field.fieldName)));
        }

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
