import type { FileCollectionStore } from 'fuma-content/collections/runtime/file-store';
import type { MDXStoreLazyData, MDXStoreData } from 'fuma-content/collections/mdx/runtime';
import type { MetaData, PageData, StaticSource } from 'fumadocs-core/source';

type ToPageData<T> =
  T extends MDXStoreData<infer Frontmatter>
    ? Frontmatter & T
    : T extends MDXStoreLazyData<infer Frontmatter, unknown>
      ? Frontmatter & T
      : never;

export function toFumadocsSource<
  Mdx extends MDXStoreData<PageData> | MDXStoreLazyData<PageData, unknown> = MDXStoreData<
    PageData,
    unknown
  >,
  Meta extends { data: MetaData } = { data: MetaData },
>(mdxStore?: FileCollectionStore<Mdx>, metaStore?: FileCollectionStore<Meta>) {
  const out: StaticSource<{
    pageData: ToPageData<Mdx>;
    metaData: Meta['data'];
  }> = { files: [] };
  for (const page of mdxStore?.list() ?? []) {
    out.files.push({
      type: 'page',
      data: ('compiled' in page
        ? { ...page, ...page.compiled.frontmatter }
        : { ...page, ...page.frontmatter }) as unknown as ToPageData<Mdx>,
      path: page.path,
      absolutePath: page.fullPath,
    });
  }
  for (const file of metaStore?.list() ?? []) {
    out.files.push({
      type: 'meta',
      data: file.data,
      path: file.path,
      absolutePath: file.fullPath,
    });
  }
  return out;
}

export function docsStore<
  Mdx extends MDXStoreData<PageData> | MDXStoreLazyData<PageData, unknown> = MDXStoreData<
    PageData,
    unknown
  >,
  Meta extends { data: MetaData } = { data: MetaData },
>(mdxStore: FileCollectionStore<Mdx>, metaStore: FileCollectionStore<Meta>) {
  return {
    toFumadocsSource() {
      return toFumadocsSource(mdxStore, metaStore);
    },
  };
}
