import { dump } from 'js-yaml';
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
  const out: string[] = [];
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
  if (banner.length > 0) out.push(`---\n${banner}\n---`);

  const imports = options.imports
    ?.map(
      (item) =>
        `import { ${item.names.join(', ')} } from ${JSON.stringify(item.from)};`,
    )
    .join('\n');

  if (imports) {
    out.push(imports);
  }

  out.push(content);

  return out.join('\n\n');
}
