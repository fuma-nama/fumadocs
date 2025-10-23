import { copy } from '@/utils';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const dir = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join('../../../examples');
const templateDir = path.join(dir, '../template');

const templates = [
  'react-router',
  'tanstack-start',
  'react-router-spa',
  'waku',
];

async function main() {
  await Promise.all(
    templates.map(async (template) => {
      await fs.rm(path.join(templateDir, template), {
        recursive: true,
        force: true,
      });

      await copy(
        path.join(examplesDir, template),
        path.join(templateDir, template),
        (name) => {
          if (name === '.gitignore') return 'example.gitignore';

          return name;
        },
      );
    }),
  );
}

void main();
