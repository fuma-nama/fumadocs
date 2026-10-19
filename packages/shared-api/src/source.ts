import * as path from 'node:path';
import { PathUtils, type MetaData, type PageData, type VirtualFile } from 'fumadocs-core/source';

export interface SourceOptions {
  baseDir?: string;
  /** Generate `meta.json` files */
  meta?: boolean | { folderStyle?: 'folder' | 'separator' };
}

interface Entry<E = unknown> {
  type: string;
  path: string;
  info: { title: string; description?: string };
  entries?: E[];
}

/** convert output entries into virtual files for `loader()` */
export function toVirtualFiles<E extends Entry<E>, Data extends PageData>(
  entries: E[],
  { baseDir = '', meta = false }: SourceOptions,
  toPage: (entry: Exclude<E, { type: 'group' }>) => Data,
): VirtualFile<{ pageData: Data; metaData: MetaData }>[] {
  const { folderStyle = 'folder' } = typeof meta === 'object' ? meta : {};
  const files: VirtualFile<{ pageData: Data; metaData: MetaData }>[] = [];

  function scan(entries: E[], parent?: E) {
    for (const entry of entries) {
      if (entry.type === 'group') {
        scan(entry.entries!, entry);
        continue;
      }

      files.push({
        type: 'page',
        path: path.join(baseDir, entry.path),
        data: toPage(entry as Exclude<E, { type: 'group' }>),
        // generated pages have no translations, share them with every language
        locale: '$',
      });
    }

    if (!meta) return;
    const pages = getMetaPages(entries, parent, folderStyle);
    if (pages.length === 0) return;
    files.push({
      type: 'meta',
      path: path.join(baseDir, parent?.path ?? '', 'meta.json'),
      data: { title: parent?.info.title, description: parent?.info.description, pages },
      locale: '$',
    });
  }

  scan(entries);
  return files;
}

/** the `pages` of `meta.json` in the folder of `parent`, for its entries */
export function getMetaPages(
  entries: Entry[],
  parent: Entry | undefined,
  folderStyle: 'folder' | 'separator',
): string[] {
  const pages: string[] = [];

  for (const entry of entries) {
    const relativePath = PathUtils.slash(
      parent ? path.relative(parent.path, entry.path) : entry.path,
    );

    if (entry.type !== 'group') pages.push(relativePath.slice(0, -path.extname(entry.path).length));
    else if (folderStyle === 'folder') pages.push(relativePath);
    else pages.push(`---${entry.info.title}---`, `...${relativePath}`);
  }

  return pages;
}
