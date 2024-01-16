import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { generate, generateTags } from '../src';

describe('Generate documents', () => {
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
      // eslint-disable-next-line no-await-in-loop -- avoid async fs operations
      await expect(tag.content).toMatchFileSnapshot(
        `./out/museum/${tag.tag.toLowerCase()}.mdx`,
      );
    }
  });
});
