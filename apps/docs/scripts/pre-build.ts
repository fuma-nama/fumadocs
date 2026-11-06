import {
  createFileSystemGeneratorCache,
  createGenerator,
  createProject,
} from 'fumadocs-typescript';
import { BEFORE, SOURCE, TYPE_NAME, TYPE_TABLES } from '../app/(landing)/sections/automate/data.ts';
import { buildRegistry } from './build-registry.ts';

/** before `next build`, which traces the landing page's files ahead of prerendering it */
async function buildTypeTables() {
  const project = await createProject();
  const generator = createGenerator({
    project,
    cache: createFileSystemGeneratorCache(TYPE_TABLES),
  });

  for (const type of [BEFORE, SOURCE]) await generator.generateTypeTable({ type, name: TYPE_NAME });
  project.close();
}

async function main() {
  await Promise.all([buildRegistry(), buildTypeTables()]);
}

await main().catch((e) => {
  console.error('Failed to run pre build script', e);
  process.exit(1);
});
