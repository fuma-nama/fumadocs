/**
 * Default configuration generator
 *
 * Feel free to copy and modify the code
 *
 * Warning: Shouldn't be imported in Next.js, this can cause problem. Put it in contentlayer.config.ts only
 */
import type {
  Args,
  ComputedFields,
  FieldDef,
  LocalDocument,
} from 'contentlayer/source-files';
import { defineDocumentType } from 'contentlayer/source-files';
import type { Options as ImgSizeOptions } from 'rehype-img-size';
import { rehypeImgSize, rehypeNextDocs, remarkGfm } from '@/mdx-plugins';
import type { RehypeNextDocsOptions } from '@/mdx-plugins/rehype-next-docs';
import { createGetUrl } from '@/server/utils';

function removeSlash(path: string): string {
  let start = 0,
    end = path.length;
  while (path.charAt(start) === '/') start++;
  while (path.charAt(end - 1) === '/' && end > start) end--;

  return path.slice(start, end);
}

function removePattern(path: string, pattern: string): string {
  let flattenedPath = path;

  if (path.endsWith('/index') || path === 'index') {
    flattenedPath = path.slice(0, path.length - 'index'.length);
  }

  if (!flattenedPath.startsWith(pattern)) {
    return flattenedPath;
  }

  return removeSlash(flattenedPath.slice(pattern.length));
}

export type Options = Partial<{
  /**
   * Where the docs files located
   * @defaultValue "docs"
   */
  docsPattern: string;

  /**
   * @defaultValue "content"
   */
  contentDirPath: string;

  /**
   * The directory path for images
   * @defaultValue "./public"
   */
  imgDirPath: string;

  baseUrl: string;

  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string;

  pluginOptions: RehypeNextDocsOptions;

  docFields: Record<string, FieldDef>;
  docsComputedFields: ComputedFields<'Docs'>;
  metaFields: Record<string, FieldDef>;
  metaComputedFields: ComputedFields<'Meta'>;
}>;

export function createConfig(options: Options = {}): Args {
  const {
    docsPattern = 'docs',
    contentDirPath = 'content',
    imgDirPath = './public',
    docFields,
    metaFields,
    baseUrl = '/docs',
    getUrl = createGetUrl(baseUrl),
    docsComputedFields,
    pluginOptions,
    metaComputedFields,
  } = options;

  function getSlugs(doc: LocalDocument): string {
    return removePattern(doc._raw.flattenedPath.split('.')[0], docsPattern);
  }

  function getLocale(doc: LocalDocument): string {
    return doc._raw.flattenedPath.split('.')[1];
  }

  const Docs = defineDocumentType(() => ({
    name: 'Docs',
    filePathPattern: `${docsPattern}/**/*.mdx`,
    contentType: 'mdx',
    fields: {
      title: {
        type: 'string',
        description: 'The title of the document',
        required: true,
      },
      description: {
        type: 'string',
        description: 'The description of the document',
        required: false,
      },
      icon: {
        type: 'string',
        required: false,
      },
      ...docFields,
    },
    computedFields: {
      locale: {
        type: 'string',
        resolve: (post) => getLocale(post),
      },
      slug: {
        type: 'string',
        resolve: (post) => getSlugs(post),
      },
      url: {
        type: 'string',
        resolve: (post) => {
          return getUrl(getSlugs(post).split('/'), getLocale(post));
        },
      },
      ...docsComputedFields,
    },
  }));

  const Meta = defineDocumentType(() => ({
    name: 'Meta',
    filePathPattern: `${docsPattern}/**/*.json`,
    contentType: 'data',
    fields: {
      title: {
        type: 'string',
        description: 'The title of the folder',
        required: false,
      },
      pages: {
        type: 'list',
        of: {
          type: 'string',
        },
        description: 'Pages of the folder',
        default: [],
      },
      icon: {
        type: 'string',
        required: false,
      },
      ...metaFields,
    },
    computedFields: {
      slug: {
        type: 'string',
        resolve: (post) => removePattern(post._raw.sourceFileDir, docsPattern),
      },
      ...metaComputedFields,
    },
  }));

  return {
    contentDirPath,
    documentTypes: [Docs, Meta],
    mdx: {
      rehypePlugins: [
        [rehypeNextDocs, pluginOptions],
        [
          // @ts-expect-error -- invalid options type
          rehypeImgSize,
          {
            dir: imgDirPath,
          } as ImgSizeOptions,
        ],
      ],
      remarkPlugins: [remarkGfm],
    },
  };
}

export const defaultConfig: Args = createConfig();
