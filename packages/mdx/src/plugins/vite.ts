import type { PluginOption } from '@/core';
import indexFile, { type IndexFilePluginOptions } from './index-file';
import type { PluginOptions } from '@/vite';

export default function vite(config: Required<PluginOptions>): PluginOption {
  const { index } = config;

  return [index && indexFile(applyDefaults(index))];
}

function applyDefaults(
  options: IndexFilePluginOptions | true,
): IndexFilePluginOptions {
  if (options === true) options = {};

  return {
    ...options,
    target: options.target ?? 'vite',
  };
}
