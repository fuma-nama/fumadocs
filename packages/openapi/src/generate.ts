import Parser from '@apidevtools/json-schema-ref-parser';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { buildRoutes } from '@/build-routes';
import type { Endpoint } from '@/endpoint';
import { generateDocument } from '@/utils/generate-document';
import { idToTitle } from '@/utils/id-to-title';
import type { RenderContext } from './types';
import { defaultRenderer, type Renderer } from './render/renderer';
import { type CodeSample, renderOperation } from './render/operation';

export interface GenerateOptions {
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
  ) => Record<string, unknown>;

  /**
   * Generate code samples for endpoint
   */
  generateCodeSamples?: (endpoint: Endpoint) => CodeSample[];

  renderer?: Partial<Renderer>;
}

export interface GenerateTagOutput {
  tag: string;
  content: string;
}

export interface GenerateOperationOutput {
  id: string;
  content: string;
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
    document.info.title,
    document.info.description,
    ctx.renderer.Root({ baseUrl: ctx.baseUrl }, child),
    options,
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
        const content = generateDocument(
          method.summary ?? method.method,
          method.description,
          ctx.renderer.Root({ baseUrl: ctx.baseUrl }, [
            await renderOperation(route.path, method, ctx, true),
          ]),
          options,
        );

        if (!method.operationId)
          throw new Error('Operation ID is required for generating docs.');

        return {
          id: method.operationId,
          content,
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
            idToTitle(tag),
            info?.description,
            ctx.renderer.Root({ baseUrl: ctx.baseUrl }, child),
            options,
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
    baseUrl: document.servers?.[0].url ?? 'https://example.com',
  };
}
