import { findConfigFile, staticConfig } from '@/loaders/config';
import { createMdxLoader } from '@/loaders/mdx';
import { toNode } from '@/loaders/adapter';
import { createCore } from '@/core';

const core = createCore({
  environment: 'node',
  configPath: findConfigFile(),
  outDir: '.source',
});

export const load = toNode(
  createMdxLoader(
    staticConfig({
      core,
      buildConfig: true,
    }),
  ),
  (filePath) => filePath.endsWith('.md') || filePath.endsWith('.mdx'),
);
