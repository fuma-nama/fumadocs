import { createCore, findConfigFile } from '@/core';
import { createMdxLoader } from '@/loaders/mdx';
import { toNode } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';

const core = createCore({
  environment: 'node',
  configPath: findConfigFile(),
  outDir: '.source',
});

export const load = toNode(
  createMdxLoader(
    createStandaloneConfigLoader({
      core,
      buildConfig: true,
      mode: 'production',
    }),
  ),
  (filePath) => filePath.endsWith('.md') || filePath.endsWith('.mdx'),
);
