import type { Metadata } from 'next';
import { type NextRequest } from 'next/server';
import {
  type InferPageType,
  type LoaderConfig,
  type LoaderOutput,
} from '@/source';

interface ImageMeta {
  alt: string;
  url: string;
  width: number;
  height: number;
}

export function createMetadataImage<
  S extends LoaderOutput<LoaderConfig>,
>(options: {
  source: S;

  /**
   * the route of your OG image generator.
   *
   * @example '/docs-og'
   * @defaultValue '/docs-og'
   */
  imageRoute?: string;

  /**
   * The filename of generated OG Image
   *
   * @defaultValue 'image.png'
   */
  filename?: string;
}): {
  getImageMeta: (slugs: string[]) => ImageMeta;

  /**
   * Add image meta tags to metadata
   */
  withImage: (slugs: string[], metadata?: Metadata) => Metadata;

  /**
   * Generate static params for OG Image Generator
   */
  generateParams: () => {
    slug: string[];
    lang?: string;
  }[];

  /**
   * create route handler for OG Image Generator
   */
  createAPI: (
    handler: (
      page: InferPageType<S>,
      request: NextRequest,
      options: {
        params:
          | {
              slug: string[];
              lang?: string;
            }
          | Promise<{
              slug: string[];
              lang?: string;
            }>;
      },
    ) => Response | Promise<Response>,
  ) => (
    request: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ignore Next.js type check
    options: any,
  ) => Response | Promise<Response>;
} {
  const { filename = 'image.webp', imageRoute = '/docs-og' } = options;

  function getImageMeta(slugs: string[]): ImageMeta {
    return {
      alt: 'Banner',
      url: `/${[...imageRoute.split('/'), ...slugs, filename].filter((v) => v.length > 0).join('/')}`,
      width: 1200,
      height: 630,
    };
  }

  return {
    getImageMeta,
    withImage(slugs, data) {
      const imageData = getImageMeta(slugs);

      return {
        ...data,
        openGraph: {
          images: imageData,
          ...data?.openGraph,
        },
        twitter: {
          images: imageData,
          card: 'summary_large_image',
          ...data?.twitter,
        },
      };
    },
    generateParams() {
      return options.source.generateParams().map((params) => ({
        ...params,
        slug: [...params.slug, filename],
      }));
    },
    createAPI(handler) {
      return async (req, args) => {
        const params = await (
          args as {
            params?: Promise<Record<string, string | string[] | undefined>>;
          }
        ).params;

        if (!params || !('slug' in params) || params.slug === undefined)
          throw new Error(`Invalid params: ${JSON.stringify(params)}`);

        const lang =
          'lang' in params && typeof params.lang === 'string'
            ? params.lang
            : undefined;
        const input: { slug: string[]; lang?: string } = {
          slug: Array.isArray(params.slug) ? params.slug : [params.slug],
          lang,
        };

        const page = options.source.getPage(
          input.slug.slice(0, -1), //remove filename
          lang,
        );
        if (!page)
          return new Response(null, {
            status: 404,
          });

        return handler(page as InferPageType<S>, req, { params: input });
      };
    },
  };
}
