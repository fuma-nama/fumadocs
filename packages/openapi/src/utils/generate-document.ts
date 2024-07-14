import { dump } from 'js-yaml';
import { defaultRenderer } from '@/render/renderer';
import { type GenerateOptions } from '@/generate';

export function generateDocument(
  title: string,
  description: string | undefined,
  content: string,
  options: GenerateOptions,
): string {
  const banner = dump({
    title,
    description,
    full: true,
    ...options.frontmatter?.(title, description),
  }).trim();

  const finalImports = (
    options.imports ?? [
      {
        names: Object.keys(defaultRenderer),
        from: 'fumadocs-openapi/ui',
      },
    ]
  )
    .map(
      (item) =>
        `import { ${item.names.join(', ')} } from ${JSON.stringify(item.from)};`,
    )
    .join('\n');

  return `---\n${banner}\n---\n\n${finalImports}\n\n${content}`;
}
