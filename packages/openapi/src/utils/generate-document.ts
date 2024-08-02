import { dump } from 'js-yaml';
import { defaultRenderer } from '@/render/renderer';
import type { DocumentContext, GenerateOptions } from '@/generate';

export function generateDocument(
  content: string,
  options: GenerateOptions,
  frontmatter: {
    title: string;
    description?: string;
    context: DocumentContext;
  },
): string {
  const banner = dump({
    title: frontmatter.title,
    description: frontmatter.description,
    full: true,
    ...(frontmatter.context.type === 'operation'
      ? {
          method: frontmatter.context.endpoint.method,
          route: frontmatter.context.route.path,
        }
      : undefined),
    ...options.frontmatter?.(
      frontmatter.title,
      frontmatter.description,
      frontmatter.context,
    ),
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
