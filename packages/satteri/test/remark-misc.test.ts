import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkMdxMermaid } from '@/remark-mdx-mermaid';
import { remarkBlockId } from '@/remark-block-id';
import { remarkFeedbackBlock } from '@/remark-feedback-block';
import { remarkImage } from '@/remark-image';
import type { MdastPluginInput } from 'satteri';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function compile(source: string, plugins: MdastPluginInput[], filePath = '/test.mdx') {
  const options = await applySatteriPreset({
    preset: 'minimal',
    mdastPlugins: plugins,
  })('bundler');

  return compileMdx({ source, filePath, options });
}

describe('remark-mdx-mermaid', () => {
  it('converts mermaid code blocks into Mermaid components', async () => {
    const { code } = await compile('```mermaid\ngraph TD; A-->B;\n```', [remarkMdxMermaid()]);

    expect(code).toContain('Mermaid');
    expect(code).toContain('chart: "graph TD; A-->B;"');
  });

  it('ignores other code blocks', async () => {
    const { code } = await compile('```js\nconst a = 1\n```', [remarkMdxMermaid()]);

    expect(code).not.toContain('Mermaid');
  });
});

describe('remark-block-id', () => {
  it('assigns deterministic ids to block nodes', async () => {
    const first = await compile('some paragraph', [remarkBlockId()]);
    const second = await compile('some paragraph', [remarkBlockId()]);

    const id = /id: "([^"]+)"/.exec(first.code)?.[1];
    expect(id).toBeDefined();
    expect(second.code).toContain(`id: "${id}"`);
    expect(first.code).toContain('"data-block": "default"');
  });

  it('keeps existing ids and supports custom generators', async () => {
    const { code } = await compile('hello world', [
      remarkBlockId({ generateId: ({ text }) => text.replaceAll(' ', '-') }),
    ]);

    expect(code).toContain('id: "hello-world"');
  });
});

describe('remark-feedback-block', () => {
  it('wraps blocks in FeedbackBlock elements', async () => {
    const { code } = await compile('first paragraph\n\nsecond paragraph', [remarkFeedbackBlock()]);

    expect(code.match(/FeedbackBlock/g)!.length).toBeGreaterThanOrEqual(2);
    expect(code).toContain('body: "first paragraph"');
  });

  it('deduplicates repeated content ids', async () => {
    const { code } = await compile('same\n\nsame', [remarkFeedbackBlock()]);

    const ids = [...code.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('remark-image', () => {
  it('converts local images into imports with size info', async () => {
    const { code } = await compile(
      '![test image](./img.png)',
      [remarkImage()],
      path.join(fixtures, 'page.mdx'),
    );

    expect(code).toContain('import __img0 from "./img.png"');
    expect(code).toContain('alt: "test image"');
  });

  it('resolves sizes directly when useImport is disabled', async () => {
    const { code } = await compile(
      '![test image](./img.png)',
      [remarkImage({ useImport: false })],
      path.join(fixtures, 'page.mdx'),
    );

    // the fixture is a 1x1 png
    expect(code).toContain('width: "1"');
    expect(code).toContain('height: "1"');
  });

  it('throws for missing images when sizes are resolved', async () => {
    await expect(
      compile(
        '![missing](./missing.png)',
        [remarkImage({ useImport: false })],
        path.join(fixtures, 'page.mdx'),
      ),
    ).rejects.toThrow();
  });

  it('hides missing images with onError: hide', async () => {
    const { code } = await compile(
      '![missing](./missing.png)',
      [remarkImage({ onError: 'hide', useImport: false })],
      path.join(fixtures, 'page.mdx'),
    );

    expect(code).not.toContain('missing.png');
  });
});
