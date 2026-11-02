import type { ReactNode } from 'react';
import { generate } from 'fumadocs-ui/og/takumi';
import { ImageResponse, type ImageResponseOptions } from 'takumi-js/response';
import type { Context } from '../context';
import type { ApiRoute, AppShape, Awaitable, HeadTag, Plugin } from '../plugin';

/** `ImageResponseOptions` of a WebP image, the plugin sets `format` and the size itself */
export type TakumiImageOptions = ImageResponseOptions extends infer T
  ? T extends { format?: 'webp' }
    ? Omit<T, 'format' | 'width' | 'height'>
    : never
  : never;

export interface TakumiOptions<C extends AppShape = AppShape> {
  /**
   * The URL prefix of images, without the base path and the language.
   *
   * @defaultValue "/og"
   */
  basePath?: string;
  /** @defaultValue 1200 */
  width?: number;
  /** @defaultValue 630 */
  height?: number;

  /**
   * Options shared by every image, `generate()` overrides them per page.
   *
   * Values resolved once belong here, like the fonts from `googleFonts()` of `takumi-js/helpers`.
   * On runtimes that can't load the native addon, pass the WebAssembly build of `takumi-js/wasm` as `module`.
   */
  options?: TakumiImageOptions;

  /** the image of a page, defaults to its title, description and the site name */
  generate?: (this: Context<C>, page: C['page']) => Awaitable<TakumiImage>;
}

export interface TakumiImage {
  node: ReactNode;
  /** over the shared `options` */
  options?: TakumiImageOptions;
}

/** the path segments of a page's image, `index.webp` for the root page */
function imageSegments(slugs: string[]): string[] {
  if (slugs.length === 0) return ['index.webp'];
  const out = slugs.slice(0, -1);
  out.push(`${slugs[slugs.length - 1]}.webp`);
  return out;
}

/** the slugs of a page from the segments of its image path, `undefined` for other paths */
function pageSlugs(segments: string[]): string[] | undefined {
  const last = segments.at(-1);
  if (!last?.endsWith('.webp')) return;
  const out = segments.slice(0, -1);
  if (out.length > 0 || last !== 'index.webp') out.push(last.slice(0, -'.webp'.length));
  return out;
}

/**
 * Open Graph images of content pages with Takumi, requires `takumi-js` and `fumadocs-ui`.
 *
 * Every language gets an image route, fallback pages use the image of the page they fall back to.
 */
export function takumiPlugin<C extends AppShape = AppShape>(
  options: TakumiOptions<NoInfer<C>> = {},
): Plugin<C> {
  const { basePath = '/og', width = 1200, height = 630 } = options;
  const dir = basePath.replace(/\/$/, '');

  async function defaultImage(this: Context<C>, page: C['page']): Promise<TakumiImage> {
    const { title, description } = await this.getPageData(page);
    return { node: generate({ title, description, site: this.siteConfig.name }) };
  }

  async function imageUrl(ctx: Context<C>, page: C['page']): Promise<string> {
    const { locale, slugs } = (await ctx.getFallbackOrigin(page)) ?? page;
    return ctx.absoluteUrl(ctx.localizePath(locale, `${dir}/${imageSegments(slugs).join('/')}`));
  }

  return {
    name: 'takumi',
    provides: ['og-image'],
    async transformPage(data, page) {
      return { ...data, image: await imageUrl(this, page) };
    },
    // `og:image` comes from `image` of the page data
    head({ page }) {
      if (!page) return;
      const tags: HeadTag[] = [
        { tag: 'meta', attrs: { property: 'og:image:width', content: String(width) } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: String(height) } },
      ];
      return tags;
    },
    async routes() {
      const source = await this.getLoader();
      const routes: ApiRoute[] = [];

      for (const lang of this.i18nConfig?.languages ?? [undefined]) {
        const staticPaths: string[][] = [];
        for (const page of source.getPages(lang)) {
          if (!(await this.getFallbackOrigin(page))) staticPaths.push(imageSegments(page.slugs));
        }

        routes.push({
          path: this.localizePath(lang, `${dir}/[...slugs]`),
          staticPaths,
          GET: async (_request, { params }) => {
            const slugs = Array.isArray(params.slugs) ? pageSlugs(params.slugs) : undefined;
            const page = slugs && (await this.getLoader()).getPage(slugs, lang);
            if (!page || (await this.getFallbackOrigin(page)))
              return new Response(null, { status: 404 });

            const image = await (options.generate ?? defaultImage).call(this, page);
            return new ImageResponse(image.node, {
              ...options.options,
              ...image.options,
              width,
              height,
              format: 'webp',
            });
          },
        });
      }

      return routes;
    },
  };
}
