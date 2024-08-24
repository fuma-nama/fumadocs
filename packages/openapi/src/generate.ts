import { resolve } from 'node:path';
import Parser from '@apidevtools/json-schema-ref-parser';
import { type OpenAPIV3 as OpenAPI } from 'openapi-types';
import { buildRoutes } from '@/build-routes';
import { generateDocument } from '@/utils/generate-document';
import { idToTitle } from '@/utils/id-to-title';
import { type Operation } from '@/server/api-page';
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

  /**
   * Add description to document body
   *
   * @defaultValue false
   */
  includeDescription?: boolean;

  cwd?: string;
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

async function dereference(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions,
): Promise<OpenAPI.Document> {
  return await Parser.dereference<OpenAPI.Document>(
    // resolve paths
    typeof pathOrDocument === 'string' &&
      !pathOrDocument.startsWith('http://') &&
      !pathOrDocument.startsWith('https://')
      ? resolve(options.cwd ?? process.cwd(), pathOrDocument)
      : pathOrDocument,
  );
}

export async function generateAll(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<string> {
  const document = await dereference(pathOrDocument, options);
  const routes = buildRoutes(document).get('all') ?? [];
  const operations: Operation[] = [];

  for (const route of routes) {
    for (const method of route.methods) {
      operations.push({
        method: method.method.toLowerCase() as OpenAPI.HttpMethods,
        path: route.path,
      });
    }
  }

  return generateDocument({
    ...options,
    dereferenced: document,
    title: document.info.title,
    description: document.info.description,
    page: {
      operations,
      hasHead: true,
      document: pathOrDocument,
    },

    context: {
      type: 'file',
      routes,
    },
  });
}

export async function generateOperations(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<GenerateOperationOutput[]> {
  const document = await dereference(pathOrDocument, options);
  const routes = buildRoutes(document).get('all') ?? [];

  return routes.flatMap<GenerateOperationOutput>((route) => {
    return route.methods.map((method) => {
      if (!method.operationId)
        throw new Error('Operation ID is required for generating docs.');

      const content = generateDocument({
        ...options,
        page: {
          operations: [
            {
              path: route.path,
              method: method.method.toLowerCase() as OpenAPI.HttpMethods,
            },
          ],
          hasHead: false,
          document: pathOrDocument,
        },
        dereferenced: document,
        title: method.summary ?? idToTitle(method.operationId),
        description: method.description,
        context: {
          type: 'operation',
          endpoint: method,
          route,
        },
      });

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
  const document = await dereference(pathOrDocument, options);
  const tags = Array.from(buildRoutes(document).entries());

  return tags
    .filter(([tag]) => tag !== 'all')
    .map(([tag, routes]) => {
      const info = document.tags?.find((t) => t.name === tag);
      const operations: Operation[] = [];

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
        content: generateDocument({
          ...options,
          page: {
            document: pathOrDocument,
            operations,
            hasHead: true,
          },
          dereferenced: document,
          title: idToTitle(tag),
          description: info?.description,
          context: {
            type: 'tag',
            tag: info,
            routes,
          },
        }),
      } satisfies GenerateTagOutput;
    });
}
