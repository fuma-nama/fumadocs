'use client';
import { useApiContext } from '@/ui/contexts/api';
import { useQuery } from '@/utils/use-query';
import { createContext, type ReactNode, use, useEffect, useMemo, useState } from 'react';
import type { AuthCodeState, ImplicitState } from './components/oauth-dialog';

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

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('must use this component under <AuthProvider />');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { schemes } = useApiContext();
  const [store, setStore] = useState<TokenStore>({});

  const authCodeQuery = useQuery(async (code: string, state: AuthCodeState) => {
    const scheme = schemes[state.scheme];
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
      const scheme = schemes[parsedState.scheme];
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

    if (window.location.search.length > 0) onQuery();
    if (window.location.hash.length > 1) onHash();
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
