import type { PluginOption } from '@/core';
import type { CreateMDXOptions } from '@/next';
import indexFile from './index-file';

export default function next(config: CreateMDXOptions): PluginOption {
  const { index = {} } = config;

  return [index && indexFile(index)];
}
