'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type GraphQLField, isRequiredArgument } from 'graphql';
import { type DataEngine, type DataEngineListener, useStf } from '@fumari/stf';
import { isPlainObject } from '@fumari/stf/lib/utils';
import {
  addLogEntry,
  type ConnectionStatus,
  type LogEntryBase,
} from 'shared-api/components/playground/log';
import { useOperation } from '@/operation';
import { useRenderContext } from '@/utils/create-page';
import {
  executeGraphQL,
  type PlaygroundRequest,
  type PlaygroundResult,
} from '@/playground/fetcher';
import { getEndpointOrigin, readStored, writeStored } from '@/playground/storage';
import { getSubscriptionUrl, subscribeGraphQL } from '@/playground/subscription';
import { syncOperationVariables } from '@/playground/variables';

export interface LogEntry extends LogEntryBase {
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

export type Playground = ReturnType<typeof usePlayground>;

const addEntry = addLogEntry<LogEntry>;

/** re-renders when the snapshot of form data changes, nested updates included */
export function useFormSnapshot<T>(engine: DataEngine, getSnapshot: () => T): T {
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

/** the optional arguments with values, as a string to compare */
function getSetArguments(field: GraphQLField<unknown, unknown>, variables: unknown): string {
  let out = '';
  if (!isPlainObject(variables)) return out;
  for (const arg of field.args) {
    if (!isRequiredArgument(arg) && variables[arg.name] !== undefined) out += `${arg.name},`;
  }
  return out;
}

/**
 * The state of the operation playground: the edited endpoint, document and form, the response of queries and mutations, and the log of subscriptions.
 */
export function usePlayground() {
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

  /** headers are stored by endpoint origin, a new origin swaps them out */
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
    query,
    setQuery,
    /** index of the example in the editor and form */
    loaded,
    example,
    /** select an example, and load it */
    select(index: number) {
      selectExample(index);
      load(index);
    },
    /** load the selected example again */
    reset,
    /** the dialog opened: restore the endpoint and headers of previous visits, load the example selected on the page */
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
    changeUrl,
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
