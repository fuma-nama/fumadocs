import type { VaultResolver } from '@/build-resolver';
import { remarkConvert } from '@/remark/remark-convert';
import { remarkObsidianComment } from '@/remark/remark-obsidian-comment';
import { remarkBlockId } from '@/remark/remark-block-id';
import type { PluggableList } from 'unified';
import { remarkWikilinks } from '@/remark/remark-wikilinks';
import type { ParsedContentFile } from '@/build-storage';

declare module 'vfile' {
  interface DataMap {
    source?: ParsedContentFile;
  }
}

export function getRemarkPlugins(resolver: VaultResolver): PluggableList {
  return [
    [remarkWikilinks, { resolver }],
    [remarkConvert, { resolver }],
    remarkObsidianComment,
    remarkBlockId,
  ];
}
