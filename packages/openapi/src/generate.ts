import Parser from '@apidevtools/json-schema-ref-parser';
import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import { type TableOfContents } from 'fumadocs-core/server';
import { type StructuredData } from 'fumadocs-core/mdx-plugins';
import Slugger from 'github-slugger';
import { buildRoutes } from '@/build-routes';
import { generateDocument } from '@/utils/generate-document';
import { idToTitle } from '@/utils/id-to-title';
import { type ApiPageProps } from '@/server/api-page';
import type { MethodInformation, RouteInformation } from './types';

export type DocumentContext =
  | {
      type: 'tag';
      tag: OpenAPI.TagObject | undefined;
      routes: RouteInformation[];
    }
  | {
      type: 'operation';

      /**
       * information of the route
       */
      route: RouteInformation;

      /**
       * information of the method (API Endpoint)
       */
      endpoint: MethodInformation;
    }
  | {
      type: 'file';
      routes: RouteInformation[];
    };

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
}

export interface GenerateTagOutput {
  tag: string;
  content: string;
}

export interface GenerateOperationOutput {
  content: string;

  method: MethodInformation;
  route: RouteInformation;
}

export async function generateAll(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<string> {
  const document = await Parser.dereference<OpenAPI.Document>(pathOrDocument);
  const routes = buildRoutes(document).get('all') ?? [];
  const operations: { path: string; method: OpenAPI.HttpMethods }[] = [];

  for (const route of routes) {
    for (const method of route.methods) {
      operations.push({
        method: method.method.toLowerCase() as OpenAPI.HttpMethods,
        path: route.path,
      });
    }
  }

  return generateDocument(
    pageContent(document, { operations, hasHead: true }),
    options,
    {
      title: document.info.title,
      description: document.info.description,
      context: {
        type: 'file',
        routes,
      },
    },
  );
}

export async function generateOperations(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<GenerateOperationOutput[]> {
  const document = await Parser.dereference<OpenAPI.Document>(pathOrDocument);
  const routes = buildRoutes(document).get('all') ?? [];

  return routes.flatMap<GenerateOperationOutput>((route) => {
    return route.methods.map((method) => {
      if (!method.operationId)
        throw new Error('Operation ID is required for generating docs.');

      const content = generateDocument(
        pageContent(document, {
          operations: [
            {
              path: route.path,
              method: method.method.toLowerCase() as OpenAPI.HttpMethods,
            },
          ],
          hasHead: false,
        }),
        options,
        {
          title: method.summary ?? idToTitle(method.operationId),
          description: method.description,
          context: {
            type: 'operation',
            endpoint: method,
            route,
          },
        },
      );

      return {
        content,
        route,
        method,
      } satisfies GenerateOperationOutput;
    });
  });
}

export async function generateTags(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<GenerateTagOutput[]> {
  const document = await Parser.dereference<OpenAPI.Document>(pathOrDocument);
  const tags = Array.from(buildRoutes(document).entries());

  return tags
    .filter(([tag]) => tag !== 'all')
    .map(([tag, routes]) => {
      const info = document.tags?.find((t) => t.name === tag);
      const operations: { path: string; method: OpenAPI.HttpMethods }[] = [];

      for (const route of routes) {
        for (const method of route.methods) {
          operations.push({
            method: method.method.toLowerCase() as OpenAPI.HttpMethods,
            path: route.path,
          });
        }
      }

      return {
        tag,
        content: generateDocument(
          pageContent(document, { operations, hasHead: true }),
          options,
          {
            title: idToTitle(tag),
            description: info?.description,
            context: {
              type: 'tag',
              tag: info,
              routes,
            },
          },
        ),
      } satisfies GenerateTagOutput;
    });
}

function pageContent(
  doc: OpenAPI.Document,
  props: Omit<ApiPageProps, 'ctx'>,
): string {
  const slugger = new Slugger();
  const toc: TableOfContents = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  for (const item of props.operations) {
    const operation = doc.paths[item.path]?.[item.method];
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

  return `<APIPage operations={${JSON.stringify(props.operations)}} hasHead={${JSON.stringify(props.hasHead)}} />

export function startup() {
    if (toc) {
        // toc might be immutable
        while (toc.length > 0) toc.pop()
        toc.push(...${JSON.stringify(toc)})
    }
    
    if (structuredData) {
        structuredData.headings = ${JSON.stringify(structuredData.headings)}
        structuredData.contents = ${JSON.stringify(structuredData.contents)}
    }
}

{startup()}`;
}
