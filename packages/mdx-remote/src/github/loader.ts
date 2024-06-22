import type { LoaderContext } from 'webpack';
import type { PluginCacheOptions } from './next-config';

const sourcePath = require.resolve('@fumadocs/mdx-remote/github/source');

function exportCacheFunction(value: string): string {
  return `export async function ${value}(...args) {
  const cache = await getCache();
  return cache.${value}(...args);
}`;
}

export default function loader(
  this: LoaderContext<PluginCacheOptions>,
  _source: string,
): string {
  console.log(this.resourcePath);
  if (this.resourcePath !== sourcePath) return _source;

  const mode = process.env.NODE_ENV === 'production' ? 'remote' : 'local';
  // MAKE SURE YOU EDIT ./source.ts TO MATCH THESE EXPORTS SO TYPES ARE CORRECT
  const exportedCacheFunctions = ['compileMDX', 'createGithubWebhookAPI'];

  const options = {
    directory: undefined as string | undefined,
    ...this.getOptions(),
  };

  if (mode === 'remote' && 'githubDirectory' in options) {
    options.directory = options.githubDirectory;
  } else if (mode === 'local' && 'localDirectory' in options) {
    options.directory = options.localDirectory;
  }

  const source = `import { createCache } from "./index.mjs";

async function getCache() {
  const cache = createCache(${JSON.stringify(options)}, "${mode}");
	await cache.load();
	return cache;
}

export async function githubLoader(...args) {
  const cache = await getCache();

  return {
    ${[
      { from: 'pageTree', to: 'getPageTree' },
      'getPages',
      'getPage',
      'getSearchIndexes',
    ]
      .map((value) => {
        if (typeof value === 'string') {
          return `${value}: async (...args) => {
            const loader = await cache.fumadocsLoader(...args);
            return loader.${value}(...args);
          }`;
        }

        return `${value.to}: async () => {
          const loader = await cache.fumadocsLoader(...args);
          return loader.${value.from};
        }`;
      })
      .join(',\n')}
  }
}

${exportedCacheFunctions.map(exportCacheFunction).join('\n')}
`;

  return source;
}
