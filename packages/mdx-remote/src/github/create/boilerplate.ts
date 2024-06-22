import { remarkStructure } from 'fumadocs-core/mdx-plugins';
import { parse } from '../utils';
import { githubCacheFileSchema } from '../schema';
import type {
  CreateCacheOptions,
  GithubCache,
  GithubCacheFile,
} from '../types';
import { createFumadocsLoader } from './fumadocs-loader';
import { createCompileMDX } from './mdx';
import { createContentResolver } from './resolve-content';

export const createCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: CreateCacheOptions<Env>,
): Omit<
  GithubCache,
  'applyToCache' | 'load' | 'fs' | 'diff' | 'createGithubWebhookAPI'
> => {
  let cacheFile: GithubCacheFile | undefined;
  let gitTree: GithubCache['tree'] | undefined;

  const notInitialized = (subject: string): string =>
    `${subject} not initialized. Did you call cache.load?`;

  return {
    get tree() {
      if (!gitTree) throw new Error(notInitialized('Tree'));

      return gitTree;
    },
    set tree(value) {
      gitTree = value;
    },
    get data() {
      if (!cacheFile) throw new Error(notInitialized('Cache'));

      return cacheFile;
    },
    set data(value) {
      parse(
        githubCacheFileSchema,
        value,
        'Invalid cache file. Please check the schema',
      );
      cacheFile = value;
    },
    get resolveAllContent() {
      return createContentResolver(this.data, this.fs());
    },
    get compileMDX() {
      return createCompileMDX({
        mdxOptions: {
          remarkPlugins: [remarkStructure],
        },
      });
    },
    get fumadocsLoader() {
      return createFumadocsLoader(this.data.sha, this.fs(), this.compileMDX, {
        include: options.include,
        baseUrl: options.baseUrl,
      });
    },
  } as GithubCache;
};
