import { loader, type InferPageType } from 'fumadocs-core/source';
import { docs } from 'fumadocs-mdx:collections/server';

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
});

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
