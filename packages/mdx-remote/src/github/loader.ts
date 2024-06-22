import type { LoaderContext } from 'webpack';
import type { PluginCacheOptions } from './next-config';

const sourcePath = require.resolve('@fumadocs/mdx-remote/github/source');

function generateExportFunction(
  fn:
    | {
        name: string;
        value: string;
      }
    | string,
): string {
  const data = typeof fn === 'string' ? { name: fn, value: fn } : fn;
  return `export async function ${data.name}(...args) {
  const cache = await getCache();
  return cache.${data.value}(...args);
}`;
}

export default function loader(
  this: LoaderContext<PluginCacheOptions>,
  _source: string,
): string {
  if (this.resourcePath !== sourcePath) return _source;

  const options = this.getOptions();

  const mode = process.env.NODE_ENV === 'production' ? 'remote' : 'local';
  // MAKE SURE YOU EDIT ./source.ts TO MATCH THESE EXPORTS SO TYPES ARE CORRECT
  const exportedFunctions = [
    'compileMDX',
    {
      name: 'githubLoader',
      value: 'fumadocsLoader',
    },
  ];

  return `import { createCache } from "./index.mjs";
  
async function getCache() {
  const cache = await createCache(${JSON.stringify(options)}, "${mode}");
	await cache.load();
	return cache;
}

${exportedFunctions.map(generateExportFunction).join('\n')}`;
}
