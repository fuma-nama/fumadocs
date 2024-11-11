import { dump } from 'js-yaml';
import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import Slugger from 'github-slugger';
import { type TableOfContents } from 'fumadocs-core/server';
import { type StructuredData } from 'fumadocs-core/mdx-plugins';
import { type ApiPageProps } from '@/server/api-page';
import type { DocumentContext, GenerateOptions } from '@/generate';
import { idToTitle } from '@/utils/id-to-title';

interface StaticData {
  toc: TableOfContents;
  structuredData: StructuredData;
}

export function generateDocument(
  options: GenerateOptions & {
    dereferenced: OpenAPI.Document;
    page: ApiPageProps;
    title: string;
    description?: string;
    context: DocumentContext;
  },
): string {
  const { frontmatter, includeDescription = false } = options;
  const out: string[] = [];
  const extend = frontmatter?.(
    options.title,
    options.description,
    options.context,
  );

  let meta: object | undefined;
  if (options.context.type === 'operation') {
    meta = {
      method: options.context.endpoint.method,
      route: options.context.route.path,
    };
  }

  const data = generateStaticData(options.dereferenced, options.page);

  const banner = dump({
    title: options.title,
    description: options.description,
    full: true,
    ...extend,
    _openapi: {
      ...meta,
      ...data,
      ...(extend?._openapi as object | undefined),
    },
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

  if (options.description && includeDescription) out.push(options.description);

  out.push(pageContent(options.page));

  return out.join('\n\n');
}

function generateStaticData(
  dereferenced: OpenAPI.Document,
  props: ApiPageProps,
): StaticData {
  const slugger = new Slugger();
  const toc: TableOfContents = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  for (const item of props.operations) {
    const operation = dereferenced.paths[item.path]?.[item.method];
    if (!operation) continue;

    if (props.hasHead && operation.operationId) {
      const title =
        operation.summary ??
        (operation.operationId ? idToTitle(operation.operationId) : item.path);
      const id = slugger.slug(title);

      toc.push({
        depth: 2,
        title,
        url: `#${id}`,
      });
      structuredData.headings.push({
        content: title,
        id,
      });
    }

    if (operation.description)
      structuredData.contents.push({
        content: operation.description,
        heading: structuredData.headings.at(-1)?.id,
      });
  }

  return { toc, structuredData };
}

function pageContent(props: ApiPageProps): string {
  return `<APIPage document={${JSON.stringify(props.document)}} operations={${JSON.stringify(props.operations)}} hasHead={${JSON.stringify(props.hasHead)}} />`;
}
