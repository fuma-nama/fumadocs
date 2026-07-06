import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkCodeTab, type RemarkCodeTabOptions } from '@/remark-code-tab';

const source = '```js tab="Tab A"\nconst a = 1\n```\n\n```js tab="Tab B"\nconst b = 2\n```';

async function compile(input: string, tabOptions?: RemarkCodeTabOptions) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    mdastPlugins: [remarkCodeTab(tabOptions)],
  })('bundler');

  const { code } = await compileMdx({ source: input, filePath: '/test.mdx', options });
  return code;
}

describe('remark-code-tab', () => {
  it('groups adjacent tabbed code blocks into CodeBlockTabs', async () => {
    const code = await compile(source);

    expect(code).toContain('CodeBlockTabs');
    expect(code.match(/_jsx\(CodeBlockTabsTrigger/g)!.length).toBe(2);
    expect(code).toContain('const a = 1');
    expect(code).toContain('const b = 2');
    // both blocks belong to one group
    expect(code.match(/_jsxs\(CodeBlockTabs,/g)!.length).toBe(1);
  });

  it('emits a valid items array in Tabs mode', async () => {
    const code = await compile(source, { Tabs: 'Tabs' });

    expect(code).toContain('items: ["Tab A", "Tab B"]');
    expect(code).not.toContain('items: (');
  });

  it('renders tab names as MDX when parseMdx is enabled', async () => {
    const code = await compile(
      '```js tab="**A**"\nconst a = 1\n```\n\n```js tab="B"\nconst b = 2\n```',
      { Tabs: 'Tabs', parseMdx: true },
    );

    expect(code).toContain('TabsTrigger');
    // the bold marker must compile to a <strong>, not leak foreign content
    expect(code).toContain('strong');
    expect(code).not.toContain('items:');
  });

  it('keeps separate groups apart', async () => {
    const code = await compile(`${source}\n\nsome text\n\n${source}`);

    expect(code.match(/_jsxs\(CodeBlockTabs,/g)!.length).toBe(2);
  });

  it('persists tab groups via tab-group attribute', async () => {
    const code = await compile(
      '```js tab="A" tab-group="my-group"\nconst a = 1\n```\n\n```js tab="B"\nconst b = 2\n```',
    );

    expect(code).toContain('groupId: "my-group"');
  });

  it('ignores untagged code blocks', async () => {
    const code = await compile('```js\nconst a = 1\n```');

    expect(code).not.toContain('CodeBlockTabs');
  });
});
