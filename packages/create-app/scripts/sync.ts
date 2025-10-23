import { copy } from '@/utils';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { glob } from 'tinyglobby';

const dir = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join('../../examples');
const templateDir = path.join(dir, '../template');

const templates = [
  'react-router',
  'tanstack-start',
  'react-router-spa',
  'waku',
];

async function rm(files: string[]) {
  await Promise.all(files.map((file) => fs.rm(file)));
}

async function main() {
  await Promise.all(
    templates.map(async (template) => {
      await rm(
        await glob(['**/*', '!README.md'], {
          cwd: path.join(templateDir, template),
          absolute: true,
        }),
      );

      await copy(
        path.join(examplesDir, template),
        path.join(templateDir, template),
        {
          rename(name) {
            switch (path.basename(name)) {
              case '.gitignore':
                return path.join(path.dirname(name), 'example.gitignore');
              default:
                return name;
            }
          },
          filterDir(dir) {
            const base = path.basename(dir);

            switch (base) {
              case 'node_modules':
              case 'dist':
              case 'build':
                return false;
              default:
                return !base.startsWith('.');
            }
          },
          filter(name) {
            const base = path.basename(name);

            switch (base) {
              case 'next-env.d.ts':
              case 'pages.gen.ts':
              case 'routeTree.gen.ts':
              case 'README.md':
                return false;
              case '.gitignore':
                return true;
              default:
                return !base.startsWith('.');
            }
          },
        },
      );
    }),
  );
}

void main();
