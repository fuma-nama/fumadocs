import { findConfigFile } from '@/utils/config';
import { createMdxLoader } from '@/loaders/mdx';
import { dynamicConfig } from '@/loaders/config-loader';
import { toNode } from '@/loaders/adapter';

export const load = toNode(
  createMdxLoader(dynamicConfig(findConfigFile(), '.source')),
  (filePath) => filePath.endsWith('.md') || filePath.endsWith('.mdx'),
);
