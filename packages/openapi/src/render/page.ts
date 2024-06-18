import { dump } from 'js-yaml';
import { defaultRenderer } from '@/render/renderer';
import { type GenerateOptions } from '@/generate';

export function renderPage(
  title: string,
  description: string | undefined,
  content: string[],
  options: GenerateOptions,
): string {
  const banner = dump({
    title,
    description,
    ...options.frontmatter?.(title, description),
  }).trim();

  const finalImports = (
    options.imports ?? [
      {
        names: Object.keys(defaultRenderer),
        from: 'fumadocs-ui/components/api',
      },
    ]
  )
    .map(
      (item) =>
        `import { ${item.names.join(', ')} } from ${JSON.stringify(item.from)};`,
    )
    .join('\n');

  const Root = options.renderer?.Root ?? defaultRenderer.Root;

  return `---\n${banner}\n---\n\n${finalImports}\n\n${Root(content)}`;
}
