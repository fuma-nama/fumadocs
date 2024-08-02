import Parser from '@apidevtools/json-schema-ref-parser';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { buildRoutes } from '@/build-routes';
import { generateDocument } from '@/utils/generate-document';
import { idToTitle } from '@/utils/id-to-title';
import type {
  MethodInformation,
  RenderContext,
  RouteInformation,
} from './types';
import { defaultRenderer, type Renderer } from './render/renderer';
import { renderOperation } from './render/operation';

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

export interface GenerateOptions
  extends Pick<
    RenderContext,
    'generateCodeSamples' | 'generateTypeScriptSchema'
  > {
  /**
   * The imports of your MDX components.
   *
   * If not specified, import required components from `fumadocs-ui/components/api`.
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

  renderer?: Partial<Renderer>;
}

export interface GenerateTagOutput {
  tag: string;
  content: string;
}

export interface GenerateOperationOutput {
  id: string;
  content: string;

  route: RouteInformation;
}

export async function generate(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<string> {
  const document = await Parser.dereference<OpenAPI.Document>(pathOrDocument);
  const routes = buildRoutes(document).get('all') ?? [];
  const ctx = getContext(document, options);
  const child: string[] = [];

  for (const route of routes) {
    for (const method of route.methods) {
      child.push(await renderOperation(route.path, method, ctx));
    }
  }

  return generateDocument(
    ctx.renderer.Root({ baseUrl: ctx.baseUrl }, child),
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
  const ctx = getContext(document, options);

  return await Promise.all(
    routes.flatMap<Promise<GenerateOperationOutput>>((route) => {
      return route.methods.map(async (method) => {
        if (!method.operationId)
          throw new Error('Operation ID is required for generating docs.');

        const content = generateDocument(
          ctx.renderer.Root({ baseUrl: ctx.baseUrl }, [
            await renderOperation(route.path, method, ctx, false),
          ]),
          options,
          {
            title: method.summary ?? method.method,
            description: method.description,
            context: {
              type: 'operation',
              endpoint: method,
              route,
            },
          },
        );

        return {
          id: method.operationId,
          content,
          route,
        } satisfies GenerateOperationOutput;
      });
    }),
  );
}

export async function generateTags(
  pathOrDocument: string | OpenAPI.Document,
  options: GenerateOptions = {},
): Promise<GenerateTagOutput[]> {
  const document = await Parser.dereference<OpenAPI.Document>(pathOrDocument);
  const tags = Array.from(buildRoutes(document).entries());
  const ctx = getContext(document, options);

  return await Promise.all(
    tags
      .filter(([tag]) => tag !== 'all')
      .map(async ([tag, routes]) => {
        const info = document.tags?.find((t) => t.name === tag);
        const child: string[] = [];

        for (const route of routes) {
          for (const method of route.methods) {
            child.push(await renderOperation(route.path, method, ctx));
          }
        }

        return {
          tag,
          content: generateDocument(
            ctx.renderer.Root({ baseUrl: ctx.baseUrl }, child),
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
      }),
  );
}

function getContext(
  document: OpenAPI.Document,
  options: GenerateOptions,
): RenderContext {
  return {
    document,
    renderer: {
      ...defaultRenderer,
      ...options.renderer,
    },
    generateTypeScriptSchema: options.generateTypeScriptSchema,
    generateCodeSamples: options.generateCodeSamples,
    baseUrl: document.servers?.[0].url ?? 'https://example.com',
  };
}
