import { generateSchemaUI } from '@/ui/schema';
import { expect, test } from 'vitest';
import { renderContextFrom } from './utils';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ResolvedSchema } from '@/utils/schema';

const cwd = fileURLToPath(new URL('./', import.meta.url));

test('test', async () => {
  const ctx = await renderContextFrom(path.join(cwd, './fixtures/unkey.json'));

  const out = generateSchemaUI({
    ctx,
    root: ctx.schema.dereferenced.components!.schemas!
      .V1KeysVerifyKeyResponse as ResolvedSchema,
  });

  expect(out).toMatchInlineSnapshot(`
    {
      "$root": "__0",
      "refs": {
        "__0": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": undefined,
          "infoTags": [],
          "props": [
            {
              "$type": "__1",
              "name": "keyId",
              "required": false,
            },
            {
              "$type": "__2",
              "name": "valid",
              "required": true,
            },
            {
              "$type": "__3",
              "name": "name",
              "required": false,
            },
            {
              "$type": "__4",
              "name": "ownerId",
              "required": false,
            },
            {
              "$type": "__5",
              "name": "meta",
              "required": false,
            },
            {
              "$type": "__7",
              "name": "expires",
              "required": false,
            },
            {
              "$type": "__8",
              "name": "ratelimit",
              "required": false,
            },
            {
              "$type": "__12",
              "name": "remaining",
              "required": false,
            },
            {
              "$type": "__13",
              "name": "code",
              "required": false,
            },
            {
              "$type": "__14",
              "name": "enabled",
              "required": false,
            },
          ],
          "readOnly": undefined,
          "type": "object",
          "typeName": "object",
          "writeOnly": undefined,
        },
        "__1": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The id of the key",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "string",
          "writeOnly": undefined,
        },
        "__10": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Remaining requests after this verification",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "number",
          "writeOnly": undefined,
        },
        "__11": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Unix timestamp in milliseconds when the ratelimit will reset",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "number",
          "writeOnly": undefined,
        },
        "__12": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "The number of requests that can be made with this key before it becomes invalid. If this field is null or undefined, the key has no request limit.",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "number",
          "writeOnly": undefined,
        },
        "__13": {
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
            <div
              className="bg-fd-secondary border rounded-lg text-xs p-1.5 shadow-md"
            >
              <span
                className="font-medium me-2"
              >
                Value in
              </span>
              <code
                className="text-fd-muted-foreground"
              >
                "NOT_FOUND" | "FORBIDDEN" | "USAGE_EXCEEDED" | "RATE_LIMITED" | "UNAUTHORIZED" | "DISABLED" | "INSUFFICIENT_PERMISSIONS"
              </code>
            </div>,
          ],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "string",
          "writeOnly": undefined,
        },
        "__14": {
          "aliasName": "boolean",
          "deprecated": undefined,
          "description": "Sets the key to be enabled or disabled. Disabled keys will not verify.",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "boolean",
          "writeOnly": undefined,
        },
        "__2": {
          "aliasName": "boolean",
          "deprecated": undefined,
          "description": "Whether the key is valid or not.
    A key could be invalid for a number of reasons, for example if it has expired, has no more verifications left or if it has been deleted.",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "boolean",
          "writeOnly": undefined,
        },
        "__3": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The name of the key, give keys a name to easily identifiy their purpose",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "string",
          "writeOnly": undefined,
        },
        "__4": {
          "aliasName": "string",
          "deprecated": undefined,
          "description": "The id of the tenant associated with this key. Use whatever reference you have in your system to identify the tenant. When verifying the key, we will send this field back to you, so you know who is accessing your API.",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "string",
          "writeOnly": undefined,
        },
        "__5": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": "Any additional metadata you want to store with the key",
          "infoTags": [],
          "props": [
            {
              "$type": "__6",
              "name": "[key: string]",
              "required": false,
            },
          ],
          "readOnly": undefined,
          "type": "object",
          "typeName": "object",
          "writeOnly": undefined,
        },
        "__6": {
          "aliasName": "unknown",
          "deprecated": undefined,
          "description": undefined,
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "unknown",
          "writeOnly": undefined,
        },
        "__7": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "The unix timestamp in milliseconds when the key will expire. If this field is null or undefined, the key is not expiring.",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "number",
          "writeOnly": undefined,
        },
        "__8": {
          "aliasName": "object",
          "deprecated": undefined,
          "description": "The ratelimit configuration for this key. If this field is null or undefined, the key has no ratelimit.",
          "infoTags": [],
          "props": [
            {
              "$type": "__9",
              "name": "limit",
              "required": true,
            },
            {
              "$type": "__10",
              "name": "remaining",
              "required": true,
            },
            {
              "$type": "__11",
              "name": "reset",
              "required": true,
            },
          ],
          "readOnly": undefined,
          "type": "object",
          "typeName": "object",
          "writeOnly": undefined,
        },
        "__9": {
          "aliasName": "number",
          "deprecated": undefined,
          "description": "Maximum number of requests that can be made inside a window",
          "infoTags": [],
          "readOnly": undefined,
          "type": "primitive",
          "typeName": "number",
          "writeOnly": undefined,
        },
      },
    }
  `);
});
