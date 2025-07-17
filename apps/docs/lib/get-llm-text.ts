import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import { remarkAutoTypeTable } from 'fumadocs-typescript';
import { remarkInclude } from 'fumadocs-mdx/config';
import { type Page } from '@/lib/source';
import { remarkNpm } from 'fumadocs-core/mdx-plugins';

const processor = remark()
  .use(remarkMdx)
  .use(remarkInclude)
  .use(remarkGfm)
  .use(remarkAutoTypeTable)
  .use(remarkNpm);

export async function getLLMText(page: Page) {
  const category =
    {
      ui: 'Fumadocs Framework',
      headless: 'Fumadocs Core (core library of framework)',
      mdx: 'Fumadocs MDX (the built-in content source)',
      cli: 'Fumadocs CLI (the CLI tool for automating Fumadocs apps)',
    }[page.slugs[0]] ?? page.slugs[0];

  const processed = await processor.process({
    path: page.data._file.absolutePath,
    value: page.data.content,
  });

  return `# ${category}: ${page.data.title}
URL: ${page.url}
Source: https://raw.githubusercontent.com/fuma-nama/fumadocs/refs/heads/main/apps/docs/content/docs/${page.path}

${page.data.description}
        
${processed.value}`;
}
