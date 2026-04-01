import { generateSchemaUI } from '@/ui/schema';
import { expect, test } from 'vitest';
import { renderContextFrom } from './utils';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ResolvedSchema } from '@/utils/schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));

test('double-oneOf in allOf does not crash', async () => {
  const ctx = await renderContextFrom(path.join(cwd, './fixtures/double-oneof.yaml'));

  const createItem = ctx.schema.dereferenced.components!.schemas!.CreateItem as ResolvedSchema;
  const out = generateSchemaUI(createItem, undefined, undefined, ctx);

  // Should produce a cross-product of 4 oneOf variants, not crash
  expect(out).toBeDefined();
  expect(out.refs).toBeDefined();
});

test('test', async () => {
  const ctx = await renderContextFrom(path.join(cwd, './fixtures/unkey.json'));

  const out = generateSchemaUI(
    ctx.schema.dereferenced.components!.schemas!.V1KeysVerifyKeyResponse as ResolvedSchema,
    undefined,
    undefined,
    ctx,
  );

  expect(out).toMatchInlineSnapshot(`
    {
      "$root": "#/components/schemas/V1KeysVerifyKeyResponse",
      "refs": {
        "#/components/schemas/V1KeysVerifyKeyResponse": {
          "aliasName": "V1KeysVerifyKeyResponse",
          "deprecated": undefined,
          "description": undefined,
          "infoTags": [],
          "props": [
            {
              "$type": "__0",
              "name": "keyId",
              "required": false,
            },
            {
              "$type": "__1",
              "name": "valid",
              "required": true,
            },
            {
              "$type": "__2",
              "name": "name",
              "required": false,
            },
            {
              "$type": "__3",
              "name": "ownerId",
              "required": false,
            },
            {
              "$type": "__4",
              "name": "meta",
              "required": false,
            },
            {
              "$type": "__6",
              "name": "expires",
              "required": false,
            },
            {
              "$type": "__7",
              "name": "ratelimit",
              "required": false,
            },
            {
              "$type": "__11",
              "name": "remaining",
              "required": false,
            },
            {
              "$type": "__12",
              "name": "code",
              "required": false,
            },
            {
              "$type": "__13",
              "name": "enabled",
              "required": false,
            },
          ],
          "type": "object",
          "typeName": "object",
        },
        "__0": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The id of the key",
          "infoTags": [],
          "type": "primitive",
          "typeName": "string",
        },
        "__1": {
          "aliasName": "boolean",
          "deprecated": undefined,
          "description": "Whether the key is valid or not.
    A key could be invalid for a number of reasons, for example if it has expired, has no more verifications left or if it has been deleted.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "boolean",
        },
        "__10": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Unix timestamp in milliseconds when the ratelimit will reset",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__11": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "The number of requests that can be made with this key before it becomes invalid. If this field is null or undefined, the key has no request limit.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__12": {
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
              "label": <I18nLabel
                label="schemaValueIn"
              />,
              "value": ""NOT_FOUND" | "FORBIDDEN" | "USAGE_EXCEEDED" | "RATE_LIMITED" | "UNAUTHORIZED" | "DISABLED" | "INSUFFICIENT_PERMISSIONS"",
            },
          ],
          "type": "primitive",
          "typeName": "string",
        },
        "__13": {
          "aliasName": "boolean",
          "deprecated": undefined,
          "description": "Sets the key to be enabled or disabled. Disabled keys will not verify.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "boolean",
        },
        "__2": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The name of the key, give keys a name to easily identify their purpose",
          "infoTags": [],
          "type": "primitive",
          "typeName": "string",
        },
        "__3": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The id of the tenant associated with this key. Use whatever reference you have in your system to identify the tenant. When verifying the key, we will send this field back to you, so you know who is accessing your API.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "string",
        },
        "__4": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": "Any additional metadata you want to store with the key",
          "infoTags": [],
          "props": [
            {
              "$type": "__5",
              "name": "[key: string]",
              "required": false,
            },
          ],
          "type": "object",
          "typeName": "object",
        },
        "__5": {
          "aliasName": "unknown",
          "deprecated": undefined,
          "description": undefined,
          "infoTags": [],
          "type": "primitive",
          "typeName": "unknown",
        },
        "__6": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "The unix timestamp in milliseconds when the key will expire. If this field is null or undefined, the key is not expiring.",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__7": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": "The ratelimit configuration for this key. If this field is null or undefined, the key has no ratelimit.",
          "infoTags": [],
          "props": [
            {
              "$type": "__8",
              "name": "limit",
              "required": true,
            },
            {
              "$type": "__9",
              "name": "remaining",
              "required": true,
            },
            {
              "$type": "__10",
              "name": "reset",
              "required": true,
            },
          ],
          "type": "object",
          "typeName": "object",
        },
        "__8": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Maximum number of requests that can be made inside a window",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
        "__9": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Remaining requests after this verification",
          "infoTags": [],
          "type": "primitive",
          "typeName": "number",
        },
      },
    }
  `);
});
