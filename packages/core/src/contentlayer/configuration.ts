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
  DocumentType,
  FieldDef,
} from 'contentlayer/source-files';
import { defineDocumentType } from 'contentlayer/source-files';
import type { MDXOptions } from 'contentlayer/core';
import type { PluggableList, Plugin } from 'unified';
import rehypeImgSize, {
  type Options as RehypeImgSizeOptions,
} from 'rehype-img-size';
import type { Root } from 'hast';
import {
  rehypeNextDocs,
  remarkGfm,
  structure,
  type RehypeNextDocsOptions,
} from '@/mdx-plugins';
import { getTableOfContents } from '@/server/get-toc';
import type { DocsPageBase } from './types';

export interface Config {
  contentDirPath: string;
  Meta: DocumentType;
  Docs: DocumentType;
  mdx: MDXOptions;
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

  mdx: MDXOptions;
  pluginOptions: RehypeNextDocsOptions;

  docFields: Record<string, FieldDef>;
  docsComputedFields: ComputedFields<'Docs'>;
  metaFields: Record<string, FieldDef>;
  metaComputedFields: ComputedFields<'Meta'>;
}>;

export function create(options: Options = {}): Config {
  const {
    docsPattern = 'docs',
    contentDirPath = 'content',
    imgDirPath = './public',
    docFields,
    metaFields,
    docsComputedFields,
    pluginOptions,
    metaComputedFields,
    mdx = {},
  } = options;

  const remarkPlugins: PluggableList = [
    remarkGfm,
    ...(mdx.remarkPlugins ?? []),
  ];
  const rehypePlugins: PluggableList = [
    [rehypeNextDocs, pluginOptions],
    [
      rehypeImgSize as Plugin<[RehypeImgSizeOptions], Root>,
      {
        dir: imgDirPath,
      },
    ],
    ...(mdx.rehypePlugins ?? []),
  ];

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
      structuredData: {
        type: 'json',
        resolve(_docs) {
          const docs = _docs as DocsPageBase;
          return structure(docs.body.raw, remarkPlugins);
        },
      },
      toc: {
        type: 'json',
        resolve(_docs) {
          const docs = _docs as DocsPageBase;
          return getTableOfContents(docs.body.raw);
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
      root: {
        type: 'boolean',
        required: false,
      },
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
        required: false,
      },
      icon: {
        type: 'string',
        required: false,
      },
      ...metaFields,
    },
    computedFields: {
      ...metaComputedFields,
    },
  }));

  return {
    contentDirPath,
    Docs,
    Meta,
    mdx: {
      ...mdx,
      rehypePlugins,
      remarkPlugins,
    },
  };
}

export function createConfig(options?: Options): Args {
  const config = create(options);

  return {
    contentDirPath: config.contentDirPath,
    documentTypes: [config.Docs, config.Meta],
    mdx: config.mdx,
  };
}

export const defaultConfig: Args = createConfig();
