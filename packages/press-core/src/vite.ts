import { defineConfig as base, type Config } from 'waku/config';

export function defineConfig(config: Config) {
  return base({
    ...config,
    vite: {
      ...config.vite,
      // we do this to avoid Vite from bundling React contexts and cause duplicated contexts conflicts.
      optimizeDeps: {
        ...config.vite?.optimizeDeps,
        exclude: [
          '@fumapress/core',
          'fumadocs-ui',
          'fumadocs-core',
          ...(config.vite?.optimizeDeps?.exclude ?? []),
        ],
        include: [
          'fumadocs-ui > unified',
          'fumadocs-core > remark',
          'fumadocs-core > hast-util-to-jsx-runtime',
          ...(config.vite?.optimizeDeps?.include ?? []),
        ],
      },
      resolve: {
        tsconfigPaths: true,
        ...config.vite?.resolve,
        noExternal:
          config.vite?.resolve?.noExternal === true
            ? true
            : [
                '@fumapress/core',
                'fumadocs-core',
                'fumadocs-ui',
                'fumadocs-openapi',
                '@fumadocs/base-ui',
                ...forceArray(config.vite?.resolve?.noExternal ?? []),
              ],
        // only dedupe for public, non-transitive libs
        dedupe: [
          '@fumapress/core',
          'fumadocs-core',
          'fumadocs-ui',
          'fumadocs-openapi',
          '@fumadocs/base-ui',
          ...(config.vite?.resolve?.dedupe ?? []),
        ],
        external:
          config.vite?.resolve?.external === true
            ? true
            : ['@takumi-rs/image-response', ...(config.vite?.resolve?.external ?? [])],
      },
    },
  });
}

function forceArray<V>(v: V | V[]): V[] {
  if (Array.isArray(v)) return v;
  return [v];
}
