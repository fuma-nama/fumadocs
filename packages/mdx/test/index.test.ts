import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@/utils/validation';
import { defineCollections } from '@/config';
import { fumaMatter } from '@/utils/fuma-matter';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import indexFile from '@/plugins/index-file';

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

const baseDir = path.relative(
  process.cwd(),
  path.dirname(fileURLToPath(import.meta.url)),
);
const cases = [
  {
    name: 'sync',
    collection: defineCollections({
      type: 'doc',
      dir: path.join(baseDir, './fixtures/generate-index'),
    }),
  },
  {
    name: 'sync-meta',
    collection: defineCollections({
      type: 'meta',
      dir: path.join(baseDir, './fixtures/generate-index'),
    }),
  },
  {
    name: 'async',
    collection: defineCollections({
      type: 'doc',
      dir: path.join(baseDir, './fixtures/generate-index'),
      async: true,
    }),
  },
];

for (const { name, collection } of cases) {
  test(`generate JS index file: ${name}`, async () => {
    const core = createCore(
      {
        configPath: path.join(baseDir, './fixtures/config.ts'),
        environment: 'test',
        outDir: path.join(baseDir, './fixtures'),
      },
      [indexFile()],
    );

    await core.init({
      config: buildConfig({
        docs: collection,
      }),
    });
    const markdown = (await core.emit())
      .map(
        (entry) => `\`\`\`ts title="${entry.path}"\n${entry.content}\n\`\`\``,
      )
      .join('\n\n');

    await expect(markdown).toMatchFileSnapshot(
      `./fixtures/index-${name}.output.md`,
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
