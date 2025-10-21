import { findConfigFile, staticConfig } from '@/loaders/config';
import { createMdxLoader } from '@/loaders/mdx';
import { toNode } from '@/loaders/adapter';

export const load = toNode(
  createMdxLoader(
    staticConfig({
      configPath: findConfigFile(),
      outDir: '.source',
      buildConfig: true,
    }),
  ),
  (filePath) => filePath.endsWith('.md') || filePath.endsWith('.mdx'),
);
