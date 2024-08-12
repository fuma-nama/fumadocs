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
  const { frontmatter } = options;
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

  out.push(pageContent(data, options.page));

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

function pageContent(data: StaticData, props: ApiPageProps): string {
  // modify toc and structured data if possible
  // it may not be compatible with other content sources except Fumadocs MDX
  // TODO: Maybe add to frontmatter and let developers to handle them?
  return `<APIPage document={${JSON.stringify(props.document)}} operations={${JSON.stringify(props.operations)}} hasHead={${JSON.stringify(props.hasHead)}} />

export function startup() {
    if (typeof toc !== 'undefined') {
        // toc might be immutable
        while (toc.length > 0) toc.pop()
        toc.push(...${JSON.stringify(data.toc)})
    }
    
    if (typeof structuredData !== 'undefined') {
        structuredData.headings = ${JSON.stringify(data.structuredData.headings)}
        structuredData.contents = ${JSON.stringify(data.structuredData.contents)}
    }
}

{startup()}`;
}
