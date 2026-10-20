import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import {
  type ConnectTarget,
  type Playground,
  type PlaygroundTransport,
  sseTransport,
  usePlayground,
} from '@/playground';
import { OperationProvider } from '@/operation';
import { AsyncAPIProvider } from '@/utils/create-page';
import { createAsyncAPIPage } from '@/ui';
import { parseBinary, toHex } from '@/ui/playground/messages';
import type { AsyncAPIObject, ServerObject } from '@/types';

describe('binary messages', () => {
  const hello = [0x48, 0x65, 0x6c, 0x6c, 0x6f];

  test('hex', () => {
    expect([...new Uint8Array(parseBinary('48 65 6c\n6C 6f', 'hex')!)]).toEqual(hello);
    expect(parseBinary('486', 'hex')).toBeUndefined();
    expect(parseBinary('4g', 'hex')).toBeUndefined();
  });

  test('base64', () => {
    expect([...new Uint8Array(parseBinary('SGVs bG8=', 'base64')!)]).toEqual(hello);
    expect(parseBinary('SGVsbG8*', 'base64')).toBeUndefined();
  });

  test('hex preview', () => {
    expect(toHex(new Uint8Array(hello).buffer)).toBe('48 65 6c 6c 6f');
    expect(toHex(new Uint8Array(100).buffer)).toBe(`${'00 '.repeat(64)}…`);
  });
});

describe('transports', () => {
  const custom: PlaygroundTransport = { connect: () => ({ close() {} }) };
  type Transports = Record<string, PlaygroundTransport>;

  function Probe({ hook, onRender }: { hook?: Transports; onRender: (value: Playground) => void }) {
    onRender(usePlayground({ transports: hook }));
    return null;
  }

  function render(
    server: ServerObject,
    { page, hook, bindings }: { page?: Transports; hook?: Transports; bindings?: object },
  ) {
    const document = {
      asyncapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      servers: { main: server },
      channels: { events: { address: '/events', bindings } },
      operations: { onEvent: { action: 'send', channel: { $ref: '#/channels/events' } } },
    } as unknown as AsyncAPIObject;
    let out: Playground | undefined;

    renderToString(
      <AsyncAPIProvider
        document={document}
        shiki={undefined as never}
        components={{} as never}
        playground={{ transports: page }}
      >
        <OperationProvider id="onEvent">
          <Probe hook={hook} onRender={(value) => (out = value)} />
        </OperationProvider>
      </AsyncAPIProvider>,
    );
    return out!;
  }

  test('WebSocket servers are built in', () => {
    const playground = render({ host: 'example.com', protocol: 'wss' }, {});

    expect(playground.transport?.connect).toBeTypeOf('function');
    expect(playground.url).toBe('wss://example.com/events');
  });

  test('other protocols need a transport', () => {
    const server: ServerObject = { host: 'example.com', protocol: 'https' };

    expect(render(server, {})).toMatchObject({ transport: undefined, url: undefined });
    expect(render(server, { page: { https: sseTransport } })).toMatchObject({
      transport: sseTransport,
      url: 'https://example.com/events',
    });
  });

  test('the query has only the inputs of the server', () => {
    const bindings = {
      ws: {
        query: {
          type: 'object',
          required: ['token'],
          properties: { token: { type: 'string', default: 'abc' } },
        },
      },
    };

    expect(render({ host: 'example.com', protocol: 'wss' }, { bindings }).url).toBe(
      'wss://example.com/events?token=abc',
    );
    expect(
      render(
        { host: 'example.com', protocol: 'https' },
        { bindings, page: { https: sseTransport } },
      ).url,
    ).toBe('https://example.com/events');
  });

  test('the transports of hook, then the ones of page, come first', () => {
    const server: ServerObject = { host: 'example.com', protocol: 'wss' };

    expect(render(server, { page: { wss: custom } }).transport).toBe(custom);
    expect(render(server, { page: { wss: sseTransport }, hook: { wss: custom } }).transport).toBe(
      custom,
    );
  });
});

describe('sseTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** a response streaming `chunks`, it stays open without `end` */
  function mockFetch(chunks: string[], end = true) {
    const fetch = vi.fn((_url: string, init: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
          if (end) controller.close();
          init.signal!.addEventListener('abort', () => controller.error(init.signal!.reason));
        },
      });

      return Promise.resolve(
        new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
      );
    });
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  function connect(target: Partial<ConnectTarget>) {
    const events: unknown[][] = [];
    const connection = sseTransport.connect(
      { url: 'https://example.com/events', auth: [], ...target } as ConnectTarget,
      {
        open: () => events.push(['open']),
        message: (data) => events.push(['message', data]),
        close: () => events.push(['close']),
        error: (message) => events.push(['error', message]),
      },
    );

    return {
      connection,
      events,
      settled: () => vi.waitFor(() => expect(events.at(-1)?.[0]).toMatch(/close|error/)),
    };
  }

  test('receives events until the stream ends', async () => {
    const fetch = mockFetch([
      'data: {"id":1}\n\n: ping\n\nevent: update\ndata: a\r',
      '\ndata: b\r\n\r\n',
    ]);
    const { events, settled } = connect({});
    await settled();

    expect(fetch.mock.calls[0][0]).toBe('https://example.com/events');
    expect(new Headers(fetch.mock.calls[0][1].headers).get('Accept')).toBe('text/event-stream');
    expect(events).toEqual([['open'], ['message', '{"id":1}'], ['message', 'a\nb'], ['close']]);
  });

  test('sends API keys and HTTP auth as headers', () => {
    function headersOf(auth: ConnectTarget['auth']) {
      const fetch = mockFetch([]);
      connect({ auth });
      return new Headers(fetch.mock.calls[0][1].headers);
    }
    const headers = headersOf([
      { scheme: { type: 'httpApiKey', in: 'header', name: 'X-API-Key' }, value: 'key' },
      { scheme: { type: 'http', scheme: 'basic' }, value: { username: 'user', password: 'pass' } },
    ]);

    expect(headers.get('X-API-Key')).toBe('key');
    expect(headers.get('Authorization')).toBe(`Basic ${btoa('user:pass')}`);
    expect(
      headersOf([{ scheme: { type: 'http', scheme: 'bearer' }, value: 'token' }]).get(
        'Authorization',
      ),
    ).toBe('Bearer token');
    expect(sseTransport.auth!({ type: 'httpApiKey', in: 'cookie', name: 'key' })).toBe(false);
    expect(sseTransport.auth!({ type: 'http', scheme: 'digest' })).toBe(false);
    expect(sseTransport.auth!({ type: 'userPassword' })).toBe(false);
  });

  test('close aborts the request', async () => {
    const fetch = mockFetch(['data: 1\n\n'], false);
    const { connection, events } = connect({});
    await vi.waitFor(() => expect(events).toEqual([['open'], ['message', '1']]));
    connection.close();

    expect(fetch.mock.calls[0][1].signal!.aborted).toBe(true);
  });

  test('failed responses are errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 401, statusText: 'Unauthorized' }))),
    );
    const { events, settled } = connect({});
    await settled();

    expect(events).toEqual([['error', '401 Unauthorized']]);
  });

  test('network errors close the connection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const { events, settled } = connect({});
    await settled();

    expect(events).toEqual([['close']]);
  });
});

describe('<AsyncAPIPage />', () => {
  const document = {
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    channels: { events: { address: '/events' } },
    operations: {
      onEvent: { action: 'send', title: 'Send events', channel: { $ref: '#/channels/events' } },
    },
  } as unknown as AsyncAPIObject;

  test('loads documents left out of page props', async () => {
    const loadDocument = vi.fn(async () => document);
    const AsyncAPIPage = createAsyncAPIPage({ loadDocument });
    const { prelude } = await prerender(
      <AsyncAPIPage
        document="events"
        operations={[{ id: 'onEvent', action: 'send' }]}
        showTitle
        payload={{}}
      />,
    );

    expect(await new Response(prelude).text()).toContain('Send events');
    expect(loadDocument).toHaveBeenCalledExactlyOnceWith('events');
  });

  test('page props without documents need `loadDocument`', () => {
    const AsyncAPIPage = createAsyncAPIPage();

    expect(() => renderToString(<AsyncAPIPage document="events" payload={{}} />)).toThrow(
      'pass `loadDocument`',
    );
  });
});
