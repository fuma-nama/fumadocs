import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@/utils/schema';
import { generateJS } from '@/map/generate';
import { defineCollections } from '@/config';

test('format errors', async () => {
  const schema = z.object({
    text: z.string(),
    obj: z.object({
      key: z.number(),
      value: z.number(),
    }),
    value: z.string().max(4),
  });

  const result = await schema['~standard'].validate({
    text: 4,
    obj: {
      value: 'string',
    },
    value: 'asfdfsdfsdfsd',
  });

  if (result.issues) {
    const error = new ValidationError('in index.mdx:', result.issues);

    expect(error.toString()).toMatchInlineSnapshot(`
      "in index.mdx::
        text: Expected string, received number
        obj,key: Required
        obj,value: Expected number, received string
        value: String must contain at most 4 character(s)"
    `);
  }
});

const file = path.dirname(fileURLToPath(import.meta.url));

const cases = [
  {
    name: 'sync',
    collection: defineCollections({
      type: 'doc',
      dir: path.join(file, './fixtures'),
    }),
  },
  {
    name: 'async',
    collection: defineCollections({
      type: 'doc',
      dir: path.join(file, './fixtures'),
      async: true,
    }),
  },
];

for (const { name, collection } of cases) {
  test(`generate JS index file: ${name}`, async () => {
    const out = await generateJS(
      path.join(file, './fixtures/config.ts'),
      {
        _runtime: {
          files: new Map(),
        },
        // @ts-expect-error -- test file
        collections: new Map([['docs', collection]]),
      },
      path.join(file, './fixtures/index-async.output.js'),
      'hash',
    );

    await expect(out.replaceAll(process.cwd(), '$cwd')).toMatchFileSnapshot(
      `./fixtures/index-${name}.output.js`,
    );
  });
}
