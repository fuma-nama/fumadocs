import Parser from '@apidevtools/json-schema-ref-parser';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { buildRoutes } from '@/build-routes';
import { renderPage } from '@/render/page';
import type { RenderContext } from './types';
import { defaultRenderer, type Renderer } from './render/renderer';
import { renderOperation } from './render/operation';

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
   * Customise frontmatter
   */
  frontmatter?: (
    title: string,
    description: string | undefined,
  ) => Record<string, unknown>;

  renderer?: Partial<Renderer>;
}

export interface GenerateTagOutput {
  tag: string;
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

  return renderPage(
    document.info.title,
    document.info.description,
    child,
    options,
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
          content: renderPage(tag, info?.description, child, options),
        } satisfies GenerateTagOutput;
      }),
  );
}

function getContext(
  document: OpenAPI.Document,
  options: GenerateOptions,
): RenderContext {
  return {
    renderer: {
      ...defaultRenderer,
      ...options.renderer,
    },
    baseUrl: document.servers?.[0].url ?? 'https://example.com',
  };
}
