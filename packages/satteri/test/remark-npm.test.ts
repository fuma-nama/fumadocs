import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkNpm } from '@/remark-npm';

async function compile(source: string) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    mdastPlugins: [remarkNpm()],
  })('bundler');

  const { code } = await compileMdx({ source, filePath: '/test.mdx', options });
  return code;
}

describe('remark-npm', () => {
  it('expands package-install blocks into package manager tabs', async () => {
    const code = await compile('```package-install\nfumadocs-core\n```');

    expect(code).toContain('CodeBlockTabs');
    expect(code).toContain('npm install fumadocs-core');
    expect(code).toContain('pnpm add fumadocs-core');
    expect(code).toContain('yarn add fumadocs-core');
    expect(code).toContain('bun add fumadocs-core');
  });

  it('keeps full npm commands as-is', async () => {
    const code = await compile('```npm\nnpx create-next-app\n```');

    expect(code).toContain('npx create-next-app');
    expect(code).toContain('bun x create-next-app');
  });

  it('ignores other languages', async () => {
    const code = await compile('```bash\nnpm install x\n```');

    expect(code).not.toContain('CodeBlockTabs');
  });
});
