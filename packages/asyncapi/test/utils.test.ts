import { describe, expect, test } from 'vitest';
import { getUrlParts } from '@/utils/server-url';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { resolveMultiFormatSchema } from '@/utils/schema';
import { getExampleMessages } from '@/utils/get-example-messages';
import { generateTypeScriptDefinitions } from '@/utils/typescript';
import { toMarkdown } from '@/utils/pages/to-markdown';
import { fromSchema } from '@/utils/pages/builder';
import { createAutoPreset } from '@/utils/pages/preset-auto';
import type { AsyncAPIObject, ServerObject } from '@/types';

describe('getUrlParts', () => {
  const server: ServerObject = { host: '{host}', protocol: 'wss', pathname: '/v1' };

  test('joins the address to the pathname of server', () => {
    expect(getUrlParts(server, { host: 'example.com' }, '/{symbol}')).toEqual([
      'wss://example.com/v1',
      '/{symbol}',
    ]);
  });

  test('does not repeat the pathname in the address', () => {
    expect(getUrlParts(server, { host: 'example.com' }, '/v1/{symbol}')).toEqual([
      'wss://example.com',
      '/v1/{symbol}',
    ]);
    expect(getUrlParts(server, { host: 'example.com' }, '/v10')).toEqual([
      'wss://example.com/v1',
      '/v10',
    ]);
  });

  test('the root address is the server', () => {
    expect(getUrlParts(server, { host: 'example.com' }, '/')).toEqual(['wss://example.com/v1', '']);
    expect(getUrlParts({ host: 'example.com', protocol: 'ws' }, {}, '/')).toEqual([
      'ws://example.com',
      '/',
    ]);
  });
});

describe('resolveMultiFormatSchema', () => {
  test('JSON Schema and AsyncAPI schemas', () => {
    const schema = { type: 'string' } as const;

    expect(resolveMultiFormatSchema(schema)).toEqual({ schema });
    expect(
      resolveMultiFormatSchema({
        schemaFormat: 'application/schema+json;version=draft-07',
        schema,
      }),
    ).toEqual({ schema });
  });

  test('empty schemas', () => {
    expect(resolveMultiFormatSchema(null as never)).toBeUndefined();
  });

  test('other formats are resolved, and kept as they are', () => {
    const avro = { type: 'record', name: 'User', fields: [{ name: 'id', type: 'long' }] };
    const doc = createMagicProxy({
      components: { schemas: { User: avro } },
      payload: {
        schemaFormat: 'application/vnd.apache.avro;version=1.9.0',
        schema: { $ref: '#/components/schemas/User' },
      },
    });

    expect(resolveMultiFormatSchema(doc.payload)).toEqual({
      schema: avro,
      schemaFormat: 'application/vnd.apache.avro;version=1.9.0',
    });
  });

  test('other formats are kept as they are', () => {
    const proto = 'message Point { required int32 x = 1; }';

    expect(
      resolveMultiFormatSchema({
        schemaFormat: 'application/vnd.google.protobuf;version=3',
        schema: proto,
      }),
    ).toEqual({ schema: proto, schemaFormat: 'application/vnd.google.protobuf;version=3' });
  });
});

describe('page generation', () => {
  const doc = {
    asyncapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    channels: {
      chat: { address: 'rooms/{roomId}/messages' },
    },
    operations: {
      onMessage: {
        action: 'send',
        channel: { $ref: '#/channels/chat' },
        tags: [{ name: 'chat' }],
      },
      sendMessage: {
        action: 'receive',
        channel: { $ref: '#/channels/chat' },
        tags: [{ name: 'chat' }],
      },
      ping: { action: 'receive', channel: { $ref: '#/channels/chat' } },
    },
  } as unknown as AsyncAPIObject;

  function paths(entries: ReturnType<typeof fromSchema>): string[] {
    const out: string[] = [];
    for (const entry of entries) {
      if (entry.type === 'group') out.push(...paths(entry.entries));
      else out.push(entry.path);
    }
    return out;
  }

  test('groups by the key of channel, one file per operation', () => {
    const entries = fromSchema('test', doc, createAutoPreset({ groupBy: 'channel' }));

    expect(paths(entries)).toEqual(['chat/onMessage.mdx', 'chat/sendMessage.mdx', 'chat/ping.mdx']);
  });

  test('pages of tags match tags by name, untagged operations are under `unknown`', () => {
    const entries = fromSchema('test', doc, createAutoPreset({ per: 'tag' }));

    expect(entries.map((entry) => entry.type === 'page' && entry.operations)).toEqual([
      [
        { id: 'onMessage', action: 'send' },
        { id: 'sendMessage', action: 'receive' },
      ],
      [{ id: 'ping', action: 'receive' }],
    ]);
  });
});

describe('getExampleMessages', () => {
  const payload = { schema: { type: 'object', properties: { id: { type: 'integer' } } } } as const;

  test('examples without headers or payload are skipped', () => {
    const examples = getExampleMessages(
      { examples: [{ name: 'Empty' }, { name: 'Ping', payload: { id: 1 } }] },
      { payload, received: true },
    );

    expect(examples).toEqual([
      { id: '1', name: 'Ping', description: undefined, headers: undefined, payload: { id: 1 } },
    ]);
  });

  test('generated from schemas when none has content', () => {
    for (const message of [{ examples: [] }, { examples: [{ name: 'Empty' }] }]) {
      expect(getExampleMessages(message, { payload, received: true })).toEqual([
        { id: 'default', name: 'Example', payload: { id: 0 } },
      ]);
    }
  });

  test('generated without the properties hidden from readers', () => {
    const payload = {
      schema: {
        type: 'object',
        properties: {
          id: { type: 'integer', readOnly: true },
          password: { type: 'string', writeOnly: true },
        },
      },
    } as const;

    expect(getExampleMessages({}, { payload, received: true })[0].payload).toEqual({ id: 0 });
    expect(getExampleMessages({}, { payload, received: false })[0].payload).toEqual({
      password: 'string',
    });
  });
});

describe('generateTypeScriptDefinitions', () => {
  test('payloads referencing schemas of the document', () => {
    const document = {
      asyncapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      components: {
        schemas: {
          Planet: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        },
      },
    } as unknown as AsyncAPIObject;
    const proxied = createMagicProxy({
      ...document,
      payload: {
        type: 'object',
        properties: { planet: { $ref: '#/components/schemas/Planet' } },
      },
    });

    const code = generateTypeScriptDefinitions(proxied.payload as never, {
      name: 'PlanetCreatedPayload',
      readOnly: true,
      writeOnly: false,
      document,
    });
    expect(code).toContain('PlanetCreatedPayload');
    expect(code).toContain('id: number');
  });
});

describe('toMarkdown', () => {
  test('operations with their messages and types', () => {
    const doc = {
      asyncapi: '3.0.0',
      info: { title: 'Chat', version: '1.0.0' },
      servers: { local: { host: 'localhost:8080', protocol: 'ws' } },
      channels: {
        room: {
          address: '/rooms/{roomId}',
          description: 'Messages of a room.',
          parameters: { roomId: { description: 'The room' } },
          messages: {
            said: {
              title: 'Said',
              payload: {
                type: 'object',
                properties: { id: { type: 'integer', readOnly: true }, text: { type: 'string' } },
              },
            },
          },
        },
      },
      operations: {
        onSaid: {
          action: 'send',
          channel: { $ref: '#/channels/room' },
          messages: [{ $ref: '#/channels/room/messages/said' }],
        },
      },
    } as unknown as AsyncAPIObject;

    const text = toMarkdown(
      { document: 'chat', operations: [{ id: 'onSaid', action: 'send' }] },
      doc,
    );
    expect(text).toContain('Messages of a room.\n\nChat sends these messages to you.');
    expect(text).toContain('Address: `/rooms/{roomId}`');
    expect(text).toContain('- `ws://localhost:8080` (Local, ws)');
    expect(text).toContain('- `roomId`: The room');
    expect(text).toContain('Payload: `SaidPayload`');
    expect(text).toContain('export type OnSaidMessage = SaidPayload;');
    expect(text).toContain('readonly id?: number;');
    expect(text).toContain('text?: string;');
  });
});
