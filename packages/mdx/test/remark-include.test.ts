import { expect, test } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import remarkMdx from 'remark-mdx';
import { remarkInclude } from '@/loaders/mdx/remark-include';
import remarkDirective from 'remark-directive';

import fs from 'node:fs/promises';
import { remark } from 'remark';
import { VFile } from 'vfile';
import { removePosition } from 'unist-util-remove-position';

const dir = path.dirname(fileURLToPath(import.meta.url));
const processor = remark()
  .use(remarkMdx)
  .use(remarkInclude)
  .use(remarkDirective);

test('remark include', async () => {
  const file = path.join(dir, 'fixtures/remark-include/index.mdx');

  const vfile = new VFile({
    path: file,
    value: await fs.readFile(file),
    data: {
      _getProcessor() {
        return processor as any;
      },
    },
  });

  const parsed = processor.parse(vfile);
  removePosition(parsed);
  await expect(parsed).toMatchFileSnapshot(
    'fixtures/remark-include/index.in.mdast',
  );

  const out = await processor.run(parsed, vfile);
  removePosition(out);
  await expect(out).toMatchFileSnapshot(
    'fixtures/remark-include/index.out.mdast',
  );

  await expect(processor.stringify(out, vfile)).toMatchFileSnapshot(
    'fixtures/remark-include/index.out.mdx',
  );
});
