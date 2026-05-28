import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { DynamicSource, MetaData } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { DefinedFetchType } from 'next-sanity/live';
import type { ReactNode } from 'react';
import type { PortableTextBlock } from '@portabletext/react';
import type { SlugValue } from '@sanity/types';
import type { QueryParams, SanityClient } from '@sanity/client';
import { renderToc } from './client';
import path from 'node:path';

export type SanityOptions<Doc extends BaseDoc = BaseDoc> =
  | GenericSanityOptions<Doc>
  | NextSanityOptions<Doc>;

interface BaseSanityOptions<Doc extends BaseDoc> {
  /** document name for docs pages */
  docType: string;

  /** generate [virtual file path](https://fumadocs.dev/docs/headless/source-api/source#static-source) from document */
  generatePath?: (doc: ShallowDoc<Doc>) => string;

  /** base directory for the virutal file paths */
  baseDir?: string;
}

export interface GenericSanityOptions<
  Doc extends BaseDoc = BaseDoc,
> extends BaseSanityOptions<Doc> {
  client: SanityClient;
}

export interface NextSanityOptions<Doc extends BaseDoc = BaseDoc> extends BaseSanityOptions<Doc> {
  client?: SanityClient;
  sanityFetch: DefinedFetchType;
}

/** your page document must align with this type */
export interface BaseDoc {
  _id: string;
  _type: string;
  title?: string;
  description?: string;
  slug?: SlugValue;
}

type ShallowDoc<Doc extends BaseDoc> = Pick<
  Doc,
  '_id' | 'title' | 'slug' | 'description' | '_type'
>;

export type DocToPage<Doc extends BaseDoc> = ShallowDoc<Doc> & {
  title: string;
  load: () => Promise<DocToPageLoaded<Doc>>;
  structuredData: () => Promise<StructuredData>;
};

export type DocToPageLoaded<Doc extends BaseDoc> = Doc & {
  _toc: PortableTextBlock[];
  renderToc: (opts: { render: (body: PortableTextBlock) => ReactNode }) => TOCItemType[];
};

export function createSanitySource<Doc extends BaseDoc>(
  options: SanityOptions<Doc>,
): DynamicSource<{
  pageData: DocToPage<Doc>;
  metaData: MetaData;
}> {
  const { docType, baseDir, generatePath } = options;
  let sanityFetch: <R = unknown>(query: string, params?: QueryParams) => Promise<R>;

  if ('sanityFetch' in options) {
    const fn = options.sanityFetch;
    sanityFetch = async (query, params) => {
      const res = await fn({ query, params });
      return res.data as never;
    };
  } else {
    const client = options.client;
    sanityFetch = client.fetch.bind(client);
  }

  return {
    async files() {
      const data = await sanityFetch<ShallowDoc<Doc>[]>(
        `*[_type == $docType]{ _id, _type, title, slug, description }`,
        {
          docType,
        },
      );

      return data.map((file) => {
        const slugs = file.slug?.current?.split('/').filter((v) => v.length > 0) ?? [];
        let filePath = generatePath
          ? generatePath(file)
          : slugs.length === 0
            ? 'index.mdx'
            : `${slugs.join('/')}.mdx`;
        if (baseDir) filePath = path.join(baseDir, filePath);

        return {
          type: 'page',
          data: {
            ...file,
            title: file.title ?? file._id,
            async load() {
              const data = await sanityFetch<Doc & { _toc?: PortableTextBlock[] }>(
                `*[_type == $docType && _id == $id][0]{
                  ...,
                  "_toc": body[style in ["h1", "h2", "h3", "h4", "h5", "h6"]]
                }`,
                {
                  id: file._id,
                  docType,
                },
              );

              return {
                ...data,
                _toc: data._toc ?? [],
                renderToc(opts) {
                  if (!data._toc) return [];
                  return renderToc({ toc: data._toc, ...opts });
                },
              };
            },
            async structuredData() {
              const data = await sanityFetch<{ structuredBody: StructuredBlock[] } | undefined>(
                `*[_type == $docType && _id == $id][0]{
                  "structuredBody": body[]{
                    ...,
                    _type == "block" => {
                      "heading": select(
                        style == "h1" => "h1",
                        style == "h2" => "h2",
                        style == "h3" => "h3",
                        style == "h4" => "h4",
                        style == "h5" => "h5",
                        style == "h6" => "h6",
                        null
                      ),
                      "content": pt::text(@)
                    }
                  }
                }`,
                {
                  docType,
                  id: file._id,
                },
              );

              return getStructuredData(data?.structuredBody ?? []);
            },
          },
          slugs,
          path: filePath,
        };
      });
    },
  };
}

interface StructuredBlock {
  _key?: string;
  content?: string | null;
  heading?: string | null;
}

function getStructuredData(blocks: StructuredBlock[] = []): StructuredData {
  const structuredData: StructuredData = {
    headings: [],
    contents: [],
  };
  let lastHeading: string | undefined;

  for (const block of blocks) {
    const content = block.content?.trim();
    if (!content) continue;

    if (block.heading && block._key) {
      structuredData.headings.push({
        id: block._key,
        content,
      });
      lastHeading = block._key;
      continue;
    }

    structuredData.contents.push({
      heading: lastHeading,
      content,
    });
  }

  return structuredData;
}
