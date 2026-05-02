import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { DynamicSource, MetaData } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { DefinedSanityFetchType } from 'next-sanity/live';
import type { ReactNode } from 'react';
import type { PortableTextBlock } from 'sanity';

export interface SanityOptions<Doc extends BaseDoc> {
  docType: string;
  sanityFetch: DefinedSanityFetchType;

  /** generate virtual file path from doc */
  generatePath?: (doc: ShallowDoc<Doc>) => string;
}

export interface BaseDoc {
  _id: string;
  _type: string;
  title?: string;
  description?: string;
  slug?: BaseSlug;
}

export interface BaseSlug {
  _type: 'slug';
  current?: string;
  source?: string;
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
  renderToc: (opts: { render: (body: PortableTextBlock) => ReactNode }) => TOCItemType[];
};

export function createSanitySource<Doc extends BaseDoc>(
  options: SanityOptions<Doc>,
): DynamicSource<{
  pageData: DocToPage<Doc>;
  metaData: MetaData;
}> {
  const { docType, sanityFetch, generatePath } = options;

  return {
    async files() {
      const docs = await sanityFetch({
        query: `*[_type == $docType]{
  _id, _type, title, slug, description
}`,
        params: {
          docType,
        },
      });
      const data = docs.data as ShallowDoc<Doc>[];

      return data.map((file) => {
        const slugs = file.slug?.current?.split('/').filter((v) => v.length > 0) ?? [];

        return {
          type: 'page',
          data: {
            ...file,
            title: file.title ?? file._id,
            async load() {
              const info = await sanityFetch({
                query: `*[_type == $docType && _id == $id][0]{
    ...,
    "toc": body[style in ["h1", "h2", "h3", "h4", "h5", "h6"]]
  }`,
                params: {
                  id: file._id,
                  docType,
                },
              });
              const data = info.data as Doc & { toc?: PortableTextBlock[] };

              return {
                ...data,
                renderToc({ render }) {
                  if (!data.toc) return [];

                  return data.toc.map((item): TOCItemType => {
                    return {
                      depth: Number(item.level ?? 0),
                      title: render({ ...item, style: undefined }),
                      url: `#${item._key}`,
                    };
                  });
                },
              };
            },
            async structuredData() {
              const result = await sanityFetch({
                query: `
                  *[_type == $docType && _id == $id][0]{
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
                  }
                `,
                params: {
                  docType,
                  id: file._id,
                },
              });

              const data = result.data as { structuredBody: StructuredBlock[] } | undefined;
              return getStructuredData(data?.structuredBody ?? []);
            },
          },
          slugs,
          path: generatePath
            ? generatePath(file)
            : slugs.length === 0
              ? 'index.mdx'
              : `${slugs.join('/')}.mdx`,
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
