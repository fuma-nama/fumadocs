import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { getSection } from './source/navigation';
import { frameworks } from './framework';

export const docsLlms = llms(source, {
  renderPage: async (page) => {
    if (page.type !== 'docs' || !('getText' in page.data)) return '';

    const section = getSection(page.slugs[0]);
    const framework = frameworks.find((item) => item.value === page.params?.framework);
    const category =
      {
        framework: `Fumadocs (Framework Mode${framework ? `, ${framework.name}` : ''})`,
        ui: 'Fumadocs UI (the default theme of Fumadocs)',
        headless: 'Fumadocs Core (the core library of Fumadocs)',
        mdx: 'Fumadocs MDX (the built-in content source)',
        cli: 'Fumadocs CLI (the CLI tool for automating Fumadocs apps)',
      }[section] ?? section;

    let processed: string;
    try {
      processed = await page.data.getText('processed');
    } catch {
      return '';
    }

    return `# ${category}: ${page.data.title}
URL: ${page.url}
Source: https://raw.githubusercontent.com/fuma-nama/fumadocs/refs/heads/main/apps/docs/content/docs/${page.path}

${page.data.description ?? ''}

${processed}`;
  },
});
