import { generateSchemaUI, type SchemaData, type SchemaUIGeneratedData } from '@/react';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { mergeAllOf, stringify } from '@/index';
import { expect, test } from 'vitest';
import { fromSchema } from './utils';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const cwd = fileURLToPath(new URL('./', import.meta.url));

/** generate the schemas reachable from the root */
function readAll({ $root, refs }: SchemaUIGeneratedData) {
  const out: Record<string, SchemaData> = {};
  const queue = [$root];
  for (const id of queue) {
    if (id in out) continue;
    const data = (out[id] = refs[id]);
    if (data.type === 'object') for (const prop of data.props) queue.push(prop.$type);
    else if (data.type === 'array') queue.push(data.item.$type);
    else if (data.type !== 'primitive') for (const item of data.items) queue.push(item.$type);
  }
  return { $root, refs: out };
}

test('double-oneOf in allOf does not crash', async () => {
  const parsed = await fromSchema(path.join(cwd, './fixtures/double-oneof.yaml'));

  const out = generateSchemaUI({
    root: (parsed.dereferenced as any).components!.schemas!.CreateItem,
    renderMarkdown(md) {
      return md;
    },
    renderCodeblock() {
      return null;
    },
  });

  // Should produce a cross-product of 4 oneOf variants, not crash
  expect(readAll(out).refs).toBeDefined();
});

test('test', async () => {
  const parsed = await fromSchema(path.join(cwd, './fixtures/unkey.json'));

  const out = generateSchemaUI({
    root: (parsed.dereferenced as any).components!.schemas!.V1KeysVerifyKeyResponse,
    renderMarkdown(md) {
      return md;
    },
    renderCodeblock() {
      return null;
    },
  });

  expect(readAll(out)).toMatchInlineSnapshot(`
    {
      "$root": "__root",
      "refs": {
        "__root": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": undefined,
          "infoTags": [],
          "props": [
            {
              "$type": "__root#0",
              "name": "keyId",
              "required": false,
            },
            {
              "$type": "__root#1",
              "name": "valid",
              "required": true,
            },
            {
              "$type": "__root#2",
              "name": "name",
              "required": false,
            },
            {
              "$type": "__root#3",
              "name": "ownerId",
              "required": false,
            },
            {
              "$type": "__root#4",
              "name": "meta",
              "required": false,
            },
            {
              "$type": "__root#5",
              "name": "expires",
              "required": false,
            },
            {
              "$type": "__root#6",
              "name": "ratelimit",
              "required": false,
            },
            {
              "$type": "__root#7",
              "name": "remaining",
              "required": false,
            },
            {
              "$type": "__root#8",
              "name": "code",
              "required": false,
            },
            {
              "$type": "__root#9",
              "name": "enabled",
              "required": false,
            },
          ],
          "type": "object",
          "typeName": "object",
        },
        "__root#0": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The id of the key",
          "infoTags": [],
          "type": "primitive",
          "typeName": "string",
        },
        "__root#1": {
          "aliasName": "boolean",
          "deprecated": undefined,
          "description": "Whether the key is valid or not.
    A key could be invalid for a number of reasons, for example if it has expired, has no more verifications left or if it has been deleted.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "boolean",
        },
        "__root#2": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The name of the key, give keys a name to easily identify their purpose",
          "infoTags": [],
          "type": "primitive",
          "typeName": "string",
        },
        "__root#3": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The id of the tenant associated with this key. Use whatever reference you have in your system to identify the tenant. When verifying the key, we will send this field back to you, so you know who is accessing your API.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "string",
        },
        "__root#4": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": "Any additional metadata you want to store with the key",
          "infoTags": [],
          "props": [
            {
              "$type": "__root#4#*",
              "name": "[key: string]",
              "required": false,
            },
          ],
          "type": "object",
          "typeName": "object",
        },
        "__root#4#*": {
          "aliasName": "unknown",
          "deprecated": undefined,
          "description": undefined,
          "infoTags": [],
          "type": "primitive",
          "typeName": "unknown",
        },
        "__root#5": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "The unix timestamp in milliseconds when the key will expire. If this field is null or undefined, the key is not expiring.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__root#6": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": "The ratelimit configuration for this key. If this field is null or undefined, the key has no ratelimit.",
          "infoTags": [],
          "props": [
            {
              "$type": "__root#6#0",
              "name": "limit",
              "required": true,
            },
            {
              "$type": "__root#6#1",
              "name": "remaining",
              "required": true,
            },
            {
              "$type": "__root#6#2",
              "name": "reset",
              "required": true,
            },
          ],
          "type": "object",
          "typeName": "object",
        },
        "__root#6#0": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Maximum number of requests that can be made inside a window",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__root#6#1": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Remaining requests after this verification",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__root#6#2": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Unix timestamp in milliseconds when the ratelimit will reset",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__root#7": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "The number of requests that can be made with this key before it becomes invalid. If this field is null or undefined, the key has no request limit.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__root#8": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "If the key is invalid this field will be set to the reason why it is invalid.
    Possible values are:
    - NOT_FOUND: the key does not exist or has expired
    - FORBIDDEN: the key is not allowed to access the api
    - USAGE_EXCEEDED: the key has exceeded its request limit
    - RATE_LIMITED: the key has been ratelimited
    - UNAUTHORIZED: the key is not authorized
    - DISABLED: the key is disabled
    - INSUFFICIENT_PERMISSIONS: you do not have the required permissions to perform this action
    ",
          "infoTags": [
            {
              "label": "Value in",
              "list": [
                ""NOT_FOUND"",
                ""FORBIDDEN"",
                ""USAGE_EXCEEDED"",
                ""RATE_LIMITED"",
                ""UNAUTHORIZED"",
                ""DISABLED"",
                ""INSUFFICIENT_PERMISSIONS"",
              ],
            },
          ],
          "type": "primitive",
          "typeName": "string",
        },
        "__root#9": {
          "aliasName": "boolean",
          "deprecated": undefined,
          "description": "Sets the key to be enabled or disabled. Disabled keys will not verify.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "boolean",
        },
      },
    }
  `);
});

test('explicit title of a composed schema is its alias (#3529)', () => {
  const doc = createMagicProxy({
    components: {
      schemas: {
        Base: { title: 'Base', type: 'object', properties: { id: { type: 'string' } } },
        ChildA: {
          title: 'ChildA',
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { type: 'object', properties: { a: { type: 'string' } } },
          ],
        },
        ChildB: {
          title: 'ChildB',
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { type: 'object', properties: { b: { type: 'string' } } },
          ],
        },
        Payload: {
          title: 'Payload',
          allOf: [
            { description: 'Event payload.' },
            {
              oneOf: [
                { $ref: '#/components/schemas/ChildA' },
                { $ref: '#/components/schemas/ChildB' },
              ],
            },
          ],
        },
        Root: {
          type: 'object',
          properties: { payload: { $ref: '#/components/schemas/Payload' } },
        },
      },
    },
  }) as any;

  const out = generateSchemaUI({
    root: doc.components.schemas.Root,
    renderMarkdown: (md) => md,
    renderCodeblock: () => null,
  });
  const payload = readAll(out).refs['#/components/schemas/Payload'];
  expect(payload.aliasName).toBe('Payload');
  expect(payload.typeName).toBe('ChildA | ChildB');
  expect(payload.type === 'or' && payload.items.map((item) => item.name)).toEqual([
    'ChildA',
    'ChildB',
  ]);
});

test('nested property intersections dedupe titles (#3529)', () => {
  const doc = createMagicProxy({
    components: {
      schemas: {
        NamedItem: { title: 'NamedItem', type: 'object' },
        BaseConfig: { title: 'BaseConfig', type: 'object' },
        DerivedConfig: {
          title: 'DerivedConfig',
          allOf: [{ $ref: '#/components/schemas/BaseConfig' }, { type: 'object' }],
        },
        BaseSettings: {
          title: 'BaseSettings',
          type: 'object',
          properties: {
            config: { $ref: '#/components/schemas/BaseConfig' },
            items: { type: 'array', items: { $ref: '#/components/schemas/NamedItem' } },
          },
        },
        DerivedSettings: {
          title: 'DerivedSettings',
          allOf: [
            { $ref: '#/components/schemas/BaseSettings' },
            {
              properties: {
                config: { $ref: '#/components/schemas/DerivedConfig' },
                items: { items: { $ref: '#/components/schemas/NamedItem' } },
              },
            },
          ],
        },
      },
    },
  }) as any;

  const out = generateSchemaUI({
    root: doc.components.schemas.DerivedSettings,
    renderMarkdown: (md) => md,
    renderCodeblock: () => null,
  });
  const root = out.refs[out.$root];
  expect(root.aliasName).toBe('DerivedSettings');
  const props = root.type === 'object' ? root.props : [];
  const labels = Object.fromEntries(props.map((p) => [p.name, out.refs[p.$type].aliasName]));
  expect(labels).toEqual({ config: 'DerivedConfig', items: 'array<NamedItem>' });
});

test('untitled `allOf` keeps combined alias', () => {
  const merged = mergeAllOf({
    allOf: [
      { title: 'Readable', type: 'object', properties: { a: { type: 'string' } } },
      { title: 'Writable', type: 'object', properties: { b: { type: 'string' } } },
    ],
  });
  expect(stringify(merged, { alias: true })).toBe('Readable & Writable');
});
