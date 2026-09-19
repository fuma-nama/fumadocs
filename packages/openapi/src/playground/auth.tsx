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
import type { OperationObject, SecuritySchemeObject } from '@/types';

export interface AuthCodeState {
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  /** name of the source security scheme */
  scheme: string;
}

export interface ImplicitState {
  redirect_uri: string;
  client_id: string;
  /** name of the source security scheme */
  scheme: string;
}

/** scheme name -> token info */
type TokenStore = Record<string, TokenInfo | undefined>;
type TokenInfo =
  | {
      type: 'authorization_code';
      redirect_uri: string;
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
  const { dereferenced, resolve } = useOpenAPI().doc;
  const schemes = dereferenced.components?.securitySchemes;
  const [store, setStore] = useState<TokenStore>({});

  const authCodeQuery = useQuery(async (code: string, state: AuthCodeState) => {
    const scheme = resolve(schemes?.[state.scheme]);
    if (!scheme || scheme.type !== 'oauth2') return;
    const value = scheme.flows?.authorizationCode;
    if (!value) return;

    const res = await fetch(value.tokenUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        // note: `state` could be invalid, but server will check it
        redirect_uri: state.redirect_uri,
        client_id: state.client_id,
        client_secret: state.client_secret,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const { access_token, token_type = 'Bearer' } = (await res.json()) as {
      access_token: string;
      token_type?: string;
    };

    const info: TokenInfo = {
      type: 'authorization_code',
      ...state,
      token: `${token_type} ${access_token}`,
    };
    setStore((s) => ({
      ...s,
      [state.scheme]: info,
    }));
  });

  useEffect(() => {
    function onQuery() {
      const query = new URLSearchParams(window.location.search);
      const state = query.get('state');
      const code = query.get('code');
      if (!state || !code) return;

      const parsedState = JSON.parse(state) as AuthCodeState;

      authCodeQuery.start(code, parsedState);
      window.history.replaceState(null, '', window.location.pathname);
    }

    function onHash() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const state = hash.get('state');
      const token = hash.get('access_token');
      const type = hash.get('token_type') ?? 'Bearer';
      if (!state || !token) return;

      const parsedState = JSON.parse(state) as ImplicitState;
      const scheme = resolve(schemes?.[parsedState.scheme]);
      if (!scheme || scheme.type !== 'oauth2' || !scheme.flows?.implicit) return;

      const info: TokenInfo = {
        type: 'implicit',
        client_id: parsedState.client_id,
        token: `${type} ${token}`,
      };
      setStore((s) => ({
        ...s,
        [parsedState.scheme]: info,
      }));
      window.history.replaceState(null, '', window.location.pathname);
    }

    try {
      if (window.location.search.length > 0) onQuery();
      if (window.location.hash.length > 1) onHash();
    } catch {
      // ignore invalid `state`
    }
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
