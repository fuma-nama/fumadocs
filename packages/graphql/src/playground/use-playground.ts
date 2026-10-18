'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type GraphQLField, isRequiredArgument } from 'graphql';
import {
  type DataEngine,
  type DataEngineListener,
  type Stf,
  useDataEngine,
  useStf,
} from '@fumari/stf';
import { isPlainObject } from '@fumari/stf/lib/utils';
import { addLogEntry } from 'shared-api/components/playground/log';
import { useOperation } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import type { OperationExample } from '@/utils/example';
import { executeGraphQL, type PlaygroundRequest, type PlaygroundResult } from './fetcher';
import { getEndpointOrigin, readStored, writeStored } from './storage';
import { getSubscriptionUrl, subscribeGraphQL } from './subscription';
import { syncOperationVariables } from './variables';

export type ConnectionStatus = 'closed' | 'connecting' | 'open';

export interface LogEntry {
  /** unique in the log */
  id: number;
  time: number;
  type: 'subscribed' | 'next' | 'error' | 'completed' | 'stopped';
  /** the result of `next`, the endpoint of `subscribed`, the `SubscriptionError` of `error` */
  data?: unknown;
}

export interface PlaygroundResponse {
  /** unique among the responses of a playground */
  id: number;
  /** the endpoint it was sent to */
  url: string;
  result: PlaygroundResult;
}

export interface Playground {
  /** the form: `variables` and `headers` of the request */
  stf: Stf;
  /** the endpoint, empty until `open()` restores it */
  url: string;
  /** headers are kept by endpoint origin, a new origin swaps them out */
  changeUrl: (url: string) => void;
  query: string;
  setQuery: (query: string) => void;
  /** index of the example in the editor and form */
  loaded: number;
  example?: OperationExample;
  /** select an example on the page, and load it */
  select: (index: number) => void;
  /** load the selected example again */
  reset: () => void;
  /** when the dialog opens: restore the endpoint and headers of previous visits, load the example selected on the page */
  open: () => void;
  /** send a query or mutation, its result becomes `response` */
  send: () => Promise<void>;
  isSending: boolean;
  response?: PlaygroundResponse;
  clearResponse: () => void;
  /** start a subscription, its events are added to `log` */
  subscribe: () => void;
  stop: () => void;
  status: ConnectionStatus;
  log: LogEntry[];
  clearLog: () => void;
}

const addEntry = addLogEntry<LogEntry>;

/** re-renders when the snapshot of form data changes, nested updates included */
function useFormSnapshot<T>(engine: DataEngine, getSnapshot: () => T): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // inits and deletes also update their parent
      const listener: DataEngineListener = { onUpdate: onChange };
      engine.listen(listener);
      return () => engine.unlisten(listener);
    },
    [engine],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** the variables and headers to send, from the JSON of form data (without `undefined` values) */
export function toRequestValues(json: string): Pick<PlaygroundRequest, 'variables' | 'headers'> {
  const { variables, headers } = JSON.parse(json) as {
    variables: unknown;
    headers: Record<string, string>;
  };

  return {
    variables:
      isPlainObject(variables) && Object.keys(variables).length === 0 ? undefined : variables,
    headers,
  };
}

/** the variables and headers the form under `<StfProvider />` sends, following its edits */
export function useRequestValues(): Pick<PlaygroundRequest, 'variables' | 'headers'> {
  const engine = useDataEngine();
  return toRequestValues(useFormSnapshot(engine, () => JSON.stringify(engine.getData())));
}

/** the optional arguments with values, as a string to compare */
function getSetArguments(field: GraphQLField<unknown, unknown>, variables: unknown): string {
  let out = '';
  if (!isPlainObject(variables)) return out;
  for (const arg of field.args) {
    if (!isRequiredArgument(arg) && variables[arg.name] !== undefined) out += `${arg.name},`;
  }
  return out;
}

/** the playground of the operation under `<OperationProvider />`, configured by the page's `playground` option */
export function usePlayground(): Playground {
  const ctx = useRenderContext();
  const options = ctx.playground ?? {};
  const { kind, field, examples, selected, select: selectExample } = useOperation();
  // the example in the editor and form, the selected one is loaded when the dialog opens
  const [loaded, setLoaded] = useState(selected);
  const example = examples.at(loaded);
  // restored with its headers when the dialog opens for the first time
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState(example?.query ?? '');
  const stf = useStf({
    // the form mutates its values in place, examples are also rendered as static docs
    defaultValues: () => ({
      variables: structuredClone(example?.variables) ?? {},
      headers: { ...options.headers },
    }),
  });
  const engine = stf.dataEngine;
  const [isSending, setSending] = useState(false);
  const [response, setResponse] = useState<PlaygroundResponse>();
  const [status, setStatus] = useState<ConnectionStatus>('closed');
  const [log, setLog] = useState<LogEntry[]>([]);
  // stops the running subscription
  const stopRef = useRef<(() => void) | null>(null);
  const restoredRef = useRef(false);

  function isSet(name: string) {
    const variables = engine.get(['variables']);
    return isPlainObject(variables) && variables[name] !== undefined;
  }

  // setting or unsetting an optional argument, in the form or as JSON, (un)declares its variable
  const setArguments = useFormSnapshot(engine, () =>
    getSetArguments(field, engine.get(['variables'])),
  );
  const [syncedArguments, setSyncedArguments] = useState(setArguments);
  if (syncedArguments !== setArguments) {
    setSyncedArguments(setArguments);
    setQuery(syncOperationVariables(query, field, isSet, { prune: true }));
  }

  const load = useCallback(
    (index: number) => {
      const item = examples.at(index);
      const variables = structuredClone(item?.variables) ?? {};
      engine.reset({ variables, headers: engine.get(['headers']) });
      setQuery(item?.query ?? '');
      // the example keeps its document
      setSyncedArguments(getSetArguments(field, variables));
      setLoaded(index);
    },
    [engine, examples, field],
  );
  const reset = useCallback(() => load(selected), [load, selected]);

  function changeUrl(value: string) {
    const origin = getEndpointOrigin(value);
    if (origin !== getEndpointOrigin(url)) {
      const stored = origin ? readStored().headers?.[origin] : undefined;
      engine.update(['headers'], { ...(stored ?? options.headers) });
    }

    setUrl(value);
  }

  /** the request of the form, its document declares the variables set, its headers are stored for the endpoint */
  function prepare() {
    const document = syncOperationVariables(query, field, isSet);
    setQuery(document);
    const values = toRequestValues(JSON.stringify(engine.getData()));
    const stored = readStored();
    const origin = getEndpointOrigin(url);
    writeStored({
      // the endpoint of subscriptions isn't the one of queries
      url: kind === 'subscription' ? stored.url : url,
      headers: origin ? { ...stored.headers, [origin]: values.headers } : stored.headers,
    });

    return { url, query: document, ...values };
  }

  // stable, so it can end the subscription with the page
  const stop = useCallback(() => {
    const stopSubscription = stopRef.current;
    if (!stopSubscription) return;
    stopRef.current = null;
    setStatus('closed');
    setLog(addEntry({ type: 'stopped' }));
    stopSubscription();
  }, []);

  useEffect(() => stop, [stop]);

  return {
    stf,
    url,
    changeUrl,
    query,
    setQuery,
    loaded,
    example,
    select(index) {
      selectExample(index);
      load(index);
    },
    reset,
    open() {
      if (!restoredRef.current) {
        restoredRef.current = true;
        let next = options.url || readStored().url || '';
        if (kind === 'subscription')
          next = options.subscriptionUrl ?? (next && getSubscriptionUrl(next));
        changeUrl(next);
      }

      // the running subscription keeps its document
      if (loaded !== selected && !stopRef.current) load(selected);
    },
    isSending,
    response,
    clearResponse() {
      setResponse(undefined);
    },
    async send() {
      if (isSending) return;
      const request = prepare();
      setSending(true);
      let result: PlaygroundResult;
      try {
        result = await (options.fetcher ?? executeGraphQL)(request, ctx);
      } catch (e) {
        result = { type: 'client_error', message: e instanceof Error ? e.message : String(e) };
      }

      setResponse((prev) => ({ id: (prev?.id ?? 0) + 1, url: request.url, result }));
      setSending(false);
    },
    status,
    log,
    clearLog() {
      setLog([]);
    },
    subscribe() {
      if (stopRef.current) return;
      const request = prepare();
      // no handler runs after the subscription is stopped
      function end(entry: Omit<LogEntry, 'id' | 'time'>) {
        stopRef.current = null;
        setStatus('closed');
        setLog(addEntry(entry));
      }

      setStatus('connecting');
      stopRef.current = subscribeGraphQL(request, {
        onOpen() {
          setStatus('open');
          setLog(addEntry({ type: 'subscribed', data: request.url }));
        },
        onNext: (result) => setLog(addEntry({ type: 'next', data: result })),
        onError: (error) => end({ type: 'error', data: error }),
        onComplete: () => end({ type: 'completed' }),
      });
    },
    stop,
  };
}
