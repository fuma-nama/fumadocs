import { compile, type Config } from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import typography from '../src/typography';

async function build(
  candidates: string[],
  plugin: NonNullable<Config['plugins']>[number] = typography,
) {
  const compiler = await compile('@plugin "typography"; @tailwind utilities;', {
    loadModule: async () => ({
      path: 'typography',
      base: import.meta.dirname,
      module: plugin,
    }),
  });

  return compiler.build(candidates);
}

describe('typography', () => {
  it('scales prose styles with a unitless custom property', async () => {
    const css = await build(['prose']);

    expect(css).toContain('--tw-prose-size: 1;');
    expect(css).toContain('font-size: calc(1rem * var(--tw-prose-size));');
    expect(css).toContain('line-height: calc(1.75rem * var(--tw-prose-size));');
    expect(css).toContain('font-size: calc(var(--text-3xl) * var(--tw-prose-size));');
    expect(css).toContain('padding: calc(3px * var(--tw-prose-size));');
    expect(css).toContain('padding: calc(var(--spacing) * 2.5 * var(--tw-prose-size));');
    expect(css).toContain('border: solid 1px;');
    expect(css).toContain('border-radius: 5px;');
    expect(css).not.toContain('border: solid calc(1px * var(--tw-prose-size));');
    expect(css).not.toContain('border-radius: calc(5px * var(--tw-prose-size));');
  });

  it('generates a small prose modifier with adjusted weight', async () => {
    const css = await build(['prose', 'prose-sm']);
    const smallCss = css.slice(css.indexOf('.prose-sm'));

    expect(smallCss).toContain('.prose-sm {');
    expect(smallCss).toContain('--tw-prose-size: 0.875;');
    expect(smallCss).not.toMatch(/\.prose-sm\s*\{[^{}]*font-weight:/);
    expect(smallCss).toContain('font-weight: 450;');
    expect(smallCss).not.toContain('font-weight: 600;');
    expect(smallCss).not.toContain('font-weight: 700;');
    expect(smallCss).not.toContain('font-weight: 800;');
    expect(smallCss).not.toContain('font-weight: 900;');
  });

  it('uses the configured class name for the small modifier', async () => {
    const css = await build(['content', 'content-sm'], typography({ className: 'content' }));

    expect(css).toContain('.content {');
    expect(css).toContain('.content-sm {');
    expect(css).not.toContain('.prose-sm {');
  });
});
