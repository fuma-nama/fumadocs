import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { generate, generateFiles, generateTags } from '../src';

describe('Generate documents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Pet Store', async () => {
    const result = await generate(
      fileURLToPath(new URL('./fixtures/petstore.yaml', import.meta.url)),
    );

    await expect(result).toMatchFileSnapshot('./out/petstore.mdx');
  });

  test('Museum', async () => {
    const tags = await generateTags(
      fileURLToPath(new URL('./fixtures/museum.yaml', import.meta.url)),
    );

    for (const tag of tags) {
      await expect(tag.content).toMatchFileSnapshot(
        `./out/museum/${tag.tag.toLowerCase()}.mdx`,
      );
    }
  });

  test('Unkey', async () => {
    const tags = await generateTags(
      fileURLToPath(new URL('./fixtures/unkey.json', import.meta.url)),
    );

    for (const tag of tags) {
      await expect(tag.content).toMatchFileSnapshot(
        `./out/unkey/${tag.tag.toLowerCase()}.mdx`,
      );
    }
  });

  test('Generate Files', async () => {
    const cwd = fileURLToPath(new URL('./', import.meta.url));
    vi.mock('node:fs/promises', async (importOriginal) => {
      return {
        // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- mock
        ...(await importOriginal<typeof import('node:fs/promises')>()),
        mkdir: vi.fn().mockImplementation(() => {
          // do nothing
        }),
        writeFile: vi.fn().mockImplementation(() => {
          // do nothing
        }),
      };
    });

    await generateFiles({
      input: ['./fixtures/*.yaml'],
      output: './out',
      cwd,
    });

    const fs = await import('node:fs/promises');

    expect(fs.writeFile).toBeCalledTimes(2);
    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/museum.mdx'),
      expect.anything(),
    );
    expect(fs.writeFile).toBeCalledWith(
      join(cwd, './out/petstore.mdx'),
      expect.anything(),
    );

    expect(fs.mkdir).toBeCalledWith(join(cwd, './out'), expect.anything());
  });
});
