import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { formatError } from '@/utils/format-error';
import { generateJS } from '@/map/generate';
import { defineCollections } from '@/config';

test('format errors', () => {
  const schema = z.object({
    text: z.string(),
    obj: z.object({
      key: z.number(),
    }),
    value: z.string().max(4),
  });

  const result = schema.safeParse({
    text: 4,
    obj: {},
    value: 'asfdfsdfsdfsd',
  });

  if (result.error)
    expect(formatError('in index.mdx:', result.error)).toMatchInlineSnapshot(`
      "in index.mdx:
        text: Expected string, received number
        obj: 
          obj.key: Required
        value: String must contain at most 4 character(s)"
    `);
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
      () => ({}),
    );

    await expect(out.replaceAll(process.cwd(), '$cwd')).toMatchFileSnapshot(
      `./fixtures/index-${name}.output.js`,
    );
  });
}
