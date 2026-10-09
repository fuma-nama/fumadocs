'use client';
import { useState } from 'react';
import { StfProvider, useDataEngine, useStf } from '@fumari/stf';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Spinner } from 'shared-api/components/spinner';
import { useQuery } from 'shared-api/utils/use-query';
import {
  type AuthPanelProps,
  type AuthProvider,
  finishOAuthFlow,
  type OAuthFlowType,
  requestOAuthToken,
  useAuthRedirect,
} from '@/playground/auth';
import type { OAuth2SecurityScheme } from '@/types';
import { Markdown } from '@/ui/components/markdown';
import { useOpenAPI } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { cn } from '@/utils/cn';
import { CheckRow, SelectRow, TextRow, ValueRow } from './fields';

interface Credentials extends Record<string, unknown> {
  client_id?: string;
  client_secret?: string;
  username?: string;
  password?: string;
}

/** OAuth 2.0 schemes, authorized in a panel */
export const oauthPanelProvider: AuthProvider = {
  on: ({ scheme }) => scheme.type === 'oauth2',
  render: function OAuthRows({ field, Value, Panel }) {
    const t = useTranslations({ note: 'playground' });
    const engine = useDataEngine();
    const query = useQuery(async (token: Promise<string> | string) => {
      engine.update(field.fieldName, await token);
    });

    useAuthRedirect(field, (url, data) => {
      const token = finishOAuthFlow(url, data);
      if (token !== undefined) void query.start(token);
    });

    return (
      <>
        <Value name="Authorization" type="header" description={field.scheme.description} />
        {query.isLoading && (
          <p className="flex items-center gap-1.5 border-b px-4 py-2.5 text-xs text-fd-muted-foreground">
            <Spinner className="size-3" />
            {t('Fetching token...')}
          </p>
        )}
        {query.error != null && (
          <div className="border-b px-4 py-2.5 text-xs">
            <p className="font-medium text-red-400">{t('Failed to fetch token')}</p>
            <p className="text-fd-muted-foreground">{String(query.error)}</p>
          </div>
        )}
        <Panel title={t('Authorize')} component={OAuthPanel} />
      </>
    );
  },
};

/** obtain the access token of an OAuth 2.0 scheme */
function OAuthPanel({ field, close }: AuthPanelProps) {
  const t = useTranslations({ note: 'OAuth dialog' });
  const engine = useDataEngine();
  const redirect = useAuthRedirect(field);
  const { oauthRedirectUrl } = useOpenAPI();
  const { resolveUrl } = useServer();
  const scheme = field.scheme as OAuth2SecurityScheme;
  const flows = scheme.flows ?? {};
  const [type, setType] = useState(() => Object.keys(flows)[0] as OAuthFlowType);
  const [clientAuth, setClientAuth] = useState<'body' | 'header'>('header');
  const [scopes, setScopes] = useState(() => new Set(field.scopes));
  const stf = useStf({});

  const flowInfo: Record<OAuthFlowType, { name: string; description: string }> = {
    authorizationCode: {
      name: t('Authorization code'),
      description: t('Authenticate with 3rd party services'),
    },
    clientCredentials: {
      name: t('Client Credentials'),
      description: t('Intended for the server-to-server authentication.'),
    },
    implicit: {
      name: t('Implicit'),
      description: t('Retrieve the access token directly.'),
    },
    password: {
      name: t('Resource Owner Password Flow'),
      description: t('Authenticate using username and password.'),
    },
    deviceAuthorization: {
      name: t('Device Authorization'),
      description: t('Authenticate with device.'),
    },
  };
  const flow = flows[type];
  const supported = type !== 'deviceAuthorization';
  const redirects = type === 'authorizationCode' || type === 'implicit';
  const hasSecret =
    type === 'authorizationCode' || type === 'clientCredentials' || type === 'password';
  const serverUrl = resolveUrl();
  // the requested scopes are listed even when the flow doesn't declare them
  const scopeOptions: Record<string, string> = { ...flow?.scopes };
  for (const scope of field.scopes) scopeOptions[scope] ??= '';

  const query = useQuery(async () => {
    const credentials = stf.dataEngine.getData() as Credentials;
    const token = await requestOAuthToken(scheme, type, {
      schemeId: field.schemeId,
      scopes: Array.from(scopes),
      clientId: credentials.client_id ?? '',
      clientSecret: credentials.client_secret ?? '',
      username: credentials.username ?? '',
      password: credentials.password ?? '',
      clientAuth,
      serverUrl,
      redirectUrl: oauthRedirectUrl,
      redirect,
    });
    if (!token) return;

    engine.update(field.fieldName, token);
    close();
  });

  return (
    <StfProvider value={stf}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void query.start();
        }}
      >
        {scheme.description && (
          <div className="border-b px-4 py-2.5 text-xs text-fd-muted-foreground [&_a]:underline">
            <Markdown md={scheme.description} />
          </div>
        )}
        <SelectRow
          name="flow"
          value={type}
          onValueChange={(v) => setType(v as OAuthFlowType)}
          items={Object.keys(flows).map((key) => ({
            value: key,
            label: flowInfo[key as OAuthFlowType].name,
            description: flowInfo[key as OAuthFlowType].description,
          }))}
        />
        {supported && (
          <ValueRow
            name="client_id"
            required={type !== 'password'}
            description={t('The client ID of your OAuth application.')}
            fieldName={['client_id']}
            field={{ type: 'string' }}
          />
        )}
        {hasSecret && (
          <ValueRow
            name="client_secret"
            required={type !== 'password'}
            description={t('The client secret of your OAuth application.')}
            fieldName={['client_secret']}
            field={{ type: 'string', format: 'password' }}
          />
        )}
        {type === 'password' && (
          <>
            <ValueRow
              name="username"
              required
              fieldName={['username']}
              field={{ type: 'string' }}
            />
            <ValueRow
              name="password"
              required
              fieldName={['password']}
              field={{ type: 'string', format: 'password' }}
            />
          </>
        )}
        {hasSecret && (
          <SelectRow
            name="client_auth"
            value={clientAuth}
            onValueChange={(v) => setClientAuth(v as 'body' | 'header')}
            items={[
              {
                value: 'header',
                label: t('Send as Basic Auth header'),
                description: t('Send the client ID and secret in the Authorization header.'),
              },
              {
                value: 'body',
                label: t('Send client credentials in body'),
                description: t('Include the client ID and secret in the token request body.'),
              },
            ]}
          />
        )}
        {flow && 'authorizationUrl' in flow && flow.authorizationUrl && (
          <TextRow name="authorization_url">
            {new URL(flow.authorizationUrl, serverUrl).href}
          </TextRow>
        )}
        {flow && 'tokenUrl' in flow && flow.tokenUrl && (
          <TextRow name="token_url">{new URL(flow.tokenUrl, serverUrl).href}</TextRow>
        )}
        {redirects && (
          <TextRow
            name="redirect_uri"
            description={t('Add this to the allowed redirect URIs of your OAuth application.')}
            copyable
          >
            {new URL(oauthRedirectUrl ?? window.location.pathname, window.location.origin).href}
          </TextRow>
        )}
        {Object.keys(scopeOptions).length > 0 && (
          <>
            <p className="flex h-9 items-center border-b px-4 text-xs font-medium text-fd-muted-foreground">
              {t('Scopes')}
            </p>
            {Object.entries(scopeOptions).map(([scope, description]) => (
              <CheckRow
                key={scope}
                name={scope}
                checked={scopes.has(scope)}
                onCheckedChange={(checked) => {
                  const next = new Set(scopes);
                  if (checked) next.add(scope);
                  else next.delete(scope);
                  setScopes(next);
                }}
              >
                {description}
              </CheckRow>
            ))}
          </>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <p
            className={cn(
              'min-w-0 flex-1 text-xs',
              query.error ? 'text-red-400' : 'text-fd-muted-foreground',
            )}
          >
            {query.error
              ? String(query.error)
              : !supported
                ? t('Unsupported')
                : redirects && t('You will be redirected to authorize, then back to this page.')}
          </p>
          <button
            type="submit"
            disabled={!supported || query.isLoading}
            className={cn(
              buttonVariants({ variant: 'primary', size: 'sm' }),
              'shrink-0 gap-1.5 px-3',
            )}
          >
            {query.isLoading && <Spinner className="size-3" />}
            {t('Authorize')}
          </button>
        </div>
      </form>
    </StfProvider>
  );
}
