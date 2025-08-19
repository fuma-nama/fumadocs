import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@/utils/validation';
import { generateJS } from '@/map/generate';
import { defineCollections } from '@/config';
import { fumaMatter } from '@/utils/fuma-matter';

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
      "Error: in index.mdx::
        text: Invalid input: expected string, received number
        obj,key: Invalid input: expected number, received undefined
        obj,value: Invalid input: expected number, received string
        value: Too big: expected string to have <=4 characters"
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
        // @ts-expect-error -- test file
        _runtime: {
          files: new Map(),
        },
        collections: new Map([['docs', collection]]),
      },
      {
        relativeTo: path.join(file, './fixtures'),
      },
      'hash',
    );

    await expect(out.replaceAll(process.cwd(), '$cwd')).toMatchFileSnapshot(
      `./fixtures/index-${name}.output.js`,
    );
  });
}

test('parse frontmatter', () => {
  expect(
    fumaMatter(
      '---\ntitle: hello world\ndescription: I love Fumadocs\n---\nwow looks cool.',
    ),
  ).toMatchInlineSnapshot(`
    {
      "content": "wow looks cool.",
      "data": {
        "description": "I love Fumadocs",
        "title": "hello world",
      },
      "matter": "---
    title: hello world
    description: I love Fumadocs
    ---
    ",
    }
  `);

  expect(
    fumaMatter(
      '---\r\ntitle: hello world\r\ndescription: I love Fumadocs\r\n---\r\nwow looks cool.',
    ),
  ).toMatchInlineSnapshot(`
    {
      "content": "wow looks cool.",
      "data": {
        "description": "I love Fumadocs",
        "title": "hello world",
      },
      "matter": "---
    title: hello world
    description: I love Fumadocs
    ---
    ",
    }
  `);

  expect(fumaMatter('--- \ntitle: hello world\r\n---\r\nwow looks cool.'))
    .toMatchInlineSnapshot(`
    {
      "content": "--- 
    title: hello world
    ---
    wow looks cool.",
      "data": {},
      "matter": "",
    }
  `);
});
