import { expect, test } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkMdx from 'remark-mdx';
import { remarkInclude } from '@/loaders/mdx/remark-include';
import remarkDirective from 'remark-directive';
import fs from 'node:fs/promises';
import { remark } from 'remark';

const dir = path.dirname(fileURLToPath(import.meta.url));
const processor = remark()
  .use(remarkMdx)
  .use(remarkInclude)
  .use(remarkDirective);
test('remark include', async () => {
  const file = path.join(dir, 'fixtures/remark-include/index.mdx');
  const out = await processor.process({
    path: file,
    value: await fs.readFile(file),
    data: {
      _getProcessor() {
        return processor as any;
      },
    },
  });

  await expect(String(out.value)).toMatchFileSnapshot(
    'fixtures/remark-include/index.out.mdx',
  );
});
