import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@/utils/validation';
import { defineCollections, defineConfig } from '@/config';
import { fumaMatter } from '@/utils/fuma-matter';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import indexFile from '@/plugins/index-file';
import lastModified from '@/plugins/last-modified';

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

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const cases: {
  name: string;
  config: Record<string, unknown>;
}[] = [
  {
    name: 'sync',
    config: {
      docs: defineCollections({
        type: 'doc',
        dir: path.join(baseDir, './fixtures/generate-index'),
      }),
      blogs: defineCollections({
        type: 'doc',
        dir: path.join(baseDir, './fixtures/generate-index'),
        postprocess: {
          extractLinkReferences: true,
        },
      }),
      default: defineConfig({
        plugins: [
          lastModified({
            versionControl: async () => new Date('2025-11-18'),
          }),
        ],
      }),
    },
  },
  {
    name: 'sync-meta',
    config: {
      docs: defineCollections({
        type: 'meta',
        dir: path.join(baseDir, './fixtures/generate-index'),
      }),
    },
  },
  {
    name: 'async',
    config: {
      docs: defineCollections({
        type: 'doc',
        dir: path.join(baseDir, './fixtures/generate-index'),
        async: true,
      }),
      blogs: defineCollections({
        type: 'doc',
        dir: path.join(baseDir, './fixtures/generate-index'),
        postprocess: {
          extractLinkReferences: true,
        },
        async: true,
      }),
    },
  },
  {
    name: 'dynamic',
    config: {
      docs: defineCollections({
        type: 'doc',
        dir: path.join(baseDir, './fixtures/generate-index'),
        dynamic: true,
      }),
      blogs: defineCollections({
        type: 'doc',
        dir: path.join(baseDir, './fixtures/generate-index'),
        postprocess: {
          extractLinkReferences: true,
        },
        dynamic: true,
      }),
    },
  },
  {
    name: 'workspace',
    config: {
      docs: defineCollections({
        type: 'doc',
        dir: path.join(baseDir, './fixtures/generate-index'),
      }),
      default: defineConfig({
        workspaces: {
          test: {
            dir: path.join(baseDir, './fixtures/generate-index-2'),
            config: {
              docs: defineCollections({
                type: 'doc',
                dir: '.',
                async: true,
              }),
            },
          },
        },
      }),
    },
  },
];

for (const { name, config } of cases) {
  test(`generate JS index file: ${name}`, async () => {
    const core = createCore({
      configPath: path.relative(
        process.cwd(),
        path.join(baseDir, './fixtures/config.ts'),
      ),
      environment: 'test',
      outDir: path.relative(process.cwd(), path.join(baseDir, './fixtures')),
      plugins: [indexFile()],
    });

    await core.init({
      config: buildConfig(config),
    });

    const { entries, workspaces } = await core.emit();
    for (const [name, workspace] of Object.entries(workspaces)) {
      for (const item of workspace) {
        item.path = path.join(name, item.path);
        entries.push(item);
      }
    }
    const markdown = entries
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
