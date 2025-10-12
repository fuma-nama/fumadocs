import { type Processor, unified } from 'unified';
import type { Root } from 'mdast';
import type { VaultFile } from '@/read-vaults';
import { buildStorage, type ParsedFile } from '@/build-storage';
import { remarkConvert } from '@/remark-convert';
import { buildResolver } from '@/build-resolver';
import { remarkObsidianComment } from '@/remark-obsidian-comment';
import { remarkBlockId } from '@/remark-block-id';
import path from 'node:path';

export interface RemarkObsidianOptions {
  files: VaultFile[];
}

/**
 * [Experimental] One remark plugin to use Obsidian-style Markdown with Fumadocs
 */
export function remarkObsidian(
  this: Processor,
  options: RemarkObsidianOptions,
) {
  const { files } = options;
  const storage = buildStorage(files, {
    url: () => undefined,
    outputPath: 'ignore',
    enforceMdx: false,
  });
  const resolver = buildResolver(storage);
  const processor = unified()
    .use(remarkConvert, { storage, resolver })
    .use(remarkObsidianComment)
    .use(remarkBlockId);
  const relativePathToVault = new Map<string, ParsedFile>();

  for (const file of storage.files.values()) {
    relativePathToVault.set(path.relative(process.cwd(), file._raw.path), file);
  }

  const parser = this.parser;
  this.parser = (doc, file) => {
    const relativePath = path.relative(process.cwd(), file.path);
    const vault = relativePathToVault.get(relativePath);
    const parsed = parser!(doc, file);

    if (vault?.format === 'content') {
      file.data.source = vault;

      return processor.runSync(parsed as Root, file);
    }

    return parsed;
  };
}
