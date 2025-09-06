import { getAPIPageItems } from '@/build-routes';
import { idToTitle } from '@/utils/id-to-title';
import type {
  ApiPageProps,
  OperationItem,
  WebhookItem,
} from '@/render/api-page';
import type { ProcessedDocument } from '@/utils/process-document';
import type { TableOfContents } from 'fumadocs-core/server';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { Document, TagObject } from '@/types';
import { dump } from 'js-yaml';
import type { NoReference } from '@/utils/schema';
import Slugger from 'github-slugger';
import { removeUndefined } from '@/utils/remove-undefined';

export interface GenerateOptions {
  /**
   * Additional imports of your MDX components.
   */
  imports?: {
    names: string[];
    from: string;
  }[];

  /**
   * Customise frontmatter.
   *
   * A `full: true` property will be added by default.
   */
  frontmatter?: (
    title: string,
    description: string | undefined,
    context: DocumentContext,
  ) => Record<string, unknown>;

  /**
   * Add description to document body.
   *
   * We recommend but don't enable it by default because some OpenAPI schemas have invalid description that breaks MDX syntax.
   *
   * @defaultValue false
   */
  includeDescription?: boolean;

  /**
   * Add a comment to the top of generated files indicating they are auto-generated.
   * - `true`: Adds a standardized comment
   * - `false`: No comment is added
   * - `string`: Adds the provided custom comment
   *
   * @defaultValue true
   */
  addGeneratedComment?: boolean | string;

  cwd?: string;

  /**
   * Inline the entire OpenAPI document into the MDX file.
   *
   * @deprecated Use the new `input` API on `createOpenAPI()` instead.
   * @defaultValue false
   */
  inlineDocument?: boolean;
}

export interface GenerateTagOutput {
  tag: string;
  content: string;
}

export type GeneratePageOutput =
  | {
      type: 'operation';
      item: OperationItem;
      content: string;
    }
  | {
      type: 'webhook';
      item: WebhookItem;
      content: string;
    };

export function generateAll(
  schemaId: string,
  processed: ProcessedDocument,
  options: GenerateOptions = {},
): string {
  const { document } = processed;
  const items = getAPIPageItems(document);

  return generatePage(
    schemaId,
    processed,
    {
      operations: items.operations,
      webhooks: items.webhooks,
      hasHead: true,
    },
    {
      ...options,
      title: document.info.title,
      description: document.info.description,
    },
    {
      type: 'file',
    },
  );
}

export function generatePages(
  schemaId: string,
  processed: ProcessedDocument,
  options: GenerateOptions = {},
): GeneratePageOutput[] {
  const { document } = processed;
  const items = getAPIPageItems(document);
  const result: GeneratePageOutput[] = [];

  for (const item of items.operations) {
    const pathItem = document.paths?.[item.path];
    if (!pathItem) continue;
    const operation = pathItem[item.method];
    if (!operation) continue;

    result.push({
      type: 'operation',
      item,
      content: generatePage(
        schemaId,
        processed,
        {
          operations: [item],
          hasHead: false,
        },
        {
          ...options,
          title:
            operation.summary ??
            pathItem.summary ??
            idToTitle(operation.operationId ?? 'unknown'),
          description: operation.description ?? pathItem.description,
        },
        {
          type: 'operation',
        },
      ),
    });
  }

  for (const item of items.webhooks) {
    const pathItem = document.webhooks?.[item.name];
    if (!pathItem) continue;
    const operation = pathItem[item.method];
    if (!operation) continue;

    result.push({
      type: 'webhook',
      item,
      content: generatePage(
        schemaId,
        processed,
        {
          webhooks: [item],
          hasHead: false,
        },
        {
          ...options,
          title: operation.summary ?? pathItem.summary ?? idToTitle(item.name),
          description: operation.description ?? pathItem.description,
        },
        {
          type: 'operation',
        },
      ),
    });
  }

  return result;
}

export function generateTags(
  schemaId: string,
  processed: ProcessedDocument,
  options: GenerateOptions = {},
): GenerateTagOutput[] {
  const { document } = processed;
  if (!document.tags) return [];
  const items = getAPIPageItems(document);

  return document.tags.map((tag) => {
    const webhooks = items.webhooks.filter(
      (v) => v.tags && v.tags.includes(tag.name),
    );
    const operations = items.operations.filter(
      (v) => v.tags && v.tags.includes(tag.name),
    );

    const displayName =
      tag && 'x-displayName' in tag && typeof tag['x-displayName'] === 'string'
        ? tag['x-displayName']
        : idToTitle(tag.name);

    return {
      tag: tag.name,
      content: generatePage(
        schemaId,
        processed,
        {
          operations,
          webhooks,
          hasHead: true,
        },
        {
          ...options,
          title: displayName,
          description: tag?.description,
        },
        {
          type: 'tag',
          tag,
        },
      ),
    } satisfies GenerateTagOutput;
  });
}

export function generateDocument(
  frontmatter: unknown,
  content: string,
  options: Pick<GenerateOptions, 'addGeneratedComment' | 'imports'>,
): string {
  const { addGeneratedComment = true, imports } = options;
  const out: string[] = [];
  const banner = dump(removeUndefined(frontmatter as object)).trimEnd();
  if (banner.length > 0) out.push(`---\n${banner}\n---`);

  if (addGeneratedComment) {
    let commentContent =
      'This file was generated by Fumadocs. Do not edit this file directly. Any changes should be made by running the generation command again.';

    if (typeof addGeneratedComment === 'string') {
      commentContent = addGeneratedComment;
    }

    commentContent = commentContent.replaceAll('/', '\\/');
    out.push(`{/* ${commentContent} */}`);
  }

  if (imports) {
    out.push(
      ...imports
        .map(
          (item) =>
            `import { ${item.names.join(', ')} } from ${JSON.stringify(item.from)};`,
        )
        .join('\n'),
    );
  }

  out.push(content);
  return out.join('\n\n');
}

interface StaticData {
  toc: TableOfContents;
  structuredData: StructuredData;
}

export type DocumentContext =
  | {
      type: 'tag';
      tag: TagObject | undefined;
    }
  | {
      type: 'operation';
    }
  | {
      type: 'file';
    };

function generatePage(
  schemaId: string,
  processed: ProcessedDocument,
  pageProps: Omit<ApiPageProps, 'document'>,
  options: GenerateOptions & {
    title: string;
    description?: string;
  },
  context: DocumentContext,
): string {
  const { frontmatter, includeDescription = false } = options;
  const extend = frontmatter?.(options.title, options.description, context);
  const page: ApiPageProps = {
    ...pageProps,
    document: schemaId,
  };

  let meta: object | undefined;
  if (page.operations?.length === 1) {
    const operation = page.operations[0];

    meta = {
      method: operation.method.toUpperCase(),
      route: operation.path,
    };
  }

  const data = generateStaticData(processed.document, page);
  const content: string[] = [];

  if (options.description && includeDescription)
    content.push(options.description);
  content.push(pageContent(page));

  return generateDocument(
    {
      title: options.title,
      description: !includeDescription ? options.description : undefined,
      full: true,
      ...extend,
      _openapi: {
        ...meta,
        ...data,
        ...(extend?._openapi as object | undefined),
      },
    },
    content.join('\n\n'),
    options,
  );
}

function generateStaticData(
  dereferenced: NoReference<Document>,
  props: ApiPageProps,
): StaticData {
  const slugger = new Slugger();
  const toc: TableOfContents = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  for (const item of props.operations ?? []) {
    const operation = dereferenced.paths?.[item.path]?.[item.method];
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
  // filter extra properties in props
  const operations: OperationItem[] = (props.operations ?? []).map((item) => ({
    path: item.path,
    method: item.method,
  }));
  const webhooks: WebhookItem[] = (props.webhooks ?? []).map((item) => ({
    name: item.name,
    method: item.method,
  }));

  return `<APIPage document={${JSON.stringify(props.document)}} operations={${JSON.stringify(operations)}} webhooks={${JSON.stringify(webhooks)}} hasHead={${JSON.stringify(props.hasHead)}} />`;
}
