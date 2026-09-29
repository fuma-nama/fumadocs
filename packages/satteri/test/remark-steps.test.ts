import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkSteps } from '@/remark-steps';

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
