import type { VaultStorage } from '@/build-storage';
import type { VaultResolver } from '@/build-resolver';
import { remarkConvert } from '@/remark/remark-convert';
import { remarkObsidianComment } from '@/remark/remark-obsidian-comment';
import { remarkBlockId } from '@/remark/remark-block-id';
import type { PluggableList } from 'unified';
import { remarkWikilinks } from '@/remark/remark-wikilinks';

export function getRemarkPlugins(
  storage: VaultStorage,
  resolver: VaultResolver,
): PluggableList {
  return [
    [remarkWikilinks, { resolver, storage }],
    [remarkConvert, { resolver, storage }],
    remarkObsidianComment,
    remarkBlockId,
  ];
}
