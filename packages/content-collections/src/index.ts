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
  return {
    files: [
      ...allDocs.map<VirtualFile>((v) => ({
        type: 'page',
        data: v,
        path: v._meta.filePath,
      })),
      ...allMetas.map<VirtualFile>((v) => ({
        type: 'meta',
        data: v,
        path: v._meta.filePath,
      })),
    ],
  };
}
