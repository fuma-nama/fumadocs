import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkSteps } from '@/remark-steps';
import { remarkLlms } from '@/remark-llms';

async function compile(source: string) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    mdastPlugins: [remarkSteps()],
  })('bundler');

  const { code } = await compileMdx({ source, filePath: '/test.mdx', options });
  return code;
}

describe('remark-steps', () => {
  it('wraps numbered headings into steps', async () => {
    const code = await compile('### 1. Install\n\ninstall it\n\n### 2. Configure\n\nconfigure it');

    expect(code).toContain('fd-steps');
    expect(code.match(/className: "fd-step"/g)!.length).toBe(2);
    // the number prefix is stripped from the heading text
    expect(code).toContain('Install');
    expect(code).not.toContain('1. Install');
  });

  it('supports the [step] tag', async () => {
    const code = await compile('### Install [step]\n\ncontent');

    expect(code).toContain('fd-steps');
    expect(code).not.toContain('[step]');
  });

  it('leaves the [step] tag out of search records only', async () => {
    const options = await applySatteriPreset({
      rehypeCodeOptions: false,
      mdastPlugins: [remarkSteps(), remarkLlms()],
    })('bundler');
    const { data } = await compileMdx({
      source:
        '### Install [step]\n\nRun it.\n\n### Configure [step] [#config]\n\n> ### Quoted [step]\n',
      filePath: '/test.mdx',
      options,
    });

    expect(data.structuredData).toEqual({
      headings: [
        { id: 'install-step', content: 'Install' },
        { id: 'config', content: 'Configure' },
      ],
      contents: [
        { heading: 'install-step', content: 'Run it.' },
        { heading: 'config', content: '> ### Quoted' },
      ],
    });
    expect(data.markdown).toBe(
      '### Install [step] [#install-step]\n\nRun it.\n\n### Configure [step] [#config]\n\n> ### Quoted [step] [#quoted-step]\n',
    );
  });

  it('ends the group at a non-step heading', async () => {
    const code = await compile('### 1. One\n\n### 2. Two\n\n### Not a step');

    expect(code).toContain('fd-steps');
    expect(code.match(/className: "fd-step"/g)!.length).toBe(2);
  });

  it('leaves documents without steps untouched', async () => {
    const code = await compile('### Just a heading\n\ntext');

    expect(code).not.toContain('fd-steps');
  });
});
