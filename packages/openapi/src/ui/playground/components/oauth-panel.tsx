'use client';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { StfProvider, useDataEngine, useStf } from '@fumari/stf';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Spinner } from 'shared-api/components/spinner';
import { useQuery } from 'shared-api/utils/use-query';
import {
  type AuthPanelProps,
  type AuthProvider,
  type DeviceUserCode,
  finishOAuthFlow,
  type OAuthFlowType,
  requestOAuthToken,
  useAuthRedirect,
  useOAuthFlows,
} from '@/playground/auth';
import type { OAuthInput } from '@/playground/use-playground';
import type { OAuthFlows } from '@/types';
import { Markdown } from '@/ui/components/markdown';
import { useOpenAPI } from '@/utils/create-page';
import { useServer } from '@/utils/use-server';
import { cn } from '@/utils/cn';
import { iconButtonClassName } from './result-display';
import { CheckRow, SelectRow, TextRow, ValueRow } from './fields';

type Credentials = Pick<OAuthInput, 'clientId' | 'clientSecret' | 'username' | 'password'>;

/** OAuth 2.0 and OpenID Connect schemes, authorized in a panel */
export const oauthPanelProvider: AuthProvider = {
  on: ({ scheme }) => scheme.type === 'oauth2' || scheme.type === 'openIdConnect',
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

/** obtain the access token of an OAuth 2.0 or OpenID Connect scheme */
function OAuthPanel({ field, close }: AuthPanelProps) {
  const t = useTranslations({ note: 'OAuth dialog' });
  const { flows, error } = useOAuthFlows(field);
  let content: ReactNode;

  if (error != null) {
    content = (
      <div className="border-b px-4 py-2.5 text-xs">
        <p className="font-medium text-red-400">
          {t('Failed to load the OpenID Connect configuration')}
        </p>
        <p className="text-fd-muted-foreground">{String(error)}</p>
      </div>
    );
  } else if (flows) {
    content = <OAuthForm field={field} flows={flows} close={close} />;
  } else {
    content = (
      <p className="flex items-center gap-1.5 border-b px-4 py-2.5 text-xs text-fd-muted-foreground">
        <Spinner className="size-3" />
        {t('Loading the OpenID Connect configuration...')}
      </p>
    );
  }

  return (
    <>
      {field.scheme.description && (
        <div className="border-b px-4 py-2.5 text-xs text-fd-muted-foreground [&_a]:underline">
          <Markdown md={field.scheme.description} />
        </div>
      )}
      {content}
    </>
  );
}

function OAuthForm({ field, flows, close }: AuthPanelProps & { flows: OAuthFlows }) {
  const t = useTranslations({ note: 'OAuth dialog' });
  const engine = useDataEngine();
  const redirect = useAuthRedirect(field);
  const { oauthRedirectUrl, proxyUrl, storageKeyPrefix } = useOpenAPI();
  const storageKey = `${storageKeyPrefix}oauth-${field.schemeId}`;
  const { resolveUrl } = useServer();
  const [type, setType] = useState(() => Object.keys(flows)[0] as OAuthFlowType);
  const [clientAuth, setClientAuth] = useState<'body' | 'header'>('header');
  const [scopes, setScopes] = useState(() => new Set(field.scopes));
  const [userCode, setUserCode] = useState<DeviceUserCode>();
  const controllerRef = useRef<AbortController>(null);
  const stf = useStf({ defaultValues: () => JSON.parse(localStorage.getItem(storageKey) ?? '{}') });

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
  const redirects = type === 'authorizationCode' || type === 'implicit';
  const serverUrl = resolveUrl();
  // the requested scopes are listed even when the flow doesn't declare them
  const scopeOptions: Record<string, string> = { ...flow?.scopes };
  for (const scope of field.scopes) scopeOptions[scope] ??= '';

  const query = useQuery(async () => {
    const credentials = stf.dataEngine.getData() as Credentials;
    localStorage.setItem(storageKey, JSON.stringify(credentials));
    const controller = (controllerRef.current = new AbortController());

    try {
      const token = await requestOAuthToken(field.scheme, type, {
        ...credentials,
        schemeId: field.schemeId,
        scopes: Array.from(scopes),
        clientAuth,
        serverUrl,
        redirectUrl: oauthRedirectUrl,
        proxyUrl,
        redirect,
        onUserCode: setUserCode,
        signal: controller.signal,
      });
      if (!token) return;

      engine.update(field.fieldName, token);
      close();
    } catch (e) {
      // cancelled by users
      if (!controller.signal.aborted) throw e;
    } finally {
      setUserCode(undefined);
    }
  });

  useEffect(() => () => controllerRef.current?.abort(), []);

  if (userCode)
    return <DeviceVerification code={userCode} onCancel={() => controllerRef.current?.abort()} />;

  let note: ReactNode;
  if (redirects) note = t('You will be redirected to authorize, then back to this page.');
  else if (type === 'deviceAuthorization')
    note = t('You will get a code to enter on the verification page.');

  return (
    <StfProvider value={stf}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void query.start();
        }}
      >
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
        <ValueRow
          name="client_id"
          required={type !== 'password'}
          description={t('The client ID of your OAuth application.')}
          fieldName={['clientId']}
          field={{ type: 'string' }}
        />
        {type !== 'implicit' && (
          <ValueRow
            name="client_secret"
            required={type === 'clientCredentials'}
            description={t('The client secret of your OAuth application.')}
            fieldName={['clientSecret']}
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
        {type !== 'implicit' && (
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
        {flow && 'deviceAuthorizationUrl' in flow && flow.deviceAuthorizationUrl && (
          <TextRow name="device_authorization_url">
            {new URL(flow.deviceAuthorizationUrl, serverUrl).href}
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
            {query.error ? String(query.error) : note}
          </p>
          <button
            type="submit"
            disabled={query.isLoading}
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

/** the code of a device authorization, until users enter it */
function DeviceVerification({ code, onCancel }: { code: DeviceUserCode; onCancel: () => void }) {
  const t = useTranslations({ note: 'OAuth dialog' });
  const tPlayground = useTranslations({ note: 'playground' });
  const [isCopied, onCopy] = useCopyButton(() => navigator.clipboard.writeText(code.userCode));

  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b px-4 py-8 text-center starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:starting:translate-y-1">
        <p className="text-xs text-fd-muted-foreground">
          {t('Enter this code on the verification page.')}
        </p>
        <div className="flex items-center gap-1 rounded-lg border bg-fd-secondary py-1 ps-4 pe-1">
          <code className="font-mono text-xl font-medium tracking-widest select-all">
            {code.userCode}
          </code>
          <button
            type="button"
            aria-label={
              isCopied
                ? tPlayground('Copied', { note: 'aria-label' })
                : tPlayground('Copy', { note: 'aria-label' })
            }
            onClick={onCopy}
            className={iconButtonClassName}
          >
            {isCopied ? <Check /> : <Copy />}
          </button>
        </div>
        <a
          href={code.verificationUriComplete ?? code.verificationUri}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'gap-1.5 px-3')}
        >
          {t('Open verification page')}
          <ExternalLink className="size-3.5" />
        </a>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-fd-muted-foreground">
          <Spinner className="size-3" />
          {t('Waiting for authorization...')}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'shrink-0 px-3')}
        >
          {t('Cancel')}
        </button>
      </div>
    </>
  );
}
