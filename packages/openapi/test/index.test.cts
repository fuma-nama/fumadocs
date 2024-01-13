import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { generateTags } from '../src';

describe('Generate documents', () => {
  test('Pet Store', async () => {
    const tags = await generateTags(
      fileURLToPath(new URL('./fixtures/petstore.yaml', import.meta.url)),
    );

    for (const tag of tags) {
      // eslint-disable-next-line no-await-in-loop -- Ignore
      await expect(tag.content).toMatchFileSnapshot(
        `./test/petstore-out/${tag.tag}.mdx`,
      );
    }
  });

  test('Pet Store', async () => {
    const tags = await generateTags(
      fileURLToPath(new URL('./fixtures/museum.yaml', import.meta.url)),
    );

    for (const tag of tags) {
      // eslint-disable-next-line no-await-in-loop -- Ignore
      await expect(tag.content).toMatchFileSnapshot(
        `./test/museum-out/${tag.tag}.mdx`,
      );
    }
  });
});
