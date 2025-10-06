import type { Source, VirtualFile } from 'fumadocs-core/source';
import type { BaseDocsData, BaseMetaData } from '@/types';

export function createMDXSource<
  Docs extends BaseDocsData,
  Meta extends BaseMetaData,
>(
  allDocs: Docs[],
  allMetas: Meta[],
): Source<{
  metaData: Meta;
  pageData: Docs;
}> {
  type File = VirtualFile<{
    metaData: Meta;
    pageData: Docs;
  }>;

  return {
    files: [
      ...allDocs.map(
        (v) =>
          ({
            type: 'page',
            data: v,
            path: v._meta.filePath,
          }) satisfies File,
      ),
      ...allMetas.map(
        (v) =>
          ({
            type: 'meta',
            data: v,
            path: v._meta.filePath,
          }) satisfies File,
      ),
    ],
  };
}
