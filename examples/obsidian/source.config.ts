import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkObsidian, RemarkObsidianOptions } from 'fumadocs-obsidian/mdx';
import { readVaultFiles } from 'fumadocs-obsidian';
import { pageSchema } from 'fumadocs-core/source/schema';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.partial(),
  },
});

export default defineConfig({
  mdxOptions: async () => {
    const files = await readVaultFiles({
      dir: 'content/docs/Obsidian Vault',
    });

    return {
      remarkPlugins: (plugins) => [
        [
          remarkObsidian,
          {
            files,
          } satisfies RemarkObsidianOptions,
        ],
        ...plugins,
      ],
    };
  },
});
