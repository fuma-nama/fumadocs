import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { finishOAuthFlow, type OAuthFlowInput, requestOAuthToken } from '@/playground/auth';
import type { SecuritySchemeObject } from '@/types';

const input: OAuthFlowInput = {
  schemeId: 'auth',
  scopes: ['read'],
  clientId: 'client',
  serverUrl: 'https://api.example.com/v1/',
};

let requests: { url: string; body: URLSearchParams; headers: Record<string, string> }[];

function mockFetch(...responses: [status: number, body: unknown][]) {
  requests = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    init?.signal?.throwIfAborted();
    requests.push({
      url: String(url),
      body: new URLSearchParams(init?.body as URLSearchParams),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const [status, body] = responses.shift()!;
    return new Response(JSON.stringify(body), { status });
  });
}

beforeEach(() => {
  vi.stubGlobal('window', {
    location: { origin: 'https://docs.example.com', pathname: '/docs/page' },
  });
  vi.stubGlobal('document', { baseURI: 'https://docs.example.com/docs/page' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('authorization code flow uses PKCE', async () => {
  const scheme: SecuritySchemeObject = {
    type: 'oauth2',
    flows: {
      authorizationCode: { authorizationUrl: '/authorize', tokenUrl: '/token', scopes: {} },
    },
  };
  let redirected: { url: URL; data: unknown } | undefined;
  await requestOAuthToken(scheme, 'authorizationCode', {
    ...input,
    redirect: (url, data) => (redirected = { url, data }),
  });

  const { url, data } = redirected!;
  const { code_verifier, state } = data as { code_verifier: string; state: string };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier));
  expect(url.origin + url.pathname).toBe('https://api.example.com/authorize');
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.searchParams.get('code_challenge')).toBe(Buffer.from(digest).toString('base64url'));

  mockFetch([200, { access_token: 'abc', token_type: 'Bearer' }]);
  const token = await finishOAuthFlow(
    new URL(`https://docs.example.com/docs/page?code=xyz&state=${state}`),
    data,
  );
  expect(token).toBe('Bearer abc');
  expect(requests[0].url).toBe('https://api.example.com/token');
  expect(requests[0].body.get('code_verifier')).toBe(code_verifier);
});

test('flows leaving the page without `redirect` are finished by the page', async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  const replace = vi.fn();
  vi.stubGlobal('window', {
    location: { origin: 'https://docs.example.com', pathname: '/docs/page', replace },
  });
  const scheme: SecuritySchemeObject = {
    type: 'oauth2',
    flows: { implicit: { authorizationUrl: '/authorize', scopes: {} } },
  };

  await requestOAuthToken(scheme, 'implicit', { ...input, origin: 'get /me' });
  expect(replace).toHaveBeenCalledOnce();
  expect(JSON.parse(storage.get('fumadocs-openapi-flow')!)).toMatchObject({
    scheme: 'auth',
    origin: 'get /me',
    oauth: true,
  });
});

test('device authorization polls until users finish', async () => {
  vi.useFakeTimers();
  mockFetch(
    [
      200,
      {
        device_code: 'device',
        user_code: 'ABCD-EFGH',
        verification_uri: 'https://example.com/device',
        expires_in: 600,
        interval: 1,
      },
    ],
    [400, { error: 'authorization_pending' }],
    [400, { error: 'slow_down' }],
    [200, { access_token: 'abc' }],
  );
  const onUserCode = vi.fn();
  const scheme: SecuritySchemeObject = {
    type: 'oauth2',
    flows: {
      deviceAuthorization: { deviceAuthorizationUrl: '/device', tokenUrl: '/token', scopes: {} },
    },
  };

  const result = requestOAuthToken(scheme, 'deviceAuthorization', { ...input, onUserCode });
  await vi.advanceTimersByTimeAsync(2000);
  expect(requests).toHaveLength(3);
  // `slow_down` adds 5 seconds to the interval
  await vi.advanceTimersByTimeAsync(5000);
  expect(requests).toHaveLength(3);
  await vi.advanceTimersByTimeAsync(1000);

  expect(await result).toBe('Bearer abc');
  expect(onUserCode).toHaveBeenCalledWith({
    userCode: 'ABCD-EFGH',
    verificationUri: 'https://example.com/device',
    verificationUriComplete: undefined,
  });
  expect(requests[0].url).toBe('https://api.example.com/device');
  expect(requests[0].body.get('client_id')).toBe('client');
  expect(requests[3].body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code');
  expect(requests[3].body.get('device_code')).toBe('device');
});

test('device authorization stops polling when aborted', async () => {
  vi.useFakeTimers();
  mockFetch([
    200,
    {
      device_code: 'device',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://example.com/device',
      expires_in: 600,
    },
  ]);
  const controller = new AbortController();
  const scheme: SecuritySchemeObject = {
    type: 'oauth2',
    flows: {
      deviceAuthorization: { deviceAuthorizationUrl: '/device', tokenUrl: '/token', scopes: {} },
    },
  };

  const result = requestOAuthToken(scheme, 'deviceAuthorization', {
    ...input,
    signal: controller.signal,
  });
  const rejected = expect(result).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(1000);
  controller.abort();
  // without waiting for the interval
  await rejected;
  expect(requests).toHaveLength(1);
});

test('OpenID Connect schemes run the flows of their configuration', async () => {
  mockFetch(
    [
      200,
      {
        authorization_endpoint: '/oauth/authorize',
        token_endpoint: '/oauth/token',
        grant_types_supported: ['client_credentials'],
      },
    ],
    [200, { access_token: 'abc', token_type: 'Bearer' }],
  );
  const scheme: SecuritySchemeObject = {
    type: 'openIdConnect',
    openIdConnectUrl: 'https://id.example.com/.well-known/openid-configuration',
  };

  const token = await requestOAuthToken(scheme, 'clientCredentials', {
    ...input,
    clientSecret: 'secret',
  });
  expect(token).toBe('Bearer abc');
  // relative endpoints resolve against the configuration
  expect(requests[1].url).toBe('https://id.example.com/oauth/token');
  expect(requests[1].headers.Authorization).toBe(`Basic ${btoa('client:secret')}`);
  // flows the configuration doesn't support
  expect(await requestOAuthToken(scheme, 'password', input)).toBeUndefined();
});

test('only requests of confidential clients and devices go through the proxy', async () => {
  const scheme: SecuritySchemeObject = {
    type: 'openIdConnect',
    openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration',
  };
  const options = { ...input, proxyUrl: '/api/proxy' };
  const tokenUrls: unknown[] = [];
  const redirect = (_url: URL, data: unknown) =>
    tokenUrls.push((data as { token_url: string }).token_url);
  const proxied = (url: string) =>
    `https://docs.example.com/api/proxy?url=${encodeURIComponent(url)}`;

  mockFetch([
    200,
    {
      authorization_endpoint: '/authorize',
      token_endpoint: '/token',
      device_authorization_endpoint: '/device',
      grant_types_supported: ['authorization_code', 'urn:ietf:params:oauth:grant-type:device_code'],
    },
  ]);
  await requestOAuthToken(scheme, 'authorizationCode', { ...options, redirect });
  await requestOAuthToken(scheme, 'authorizationCode', {
    ...options,
    clientSecret: 'secret',
    redirect,
  });
  expect(requests[0].url).toBe('https://auth.example.com/.well-known/openid-configuration');
  expect(tokenUrls).toEqual([
    'https://auth.example.com/token',
    proxied('https://auth.example.com/token'),
  ]);

  mockFetch([400, { error: 'invalid_client' }]);
  await expect(requestOAuthToken(scheme, 'deviceAuthorization', options)).rejects.toThrow();
  expect(requests[0].url).toBe(proxied('https://auth.example.com/device'));
});

test('token errors show the OAuth error', async () => {
  mockFetch([400, { error: 'invalid_client', error_description: 'Unknown client' }]);
  const scheme: SecuritySchemeObject = {
    type: 'oauth2',
    flows: { clientCredentials: { tokenUrl: '/token', scopes: {} } },
  };

  await expect(requestOAuthToken(scheme, 'clientCredentials', input)).rejects.toThrow(
    'invalid_client: Unknown client',
  );
});
