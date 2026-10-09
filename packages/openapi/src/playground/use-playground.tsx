'use client';
import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { type DataEngineListener, type Stf, useStf } from '@fumari/stf';
import type { JsonSchema } from '@fumadocs/json-schema';
import { useExampleRequests, useOperation } from '@/operation';
import { pathnameFromRequest } from '@/requests/generators';
import { encodeRequestData } from '@/requests/media/encode';
import type { RawRequestData } from '@/requests/types';
import type { OAuth2SecurityScheme } from '@/types';
import { useOpenAPI } from '@/utils/create-page';
import { getPreferredType } from '@/utils/schema';
import { useServer } from '@/utils/use-server';
import {
  type AuthField,
  type AuthProvider,
  type AuthRequirement,
  type OAuthFlowInput,
  type OAuthFlowType,
  readPendingFlow,
  requestOAuthToken,
  useAuthFields,
  usePlaygroundAuth,
} from './auth';
import { type BrowserFetcherOptions, createBrowserFetcher, type FetchResult } from './fetcher';

const subscribeNever = () => () => {};

export interface PlaygroundOptions {
  /** handle security schemes, before the built-in providers */
  authProviders?: AuthProvider[];
  /** customise the auth fields, like their default values */
  transformAuthInputs?: (fields: AuthField[]) => AuthField[];
  fetchOptions?: BrowserFetcherOptions;
}

export interface RequestBodyInfo {
  /** the preferred one of its media types */
  mediaType: string;
  schema: JsonSchema;
}

export interface PlaygroundAuth {
  /** the security requirements of the operation, one of them authorizes the request */
  requirements: AuthRequirement[][];
  /** index of the selected requirement, `-1` when the operation needs no authorization */
  selected: number;
  select: (index: number) => void;
  /** the fields of the selected requirement */
  fields: AuthField[];
  /**
   * Obtain the access token of an OAuth 2.0 field, and write it into the field.
   *
   * `implicit` and `authorizationCode` leave the page without a token, `flowReturned` is set when they return.
   */
  authorize: (field: AuthField, input: OAuthInput) => Promise<string | undefined>;
  /** a flow started here has returned to the page */
  flowReturned: boolean;
}

export interface OAuthInput extends Partial<
  Pick<OAuthFlowInput, 'clientId' | 'clientSecret' | 'username' | 'password' | 'clientAuth'>
> {
  type: OAuthFlowType;
  /** defaults to the scopes required by the operation */
  scopes?: string[];
}

export interface PlaygroundResponse {
  /** unique among the responses of a playground */
  id: number;
  result: FetchResult;
}

export interface Playground {
  /** the form, holding the `path`, `query`, `header`, `cookie` and `body` of request */
  stf: Stf;
  /** the request body edited in the form */
  body?: RequestBodyInfo;
  auth: PlaygroundAuth;
  /** send the request of form */
  send: () => Promise<void>;
  isSending: boolean;
  /** the response of last request */
  response?: PlaygroundResponse;
  clearResponse: () => void;
}

/**
 * The state of an API playground under `<OperationProvider />`: a form starting from the selected example request, its auth and the request it sends.
 *
 * Edits are synced to the example request, so code usages follow them.
 */
export function usePlayground({
  authProviders,
  transformAuthInputs,
  fetchOptions,
}: PlaygroundOptions = {}): Playground {
  const { mediaAdapters, proxyUrl, oauthRedirectUrl } = useOpenAPI();
  const { path, method, operation, parameters: groups, requestBody } = useOperation();
  const { items: examples, selected, update } = useExampleRequests();
  const { resolveUrl } = useServer();
  // where OAuth flows return to
  const origin = `${method} ${path}`;
  const oauthOrigin = usePlaygroundAuth().origin;
  // the scheme of a flow that left the page with `useAuthRedirect()`, and returned to this playground
  const returnedScheme = useSyncExternalStore(
    subscribeNever,
    () => {
      const flow = readPendingFlow();
      if (flow?.origin === origin) return flow.scheme;
    },
    () => undefined,
  );
  const flowReturned = returnedScheme !== undefined || oauthOrigin === origin;
  const [response, setResponse] = useState<PlaygroundResponse>();
  const [isSending, setSending] = useState(false);
  let body: RequestBodyInfo | undefined;
  if (requestBody) {
    const mediaType = getPreferredType(requestBody.content)!;
    body = { mediaType, schema: requestBody.content[mediaType].schema ?? true };
  }

  const defaultValues = useMemo(() => {
    const data = examples.find((example) => example.id === selected)?.data;

    return {
      path: data?.path ?? {},
      query: data?.query ?? {},
      header: data?.header ?? {},
      cookie: data?.cookie ?? {},
      body: data?.body ?? {},
    };
  }, [examples, selected]);
  // edited in place, they are persisted to the example by `update()` anyway
  const stf = useStf({ defaultValues });
  const engine = stf.dataEngine;
  const auth = useAuthFields(engine, {
    operation,
    providers: authProviders,
    transform: transformAuthInputs,
  });

  function getRequestData(): RawRequestData {
    return auth.mapValues({
      ...(engine.getData() as typeof defaultValues),
      method,
      bodyMediaType: body?.mediaType,
    });
  }

  const syncExample = useEffectEvent(() => update(getRequestData()));

  // its provider finishes the flow, it must be selected
  useOnChange(returnedScheme, (scheme) => {
    const idx = auth.requirements.findIndex((req) => req.some((item) => item.id === scheme));
    if (idx !== -1) auth.select(idx);
  });

  useEffect(() => {
    // same object reference = unchanged
    if (engine.getData() !== defaultValues) engine.reset(defaultValues);
  }, [engine, defaultValues]);

  const initAuth = auth.init;
  // write the auth values again after resets, then sync the edits with a delay
  useEffect(() => {
    const reset = initAuth();
    syncExample();
    let timer: number | undefined;
    const listener: DataEngineListener = {
      onUpdate() {
        window.clearTimeout(timer);
        timer = window.setTimeout(syncExample, 400);
      },
    };

    engine.listen(listener);
    return () => {
      engine.unlisten(listener);
      window.clearTimeout(timer);
      reset();
    };
  }, [engine, defaultValues, initAuth]);

  return {
    stf,
    body,
    auth: {
      requirements: auth.requirements,
      selected: auth.selected,
      select: auth.select,
      fields: auth.fields,
      async authorize(field, { type, scopes = field.scopes, clientAuth = 'header', ...input }) {
        const token = await requestOAuthToken(field.scheme as OAuth2SecurityScheme, type, {
          clientId: input.clientId ?? '',
          clientSecret: input.clientSecret ?? '',
          username: input.username ?? '',
          password: input.password ?? '',
          scopes,
          clientAuth,
          schemeId: field.schemeId,
          serverUrl: resolveUrl(),
          redirectUrl: oauthRedirectUrl,
          origin,
        });
        if (token) engine.update(field.fieldName, token);
        return token;
      },
      flowReturned,
    },
    isSending,
    response,
    async send() {
      if (isSending) return;
      setSending(true);
      const parameters = groups.flatMap((group) => group.items);
      let result: FetchResult;
      try {
        const data = encodeRequestData(getRequestData(), mediaAdapters, parameters);
        const fetcher = createBrowserFetcher(mediaAdapters, { proxyUrl, ...fetchOptions });
        result = await fetcher.fetch(resolveUrl(pathnameFromRequest(path, data)), data);
      } catch (e) {
        result = { type: 'client_error', url: path, message: String(e) };
      }

      setResponse((prev) => ({ id: (prev?.id ?? 0) + 1, result }));
      setSending(false);
    },
    clearResponse() {
      setResponse(undefined);
    },
  };
}
