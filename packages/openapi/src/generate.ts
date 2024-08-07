import Parser from '@apidevtools/json-schema-ref-parser';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { buildRoutes } from '@/build-routes';
import { generateDocument } from '@/utils/generate-document';
import { idToTitle } from '@/utils/id-to-title';
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

export async function generate(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<string> {
  const document = await Parser.dereference<OpenAPI.Document>(pathOrDocument);
  const routes = buildRoutes(document).get('all') ?? [];
  const operations: { path: string; method: string }[] = [];

  for (const route of routes) {
    for (const method of route.methods) {
      operations.push({
        method: method.method.toLowerCase(),
        path: route.path,
      });
    }
  }

  return generateDocument(
    `<APIPage operations={${JSON.stringify(operations)}} />`,
    options,
    {
      ...document.info,
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
        `<APIPage operations={${JSON.stringify([
          {
            path: route.path,
            method: method.method.toLowerCase(),
          },
        ])}} hasHead={false} />`,
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
      const operations: { path: string; method: string }[] = [];

      for (const route of routes) {
        for (const method of route.methods) {
          operations.push({
            method: method.method.toLowerCase(),
            path: route.path,
          });
        }
      }

      return {
        tag,
        content: generateDocument(
          `<APIPage operations={${JSON.stringify(operations)}} />`,
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
