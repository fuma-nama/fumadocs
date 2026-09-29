import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkDirectiveAdmonition } from '@/remark-directive-admonition';

async function compile(source: string) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    features: { directive: true },
    mdastPlugins: [remarkDirectiveAdmonition()],
  })('bundler');

  const { code } = await compileMdx({ source, filePath: '/test.mdx', options });
  return code;
}

describe('remark-directive-admonition', () => {
  it('converts directives into callout components', async () => {
    const code = await compile(':::warn\nbe careful\n:::');

    expect(code).toContain('CalloutContainer');
    expect(code).toContain('type: "warning"');
    expect(code).toContain('be careful');
  });

  it('splits label into title and body into description', async () => {
    const code = await compile(':::info[My Title]\nbody text\n:::');

    expect(code).toContain('CalloutTitle');
    expect(code).toContain('My Title');
    expect(code).toContain('CalloutDescription');
    expect(code).toContain('body text');
  });

  it('forwards extra directive attributes', async () => {
    const code = await compile(':::info{id="note-1"}\nbody\n:::');

    expect(code).toContain('id: "note-1"');
  });

  it('ignores unknown directive names', async () => {
    const code = await compile(':::whatever\nbody\n:::');

    expect(code).not.toContain('CalloutContainer');
  });
});
