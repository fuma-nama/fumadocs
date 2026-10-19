import { EventSourceParserStream } from 'eventsource-parser/stream';
import type { PlaygroundRequest } from './fetcher';

/** why a subscription failed */
export type SubscriptionError =
  /** the server didn't acknowledge the graphql-ws connection in time */
  | { type: 'timeout' }
  /** the WebSocket closed before the subscription completed */
  | { type: 'close'; code: number; reason: string }
  /** the server answered with an error, like an HTTP status */
  | { type: 'response'; message: string }
  /** the request failed, like network errors and invalid URLs */
  | { type: 'network'; message: string };

export interface SubscriptionHandlers {
  /** the subscription started */
  onOpen?: () => void;
  /** an execution result of the subscription, like `{ data }` or `{ errors }`, including the errors of a rejected subscription */
  onNext: (result: unknown) => void;
  /** the connection failed, it ends the subscription */
  onError: (error: SubscriptionError) => void;
  /** the server completed the subscription, it ends the subscription */
  onComplete: () => void;
}

/** milliseconds to wait for the server to acknowledge a graphql-ws connection */
const ackTimeout = 10_000;

/**
 * Start a subscription: `ws(s)://` URLs use the graphql-ws protocol, `http(s)://` URLs GraphQL over SSE.
 *
 * @returns stop the subscription, no handler is called after it
 */
export function subscribeGraphQL(
  request: PlaygroundRequest,
  handlers: SubscriptionHandlers,
): () => void {
  let active = true;
  function stop() {
    if (!active) return;
    active = false;
    cleanup();
  }
  function end(handler: () => void) {
    if (!active) return;
    stop();
    handler();
  }

  const transport = /^wss?:/i.test(request.url) ? subscribeWs : subscribeSse;
  const cleanup = transport(request, {
    onOpen() {
      if (active) handlers.onOpen?.();
    },
    onNext(result) {
      if (active) handlers.onNext(result);
    },
    onError: (error) => end(() => handlers.onError(error)),
    onComplete: () => end(() => handlers.onComplete()),
  });

  return stop;
}

/**
 * The default subscription endpoint: `url` with a `ws(s)://` scheme, relative URLs are resolved against the page.
 */
export function getSubscriptionUrl(url: string): string {
  try {
    return new URL(url, window.location.href).href.replace(/^http(s?):/, 'ws$1:');
  } catch {
    return url;
  }
}

/** the `graphql-transport-ws` protocol, one subscription per socket */
function subscribeWs(request: PlaygroundRequest, handlers: Required<SubscriptionHandlers>) {
  let socket: WebSocket;
  try {
    socket = new WebSocket(request.url, 'graphql-transport-ws');
  } catch (e) {
    // e.g. insecure URLs on HTTPS pages, reported after returning like other errors
    queueMicrotask(() =>
      handlers.onError({ type: 'network', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {};
  }

  let subscribed = false;
  const send = (message: object) => socket.send(JSON.stringify(message));
  const timer = setTimeout(() => handlers.onError({ type: 'timeout' }), ackTimeout);

  // browsers can't set the headers of WebSockets, servers read them from the payload instead
  socket.onopen = () => send({ type: 'connection_init', payload: request.headers });
  socket.onmessage = (event: MessageEvent<string>) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'connection_ack':
        clearTimeout(timer);
        send({
          id: '1',
          type: 'subscribe',
          payload: { query: request.query, variables: request.variables },
        });
        subscribed = true;
        handlers.onOpen();
        break;
      case 'ping':
        send({ type: 'pong' });
        break;
      case 'next':
        handlers.onNext(message.payload);
        break;
      case 'error':
        // the GraphQL errors of a rejected subscription, like a result over SSE
        subscribed = false;
        handlers.onNext({ errors: message.payload });
        handlers.onComplete();
        break;
      case 'complete':
        subscribed = false;
        handlers.onComplete();
        break;
    }
  };
  socket.onclose = (event) =>
    handlers.onError({ type: 'close', code: event.code, reason: event.reason });

  return () => {
    clearTimeout(timer);
    if (subscribed) send({ id: '1', type: 'complete' });
    socket.close(1000);
  };
}

/** GraphQL over SSE in the distinct connections mode */
function subscribeSse(request: PlaygroundRequest, handlers: Required<SubscriptionHandlers>) {
  const controller = new AbortController();

  async function run() {
    const res = await fetch(request.url, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...request.headers,
      },
      body: JSON.stringify({ query: request.query, variables: request.variables }),
      signal: controller.signal,
    });
    // a single result, like validation errors with `400` in GraphQL over HTTP
    if (res.headers.get('Content-Type')?.includes('json')) {
      handlers.onNext(await res.json());
      return handlers.onComplete();
    }
    if (!res.ok || !res.body) {
      const text = (await res.text()).trim();
      // long bodies and HTML pages, like the 404 page of a framework, would flood the log
      const detail = text.length <= 200 && !text.startsWith('<') ? text : res.statusText;
      return handlers.onError({
        type: 'response',
        message: detail ? `${res.status} ${detail}` : String(res.status),
      });
    }

    handlers.onOpen();
    await res.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream())
      .pipeTo(
        new WritableStream({
          write(message) {
            if (message.event === 'next') handlers.onNext(JSON.parse(message.data));
            else if (message.event === 'complete') handlers.onComplete();
          },
        }),
      );
    handlers.onComplete();
  }

  run().catch((e) =>
    handlers.onError({
      // `fetch` fails with a `TypeError`, invalid data with a `SyntaxError`
      type: e instanceof TypeError ? 'network' : 'response',
      message: e instanceof Error ? e.message : String(e),
    }),
  );
  return () => controller.abort();
}
