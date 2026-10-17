import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getSubscriptionUrl, subscribeGraphQL } from '@/playground/subscription';
import type { PlaygroundRequest } from '@/playground/fetcher';

const query = 'subscription ($id: ID!) { orderUpdated(id: $id) { status } }';

function request(url: string): PlaygroundRequest {
  return { url, query, variables: { id: '1' }, headers: { Authorization: 'Bearer token' } };
}

/** subscribe with handlers logging their calls in order, `ended` resolves with the log when it ends */
function subscribe(url: string) {
  const log: unknown[][] = [];
  let resolve: (log: unknown[][]) => void;
  const ended = new Promise<unknown[][]>((res) => (resolve = res));
  const stop = subscribeGraphQL(request(url), {
    onOpen: () => log.push(['open']),
    onNext: (result) => log.push(['next', result]),
    onError(error) {
      log.push(['error', error]);
      resolve(log);
    },
    onComplete() {
      log.push(['complete']);
      resolve(log);
    },
  });

  return { log, ended, stop };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('graphql-ws', () => {
  class FakeWebSocket {
    static last: FakeWebSocket;
    sent: unknown[] = [];
    closed?: number;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;

    constructor(
      readonly url: string,
      readonly protocol: string,
    ) {
      FakeWebSocket.last = this;
    }

    send(data: string) {
      this.sent.push(JSON.parse(data));
    }

    close(code: number) {
      this.closed = code;
      this.onclose?.({ code, reason: '' });
    }

    // the server side
    open() {
      this.onopen?.();
    }

    receive(message: object) {
      this.onmessage?.({ data: JSON.stringify(message) });
    }
  }

  const url = 'wss://api.example.com/graphql';
  const init = { type: 'connection_init', payload: { Authorization: 'Bearer token' } };
  const subscribeMessage = {
    id: '1',
    type: 'subscribe',
    payload: { query, variables: { id: '1' } },
  };

  /** a subscription the server accepted */
  function accepted() {
    const result = subscribe(url);
    const socket = FakeWebSocket.last;
    socket.open();
    socket.receive({ type: 'connection_ack' });
    return { ...result, socket };
  }

  beforeEach(() => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  test('handshake', () => {
    const { log } = subscribe(url);
    const socket = FakeWebSocket.last;
    expect(socket.url).toBe(url);
    expect(socket.protocol).toBe('graphql-transport-ws');
    expect(socket.sent).toEqual([]);

    socket.open();
    expect(socket.sent).toEqual([init]);
    expect(log).toEqual([]);

    socket.receive({ type: 'connection_ack' });
    expect(socket.sent).toEqual([init, subscribeMessage]);
    expect(log).toEqual([['open']]);
  });

  test('results and complete', async () => {
    const { ended, socket } = accepted();
    socket.receive({ id: '1', type: 'next', payload: { data: { orderUpdated: { status: 'A' } } } });
    socket.receive({ id: '1', type: 'next', payload: { errors: [{ message: 'oops' }] } });
    socket.receive({ id: '1', type: 'complete' });
    socket.receive({ id: '1', type: 'next', payload: { data: null } });

    expect(await ended).toEqual([
      ['open'],
      ['next', { data: { orderUpdated: { status: 'A' } } }],
      ['next', { errors: [{ message: 'oops' }] }],
      ['complete'],
    ]);
    expect(socket.closed).toBe(1000);
    expect(socket.sent).toEqual([init, subscribeMessage]);
  });

  test('errors of a rejected subscription are a result', async () => {
    const { ended, socket } = accepted();
    const errors = [{ message: 'Unknown argument "x".' }, { message: 'Expected "id".' }];
    socket.receive({ id: '1', type: 'error', payload: errors });

    expect(await ended).toEqual([['open'], ['next', { errors }], ['complete']]);
    expect(socket.closed).toBe(1000);
    expect(socket.sent).toEqual([init, subscribeMessage]);
  });

  test('ping', () => {
    const { log } = subscribe(url);
    const socket = FakeWebSocket.last;
    socket.open();
    socket.receive({ type: 'ping' });
    socket.receive({ type: 'connection_ack' });
    socket.receive({ type: 'ping', payload: { time: 1 } });
    socket.receive({ type: 'pong' });

    expect(socket.sent).toEqual([init, { type: 'pong' }, subscribeMessage, { type: 'pong' }]);
    expect(log).toEqual([['open']]);
  });

  test('unexpected close', async () => {
    const { ended, socket } = accepted();
    socket.onclose!({ code: 4403, reason: 'Forbidden' });

    expect(await ended).toEqual([
      ['open'],
      ['error', { type: 'close', code: 4403, reason: 'Forbidden' }],
    ]);
  });

  test('failing to connect', async () => {
    const { ended } = subscribe(url);
    FakeWebSocket.last.onclose!({ code: 1006, reason: '' });

    expect(await ended).toEqual([['error', { type: 'close', code: 1006, reason: '' }]]);
  });

  test('ack timeout', () => {
    vi.useFakeTimers();
    const { log } = subscribe(url);
    const socket = FakeWebSocket.last;
    socket.open();
    vi.advanceTimersByTime(9_999);
    expect(log).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(log).toEqual([['error', { type: 'timeout' }]]);
    expect(socket.closed).toBe(1000);
  });

  test('ack clears the timeout', () => {
    vi.useFakeTimers();
    const { log } = accepted();
    vi.advanceTimersByTime(60_000);
    expect(log).toEqual([['open']]);
  });

  test('stop', () => {
    const { log, stop, socket } = accepted();
    socket.receive({ id: '1', type: 'next', payload: { data: {} } });
    stop();
    expect(socket.sent.at(-1)).toEqual({ id: '1', type: 'complete' });
    expect(socket.closed).toBe(1000);

    socket.receive({ id: '1', type: 'next', payload: { data: {} } });
    socket.receive({ id: '1', type: 'complete' });
    socket.onclose!({ code: 1006, reason: '' });
    stop();
    expect(log).toEqual([['open'], ['next', { data: {} }]]);
    expect(socket.sent).toEqual([init, subscribeMessage, { id: '1', type: 'complete' }]);
  });

  test('stop before the ack', () => {
    vi.useFakeTimers();
    const { log, stop } = subscribe(url);
    const socket = FakeWebSocket.last;
    socket.open();
    stop();
    vi.advanceTimersByTime(60_000);

    expect(socket.sent).toEqual([init]);
    expect(socket.closed).toBe(1000);
    expect(log).toEqual([]);
  });

  test('invalid URL', async () => {
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor() {
          throw new SyntaxError('Invalid URL');
        }
      },
    );
    const { log, ended } = subscribe('ws://');
    // handlers never run before returning
    expect(log).toEqual([]);
    expect(await ended).toEqual([['error', { type: 'network', message: 'Invalid URL' }]]);
  });
});

describe('GraphQL over SSE', () => {
  const encoder = new TextEncoder();

  /** a response streaming the chunks, more can be pushed to the returned controller */
  function eventStream(chunks: (string | Uint8Array)[] = [], end = true) {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        for (const chunk of chunks)
          c.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
        if (end) c.close();
      },
    });

    return {
      response: new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
      controller,
    };
  }

  function mockFetch(response: Response | Promise<Response>) {
    const fetch = vi.fn((_url: string, _init: RequestInit) => Promise.resolve(response));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  const text = [
    ': connected',
    '',
    'event: next',
    'data: {"data":',
    'data: {"orderUpdated":{"status":"PENDING","note":"café"}}}',
    '',
    ': keep-alive',
    'id: 1',
    'retry: 1000',
    '',
    'event:next',
    'data:{"data":null}',
    '',
    'event: complete',
    'data:',
    '',
    'event: next',
    'data: {"data":"after complete"}',
    '',
  ];
  const expected = [
    ['open'],
    ['next', { data: { orderUpdated: { status: 'PENDING', note: 'café' } } }],
    ['next', { data: null }],
    ['complete'],
  ];

  test('request', async () => {
    const fetch = mockFetch(eventStream(['event: complete\ndata:\n\n']).response);
    const { ended } = subscribe('/api/graphql');
    await ended;

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/graphql');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
    expect(JSON.parse(init.body as string)).toEqual({ query, variables: { id: '1' } });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  test('events, multi-line data and comments', async () => {
    mockFetch(eventStream([text.join('\n')]).response);
    expect(await subscribe('/api/graphql').ended).toEqual(expected);
  });

  test('chunk boundaries split lines, line breaks and characters', async () => {
    // CRLF line breaks, one byte per chunk
    const bytes = encoder.encode(text.join('\r\n'));
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i++) chunks.push(bytes.subarray(i, i + 1));
    mockFetch(eventStream(chunks).response);

    expect(await subscribe('/api/graphql').ended).toEqual(expected);
  });

  test('chunk boundaries split events', async () => {
    mockFetch(
      eventStream([
        'event: ne',
        'xt\ndata: {"data":1}\n',
        '\nevent: next\nda',
        'ta: {"data":2}\n\n',
      ]).response,
    );

    expect(await subscribe('/api/graphql').ended).toEqual([
      ['open'],
      ['next', { data: 1 }],
      ['next', { data: 2 }],
      ['complete'],
    ]);
  });

  test('the stream ending without complete', async () => {
    mockFetch(
      eventStream(['event: next\ndata: {"data":1}\n\nevent: next\ndata: {"data":2}']).response,
    );

    // the incomplete event is dropped
    expect(await subscribe('/api/graphql').ended).toEqual([
      ['open'],
      ['next', { data: 1 }],
      ['complete'],
    ]);
  });

  test('JSON responses are a single result', async () => {
    const result = { errors: [{ message: 'Unknown field.' }] };
    mockFetch(Response.json(result));
    expect(await subscribe('/api/graphql').ended).toEqual([['next', result], ['complete']]);

    mockFetch(
      new Response(JSON.stringify(result), {
        status: 400,
        headers: { 'Content-Type': 'application/graphql-response+json; charset=utf-8' },
      }),
    );
    expect(await subscribe('/api/graphql').ended).toEqual([['next', result], ['complete']]);
  });

  test('HTTP error', async () => {
    const error = (message: string) => [['error', { type: 'response', message }]];
    mockFetch(new Response('Bad Gateway\n', { status: 502 }));
    expect(await subscribe('/api/graphql').ended).toEqual(error('502 Bad Gateway'));

    mockFetch(new Response(null, { status: 502 }));
    expect(await subscribe('/api/graphql').ended).toEqual(error('502'));

    // HTML pages and long bodies are replaced by the status text
    mockFetch(
      new Response('<!DOCTYPE html><html>…</html>', { status: 404, statusText: 'Not Found' }),
    );
    expect(await subscribe('/api/graphql').ended).toEqual(error('404 Not Found'));
    mockFetch(new Response('x'.repeat(201), { status: 500, statusText: 'Server Error' }));
    expect(await subscribe('/api/graphql').ended).toEqual(error('500 Server Error'));
  });

  test('network error', async () => {
    mockFetch(Promise.reject(new TypeError('Failed to fetch')));
    expect(await subscribe('/api/graphql').ended).toEqual([
      ['error', { type: 'network', message: 'Failed to fetch' }],
    ]);
  });

  test('invalid data', async () => {
    mockFetch(eventStream(['event: next\ndata: {\n\n']).response);
    const [open, [type]] = await subscribe('/api/graphql').ended;
    expect([open, type]).toEqual([['open'], 'error']);
  });

  test('stop', async () => {
    const { response, controller } = eventStream(['event: next\ndata: {"data":1}\n\n'], false);
    const fetch = mockFetch(response);
    const { log, stop } = subscribe('/api/graphql');
    await vi.waitFor(() => expect(log).toHaveLength(2));
    stop();

    expect(fetch.mock.calls[0][1].signal!.aborted).toBe(true);
    controller.enqueue(
      encoder.encode('event: next\ndata: {"data":2}\n\nevent: complete\ndata:\n\n'),
    );
    controller.close();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(log).toEqual([['open'], ['next', { data: 1 }]]);
  });
});

describe('getSubscriptionUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { href: 'https://docs.example.com/docs/subscriptions/orderUpdated' },
    });
  });

  test('absolute URLs', () => {
    expect(getSubscriptionUrl('https://api.example.com/graphql')).toBe(
      'wss://api.example.com/graphql',
    );
    expect(getSubscriptionUrl('http://localhost:4000/graphql?x=1')).toBe(
      'ws://localhost:4000/graphql?x=1',
    );
  });

  test('relative URLs', () => {
    expect(getSubscriptionUrl('/api/graphql')).toBe('wss://docs.example.com/api/graphql');
    expect(getSubscriptionUrl('graphql')).toBe('wss://docs.example.com/docs/subscriptions/graphql');
  });

  test('WebSocket URLs', () => {
    expect(getSubscriptionUrl('ws://localhost:4000/graphql')).toBe('ws://localhost:4000/graphql');
    expect(getSubscriptionUrl('wss://api.example.com/graphql')).toBe(
      'wss://api.example.com/graphql',
    );
  });

  test('invalid URLs', () => {
    expect(getSubscriptionUrl('http://[')).toBe('http://[');
  });
});
