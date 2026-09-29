import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkAdmonition } from '@/remark-admonition';

async function compile(source: string) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    // `:::` must reach the plugin as paragraphs, not as parsed directives
    features: { directive: false },
    mdastPlugins: [remarkAdmonition()],
  })('bundler');

  const { code } = await compileMdx({ source, filePath: '/test.mdx', options });
  return code;
}

describe('remark-admonition', () => {
  it('converts an admonition block into a Callout with type', async () => {
    const code = await compile(':::info\n\nhello world\n\n:::');

    expect(code).toContain('Callout');
    expect(code).toContain('type: "info"');
    expect(code).toContain('hello world');
  });

  it('maps docusaurus type aliases', async () => {
    const code = await compile(':::danger\n\ncareful\n\n:::');

    expect(code).toContain('type: "error"');
  });

  it('keeps the title attribute', async () => {
    const code = await compile(':::warning[Be careful]\n\nhello\n\n:::');

    expect(code).toContain('type: "warn"');
    expect(code).toContain('title: "Be careful"');
  });

  it('handles multiple admonitions in one document', async () => {
    const code = await compile(':::info\n\nfirst\n\n:::\n\n:::danger\n\nsecond\n\n:::');

    expect(code).toContain('type: "info"');
    expect(code).toContain('type: "error"');
    expect(code).toContain('first');
    expect(code).toContain('second');
  });

  it('converts admonitions inside blockquotes', async () => {
    const code = await compile('> :::info\n>\n> quoted\n>\n> :::');

    expect(code).toContain('Callout');
    expect(code).toContain('quoted');
  });

  it('leaves unknown types untouched', async () => {
    const code = await compile(':::unknown\n\nbody\n\n:::');

    expect(code).not.toContain('Callout');
  });
});
