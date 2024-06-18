import type { Compiler } from 'webpack';
import { createCache, type GithubCache } from '../cache';

export const cache: { inner?: GithubCache } = {};

type Options = Parameters<typeof createCache>[0];

export class MDXRemoteGithubPlugin {
  constructor(private options: Options) {}

  apply(compiler: Compiler): void {
    const pluginName = this.constructor.name;

    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- Webpack
    compiler.hooks.beforeCompile.tapAsync(
      pluginName,
      (_, callback: (err?: Error | null | undefined) => void) => {
        try {
          cache.inner = createCache(this.options);
          callback();
        } catch (err) {
          callback(err as Error);
        }
      },
    );
  }
}
