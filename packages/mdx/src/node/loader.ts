import { dynamicConfig, findConfigFile } from '@/loaders/config';
import { createMdxLoader } from '@/loaders/mdx';
import { toNode } from '@/loaders/adapter';

export const load = toNode(
  createMdxLoader(dynamicConfig(findConfigFile(), '.source')),
  (filePath) => filePath.endsWith('.md') || filePath.endsWith('.mdx'),
);
