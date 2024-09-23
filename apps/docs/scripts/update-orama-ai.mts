import * as fs from 'node:fs/promises';
import { CloudManager } from '@oramacloud/client';
import fg from 'fast-glob';
import matter from 'gray-matter';
import path from 'node:path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import {
  fileGenerator,
  remarkDocGen,
  remarkInstall,
  typescriptGenerator,
} from 'fumadocs-docgen';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';

export async function updateOramaAi(): Promise<void> {
  const apiKey = process.env.ORAMA_PRIVATE_API_KEY;
  const index = process.env.ORAMA_INDEX_ID;

  if (!apiKey || !index) {
    console.log('no api key for Orama found, skipping');
    return;
  }

  const manager = new CloudManager({ api_key: apiKey });
  const indexManager = manager.index(index);

  await indexManager.empty();

  const files = await fg([
    './content/docs/**/*.mdx',
    '!*.model.mdx',
    '!./content/docs/ui/museum/**/*',
  ]);
  const records: unknown[] = [];

  console.log('processing documents for AI');
  const scan = files.map(async (file) => {
    const fileContent = await fs.readFile(file);
    const { content, data } = matter(fileContent.toString());

    const dir = path.dirname(file).split(path.sep).at(3);
    const category = {
      ui: 'Fumadocs and the default docs theme',
      headless: 'Fumadocs Core, the headless library of Fumadocs',
      mdx: 'Fumadocs MDX, the built-in content source',
      cli: 'Fumadocs CLI, the CLI tool for setting up Fumadocs projects',
    }[dir ?? ''];

    if (data._mdx?.mirror) {
      return;
    }

    const processed = await processContent(content);
    records.push({
      id: file,
      title: data.title as string,
      description: data.description as string,
      content: processed,
      category,
    });
  });

  await Promise.all(scan);

  console.log(`added ${records.length} records`);
  await indexManager.insert(records);
  await indexManager.deploy();
}

async function processContent(content: string): Promise<string> {
  const file = await remark()
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkDocGen, { generators: [typescriptGenerator(), fileGenerator()] })
    .use(remarkInstall, { persist: { id: 'package-manager' } })
    .use(remarkStringify)
    .process(content);

  return String(file);
}
