import type { PluginOption } from '@/core';
import indexFile, { type IndexFilePluginOptions } from './index-file';
import type { PluginOptions } from '@/vite';

export default function vite(config: Required<PluginOptions>): PluginOption {
  const out: PluginOption = [];

  if (config.index) {
    const options: IndexFilePluginOptions =
      config.index === true ? {} : config.index;

    out.push(indexFile(applyDefaults(options)));
  }

  return out;
}

function applyDefaults(
  options: IndexFilePluginOptions,
): IndexFilePluginOptions {
  return {
    ...options,
    target: options.target ?? 'vite',
  };
}
