import { type Page } from '@/lib/source';
import { getSection } from './source/navigation';

export async function getLLMText(page: Page) {
  if (page.data.type === 'openapi') return '';

  const section = getSection(page.slugs[0]);
  const category =
    {
      framework: 'Fumadocs (Framework Mode)',
      ui: 'Fumadocs UI (the default theme of Fumadocs)',
      headless: 'Fumadocs Core (the core library of Fumadocs)',
      mdx: 'Fumadocs MDX (the built-in content source)',
      cli: 'Fumadocs CLI (the CLI tool for automating Fumadocs apps)',
    }[section] ?? section;

  const processed = await page.data.getText('processed');

  return `# ${category}: ${page.data.title}
URL: ${page.url}
Source: https://raw.githubusercontent.com/fuma-nama/fumadocs/refs/heads/main/apps/docs/content/docs/${page.path}

${page.data.description ?? ''}
        
${processed}`;
}
